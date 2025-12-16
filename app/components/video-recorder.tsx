/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  StopCircle,
  Loader2,
  X,
  Check,
  RotateCcw,
  ArrowLeft,
  Upload,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface VideoRecorderProps {
  onRecordingComplete: (file: File) => void;
  onCancel: () => void;
  uploadAndProceed?: (
    file: File,
    onProgress?: (progress: number) => void
  ) => Promise<string>;
  onProceed?: (submissionId: string) => void;
  script?: string;
  shouldRequestFullscreen?: boolean; // Add this prop
}

const RECORDING_DURATION = 30; // 30 seconds fixed duration

export default function VideoRecorder({
  onRecordingComplete,
  onCancel,
  uploadAndProceed,
  onProceed,
  script = "",
  shouldRequestFullscreen = false, // Add this with default false
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(RECORDING_DURATION);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<
    "encoding" | "enhancing"
  >("encoding");
  const [error, setError] = useState<string | null>(null);
  const [recordingStage, setRecordingStage] = useState<
    "preview" | "recording" | "playback"
  >("preview");
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  // New states for upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const lineIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const teleprompterLines = [
    "Hello, I am excited to record this video.",
    "I'm speaking with confidence and ease.",
    "The lighting looks great and my voice is clear.",
    "I'm keeping a warm smile with natural hand movements.",
    "My face stays well visible as I speak steadily.",
    "I'm maintaining a calm, natural tone throughout.",
    "I'm taking gentle pauses between sentences.",
    "I'm enjoying the process and doing my best.",
    "I'm staying relaxed and focused as I continue.",
    "I'm speaking at a comfortable and natural pace.",
    "I'm keeping my posture open and balanced.",
    "I'm letting my thoughts flow smoothly and clearly.",
    "I'm keeping my energy positive and steady.",
    "I'm staying mindful of my expressions and tone.",
    "I'm speaking with clarity and calm confidence.",
    "I'm maintaining eye contact with ease.",
    "I'm keeping each sentence simple and natural.",
    "I'm taking my time and staying comfortable.",
    "I'm allowing my voice to sound warm and friendly.",
    "I'm staying present and enjoying the moment.",
    "I'm ending each thought with a gentle pause.",
  ];

  // Get line duration based on device type
  const getLineDuration = () => {
    return isMobile ? 2800 : 2000; // Mobile: 2.8s, Desktop: 2s
  };

  // Skip to next line
  const skipToNextLine = () => {
    if (!isRecording) return;
    setCurrentLineIndex((prev) => (prev + 1) % teleprompterLines.length);

    // Reset interval to start fresh from new line
    if (lineIntervalRef.current) {
      clearInterval(lineIntervalRef.current);
    }
    startLineInterval();
  };

  // Start line interval
  const startLineInterval = () => {
    if (lineIntervalRef.current) {
      clearInterval(lineIntervalRef.current);
    }

    lineIntervalRef.current = setInterval(() => {
      setCurrentLineIndex((prev) => (prev + 1) % teleprompterLines.length);
    }, getLineDuration());
  };

  // Fullscreen helper functions
  const requestFullscreen = async () => {
    if (!modalContainerRef.current) return;

    try {
      const elem = modalContainerRef.current as any;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        setIsFullscreen(true);
      } else if (elem.webkitRequestFullscreen) {
        // Safari support
        await elem.webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn("Fullscreen request failed:", err);
      // Continue without fullscreen
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else if ((document as any).webkitFullscreenElement) {
        (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Exit fullscreen failed:", err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement ||
          !!(document as any).webkitFullscreenElement
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      if (lineIntervalRef.current) {
        clearInterval(lineIntervalRef.current);
        lineIntervalRef.current = null;
      }
      return;
    }

    startLineInterval();

    // Keyboard shortcut: Space or Arrow Right to skip line
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "ArrowRight") && isRecording) {
        e.preventDefault();
        skipToNextLine();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (lineIntervalRef.current) {
        clearInterval(lineIntervalRef.current);
      }
    };
  }, [isRecording, isMobile]);

  // Callback ref for the live video element to handle remounting (e.g., after retake)
  const videoRefCallback = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node !== null && recordingStage !== "playback") {
        setCameraReady(false);
        if (streamRef.current) {
          node.srcObject = streamRef.current;
          const handleMetadata = () => {
            setCameraReady(true);
            node.play().catch((e) => console.error("Autoplay failed:", e));
          };
          node.onloadedmetadata = handleMetadata;
        }
      }
      videoRef.current = node;
    },
    [recordingStage]
  );

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      cleanup();
    };
  }, []);

  // Add this new useEffect to handle fullscreen on mount for mobile
  useEffect(() => {
    if (shouldRequestFullscreen && isMobile && modalContainerRef.current) {
      const timer = setTimeout(() => {
        requestFullscreen();
      }, 100); // Small delay to ensure DOM is ready

      return () => clearTimeout(timer);
    }
  }, [shouldRequestFullscreen, isMobile]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    // Exit fullscreen on cleanup
    if (isFullscreen) {
      exitFullscreen();
    }
  };

  const loadFFmpeg = async () => {
    if (!ffmpegRef.current) {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => {
        console.log("FFmpeg log:", message);
      });
      ffmpeg.on("progress", ({ progress }) => {
        console.log("FFmpeg progress:", progress);
      });
      await ffmpeg.load({
        coreURL: await toBlobURL(
          "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js",
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm",
          "application/wasm"
        ),
      });
      ffmpegRef.current = ffmpeg;
    }
    return ffmpegRef.current;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          aspectRatio: 1.77778,
          frameRate: { ideal: 30, min: 24 },
          facingMode: "user",
        },
        audio: {
          sampleRate: 48000,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          videoRef.current?.play().catch(console.error);
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Failed to access camera. Please grant camera permissions.");
    }
  };

  const startCountdown = () => {
    // Request fullscreen on mobile when starting countdown
    if (isMobile) {
      requestFullscreen();
    }

    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          startRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    try {
      if (!streamRef.current) {
        setError("Camera stream not available");
        return;
      }

      chunksRef.current = [];

      let mimeType = "video/webm;codecs=vp9,opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp8,opus";
      }

      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 128000,
      };

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setTimeout(async () => {
          await processRecording();
        }, 500);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        setError("Recording failed. Please try again.");
        setIsRecording(false);
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingStage("recording");
      setRecordingTime(RECORDING_DURATION);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = RECORDING_DURATION - elapsed;
        setRecordingTime(remaining);

        if (remaining <= 0) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.error("Recording start error:", err);
      setError("Failed to start recording. Please try again.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const enhanceVideoWithFFmpeg = async (inputBlob: Blob): Promise<Blob> => {
    let ffmpeg: FFmpeg;
    try {
      ffmpeg = await loadFFmpeg();
      setProcessingStep("enhancing");

      await ffmpeg.writeFile("input.webm", await fetchFile(inputBlob));

      // Fast mode command
      await ffmpeg.exec([
        "-fflags",
        "+genpts+igndts",
        "-avoid_negative_ts",
        "make_zero",
        "-copytb",
        "1",
        "-i",
        "input.webm",
        "-map",
        "0",
        "-af",
        "aresample=async=1",
        "-vf",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "96k", // Lower for speed
        "-movflags",
        "+faststart",
        "-y",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      return new Blob([data.buffer], { type: "video/mp4" });
    } catch (enhanceErr: any) {
      console.warn(
        "FFmpeg enhancement failed, falling back to raw blob:",
        enhanceErr
      );
      // ... cleanup
      return inputBlob;
    }
  };

  const processRecording = async () => {
    setIsProcessing(true);
    setProcessingStep("encoding");
    let finalBlob: Blob;

    try {
      console.log(
        "Processing recording with",
        chunksRef.current.length,
        "chunks"
      );

      const mimeType = mediaRecorderRef.current?.mimeType || "video/webm";
      const rawBlob = new Blob(chunksRef.current, { type: mimeType });

      console.log("Raw Blob created:", {
        size: rawBlob.size,
        type: rawBlob.type,
      });

      if (rawBlob.size === 0) {
        throw new Error("Recording resulted in empty file");
      }

      finalBlob = await enhanceVideoWithFFmpeg(rawBlob);
      recordedBlobRef.current = finalBlob;

      // Create preview URL
      const previewUrl = URL.createObjectURL(finalBlob);
      setRecordedVideoUrl(previewUrl);
      setRecordingStage("playback");
    } catch (err: any) {
      console.error("Processing error:", err);
      setError("Failed to process recording. Please try again.");

      if (chunksRef.current.length > 0) {
        const mimeType = mediaRecorderRef.current?.mimeType || "video/webm";
        finalBlob = new Blob(chunksRef.current, { type: mimeType });
        recordedBlobRef.current = finalBlob;
        const previewUrl = URL.createObjectURL(finalBlob);
        setRecordedVideoUrl(previewUrl);
        setRecordingStage("playback");
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep("encoding");
    }
  };

  const handleSubmitRecording = async () => {
    if (!recordedBlobRef.current) {
      setError("No recording found");
      return;
    }

    const timestamp = Date.now();
    const file = new File(
      [recordedBlobRef.current],
      `recording-${timestamp}.mp4`,
      {
        type: recordedBlobRef.current.type || "video/mp4",
        lastModified: timestamp,
      }
    );

    console.log("Submitting File:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Clean up camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (uploadAndProceed && onProceed) {
      // Integrated upload flow
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);
      setUploadProgress(0);

      try {
        const submissionId = await uploadAndProceed(file, (progress) => {
          setUploadProgress(progress);
        });
        setUploadProgress(100);
        setUploadSuccess(true);
        setTimeout(() => {
          onProceed(submissionId);
        }, 1500);
      } catch (err: any) {
        setUploadError(err.message || "Upload failed. Please try again.");
        setUploading(false);
      }
    } else {
      // Fallback to old flow
      onRecordingComplete(file);
    }
  };

  const handleRetake = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    recordedBlobRef.current = null;
    chunksRef.current = [];
    setRecordingStage("preview");
    setRecordingTime(RECORDING_DURATION);
    setCameraReady(false); // Reset to show loading overlay briefly during remount
    setError(null);
    // Reset upload states
    setUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    // Restart camera if needed
    if (!streamRef.current) {
      startCamera();
    }
  };

  const handleCancel = () => {
    if (isFullscreen) {
      exitFullscreen();
    }
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    // Prevent body scroll when recorder is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // ========== KEY CHANGES BELOW ==========
  // Modal backdrop and container styling - consistent fullscreen experience
  // Mobile: fullscreen
  // Desktop: 85% centered modal with backdrop

  return (
    <>
      {/* Modal Backdrop - Only visible on desktop, clicking it closes the modal */}
      {!isMobile && (
        <div
          className="fixed inset-0 w-screen h-screen bg-black/90 backdrop-blur-sm z-[9998]"
          onClick={(e) => {
            // Only close if clicking directly on backdrop, not on children
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
          style={{ minHeight: "100vh", minWidth: "100vw" }}
        />
      )}

      {/* Modal Container */}
      <div
        ref={modalContainerRef}
        className={`fixed z-[9999] bg-black ${
          isMobile
            ? "inset-0"
            : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden shadow-2xl"
        }`}
        style={
          isMobile
            ? { width: "100vw", height: "100vh" }
            : {
                width: "85vw",
                height: "85vh",
                maxWidth: "1400px",
                maxHeight: "900px",
              }
        }
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {(error || uploadError) && (
          <div className="absolute top-4 left-4 right-4 z-50 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            <button
              onClick={() => {
                setError(null);
                setUploadError(null);
              }}
              className="absolute top-2 right-2 text-red-700 hover:text-red-900"
            >
              <X size={16} />
            </button>
            {uploadError || error}
          </div>
        )}

        {/* Preview/Recording Stage */}
        {recordingStage !== "playback" && (
          <div className="relative w-full h-full">
            <video
              ref={videoRefCallback}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Camera Loading Overlay */}
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <Loader2
                    className="mx-auto mb-2 text-white animate-spin"
                    size={48}
                  />
                  <p className="text-white text-sm">Initializing camera...</p>
                </div>
              </div>
            )}

            {/* Countdown Overlay */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 z-40"
                >
                  <motion.div
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="text-white text-9xl font-bold"
                  >
                    {countdown}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-2 left-4 flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full z-30">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-3 h-3 bg-white rounded-full"
                />
                <span className="font-bold text-md">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}

            {/* Script Instructions Overlay */}
            {cameraReady && recordingStage === "preview" && script && (
              <div className="absolute top-20 left-0 right-0 p-6 z-20">
                <div className="max-w-3xl mx-auto">
                  <div className="bg-black/30 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                    <p className="text-white text-sm md:text-base leading-relaxed whitespace-pre-line text-center">
                      {script}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isRecording && (
              <div className="absolute top-10 left-0 right-0 p-4 z-20">
                <div className="max-w-2xl mx-auto text-center">
                  <div className="bg-white/5 backdrop-blur-md rounded-lg p-4">
                    <p className="text-white text-lg font-semibold mb-2">
                      Recording in Progress
                    </p>

                    <div className="relative h-20 overflow-hidden">
                      <style>{`
                  .teleprompter-container {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    transition: transform 0.3s ease-in-out;
                  }

                  .line {
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    color: white;
                    white-space: pre-wrap; 
                    word-wrap: break-word; 
                    flex-shrink: 0;
                  }
                  `}</style>

                      <div
                        className="teleprompter-container"
                        style={{
                          transform: `translateY(-${currentLineIndex * 48}px)`,
                        }}
                      >
                        {teleprompterLines.map((line, index) => (
                          <div key={index} className="line text-wrap">
                            {line}
                          </div>
                        ))}
                        {/* Repeat lines at the end to create seamless loop */}
                        {teleprompterLines.map((line, index) => (
                          <div
                            key={`repeat-${index}`}
                            className="line text-wrap"
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skip Line Button/Indicator */}
                    <p className="text-white/60 text-xs mt-3">
                      {isMobile
                        ? "Tap screen or use arrow buttons to skip line"
                        : "Press SPACE or → to skip line"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Skip Line Touch Area for Mobile */}
            {isRecording && isMobile && (
              <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={skipToNextLine}
              />
            )}

            {/* Control Buttons */}
            <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-4 z-30 px-4 pb-safe">
              {!isRecording &&
                countdown === null &&
                !isProcessing &&
                cameraReady && (
                  <>
                    <motion.button
                      onClick={startCountdown}
                      className="flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg shadow-2xl"
                      style={{
                        background:
                          "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                        color: "#111827",
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Video size={20} className="md:w-6 md:h-6" />
                      Start Recording
                    </motion.button>
                    <motion.button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-5 py-3 md:px-6 md:py-4 bg-gray-600/90 hover:bg-gray-700 text-white rounded-full font-semibold backdrop-blur-sm text-sm md:text-base"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ArrowLeft size={18} className="md:w-5 md:h-5" />
                      Back
                    </motion.button>
                  </>
                )}
            </div>

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
                <div className="text-center">
                  <Loader2
                    className="mx-auto mb-4 text-white animate-spin"
                    size={64}
                  />
                  <p className="text-white text-xl font-semibold mb-2">
                    {processingStep === "encoding"
                      ? "Finalizing recording..."
                      : "Enhancing video quality..."}
                  </p>
                  <p className="text-white/70 text-sm">
                    This may take a moment
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Playback Stage */}
        {recordingStage === "playback" && recordedVideoUrl && (
          <div className="relative w-full h-full bg-black">
            <video
              ref={playbackVideoRef}
              src={recordedVideoUrl}
              controls
              className="w-full h-full object-contain"
              // controlsList="nodownload noplaybackrate nofullscreen noremoteplayback nopicture-in-picture"
            />

            {/* Upload Progress Overlay */}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
                <div className="text-center w-full max-w-md px-4">
                  <Loader2
                    className="mx-auto mb-4 text-white animate-spin"
                    size={48}
                  />
                  <p className="text-white text-xl font-semibold mb-4">
                    Uploading Video...
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                    <div
                      className="bg-gradient-to-r from-[#F6C066] to-[#E38826] h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-white/70 text-sm">
                    {uploadProgress}% Complete
                  </p>
                </div>
              </div>
            )}

            {/* Upload Success Overlay */}
            {uploadSuccess && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
                <div className="text-center w-full max-w-md px-4">
                  <Check className="mx-auto mb-4 text-green-500" size={48} />
                  <p className="text-white text-xl font-semibold mb-4">
                    Upload Complete!
                  </p>
                  <p className="text-white/70 text-sm">
                    Proceeding to next step...
                  </p>
                </div>
              </div>
            )}

            {/* Playback Controls Overlay */}
            <div className="absolute bottom-12 left-0 right-0 bg-transparent p-6 z-30 pb-safe">
              <div className="max-w-2xl mx-auto">
                <p className="text-white text-center font-semibold text-lg mb-4">
                  Review Your Recording
                </p>
                <div className="flex items-center justify-center gap-4">
                  <motion.button
                    onClick={handleSubmitRecording}
                    disabled={uploading || uploadSuccess}
                    className="flex items-center gap-2 text-white px-5 py-3 md:px-6 md:py-4 rounded-full font-semibold text-sm md:text-base shadow-2xl disabled:opacity-50"
                    style={{
                      background:
                        uploading || uploadSuccess ? "#6B7280" : "#3ab44c",
                      // color: uploading || uploadSuccess ? "white" : "#111827",
                    }}
                    whileHover={
                      !uploading && !uploadSuccess ? { scale: 1.05 } : {}
                    }
                    whileTap={
                      !uploading && !uploadSuccess ? { scale: 0.95 } : {}
                    }
                  >
                    {uploading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : uploadSuccess ? (
                      <Check size={20} />
                    ) : (
                      <>
                        {uploadAndProceed ? (
                          <Upload size={20} />
                        ) : (
                          <Check size={20} />
                        )}
                        {uploadAndProceed ? "Upload" : "Submit"}
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={handleRetake}
                    disabled={uploading}
                    className="flex items-center gap-2 px-5 py-3 md:px-6 md:py-4 bg-gray-600/90 hover:bg-gray-700 text-white rounded-full font-semibold backdrop-blur-sm text-sm md:text-base disabled:opacity-50"
                    whileHover={!uploading ? { scale: 1.05 } : {}}
                    whileTap={!uploading ? { scale: 0.95 } : {}}
                  >
                    <RotateCcw size={18} />
                    Retake
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
