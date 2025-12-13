/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Upload,
  FileText,
  CreditCard,
  Loader2,
  X,
  User,
  Video,
} from "lucide-react";
import VideoRecorder from "./video-recorder";

// const RECORDING_SCRIPT = `Feel free to speak on any topic you prefer, or follow the sample script provided on the next screen.`;
const RECORDING_SCRIPT = `Feel free to speak any topic you prefer, or follow the same script provided on the next screen`;

// Hi! I’m feeling good today. The lighting is nice and I’m speaking clearly. I’m relaxed and smiling while recording. I’ll talk naturally and move my hands a bit as I speak.`;

const PACKAGES = [{ id: "ai-clone", name: "Get Your AI Clone", amount: 37 }];

// Optimized SessionData: Only essentials (no buyerInfo or customPrompt—fetch fresh from API)
interface SessionData {
  orderId: string;
  submissionId: string | null;
  paymentStatus: "pending" | "paid" | "failed";
  completedSteps: number[];
  timestamp: number;
}

const SESSION_STORAGE_KEY = "ai_clone_session";
const SESSION_EXPIRY_DAYS = 90; // 90 days session validity

// Helper functions
const saveSession = (data: SessionData) => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
};

export const loadSession = (): SessionData | null => {
  try {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return null;

    const session: SessionData = JSON.parse(data);

    // Check if session is expired (90 days)
    const expiryTime =
      session.timestamp + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() > expiryTime) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error("Failed to load session:", error);
    return null;
  }
};

const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
};

const updateSession = (updates: Partial<SessionData>) => {
  const existing = loadSession();
  if (existing) {
    saveSession({ ...existing, ...updates });
  }
};

// ============ NEW ROBUST UPLOAD SYSTEM ============

interface UploadProgress {
  phase: "preparing" | "uploading" | "finalizing";
  progress: number;
  chunkIndex?: number;
  totalChunks?: number;
  bytesUploaded?: number;
  totalBytes?: number;
}

interface ChunkUploadState {
  uploadId: string;
  uploadedChunks: number[];
  etags: { partNumber: number; etag: string }[];
}

const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks (Cloudinary recommends 5-6MB)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Storage key for resumable uploads
const getUploadStateKey = (fileHash: string, submissionId: string) =>
  `upload_state_${submissionId}_${fileHash}`;

// Generate a simple hash for the file (for resume identification)
const generateFileHash = async (file: File): Promise<string> => {
  const slice = file.slice(0, 1024 * 1024); // First 1MB
  const buffer = await slice.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hashHex.substring(0, 16)}_${file.size}_${file.name}`;
};

// Save upload state for resume capability
const saveUploadState = (key: string, state: ChunkUploadState) => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save upload state:", e);
  }
};

// Load upload state for resume
const loadUploadState = (key: string): ChunkUploadState | null => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

// Clear upload state
const clearUploadState = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Failed to clear upload state:", e);
  }
};

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Upload a single chunk with retry logic
async function uploadChunkWithRetry(
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  fileSize: number,
  uniqueUploadId: string,
  uploadParams: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
  },
  retries = MAX_RETRIES
): Promise<{ etag?: string; result?: any }> {
  const start = chunkIndex * CHUNK_SIZE;
  const end = Math.min(start + chunk.size, fileSize);
  const isLastChunk = chunkIndex === totalChunks - 1;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("api_key", uploadParams.apiKey);
        formData.append("timestamp", uploadParams.timestamp.toString());
        formData.append("signature", uploadParams.signature);
        formData.append("folder", uploadParams.folder);
        formData.append("public_id", uploadParams.publicId);

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch {
              resolve({ success: true, intermediate: true });
            }
          } else {
            let errorMsg = `HTTP ${xhr.status}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMsg = errorResponse.error?.message || errorMsg;
            } catch {
              errorMsg = xhr.responseText || errorMsg;
            }
            reject(new Error(errorMsg));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () =>
          reject(new Error("Upload aborted"))
        );

        xhr.open(
          "POST",
          `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/video/upload`
        );
        xhr.setRequestHeader("X-Unique-Upload-Id", uniqueUploadId);
        xhr.setRequestHeader(
          "Content-Range",
          `bytes ${start}-${end - 1}/${fileSize}`
        );
        xhr.send(formData);
      });

      if (isLastChunk && result.secure_url) {
        return { result };
      }
      return { etag: `chunk_${chunkIndex}` };
    } catch (error: any) {
      console.warn(
        `Chunk ${chunkIndex + 1} attempt ${attempt + 1} failed:`,
        error.message
      );
      if (attempt === retries) {
        throw new Error(`Chunk ${chunkIndex + 1} failed: ${error.message}`);
      }
      await sleep(RETRY_DELAY * Math.pow(2, attempt));
    }
  }
  throw new Error("Unexpected error in chunk upload");
}

// Main chunked upload function with fault tolerance
// async function uploadToCloudinaryChunkedRobust(
//   file: File,
//   uploadParams: {
//     cloudName: string;
//     apiKey: string;
//     timestamp: number;
//     signature: string;
//     folder: string;
//     publicId: string;
//   },
//   submissionId: string,
//   onProgress?: (progress: UploadProgress) => void
// ): Promise<any> {
//   const fileHash = await generateFileHash(file);
//   const stateKey = getUploadStateKey(fileHash, submissionId);
//   const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

//   // Generate unique upload ID
//   const uploadId = `${uploadParams.publicId}_${Date.now()}`;

//   // Check for existing upload state (resume capability)
//   let uploadState = loadUploadState(stateKey);
//   let startChunk = 0;

//   if (uploadState && uploadState.uploadId) {
//     console.log(
//       `Resuming upload from chunk ${
//         uploadState.uploadedChunks.length + 1
//       }/${totalChunks}`
//     );
//     startChunk = uploadState.uploadedChunks.length;
//   } else {
//     uploadState = {
//       uploadId,
//       uploadedChunks: [],
//       etags: [],
//     };
//     saveUploadState(stateKey, uploadState);
//   }

//   onProgress?.({
//     phase: "uploading",
//     progress: Math.round((startChunk / totalChunks) * 100),
//     chunkIndex: startChunk,
//     totalChunks,
//     bytesUploaded: startChunk * CHUNK_SIZE,
//     totalBytes: file.size,
//   });

//   let finalResult: any = null;

//   // Upload chunks sequentially
//   for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
//     const start = chunkIndex * CHUNK_SIZE;
//     const end = Math.min(start + CHUNK_SIZE, file.size);
//     const chunk = file.slice(start, end);

//     console.log(
//       `Uploading chunk ${chunkIndex + 1}/${totalChunks} (${(
//         chunk.size /
//         1024 /
//         1024
//       ).toFixed(2)} MB)`
//     );

//     const { etag, result } = await uploadChunkWithRetry(
//       chunk,
//       chunkIndex,
//       totalChunks,
//       file.size,
//       uploadState.uploadId,
//       { ...uploadParams, uploadId: uploadState.uploadId }
//     );

//     // Update state
//     uploadState.uploadedChunks.push(chunkIndex);
//     if (etag) {
//       uploadState.etags.push({ partNumber: chunkIndex + 1, etag });
//     }
//     saveUploadState(stateKey, uploadState);

