/**
 * Robust Chunked Upload Utility for Cloudinary
 * Supports:
 * - Fault tolerance with automatic retries
 * - Resume capability using localStorage
 * - Progress tracking
 * - Large file support (up to 2GB)
 */

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
}

export interface ChunkedUploadConfig {
  chunkSize?: number; // Default: 6MB (Cloudinary recommended)
  maxRetries?: number;
  retryDelay?: number; // ms
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onError?: (error: Error, chunkIndex: number) => void;
}

export interface UploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  uploadPreset?: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  resource_type: string;
  format: string;
  bytes: number;
  duration?: number;
  width?: number;
  height?: number;
  created_at: string;
  etag: string;
  asset_id: string;
}

interface UploadState {
  fileId: string;
  uploadedChunks: number[];
  uniqueId: string;
  startTime: number;
}

const STORAGE_KEY_PREFIX = "chunked_upload_";
const DEFAULT_CHUNK_SIZE = 6 * 1024 * 1024; // 6MB - Cloudinary's recommended chunk size
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Generate a unique file identifier based on file properties
 */
function generateFileId(file: File): string {
  return `${file.name}_${file.size}_${file.lastModified}`;
}

/**
 * Save upload state to localStorage for resume capability
 */
function saveUploadState(state: UploadState): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${state.fileId}`,
      JSON.stringify(state)
    );
  } catch (e) {
    console.warn("Failed to save upload state:", e);
  }
}

/**
 * Load upload state from localStorage
 */
function loadUploadState(fileId: string): UploadState | null {
  try {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${fileId}`);
    if (!data) return null;

    const state: UploadState = JSON.parse(data);

    // Check if state is too old (24 hours)
    if (Date.now() - state.startTime > 24 * 60 * 60 * 1000) {
      clearUploadState(fileId);
      return null;
    }

    return state;
  } catch (e) {
    return null;
  }
}

/**
 * Clear upload state from localStorage
 */