//     // Update progress
//     const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
//     onProgress?.({
//       phase: chunkIndex === totalChunks - 1 ? "finalizing" : "uploading",
//       progress,
//       chunkIndex: chunkIndex + 1,
//       totalChunks,
//       bytesUploaded: end,
//       totalBytes: file.size,
//     });

//     if (result) {
//       finalResult = result;
//     }
//   }

//   // Clear upload state on success
//   clearUploadState(stateKey);

//   if (!finalResult) {
//     throw new Error("Upload completed but no result received");
//   }

//   return finalResult;
// }

async function uploadToCloudinaryChunkedRobust(
  file: File,
  uploadParams: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
  },
  submissionId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<any> {
  const fileHash = await generateFileHash(file);
  const stateKey = getUploadStateKey(fileHash, submissionId);
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // Generate unique upload ID for Cloudinary
  const uniqueUploadId = `${uploadParams.publicId}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 10)}`;

  let uploadState = loadUploadState(stateKey);
  let startChunk = 0;

  if (uploadState && uploadState.uploadedChunks.length > 0) {
    console.log(
      `Resuming from chunk ${
        uploadState.uploadedChunks.length + 1
      }/${totalChunks}`
    );
    startChunk = uploadState.uploadedChunks.length;
  } else {
    uploadState = { uploadId: uniqueUploadId, uploadedChunks: [], etags: [] };
    saveUploadState(stateKey, uploadState);
  }

  onProgress?.({
    phase: "uploading",
    progress: Math.round((startChunk / totalChunks) * 100),
    chunkIndex: startChunk,
    totalChunks,
    bytesUploaded: startChunk * CHUNK_SIZE,
    totalBytes: file.size,
  });

  let finalResult: any = null;

  for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    console.log(
      `Uploading chunk ${chunkIndex + 1}/${totalChunks} (${(
        chunk.size /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );

    const { etag, result } = await uploadChunkWithRetry(
      chunk,
      chunkIndex,
      totalChunks,
      file.size,
      uploadState.uploadId,
      uploadParams
    );

    uploadState.uploadedChunks.push(chunkIndex);
    if (etag) uploadState.etags.push({ partNumber: chunkIndex + 1, etag });
    saveUploadState(stateKey, uploadState);

    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    onProgress?.({
      phase: chunkIndex === totalChunks - 1 ? "finalizing" : "uploading",
      progress,
      chunkIndex: chunkIndex + 1,
      totalChunks,
      bytesUploaded: end,
      totalBytes: file.size,
    });

    if (result) finalResult = result;
  }

  clearUploadState(stateKey);

  if (!finalResult) {
    throw new Error("Upload completed but no result received");
  }

  return finalResult;
}
// Wrapper function that handles both small and large files
async function uploadVideoRobust(
  file: File,
  submissionId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; video?: any; error?: string }> {
  const DIRECT_UPLOAD_THRESHOLD = 20 * 1024 * 1024; // 20MB

  onProgress?.({ phase: "preparing", progress: 0 });

  try {
    // For small files, upload directly through server using XHR
    if (file.size <= DIRECT_UPLOAD_THRESHOLD) {
      console.log(
        `Direct upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(
          2
        )} MB)`
      );

      return new Promise((resolve) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("submissionId", submissionId);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 95);
            onProgress?.({
              phase: "uploading",
              progress,
              bytesUploaded: event.loaded,
              totalBytes: event.total,
            });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                onProgress?.({ phase: "finalizing", progress: 100 });
                resolve({ success: true, video: response.video });
              } else if (response.useChunkedUpload) {
                // Server says use chunked - handle in catch block
                handleChunkedUpload(
                  file,
                  submissionId,
                  response.uploadParams,
                  onProgress
                )
                  .then(resolve)
                  .catch((err) =>
                    resolve({ success: false, error: err.message })
                  );
              } else {
                resolve({
                  success: false,
                  error: response.error || "Upload failed",
                });
              }
            } catch {
              resolve({ success: false, error: "Invalid server response" });
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              resolve({
                success: false,
                error: errorResponse.error || `HTTP ${xhr.status}`,
              });
            } catch {
              resolve({
                success: false,
                error: `Upload failed: ${xhr.status}`,
              });
            }
          }
        });

        xhr.addEventListener("error", () =>
          resolve({ success: false, error: "Network error" })
        );
        xhr.addEventListener("abort", () =>
          resolve({ success: false, error: "Upload cancelled" })
        );

        xhr.open("POST", "/api/v1/uploads/upload-video");
        xhr.send(formData);
      });
    }

    // For large files, get upload params and use chunked upload
    console.log(
      `Chunked upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(
        2
      )} MB)`
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("submissionId", submissionId);

    const initResponse = await fetch("/api/v1/uploads/upload-video", {
      method: "POST",
      body: formData,
    });

    const initData = await initResponse.json();

    if (initData.success) {
      onProgress?.({ phase: "finalizing", progress: 100 });
      return { success: true, video: initData.video };
    }

    if (!initData.useChunkedUpload || !initData.uploadParams) {
      return {
        success: false,
        error: "Server did not provide chunked upload params",
      };
    }

    return handleChunkedUpload(
      file,
      submissionId,
      initData.uploadParams,
      onProgress
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return { success: false, error: error.message };
  }
}

// Handle chunked upload with finalization
async function handleChunkedUpload(
  file: File,
  submissionId: string,
  uploadParams: any,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; video?: any; error?: string }> {
  try {
    // Perform chunked upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinaryChunkedRobust(
      file,
      uploadParams,
      submissionId,
      onProgress
    );

    onProgress?.({ phase: "finalizing", progress: 98 });

    // Finalize upload on server
    const finalizeResponse = await fetch("/api/v1/uploads/finalize-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId,
        uploadResult: cloudinaryResult,
        filename: file.name,
        fileSize: file.size,
      }),
    });

    if (!finalizeResponse.ok) {
      console.warn("Finalization failed, but upload succeeded to Cloudinary");
    }

    const finalizeData = await finalizeResponse.json().catch(() => ({}));
    onProgress?.({ phase: "finalizing", progress: 100 });

    return {
      success: true,
      video: finalizeData.video || {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        filename: file.name,
        size: file.size,
      },
    };
  } catch (error: any) {
    console.error("Chunked upload error:", error);
    return { success: false, error: error.message };
  }
}

// ============ END NEW UPLOAD SYSTEM ============

export default function ProcessFlowSection() {
  const [currentStep, setCurrentStep] = useState(1);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "paid" | "failed"
  >("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [buyerInfo, setBuyerInfo] = useState<{
    email: string;
    phone: string;
    name?: string;
  } | null>(null);
  const [recordingMode, setRecordingMode] = useState(false);

  // Form state
  const [customPrompt, setCustomPrompt] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // NEW: Flag to prevent multiple auto-restores
  const [hasAutoRestored, setHasAutoRestored] = useState(false);
  const [showStep1Modal, setShowStep1Modal] = useState(false);
  const [showStep2Modal, setShowStep2Modal] = useState(false);

  // Add this new useEffect to control modal visibility based on completedSteps
  useEffect(() => {
    const steps = completedSteps;
    setShowStep1Modal(steps.includes(1) && !steps.includes(2));
    setShowStep2Modal(steps.includes(2) && !steps.includes(3));
  }, [completedSteps]);

  // NEW: Auto-restore session on mount (behind the scenes)
  useEffect(() => {
    const existingSession = loadSession();
    if (
      existingSession &&
      existingSession.paymentStatus === "paid" &&
      !hasAutoRestored
    ) {
      // Auto-validate and restore silently
      autoRestoreSession(existingSession);
    } else {
      // No valid session: Proceed to Step 1 (or set flag if already checked)
      setHasAutoRestored(true);
    }
  }, []); // Empty deps: Runs once on mount

  const autoRestoreSession = async (session: SessionData) => {
    if (hasAutoRestored) return;
    setLoading(true);
    try {
      const response = await fetch("/api/v1/orders/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: session.orderId }),
      });

      const data = await response.json();

      if (data.success && data.session.paymentStatus === "paid") {
        let currentSteps = [...session.completedSteps];

        // Auto-add step 2 if videos exist but not marked (for consistency with localStorage)
        if (data.session.hasVideos && !currentSteps.includes(2)) {
          currentSteps = [...currentSteps, 2];
          updateSession({ completedSteps: currentSteps });
        }

        // Restore core state
        setOrderId(data.session.orderId);
        setSubmissionId(data.session.submissionId);
        setPaymentStatus(data.session.paymentStatus);
        setCompletedSteps(currentSteps);

        // Fetch fresh buyerInfo and form data
        if (data.session.buyer) {
          setBuyerInfo(data.session.buyer);
          setName(data.session.buyer.name || "");
          setEmail(data.session.buyer.email || "");
          setPhone(data.session.buyer.phone || "");
        }

        // Fetch customPrompt if relevant (e.g., Step 3)
        if (currentSteps.includes(2) && data.session.customPrompt) {
          setCustomPrompt(data.session.customPrompt);
        }

        // Auto-set currentStep to the max completed step (triggers modals via useEffect)
        const maxCompleted = Math.max(...currentSteps, 0);
        const targetStep = maxCompleted === 0 ? 1 : maxCompleted;
        setCurrentStep(targetStep);

        // Save refreshed optimized session
        saveSession({
          orderId: data.session.orderId,
          submissionId: data.session.submissionId,
          paymentStatus: data.session.paymentStatus,
          completedSteps: currentSteps,
          timestamp: Date.now(),
        });

        // Scroll to section
        setTimeout(() => {
          sectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 300);
      } else {
        clearSession();
      }
    } catch (err) {
      console.error("Auto-restore error:", err);
      clearSession();
    } finally {
      setLoading(false);
      setHasAutoRestored(true);
    }
  };

  // NEW: Save session whenever critical state changes (optimized: no buyerInfo)
  useEffect(() => {
    if (orderId && paymentStatus === "paid") {
      saveSession({
        orderId,
        submissionId,
        paymentStatus,
        completedSteps,
        timestamp: Date.now(),
      });
    }
  }, [orderId, submissionId, paymentStatus, completedSteps]);

  // Check for session_id in URL (return from Stripe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (sessionId && !orderId) {
      checkPaymentStatus(sessionId);
    }
  }, []);

  // Scroll to section when step changes after payment
  useEffect(() => {
    if (currentStep === 2 && paymentStatus === "paid" && sectionRef.current) {
      const url = new URL(window.location.href);
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());

      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [currentStep, paymentStatus]);

  // Auto-scroll when step 3 is completed
  useEffect(() => {
    if (completedSteps.includes(3) && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 500);
    }
  }, [completedSteps]);

  const checkPaymentStatus = async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/orders/confirm?session_id=${sessionId}`
      );
      const data = await response.json();

      if (data.orderId) {
        setOrderId(data.orderId);
        setPaymentStatus(data.paymentStatus);
        if (data.buyer) {
          setBuyerInfo(data.buyer);
        }

        if (data.paymentStatus === "paid") {
          const newCompletedSteps = [1];
          setCompletedSteps(newCompletedSteps);

          // NEW: Save optimized session
          saveSession({
            orderId: data.orderId,
            submissionId: null,
            paymentStatus: data.paymentStatus,
            completedSteps: newCompletedSteps,
            timestamp: Date.now(),
          });

          setTimeout(() => {
            sectionRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 300);
        } else {
          setTimeout(() => checkPaymentStatus(sessionId), 2000);
        }
      }
    } catch (err) {
      console.error("Payment check error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (packageId: string, amount: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          amount,
          currency: "usd",
          buyer: {
            email: buyerInfo?.email || "customer@example.com",
            phone: buyerInfo?.phone || "+1234567890",
          },
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        const errorMessage = data.error || "Failed to create checkout session";
        setError(errorMessage);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  // New: uploadAndProceed for in-modal upload after recording
  const uploadAndProceed = useCallback(
    async (
      file: File,
      onProgress?: (progress: number) => void
    ): Promise<string> => {
      if (!orderId) {
        throw new Error("Order not found. Please complete payment first.");
      }

      setLoading(true);
      setError(null);
      setUploadProgress(0);

      try {
        let currentSubmissionId = submissionId;
        if (!currentSubmissionId) {
          const buyerEmail = buyerInfo?.email || "customer@example.com";
          const buyerPhone = buyerInfo?.phone || "+1234567890";
          const buyerName = buyerInfo?.name || "User";

          const submissionResponse = await fetch(
            `/api/v1/orders/${orderId}/submission`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scriptText: RECORDING_SCRIPT,
                greenScreen: false,
                email: buyerEmail,
                phone: buyerPhone,
                name: buyerName,
              }),
            }
          );

          const submissionData = await submissionResponse.json();
          if (submissionData.submissionId) {
            currentSubmissionId = submissionData.submissionId;
            setSubmissionId(currentSubmissionId);
          } else {
            throw new Error(
              submissionData.error || "Failed to create submission"
            );
          }
        }

        console.log(
          `Uploading: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
        );

        const uploadResult = await uploadVideoRobust(
          file,
          currentSubmissionId!,
          (progress) => {
            setUploadProgress(progress.progress);
            // Call the callback to update VideoRecorder's progress
            onProgress?.(progress.progress);
            console.log(`Upload: ${progress.phase} - ${progress.progress}%`);
          }
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Upload failed");
        }

        console.log(`✓ Uploaded: ${file.name}`);
        setUploadProgress(100);
        onProgress?.(100);
        return currentSubmissionId || "";
      } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || "Failed to upload video");
        throw err;
      } finally {
        setLoading(false);
        setUploadProgress(0);
      }
    },
    [orderId, submissionId, buyerInfo]
  );

  // New: onProceed after successful upload in recorder
  const handleProceed = useCallback(
    (newSubmissionId: string) => {
      setSubmissionId(newSubmissionId);
      setUploadedFiles((prev) => [...prev, "recorded-video.webm"]); // Dummy for auto-advance
      setFiles([]);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
      setCompletedSteps((prev) => {
        if (!prev.includes(2)) {
          return [...prev, 2];
        }
        return prev;
      });
      setRecordingMode(false);
    },
    [videoPreview]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) => {
      const ext = file.name.toLowerCase().match(/\.[^.]+$/);
      const allowedTypes = [".mp4", ".mov", ".webm"];
      if (!ext || !allowedTypes.includes(ext[0])) {
        alert(
          `Invalid file type: ${file.name}. Only .mp4, .mov, and .webm are allowed.`
        );
        return false;
      }
      if (file.size > 80 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 80MB.`);
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      const previewUrl = URL.createObjectURL(validFiles[0]);
      setVideoPreview(previewUrl);
    }
  };

  // Updated: handleRecordingComplete now just closes modal (upload handled in recorder)
  const handleRecordingComplete = (file: File) => {
    // No-op: upload happens in recorder via uploadAndProceed
    setRecordingMode(false);
  };

  const handleUpload = async (): Promise<string | undefined> => {
    if (files.length === 0) {
      setError("Please select at least one file");
      return undefined;
    }

    if (!orderId) {
      setError("Order not found. Please complete payment first.");
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Create submission if it doesn't exist
      let currentSubmissionId = submissionId;
      if (!currentSubmissionId) {
        const buyerEmail = buyerInfo?.email || "customer@example.com";
        const buyerPhone = buyerInfo?.phone || "+1234567890";
        const buyerName = buyerInfo?.name || "User";

        const submissionResponse = await fetch(
          `/api/v1/orders/${orderId}/submission`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scriptText: RECORDING_SCRIPT,
              greenScreen: false,
              email: buyerEmail,
              phone: buyerPhone,
              name: buyerName,
            }),
          }
        );

        const submissionData = await submissionResponse.json();
        if (submissionData.submissionId) {
          currentSubmissionId = submissionData.submissionId;
          setSubmissionId(currentSubmissionId);
        } else {
          throw new Error(
            submissionData.error || "Failed to create submission"
          );
        }
      }

      const uploadErrors: string[] = [];
      const successfulUploads: string[] = [];

      console.log(`Starting upload of ${files.length} file(s)...`);

      // Upload each file using robust upload
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        try {
          console.log(
            `Uploading file ${fileIndex + 1}/${files.length}: ${file.name} (${(
              file.size /
              1024 /
              1024
            ).toFixed(2)} MB)`
          );

          const uploadResult = await uploadVideoRobust(
            file,
            currentSubmissionId!,
            (progress) => {
              // Calculate progress across all files
              const fileProgress = progress.progress;
              const overallProgress = Math.round(
                (fileIndex * 100 + fileProgress) / files.length
              );
              setUploadProgress(overallProgress);

              if (progress.chunkIndex && progress.totalChunks) {
                console.log(
                  `File ${fileIndex + 1}/${files.length} - Chunk ${
                    progress.chunkIndex
                  }/${progress.totalChunks} (${progress.phase})`
                );
              }
            }
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || "Upload failed");
          }

          console.log(`✓ Successfully uploaded: ${file.name}`);
          successfulUploads.push(file.name);
        } catch (fileError: any) {
          console.error(`Error uploading ${file.name}:`, fileError);
          uploadErrors.push(`${file.name}: ${fileError.message}`);
        }
      }

      if (successfulUploads.length === 0) {
        throw new Error(
          uploadErrors.length > 0
            ? `All uploads failed:\n${uploadErrors.join("\n")}`
            : "No files were successfully uploaded"
        );
      }

      if (uploadErrors.length > 0) {
        setError(`Some files failed:\n${uploadErrors.join("\n")}`);
      }

      setUploadedFiles((prev) => [...prev, ...successfulUploads]);
      setFiles([]);
      setUploadProgress(100);

      setCompletedSteps((prev) => {
        if (!prev.includes(2)) {
          const newSteps = [...prev, 2];
          // NEW: Save session after marking Step 2 complete
          updateSession({ completedSteps: newSteps });
          return newSteps;
        }
        return prev;
      });

      console.log(
        `Upload complete: ${successfulUploads.length} successful, ${uploadErrors.length} failed`
      );

      return currentSubmissionId || undefined;
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload files");
      throw err;
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveCustomPrompt = async () => {
    if (!submissionId || !customPrompt.trim()) {
      return false;
    }

    try {
      const response = await fetch(
        `/api/v1/submissions/${submissionId}/custom-prompt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customPrompt }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save custom prompt");
      }

      return true;
    } catch (err) {
      console.error("Failed to save custom prompt:", err);
      return false;
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (index === 0 && videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(
          newFiles.length > 0 ? URL.createObjectURL(newFiles[0]) : null
        );
      }
      return newFiles;
    });
  };

  const handleRefresh = () => {
    setCurrentStep(1);
    setOrderId(null);
    setSubmissionId(null);
    setPaymentStatus("pending");
    setLoading(false);
    setError(null);
    setCompletedSteps([]);
    setBuyerInfo(null);
    setCustomPrompt("");
    setName("");
    setEmail("");
    setPhone("");
    setHasAutoRestored(false);
    setFiles([]);
    setUploadedFiles([]);
    clearSession();
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.toString());
  };

  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  // Handle hash routing to scroll to process flow section
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#process-flow" || hash === "#the-process") {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, []);

  return (
    <>
      <section
        ref={sectionRef}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-black"
        id="process-flow"
      >
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl mb-16 text-center unbounded"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="text-white unbounded">The </span>
            <span className="text-[#C89356] unbounded">Process</span>
          </motion.h2>

          {/* Desktop Stepper - Horizontal */}
          <div className="hidden md:flex flex-row items-center justify-center mb-12 gap-0">
            {[1, 2, 3].map((step) => {
              const isCompleted = completedSteps.includes(step);
              const isCurrent = currentStep === step;

              return (
                <React.Fragment key={step}>
                  <div className="flex items-center justify-center flex-shrink-0">
                    <div className="flex flex-col items-center relative">
                      <motion.div
                        className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl cursor-default transition-all whitespace-nowrap ${
                          isCompleted || isCurrent ? "" : "opacity-60"
                        }`}
                        style={{
                          background:
                            "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                          color: "#111827",
                          boxShadow:
                            isCompleted || isCurrent
                              ? "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)"
                              : "0 0 10px rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.1), 0 10px 20px rgba(227,129,38,0.1), inset 0 3px 9px rgba(255,255,255,0.05)",
                        }}
                      >
                        {isCompleted ? (
                          <Check size={32} className="text-green-600" />
                        ) : (
                          step
                        )}
                      </motion.div>
                      {isCurrent && !completedSteps.includes(3) && (
                        <motion.div
                          className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center text-3xl"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <span className="text-xs text-white font-medium mb-1">
                            Click here
                          </span>
                          <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            style={{
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                            }}
                          >
                            👇
                          </motion.div>
                        </motion.div>
                      )}
                      <div className="mt-2 text-base font-medium text-white text-center">
                        {step === 1 && "STEP 1"}
                        {step === 2 && "STEP 2"}
                        {step === 3 && "STEP 3"}
                      </div>
                      <div className="mt-1 text-sm font-medium text-white text-center">
                        {step === 1 && "Purchase Your AI Clone"}
                        {step === 2 && (
                          <>
                            Upload your raw video by following
                            <br />
                            the script/template
                          </>
                        )}
                        {step === 3 && "Get your AI Clone"}
                      </div>
                    </div>
                  </div>
                  {step < 3 && (
                    <div className="hidden md:flex items-center w-[120px] flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                      <div
                        className={`h-0.5 flex-1 transition-colors ${
                          completedSteps.includes(step)
                            ? "bg-green-500"
                            : "bg-white"
                        }`}
                      />
                      <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Mobile: Sequential Vertical Flow */}
          <div className="md:hidden space-y-8 mb-12">
            {/* Error Message for Mobile */}
            {error && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}
            {[1, 2, 3].map((step) => {
              const isCurrent = currentStep === step;
              const isCompleted = completedSteps.includes(step);
              const shouldShow =
                step === 1 ||
                completedSteps.includes(step - 1) ||
                (step === 2 && paymentStatus === "paid") ||
                (step === 3 && completedSteps.includes(2));

              return (
                <div key={step} className="space-y-4">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl cursor-default transition-all ${
                        isCompleted || isCurrent ? "" : "opacity-60"
                      }`}
                      style={{
                        background:
                          "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                        color: "#111827",
                        boxShadow:
                          isCompleted || isCurrent
                            ? "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)"
                            : "0 0 10px rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.1), 0 10px 20px rgba(227,129,38,0.1), inset 0 3px 9px rgba(255,255,255,0.05)",
                      }}
                    >
                      {isCompleted ? (
                        <Check size={32} className="text-green-600" />
                      ) : (
                        step
                      )}
                    </motion.div>
                    <div className="mt-2 text-base font-medium text-white text-center">
                      {step === 1 && "STEP 1"}
                      {step === 2 && "STEP 2"}
                      {step === 3 && "STEP 3"}
                    </div>
                    <div className="mt-1 text-sm font-medium text-white text-center">
                      {step === 1 && "Purchase Your AI Clone"}
                      {step === 2 && (
                        <>
                          Upload your raw video by following
                          <br />
                          the script/template
                        </>
                      )}
                      {step === 3 && "Get your AI Clone"}
                    </div>
                  </div>

                  {/* Connecting Line */}
                  {step < 3 && (
                    <div
                      className={`w-0.5 h-8 mx-auto transition-colors ${
                        completedSteps.includes(step)
                          ? "bg-green-500"
                          : "bg-white/30"
                      }`}
                    />
                  )}

                  {/* Step Component - Show if step is accessible */}
                  {shouldShow && isCurrent && (
                    <div className="w-full">
                      {/* Step 1: Purchase */}
                      {step === 1 && (
                        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#C89356]">
                          <div className="text-center mb-6">
                            <CreditCard
                              className="mx-auto mb-3 text-[#C89356]"
                              size={32}
                            />
                            <h3 className="text-xl font-bold text-white mb-2">
                              STEP 1 – Purchase Your AI Clone
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {PACKAGES.map((pkg) => (
                              <div
                                key={pkg.id}
                                className="border-2 border-[#C89356] rounded-lg p-4"
                              >
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-lg font-bold text-white">
                                    {pkg.name}
                                  </h4>
                                  <span className="text-xl font-bold text-[#C89356]">
                                    ${pkg.amount}
                                  </span>
                                </div>
                                <motion.button
                                  onClick={() =>
                                    handleCheckout(pkg.id, pkg.amount)
                                  }
                                  disabled={loading}
                                  className="w-full py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                                  style={{
                                    background: loading
                                      ? "#C89356"
                                      : "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                                    color: "#111827",
                                    boxShadow: loading
                                      ? "none"
                                      : "0 0 10px rgba(255,255,255,0.2), 0 0 20px rgba(255,255,255,0.1), 0 10px 20px rgba(227,129,38,0.1), inset 0 3px 9px rgba(255,255,255,0.05)",
                                  }}
                                  whileHover={
                                    !loading
                                      ? {
                                          scale: 1.02,
                                          boxShadow:
                                            "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 10px 20px rgba(227,129,38,0.18), inset 0 4px 12px rgba(255,255,255,0.06)",
                                        }
                                      : {}
                                  }
                                  whileTap={!loading ? { scale: 0.98 } : {}}
                                >
                                  {loading ? (
                                    <span className="flex items-center justify-center gap-2 text-white text-sm">
                                      <Loader2
                                        className="animate-spin"
                                        size={16}
                                      />
                                      Processing...
                                    </span>
                                  ) : (
                                    "Pay & Unlock"
                                  )}
                                </motion.button>
                              </div>
                            ))}
                          </div>

                          {paymentStatus === "pending" && orderId && (
                            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg text-center">
                              <p className="text-yellow-200 text-sm">
                                Waiting for payment confirmation...
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 2: Record & Upload Video */}
                      {step === 2 && (
                        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#C89356]">
                          <div className="text-center mb-6">
                            <Upload
                              className="mx-auto mb-3 text-[#C89356]"
                              size={32}
                            />
                            <h3 className="text-xl font-bold text-white mb-2">
                              STEP 2 – Upload Video
                            </h3>
                            <p className="text-white text-sm">
                              Payment confirmed – please record yourself
                              following the script below and upload your video
                            </p>
                          </div>

                          <div className="space-y-4">
                            {/* Record Button - Show only when not recording and no video preview */}
                            {!recordingMode && !videoPreview && (
                              <div className="text-center">
                                <motion.button
                                  onClick={() => setRecordingMode(true)}
                                  className="mb-3 px-6 py-2 rounded-lg font-semibold flex items-center gap-2 mx-auto text-sm"
                                  style={{
                                    background:
                                      "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                                    color: "#111827",
                                    boxShadow:
                                      "0 0 10px rgba(255,255,255,0.2), 0 0 20px rgba(255,255,255,0.1), 0 10px 20px rgba(227,129,38,0.1), inset 0 3px 9px rgba(255,255,255,0.05)",
                                  }}
                                  whileHover={{
                                    scale: 1.05,
                                    boxShadow:
                                      "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 10px 20px rgba(227,129,38,0.18), inset 0 4px 12px rgba(255,255,255,0.06)",
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Video size={16} />
                                  Record Your Video
                                </motion.button>
                              </div>
                            )}

                            {/* Script Section - COMES AFTER RECORD BUTTON */}
                            <div className="bg-[#2a2a2a] border border-[#C89356] rounded-lg p-4">
                              <label className="block text-xs font-semibold text-white mb-2">
                                Please record yourself following this script:
                              </label>
                              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#92400E]">
                                <p className="text-white whitespace-pre-line leading-relaxed text-sm">
                                  Hi! I’m feeling good today. The lighting is
                                  nice and I’m speaking clearly. I’m relaxed and
                                  smiling while recording. I’ll talk naturally
                                  and move my hands a bit as I speak.
                                </p>
                              </div>
                              <p className="mt-2 text-xs text-white">
                                Record in a quiet room. Keep camera at eye
                                level. Speak clearly and naturally.
                              </p>
                            </div>

                            <p className="text-white text-xs mb-2 text-center">
                              OR
                            </p>
                            {/* Show either VideoRecorder or Upload Zone */}
                            {recordingMode ? (
                              <VideoRecorder
                                onRecordingComplete={handleRecordingComplete}
                                onCancel={() => setRecordingMode(false)}
                                uploadAndProceed={uploadAndProceed}
                                onProceed={handleProceed}
                                script={RECORDING_SCRIPT}
                                shouldRequestFullscreen
                              />
                            ) : (
                              <div>
                                <label className="block text-xs font-semibold text-white mb-2">
                                  Upload Your Recording{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <div className="border-2 border-dashed border-[#C89356] rounded-lg overflow-hidden relative">
                                  {videoPreview ? (
                                    <div className="relative">
                                      <video
                                        src={videoPreview}
                                        controls
                                        className="w-full h-auto max-h-[300px] object-contain"
                                      />
                                      <button
                                        onClick={() => {
                                          if (videoPreview)
                                            URL.revokeObjectURL(videoPreview);
                                          setVideoPreview(null);
                                          setFiles([]);
                                        }}
                                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors text-xs"
                                        title="Remove video"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="p-6 text-center hover:border-[#C89356] transition-colors">
                                      <input
                                        type="file"
                                        accept=".mp4,.mov,.webm"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="file-upload-step2"
                                      />
                                      <label
                                        htmlFor="file-upload-step2"
                                        className="cursor-pointer flex flex-col items-center gap-1"
                                      >
                                        <Upload
                                          size={24}
                                          className="text-white"
                                        />
                                        <span className="text-white text-sm">
                                          Drag & drop or click to select
                                        </span>
                                        <span className="text-xs text-white/70">
                                          Max 80MB per file (.mp4, .mov, or
                                          .webm)
                                        </span>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {files.length > 0 &&
                              uploadedFiles.length === 0 &&
                              !recordingMode && (
                                <motion.button
                                  onClick={async () => {
                                    try {
                                      await handleUpload();
                                    } catch (err: any) {
                                      // Error handled in handleUpload
                                    }
                                  }}
                                  disabled={loading}
                                  className="w-full py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                                  style={{
                                    background: loading
                                      ? "#C89356"
                                      : "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                                    color: "#111827",
                                    boxShadow: loading
                                      ? "none"
                                      : "0 0 10px rgba(255,255,255,0.2), 0 0 20px rgba(255,255,255,0.1), 0 10px 20px rgba(227,129,38,0.1), inset 0 3px 9px rgba(255,255,255,0.05)",
                                  }}
                                  whileHover={
                                    !loading
                                      ? {
                                          scale: 1.02,
                                          boxShadow:
                                            "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 10px 20px rgba(227,129,38,0.18), inset 0 4px 12px rgba(255,255,255,0.06)",
                                        }
                                      : {}
                                  }
                                  whileTap={!loading ? { scale: 0.98 } : {}}
                                >
                                  {loading ? (
                                    <span className="flex items-center justify-center gap-2 text-white text-sm">
                                      <Loader2
                                        className="animate-spin"
                                        size={16}
                                      />
                                      Uploading...
                                    </span>
                                  ) : (
                                    "Proceed to Step 2"
                                  )}
                                </motion.button>
                              )}

                            {uploadedFiles.length > 0 && (
                              <div className="p-3 bg-green-900/50 border border-green-600 rounded-lg">
                                <p className="text-green-200 font-semibold mb-1 text-sm">
                                  ✓ Video uploaded successfully!
                                </p>
                                <p className="text-green-300 text-xs">
                                  Proceeding to the next step...
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step 3: Contact Information */}
                      {step === 3 && (
                        <div
                          data-step="3"
                          className="bg-[#1a1a1a] rounded-xl p-6 border border-[#C89356]"
                        >
                          <div className="text-center mb-6">
                            <User
                              className="mx-auto mb-3 text-[#C89356]"
                              size={32}
                            />
                            <h3 className="text-xl font-bold text-white mb-2">
                              STEP 3 – Contact Information
                            </h3>
                            <p className="text-white text-sm">
                              Please provide your contact information and script
                              description to complete the process
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-white mb-1">
                                Full Name{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={completedSteps.includes(3)}
                                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 text-sm"
                                placeholder="Enter your full name"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-white mb-1">
                                Email Address{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={completedSteps.includes(3)}
                                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 text-sm"
                                placeholder="your.email@example.com"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-white mb-1">
                                Phone Number{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={completedSteps.includes(3)}
                                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 text-sm"
                                placeholder="+1234567890"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-white mb-1">
                                Script/Prompt Description for Your AI Avatar{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={customPrompt}
                                onChange={(e) =>
                                  setCustomPrompt(e.target.value)
                                }
                                disabled={completedSteps.includes(3)}
                                rows={4}
                                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] resize-none disabled:opacity-50 text-sm"
                                placeholder="Write the script or prompt description you want your AI avatar to say. For example: 'Hello! Welcome to our real estate services. I'm here to help you find your dream home...'"
                              />
                              <p className="mt-1 text-xs text-white">
                                This description will be used to generate your
                                AI avatar&apos;s speech. Be clear and specific.
                              </p>
                            </div>

                            <motion.button
                              onClick={async () => {
                                if (
                                  !name.trim() ||
                                  !email.trim() ||
                                  !phone.trim()
                                ) {
                                  setError(
                                    "Please fill in all contact information fields"
                                  );
                                  return;
                                }

                                if (!customPrompt.trim()) {
                                  setError(
                                    "Please write a script description for your AI avatar"
                                  );
                                  return;
                                }

                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (!emailRegex.test(email)) {
                                  setError(
                                    "Please enter a valid email address"
                                  );
                                  return;
                                }

                                setLoading(true);
                                setError(null);

                                try {
                                  const currentSubmissionId = submissionId;

                                  if (!currentSubmissionId) {
                                    throw new Error(
                                      "Submission not found. Please go back and upload your video first."
                                    );
                                  }

                                  const promptResponse = await fetch(
                                    `/api/v1/submissions/${currentSubmissionId}/custom-prompt`,
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        customPrompt: customPrompt.trim(),
                                      }),
                                    }
                                  );

                                  if (!promptResponse.ok) {
                                    throw new Error(
                                      "Failed to save script description"
                                    );
                                  }

                                  if (orderId) {
                                    const response = await fetch(
                                      `/api/v1/orders/${orderId}`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          buyer: {
                                            name: name.trim(),
                                            email: email.trim(),
                                            phone: phone.trim(),
                                          },
                                        }),
                                      }
                                    );

                                    if (!response.ok) {
                                      const errorData = await response
                                        .json()
                                        .catch(() => ({
                                          error:
                                            "Failed to save contact information",
                                        }));
                                      throw new Error(
                                        errorData.error ||
                                          "Failed to save contact information"
                                      );
                                    }
                                  }

                                  setCompletedSteps([1, 2, 3]);
                                  saveSession({
                                    orderId,
                                    submissionId,
                                    paymentStatus,
                                    completedSteps: [1, 2, 3],
                                    timestamp: Date.now(),
                                  });
                                  setError(null);
                                  setTimeout(() => {
                                    sectionRef.current?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "start",
                                    });
                                  }, 500);
                                } catch (err: any) {
                                  setError(
                                    err.message ||
                                      "Failed to save. Please try again."
                                  );
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={
                                loading ||
                                !name.trim() ||
                                !email.trim() ||
                                !phone.trim() ||
                                !customPrompt.trim() ||
                                completedSteps.includes(3)
                              }
                              className="w-full py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                background: loading
                                  ? "#C89356"
                                  : "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                                color: "#111827",
                                boxShadow: loading
                                  ? "none"
                                  : "0 0 10px rgba(255,255,255,0.2), 0 0 20px rgba(255,255,255,0.1), 0 10px 20px rgba(227,129,38,0.1), inset 0 3px 9px rgba(255,255,255,0.05)",
                              }}
                              whileHover={
                                !loading && !completedSteps.includes(3)
                                  ? {
                                      scale: 1.02,
                                      boxShadow:
                                        "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 10px 20px rgba(227,129,38,0.18), inset 0 4px 12px rgba(255,255,255,0.06)",
                                    }
                                  : {}
                              }
                              whileTap={
                                !loading && !completedSteps.includes(3)
                                  ? { scale: 0.98 }
                                  : {}
                              }
                            >
                              {loading ? (
                                <span className="flex items-center justify-center gap-2 text-white text-sm">
                                  <Loader2 className="animate-spin" size={16} />
                                  Saving...
                                </span>
                              ) : (
                                "Complete & Submit"
                              )}
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Message - Visible on both mobile and desktop */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm md:text-base">
              {error}
            </div>
          )}

          {/* Desktop: Step Components (AnimatePresence) - Hidden on mobile */}
          <div className="hidden md:block">
            <AnimatePresence mode="wait">
              {/* Step 1: Purchase */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-[#1a1a1a] rounded-xl p-8 border border-[#C89356]"
                >
                  <div className="text-center mb-8">
                    <CreditCard
                      className="mx-auto mb-4 text-[#C89356]"
                      size={48}
                    />
                    <h3 className="text-2xl font-bold text-white mb-4">
                      STEP 1 – Purchase Your AI Clone
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {PACKAGES.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="border-2 border-[#C89356] rounded-lg p-6 hover:border-[#C89356] transition-colors"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-xl font-bold text-white">
                            {pkg.name}
                          </h4>
                          <span className="text-2xl font-bold text-[#C89356]">
                            ${pkg.amount}
                          </span>
                        </div>
                        <motion.button
                          onClick={() => handleCheckout(pkg.id, pkg.amount)}
                          disabled={loading}
                          className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: loading
                              ? "#C89356"
                              : "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                            color: "#111827",
                            boxShadow: loading
                              ? "none"
                              : "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                          }}
                          whileHover={
                            !loading
                              ? {
                                  scale: 1.02,
                                  boxShadow:
                                    "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                                }
                              : {}
                          }
                          whileTap={!loading ? { scale: 0.98 } : {}}
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2 text-white">
                              <Loader2 className="animate-spin" size={20} />
                              Processing...
                            </span>
                          ) : (
                            "Pay & Unlock"
                          )}
                        </motion.button>
                      </div>
                    ))}
                  </div>

                  {paymentStatus === "pending" && orderId && (
                    <div className="mt-6 p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg text-center">
                      <p className="text-yellow-200">
                        Waiting for payment confirmation...
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 2: Record & Upload Video */}
              {(currentStep === 2 ||
                (paymentStatus === "paid" && !completedSteps.includes(2))) && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-[#1a1a1a] rounded-xl p-8 border border-[#C89356]"
                >
                  <div className="text-center mb-8">
                    <Upload className="mx-auto mb-4 text-[#C89356]" size={48} />
                    <h3 className="text-2xl font-bold text-white mb-4">
                      STEP 2 – Upload Video
                    </h3>
                    <p className="text-white">
                      Payment confirmed – please record yourself following the
                      script below and upload your video
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Record Button - Show only when not recording and no video preview */}
                    {!recordingMode && !videoPreview && (
                      <div className="text-center">
                        <motion.button
                          onClick={() => setRecordingMode(true)}
                          className="mb-4 px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
                          style={{
                            background:
                              "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                            color: "#111827",
                            boxShadow:
                              "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                          }}
                          whileHover={{
                            scale: 1.05,
                            boxShadow:
                              "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Video size={20} />
                          Record Your Video
                        </motion.button>
                      </div>
                    )}

                    {/* Script Section - COMES AFTER RECORD BUTTON */}
                    <div className="bg-[#2a2a2a] border border-[#C89356] rounded-lg p-6">
                      <label className="block text-sm font-semibold text-white mb-3">
                        Please record yourself following this script:
                      </label>
                      <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#92400E]">
                        <p className="text-white whitespace-pre-line leading-relaxed text-base">
                          Hi! I’m feeling good today. The lighting is nice and
                          I’m speaking clearly. I’m relaxed and smiling while
                          recording. I’ll talk naturally and move my hands a bit
                          as I speak.
                        </p>
                      </div>
                      <p className="mt-3 text-sm text-white">
                        Record in a quiet room. Keep camera at eye level. Speak
                        clearly and naturally.
                      </p>
                    </div>

                    <p className="text-white text-sm mb-3 text-center">OR</p>
                    {/* Show either VideoRecorder or Upload Zone */}
                    {recordingMode ? (
                      <VideoRecorder
                        onRecordingComplete={handleRecordingComplete}
                        onCancel={() => setRecordingMode(false)}
                        uploadAndProceed={uploadAndProceed}
                        onProceed={handleProceed}
                        script={RECORDING_SCRIPT}
                      />
                    ) : (
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          Upload Your Recording{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="border-2 border-dashed border-[#C89356] rounded-lg overflow-hidden relative">
                          {videoPreview ? (
                            <div className="relative">
                              <video
                                src={videoPreview}
                                controls
                                className="w-full h-auto max-h-[400px] object-contain"
                              />
                              <button
                                onClick={() => {
                                  if (videoPreview)
                                    URL.revokeObjectURL(videoPreview);
                                  setVideoPreview(null);
                                  setFiles([]);
                                }}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                                title="Remove video"
                              >
                                <X size={20} />
                              </button>
                            </div>
                          ) : (
                            <div className="p-8 text-center hover:border-[#C89356] transition-colors">
                              <input
                                type="file"
                                accept=".mp4,.mov,.webm"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload-step2"
                              />
                              <label
                                htmlFor="file-upload-step2"
                                className="cursor-pointer flex flex-col items-center gap-2"
                              >
                                <Upload size={32} className="text-white" />
                                <span className="text-white">
                                  Drag & drop or click to select
                                </span>
                                <span className="text-sm text-white">
                                  Max 80MB per file (.mp4, .mov, or .webm)
                                </span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {uploadedFiles.length > 0 && (
                      <div className="p-4 bg-green-900/50 border border-green-600 rounded-lg">
                        <p className="text-green-200 font-semibold mb-2">
                          ✓ Video uploaded successfully!
                        </p>
                        <p className="text-green-300 text-sm">
                          Proceeding to the next step...
                        </p>
                      </div>
                    )}

                    {files.length > 0 &&
                      uploadedFiles.length === 0 &&
                      !recordingMode && (
                        <motion.button
                          onClick={async () => {
                            try {
                              await handleUpload();
                            } catch (err: any) {
                              // Error handled in handleUpload
                            }
                          }}
                          disabled={loading}
                          className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: loading
                              ? "#C89356"
                              : "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                            color: "#111827",
                            boxShadow: loading
                              ? "none"
                              : "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                          }}
                          whileHover={
                            !loading
                              ? {
                                  scale: 1.02,
                                  boxShadow:
                                    "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                                }
                              : {}
                          }
                          whileTap={!loading ? { scale: 0.98 } : {}}
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2 text-white">
                              <Loader2 className="animate-spin" size={20} />
                              Uploading...
                            </span>
                          ) : (
                            "Upload & Proceed to Final Step"
                          )}
                        </motion.button>
                      )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact Information */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  data-step="3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-[#1a1a1a] rounded-xl p-8 border border-[#C89356]"
                >
                  <div className="text-center mb-8">
                    <User className="mx-auto mb-4 text-[#C89356]" size={48} />
                    <h3 className="text-2xl font-bold text-white mb-4">
                      STEP 3 – Contact Information
                    </h3>
                    <p className="text-white">
                      Please provide your contact information and script
                      description to complete the process
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={completedSteps.includes(3)}
                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={completedSteps.includes(3)}
                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={completedSteps.includes(3)}
                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="+1234567890"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Script/Prompt Description for Your AI Avatar{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        disabled={completedSteps.includes(3)}
                        rows={6}
                        className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Write the script or prompt description you want your AI avatar to say. For example: 'Hello! Welcome to our real estate services. I'm here to help you find your dream home...'"
                      />
                      <p className="mt-2 text-sm text-white">
                        This description will be used to generate your AI
                        avatar&apos;s speech. Be clear and specific.
                      </p>
                    </div>

                    <motion.button
                      onClick={async () => {
                        if (!name.trim() || !email.trim() || !phone.trim()) {
                          setError(
                            "Please fill in all contact information fields"
                          );
                          return;
                        }

                        if (!customPrompt.trim()) {
                          setError(
                            "Please write a script description for your AI avatar"
                          );
                          return;
                        }

                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(email)) {
                          setError("Please enter a valid email address");
                          return;
                        }

                        setLoading(true);
                        setError(null);

                        try {
                          const currentSubmissionId = submissionId;

                          if (!currentSubmissionId) {
                            throw new Error(
                              "Submission not found. Please go back and upload your video first."
                            );
                          }

                          const promptResponse = await fetch(
                            `/api/v1/submissions/${currentSubmissionId}/custom-prompt`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                customPrompt: customPrompt.trim(),
                              }),
                            }
                          );

                          if (!promptResponse.ok) {
                            throw new Error(
                              "Failed to save script description"
                            );
                          }

                          if (orderId) {
                            const response = await fetch(
                              `/api/v1/orders/${orderId}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  buyer: {
                                    name: name.trim(),
                                    email: email.trim(),
                                    phone: phone.trim(),
                                  },
                                }),
                              }
                            );

                            if (!response.ok) {
                              const errorData = await response
                                .json()
                                .catch(() => ({
                                  error: "Failed to save contact information",
                                }));
                              throw new Error(
                                errorData.error ||
                                  "Failed to save contact information"
                              );
                            }
                          }

                          setCompletedSteps([1, 2, 3]);
                          saveSession({
                            orderId,
                            submissionId,
                            paymentStatus,
                            completedSteps: [1, 2, 3],
                            timestamp: Date.now(),
                          });
                          setError(null);
                          setTimeout(() => {
                            sectionRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 500);
                        } catch (err: any) {
                          setError(
                            err.message || "Failed to save. Please try again."
                          );
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={
                        loading ||
                        !name.trim() ||
                        !email.trim() ||
                        !phone.trim() ||
                        !customPrompt.trim() ||
                        completedSteps.includes(3)
                      }
                      className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: loading
                          ? "#C89356"
                          : "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                        color: "#111827",
                        boxShadow: loading
                          ? "none"
                          : "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                      }}
                      whileHover={
                        !loading && !completedSteps.includes(3)
                          ? {
                              scale: 1.02,
                              boxShadow:
                                "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                            }
                          : {}
                      }
                      whileTap={
                        !loading && !completedSteps.includes(3)
                          ? { scale: 0.98 }
                          : {}
                      }
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2 text-white">
                          <Loader2 className="animate-spin" size={20} />
                          Saving...
                        </span>
                      ) : (
                        "Complete & Submit"
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showStep1Modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: "1rem",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] border-2 border-[#C89356] rounded-xl p-6 md:p-8 max-w-md w-full mx-4 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check size={32} className="text-green-500" />
              </motion.div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                ✓ Payment Completed!
              </h3>

              <div className="space-y-3 mb-6">
                <p className="text-white text-xs md:text-base">
                  Your payment has been successfully processed! You can now
                  proceed to create your AI clone!
                </p>
                <p className="text-white text-xs md:text-base">
                  Don’t worry, you can return to this section anytime to upload
                  your video at your convenience.
                </p>
              </div>

              <motion.button
                onClick={() => {
                  setShowStep1Modal(false);
                  setCurrentStep(2);
                  setTimeout(() => {
                    sectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }, 300);
                }}
                className="w-full py-3 bg-[#3ab44c] hover:bg-[#44874e] hover:delay-150 text-white rounded-lg font-semibold transition-colors text-sm md:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Proceed to Step 2
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 2 Completion Modal */}
      <AnimatePresence>
        {showStep2Modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: "1rem",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] border-2 border-[#C89356] rounded-xl p-6 md:p-8 max-w-md w-full mx-4 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check size={32} className="text-green-500" />
              </motion.div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                ✓ Video Upload Complete!
              </h3>

              <div className="space-y-3 mb-6">
                <p className="text-white text-sm md:text-base">
                  Your video has been uploaded - you’re all set!
                </p>
                <p className="text-white text-xs md:text-sm">
                  You can come back later to fill in the details, or proceed to
                  Step 3 and continue right now.
                </p>
              </div>

              <motion.button
                onClick={() => {
                  setShowStep2Modal(false);
                  setCurrentStep(3);
                  setTimeout(() => {
                    const step3Element =
                      document.querySelector('[data-step="3"]');
                    if (step3Element) {
                      step3Element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    } else {
                      sectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }, 300);
                }}
                className="w-full py-3 bg-[#3ab44c] hover:bg-[#44874e] hover:delay-150 text-white rounded-lg font-semibold transition-colors text-sm md:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Proceed to Step 3
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {completedSteps.includes(3) && (
          <motion.div
            key="completion-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: "1rem",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] border-2 border-[#C89356] rounded-xl p-6 md:p-8 max-w-md w-full mx-4 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check size={32} className="text-green-500" />
              </motion.div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                ✓ All Steps Completed!
              </h3>

              <div className="space-y-3 mb-6">
                <p className="text-white text-sm md:text-base">
                  Your video has been uploaded, your script has been saved, and
                  your contact information has been recorded. You will receive
                  your Digital AI Avatar along with your fully edited video as
                  per your script within 24 Hours.
                </p>
                <p className="text-white text-xs md:text-sm">
                  The form is now locked to prevent changes. To start a new
                  order, please refresh.
                </p>
              </div>

              <button
                onClick={handleRefresh}
                className="w-full py-3 bg-[#C89356] hover:bg-[#B45309] text-white rounded-lg font-semibold transition-colors text-sm md:text-base"
              >
                Refresh & Start New Order
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