function clearUploadState(fileId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${fileId}`);
  } catch (e) {
    console.warn("Failed to clear upload state:", e);
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload a single chunk with retry logic
 */
async function uploadChunk(
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  file: File,
  uploadParams: UploadParams,
  uniqueId: string,
  maxRetries: number,
  retryDelay: number,
  onProgress?: (loaded: number) => void
): Promise<Response> {
  const start = chunkIndex * chunk.size;
  const end = Math.min(start + chunk.size, file.size);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("cloud_name", uploadParams.cloudName);
      formData.append("api_key", uploadParams.apiKey);
      formData.append("timestamp", uploadParams.timestamp.toString());
      formData.append("signature", uploadParams.signature);
      formData.append("folder", uploadParams.folder);
      formData.append("public_id", uploadParams.publicId);
      formData.append("resource_type", "video");
      formData.append("unique_id", uniqueId);

      // Use XMLHttpRequest for progress tracking
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(event.loaded);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(
              new Response(xhr.responseText, {
                status: xhr.status,
                statusText: xhr.statusText,
                headers: { "Content-Type": "application/json" },
              })
            );
          } else {
            reject(
              new Error(
                `Upload failed with status ${xhr.status}: ${xhr.responseText}`
              )
            );
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };

        xhr.ontimeout = () => {
          reject(new Error("Upload timeout"));
        };

        // Set Content-Range header for chunked upload
        xhr.open(
          "POST",
          `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/video/upload`
        );
        xhr.setRequestHeader("X-Unique-Upload-Id", uniqueId);
        xhr.setRequestHeader(
          "Content-Range",
          `bytes ${start}-${end - 1}/${file.size}`
        );
        xhr.timeout = 300000; // 5 minute timeout per chunk
        xhr.send(formData);
      });

      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(
        `Chunk ${chunkIndex + 1}/${totalChunks} upload attempt ${
          attempt + 1
        } failed:`,
        error.message
      );

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("Upload failed after all retries");
}

/**
 * Main chunked upload function with fault tolerance
 */
export async function uploadFileChunked(
  file: File,
  uploadParams: UploadParams,
  config: ChunkedUploadConfig = {}
): Promise<CloudinaryUploadResult> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    onProgress,
    onChunkComplete,
    onError,
  } = config;

  const fileId = generateFileId(file);
  const totalChunks = Math.ceil(file.size / chunkSize);

  // Check for existing upload state (resume capability)
  let state = loadUploadState(fileId);
  let uniqueId: string;
  let uploadedChunks: Set<number>;

  if (state && state.uniqueId) {
    console.log(
      `Resuming upload for ${file.name}, ${state.uploadedChunks.length}/${totalChunks} chunks already uploaded`
    );
    uniqueId = state.uniqueId;
    uploadedChunks = new Set(state.uploadedChunks);
  } else {
    // Start fresh upload
    uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    uploadedChunks = new Set();
    state = {
      fileId,
      uniqueId,
      uploadedChunks: [],
      startTime: Date.now(),
    };
    saveUploadState(state);
  }

  const startTime = Date.now();
  let totalBytesUploaded = uploadedChunks.size * chunkSize;
  let lastProgressUpdate = Date.now();
  let lastBytesUploaded = totalBytesUploaded;

  // Upload chunks
  let result: CloudinaryUploadResult | null = null;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    // Skip already uploaded chunks
    if (uploadedChunks.has(chunkIndex)) {
      console.log(
        `Skipping chunk ${chunkIndex + 1}/${totalChunks} (already uploaded)`
      );
      continue;
    }

    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    try {
      const response = await uploadChunk(
        chunk,
        chunkIndex,
        totalChunks,
        file,
        uploadParams,
        uniqueId,
        maxRetries,
        retryDelay,
        (loaded) => {
          const currentTotalUploaded = totalBytesUploaded + loaded;
          const now = Date.now();
          const timeDiff = (now - lastProgressUpdate) / 1000;

          let speed = 0;
          if (timeDiff > 0.1) {
            speed = (currentTotalUploaded - lastBytesUploaded) / timeDiff;
            lastProgressUpdate = now;
            lastBytesUploaded = currentTotalUploaded;
          }

          const remainingBytes = file.size - currentTotalUploaded;
          const remainingTime = speed > 0 ? remainingBytes / speed : 0;

          if (onProgress) {
            onProgress({
              loaded: currentTotalUploaded,
              total: file.size,
              percentage: Math.round((currentTotalUploaded / file.size) * 100),
              currentChunk: chunkIndex + 1,
              totalChunks,
              speed,
              remainingTime,
            });
          }
        }
      );

      const responseData = await response.json();

      // Mark chunk as uploaded
      uploadedChunks.add(chunkIndex);
      totalBytesUploaded = (chunkIndex + 1) * chunkSize;

      // Save state after each successful chunk
      saveUploadState({
        fileId,
        uniqueId,
        uploadedChunks: Array.from(uploadedChunks),
        startTime: state.startTime,
      });

      if (onChunkComplete) {
        onChunkComplete(chunkIndex + 1, totalChunks);
      }

      // Last chunk returns the full result
      if (chunkIndex === totalChunks - 1) {
        result = responseData;
      }
    } catch (error: any) {
      console.error(
        `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}:`,
        error
      );

      if (onError) {
        onError(error, chunkIndex);
      }

      throw new Error(
        `Upload failed at chunk ${chunkIndex + 1}/${totalChunks}: ${
          error.message
        }`
      );
    }
  }

  // Clear upload state on success
  clearUploadState(fileId);

  if (!result) {
    throw new Error("Upload completed but no result received");
  }

  console.log(`Upload completed successfully: ${result.secure_url}`);
  return result;
}

/**
 * Check if a file should use chunked upload
 */
export function shouldUseChunkedUpload(
  file: File,
  threshold: number = 20 * 1024 * 1024
): boolean {
  return file.size > threshold;
}

/**
 * Get upload status from localStorage
 */
export function getUploadStatus(
  file: File
): { resumable: boolean; progress: number } | null {
  const fileId = generateFileId(file);
  const state = loadUploadState(fileId);

  if (!state) {
    return null;
  }

  const chunkSize = DEFAULT_CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);
  const progress = Math.round(
    (state.uploadedChunks.length / totalChunks) * 100
  );

  return {
    resumable: true,
    progress,
  };
}

/**
 * Clear any pending upload for a file
 */
export function clearPendingUpload(file: File): void {
  const fileId = generateFileId(file);
  clearUploadState(fileId);
}
