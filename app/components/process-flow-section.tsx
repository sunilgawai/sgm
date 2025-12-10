"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Upload, FileText, CreditCard, Loader2, X, User, Video } from "lucide-react"
import VideoRecorder from "./video-recorder"

const RECORDING_SCRIPT = `Hello! I'm feeling confident and relaxed right now. The lighting is good, and my pronunciation is clear. This process is enjoyable. I'll smile and include natural and general hand movements.

My face is clearly visible. I'm speaking in a steady pace with a natural tone. I'm taking pauses between sentences. This recording is fun and I'm in a great mood. I'll continue doing my best until the end.`

const PACKAGES = [
  { id: "ai-clone", name: "Get Your AI Clone", amount: 37 },
]

async function uploadToCloudinaryChunked(
  file: File,
  uploadParams: any,
  onProgress?: (progress: number) => void
): Promise<any> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // Upload chunks sequentially
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("cloud_name", uploadParams.cloudName);
    formData.append("timestamp", uploadParams.timestamp.toString());
    formData.append("signature", uploadParams.signature);
    formData.append("api_key", uploadParams.apiKey);
    formData.append("folder", uploadParams.folder);
    formData.append("public_id", uploadParams.publicId);
    formData.append("resource_type", "video");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/video/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Chunk upload failed: ${response.status}`
      );
    }

    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    if (onProgress) {
      onProgress(progress);
    }

    // Only the last chunk returns the full result
    if (chunkIndex === totalChunks - 1) {
      return await response.json();
    }
  }
}

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

  // Form state
  const [customPrompt, setCustomPrompt] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

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

  // Auto-advance to step 3 when step 2 is completed
  useEffect(() => {
    if (
      completedSteps.includes(2) &&
      uploadedFiles.length > 0 &&
      submissionId &&
      currentStep !== 3 &&
      !completedSteps.includes(3)
    ) {
      setCurrentStep(3);
      setTimeout(() => {
        const step3Element = document.querySelector('[data-step="3"]');
        if (step3Element) {
          step3Element.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          sectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 600);
    }
  }, [completedSteps, uploadedFiles.length, submissionId, currentStep]);

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
          setCompletedSteps([1]);
          setCurrentStep(2);
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
        console.error("Checkout error:", errorMessage);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

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
      if (file.size > 2 * 1024 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 2GB.`);
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

  const handleRecordingComplete = (file: File) => {
    setFiles([file]);
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
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

      // Upload each file
      for (const file of files) {
        try {
          console.log(
            `Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(
              2
            )} MB)`
          );

          const formData = new FormData();
          formData.append("file", file);
          if (currentSubmissionId) {
            formData.append("submissionId", currentSubmissionId);
          }

          // First, check if we need chunked upload
          const uploadResponse = await fetch("/api/v1/uploads/upload-video", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse
              .json()
              .catch(() => ({ error: "Upload failed" }));
            console.error(`Upload failed for ${file.name}:`, errorData);
            throw new Error(
              errorData.error || `Upload failed: ${uploadResponse.status}`
            );
          }

          const uploadData = await uploadResponse.json();

          // Check if we need to use chunked upload
          if (uploadData.useChunkedUpload) {
            console.log(`Using chunked upload for large file: ${file.name}`);

            // Perform chunked upload directly to Cloudinary
            const cloudinaryResult = await uploadToCloudinaryChunked(
              file,
              uploadData.uploadParams,
              (progress) => {
                setUploadProgress(progress);
                console.log(`Upload progress: ${progress}%`);
              }
            );

            // Finalize the upload on our server
            const finalizeResponse = await fetch(
              "/api/v1/uploads/finalize-upload",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  submissionId: currentSubmissionId,
                  uploadResult: cloudinaryResult,
                  filename: file.name,
                  fileSize: file.size,
                }),
              }
            );

            if (!finalizeResponse.ok) {
              throw new Error("Failed to finalize chunked upload");
            }

            console.log(`✓ Successfully uploaded (chunked): ${file.name}`);
          } else {
            console.log(`✓ Successfully uploaded: ${file.name}`);
          }

          successfulUploads.push(file.name);
          setUploadProgress(100);
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

      setUploadedFiles([...uploadedFiles, ...successfulUploads]);
      setFiles([]);

      setCompletedSteps((prev) => {
        if (!prev.includes(2)) {
          return [...prev, 2];
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
    setFiles([]);
    setUploadedFiles([]);
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

  return (
    <>
      <section
        ref={sectionRef}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-black"
        id="process-flow"
      >
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-16 text-center unbounded"
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
              const isClickable =
                step === 1 ||
                (step === 2 &&
                  completedSteps.includes(1) &&
                  paymentStatus === "paid") ||
                (step === 3 &&
                  completedSteps.includes(1) &&
                  completedSteps.includes(2) &&
                  paymentStatus === "paid" &&
                  (uploadedFiles.length > 0 || submissionId));

              return (
                <React.Fragment key={step}>
                  <div className="flex items-center justify-center flex-shrink-0">
                    <div className="flex flex-col items-center relative">
                      <motion.div
                        className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl cursor-pointer transition-all whitespace-nowrap ${
                          isClickable
                            ? "hover:scale-110"
                            : "cursor-not-allowed opacity-60"
                        }`}
                        style={{
                          background:
                            "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                          color: "#111827",
                          boxShadow: isClickable
                            ? "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)"
                            : "0 0 10px rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.1), 0 10px 20px rgba(227,129,38,0.1), inset 0 3px 9px rgba(255,255,255,0.05)",
                        }}
                        onClick={() => {
                          if (completedSteps.includes(3)) {
                            setError(
                              "Process completed! Please refresh to start a new order."
                            );
                            return;
                          }
                          if (!isClickable) {
                            if (step === 2) {
                              setError(
                                "Please complete Step 1 (Purchase) first before proceeding to Step 2."
                              );
                            } else if (step === 3) {
                              if (
                                !completedSteps.includes(1) ||
                                paymentStatus !== "paid"
                              ) {
                                setError(
                                  "Please complete Step 1 and Step 2 first before proceeding to Step 3."
                                );
                              } else if (
                                !completedSteps.includes(2) ||
                                (uploadedFiles.length === 0 && !submissionId)
                              ) {
                                setError(
                                  "Please complete Step 2 (Upload) first before proceeding to Step 3."
                                );
                              }
                            }
                            setTimeout(() => {
                              sectionRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }, 100);
                            return;
                          }
                          if (step === 1) {
                            setCurrentStep(1);
                            setError(null);
                          } else if (step === 2) {
                            if (
                              completedSteps.includes(1) &&
                              paymentStatus === "paid"
                            ) {
                              setCurrentStep(2);
                              setError(null);
                            } else {
                              setError(
                                "Please complete Step 1 (Purchase) first before proceeding to Step 2."
                              );
                            }
                          } else if (step === 3) {
                            if (
                              !completedSteps.includes(1) ||
                              paymentStatus !== "paid"
                            ) {
                              setError(
                                "Please complete Step 1 (Purchase) first before proceeding to Step 3."
                              );
                            } else if (
                              !completedSteps.includes(2) ||
                              (uploadedFiles.length === 0 && !submissionId)
                            ) {
                              setError(
                                "Please complete Step 2 (Upload) first before proceeding to Step 3."
                              );
                            } else {
                              setCurrentStep(3);
                              setError(null);
                            }
                          }
                          setTimeout(() => {
                            sectionRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 100);
                        }}
                        whileHover={
                          isClickable
                            ? {
                                scale: 1.1,
                                boxShadow:
                                  "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                              }
                            : {}
                        }
                        whileTap={isClickable ? { scale: 0.95 } : {}}
                      >
                        {step}
                      </motion.div>
                      {isCurrent && (
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
                          completedSteps.includes(step + 1) ||
                          currentStep > step
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

              // Step is clickable only if all previous steps are completed
              const isClickable =
                step === 1 ||
                (step === 2 &&
                  completedSteps.includes(1) &&
                  paymentStatus === "paid") ||
                (step === 3 &&
                  completedSteps.includes(1) &&
                  completedSteps.includes(2) &&
                  paymentStatus === "paid" &&
                  (uploadedFiles.length > 0 || submissionId));

              return (
                <div key={step} className="space-y-4">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl cursor-pointer transition-all ${
                        isClickable
                          ? "hover:scale-110"
                          : "cursor-not-allowed opacity-60"
                      }`}
                      style={{
                        background:
                          "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                        color: "#111827",
                        boxShadow: isClickable
                          ? "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)"
                          : "0 0 10px rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.1), 0 10px 20px rgba(227,129,38,0.1), inset 0 3px 9px rgba(255,255,255,0.05)",
                      }}
                      onClick={() => {
                        // Prevent navigation if step 3 is completed
                        if (completedSteps.includes(3)) {
                          setError(
                            "Process completed! Please refresh to start a new order."
                          );
                          return;
                        }

                        if (!isClickable) {
                          // Show error message based on which step is missing
                          if (step === 2) {
                            setError(
                              "Please complete Step 1 (Purchase) first before proceeding to Step 2."
                            );
                          } else if (step === 3) {
                            if (
                              !completedSteps.includes(1) ||
                              paymentStatus !== "paid"
                            ) {
                              setError(
                                "Please complete Step 1 and Step 2 first before proceeding to Step 3."
                              );
                            } else if (
                              !completedSteps.includes(2) ||
                              (uploadedFiles.length === 0 && !submissionId)
                            ) {
                              setError(
                                "Please complete Step 2 (Upload) first before proceeding to Step 3."
                              );
                            }
                          }
                          setTimeout(() => {
                            sectionRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }, 100);
                          return;
                        }

                        // Only allow navigation if previous steps are completed
                        if (step === 1) {
                          setCurrentStep(1);
                          setError(null);
                        } else if (step === 2) {
                          // Only allow if step 1 is completed
                          if (
                            completedSteps.includes(1) &&
                            paymentStatus === "paid"
                          ) {
                            setCurrentStep(2);
                            setError(null);
                          } else {
                            setError(
                              "Please complete Step 1 (Purchase) first before proceeding to Step 2."
                            );
                          }
                        } else if (step === 3) {
                          // Only allow if steps 1 and 2 are completed
                          if (
                            !completedSteps.includes(1) ||
                            paymentStatus !== "paid"
                          ) {
                            setError(
                              "Please complete Step 1 and Step 2 first before proceeding to Step 3."
                            );
                          } else if (
                            !completedSteps.includes(2) ||
                            (uploadedFiles.length === 0 && !submissionId)
                          ) {
                            setError(
                              "Please complete Step 2 (Upload) first before proceeding to Step 3."
                            );
                          } else {
                            setCurrentStep(3);
                            setError(null);
                          }
                        }
                        setTimeout(() => {
                          sectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }, 100);
                      }}
                      whileHover={
                        isClickable
                          ? {
                              scale: 1.1,
                              boxShadow:
                                "0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.3), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                            }
                          : {}
                      }
                      whileTap={isClickable ? { scale: 0.95 } : {}}
                    >
                      {step}
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
                        completedSteps.includes(step + 1) || currentStep > step
                          ? "bg-green-500"
                          : "bg-white/30"
                      }`}
                    />
                  )}

                  {/* Step Component - Show if step is accessible */}
                  {shouldShow && (
                    <div className="mt-4">
                      {step === 1 && currentStep === 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#1a1a1a] rounded-xl p-6 border border-[#C89356]"
                        >
                          <div className="text-center mb-6">
                            <CreditCard
                              className="mx-auto mb-3 text-[#C89356]"
                              size={40}
                            />
                            <h3 className="text-xl font-bold text-white mb-2">
                              STEP 1 — Purchase Your AI Clone
                            </h3>
                          </div>
                          <div className="space-y-4">
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
                                  className="w-full py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                      <Loader2
                                        className="animate-spin"
                                        size={18}
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
                        </motion.div>
                      )}
                      {/* Step 2 Component for Mobile - Show only when current step is 2, hide when completed */}
                      {step === 2 &&
                        currentStep === 2 &&
                        !completedSteps.includes(3) && (
                          <div className="md:hidden bg-[#1a1a1a] rounded-xl p-6 border border-[#C89356] mt-4">
                            <div className="text-center mb-6">
                              <Upload
                                className="mx-auto mb-3 text-[#C89356]"
                                size={40}
                              />
                              <h3 className="text-xl font-bold text-white mb-2">
                                STEP 2 — Upload Video
                              </h3>
                              <p className="text-white text-sm">
                                Payment confirmed — please record yourself
                                following the script below and upload your video
                              </p>
                            </div>
                            <div className="space-y-4">
                              <div className="bg-[#2a2a2a] border border-[#C89356] rounded-lg p-4">
                                <label className="block text-sm font-semibold text-white mb-2">
                                  Please record yourself following this script:
                                </label>
                                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#92400E]">
                                  <p className="text-white whitespace-pre-line leading-relaxed text-sm">
                                    {RECORDING_SCRIPT}
                                  </p>
                                </div>
                                <p className="mt-2 text-xs text-white">
                                  Record in a quiet room. Keep camera at eye
                                  level. Speak clearly and naturally.
                                </p>
                              </div>

                              {!recordingMode && !videoPreview && (
                                <div className="text-center">
                                  <motion.button
                                    onClick={() => setRecordingMode(true)}
                                    className="mb-3 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 mx-auto text-sm"
                                    style={{
                                      background:
                                        "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                                      color: "#111827",
                                      boxShadow:
                                        "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Video size={18} />
                                    Record Your Video
                                  </motion.button>
                                  <p className="text-white text-xs mb-3">OR</p>
                                </div>
                              )}

                              {recordingMode ? (
                                <VideoRecorder
                                  onRecordingComplete={handleRecordingComplete}
                                  onCancel={() => setRecordingMode(false)}
                                />
                              ) : (
                                <div>
                                  {loading &&
                                    uploadProgress > 0 &&
                                    uploadProgress < 100 && (
                                      <div className="mt-4">
                                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                                          <div
                                            className="bg-gradient-to-r from-[#F6C066] to-[#E38826] h-2.5 rounded-full transition-all duration-300"
                                            style={{
                                              width: `${uploadProgress}%`,
                                            }}
                                          />
                                        </div>
                                        <p className="text-white text-sm text-center mt-2">
                                          Uploading... {uploadProgress}%
                                        </p>
                                      </div>
                                    )}
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
                                          className="w-full h-auto max-h-[300px] object-contain"
                                        />
                                        <button
                                          onClick={() => {
                                            if (videoPreview)
                                              URL.revokeObjectURL(videoPreview);
                                            setVideoPreview(null);
                                            setFiles([]);
                                          }}
                                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2"
                                        >
                                          <X size={18} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="p-6 text-center">
                                        <input
                                          type="file"
                                          accept=".mp4,.mov,.webm"
                                          onChange={handleFileSelect}
                                          className="hidden"
                                          id="file-upload-mobile-step2"
                                        />
                                        <label
                                          htmlFor="file-upload-mobile-step2"
                                          className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                          <Upload
                                            size={28}
                                            className="text-white"
                                          />
                                          <span className="text-white text-sm">
                                            Drag & drop or click to select
                                          </span>
                                          <span className="text-xs text-white">
                                            Max 2GB per file (.mp4, .mov, or
                                            .webm)
                                          </span>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {uploadedFiles.length > 0 && (
                                <div className="p-3 bg-green-900/50 border border-green-600 rounded-lg">
                                  <p className="text-green-200 font-semibold text-sm mb-1">
                                    ✓ Video uploaded successfully!
                                  </p>
                                  <p className="text-green-300 text-xs">
                                    Proceeding to the next step...
                                  </p>
                                </div>
                              )}

                              {files.length > 0 &&
                                uploadedFiles.length === 0 && (
                                  <motion.button
                                    onClick={async () => {
                                      if (
                                        files.length === 0 &&
                                        uploadedFiles.length === 0
                                      ) {
                                        setError(
                                          "Please upload your video recording"
                                        );
                                        return;
                                      }
                                      setLoading(true);
                                      setError(null);
                                      try {
                                        let currentSubmissionId = submissionId;
                                        if (files.length > 0) {
                                          const newSubmissionId =
                                            await handleUpload();
                                          if (newSubmissionId) {
                                            currentSubmissionId =
                                              newSubmissionId;
                                            setSubmissionId(newSubmissionId);
                                          } else {
                                            throw new Error(
                                              "Failed to upload video. Please try again."
                                            );
                                          }
                                        }
                                        if (!currentSubmissionId) {
                                          throw new Error(
                                            "Submission not found. Please upload your video first."
                                          );
                                        }
                                      } catch (err: any) {
                                        setError(
                                          err.message ||
                                            "Failed to upload. Please try again."
                                        );
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    disabled={
                                      loading ||
                                      (files.length === 0 &&
                                        uploadedFiles.length === 0)
                                    }
                                    className="w-full py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    style={{
                                      background: loading
                                        ? "#C89356"
                                        : "linear-gradient(90deg,#F6C066 0%, #F0A43A 50%, #E38826 100%)",
                                      color: "#111827",
                                      boxShadow: loading
                                        ? "none"
                                        : "0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2), 0 18px 36px rgba(227,129,38,0.18), inset 0 6px 18px rgba(255,255,255,0.08)",
                                    }}
                                    whileHover={!loading ? { scale: 1.02 } : {}}
                                    whileTap={!loading ? { scale: 0.98 } : {}}
                                  >
                                    {loading ? (
                                      <span className="flex items-center justify-center gap-2 text-white">
                                        <Loader2
                                          className="animate-spin"
                                          size={18}
                                        />
                                        Uploading...
                                      </span>
                                    ) : (
                                      "Proceed to Final Step & Add Info"
                                    )}
                                  </motion.button>
                                )}
                            </div>
                          </div>
                        )}
                      {/* Step 3 Component for Mobile - Show when accessible */}
                      {step === 3 &&
                        (currentStep === 3 ||
                          completedSteps.includes(3) ||
                          (completedSteps.includes(2) &&
                            uploadedFiles.length > 0)) && (
                          <div
                            className="md:hidden bg-[#1a1a1a] rounded-xl p-6 border border-[#C89356] mt-4"
                            data-step="3"
                          >
                            <div className="text-center mb-6">
                              <User
                                className="mx-auto mb-3 text-[#C89356]"
                                size={40}
                              />
                              <h3 className="text-xl font-bold text-white mb-2">
                                STEP 3 — Contact Information
                              </h3>
                              <p className="text-white text-sm">
                                Please provide your contact information and
                                script description to complete the process
                              </p>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-white mb-2">
                                  Full Name{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  disabled={completedSteps.includes(3)}
                                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                  placeholder="Enter your full name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-white mb-2">
                                  Email Address{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="email"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  disabled={completedSteps.includes(3)}
                                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                  placeholder="your.email@example.com"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-white mb-2">
                                  Phone Number{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="tel"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  disabled={completedSteps.includes(3)}
                                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
                                  onChange={(e) =>
                                    setCustomPrompt(e.target.value)
                                  }
                                  disabled={completedSteps.includes(3)}
                                  rows={5}
                                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#C89356] text-white rounded-lg focus:outline-none focus:border-[#C89356] resize-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                  placeholder="Write the script or prompt description you want your AI avatar to say..."
                                />
                                <p className="mt-1 text-xs text-white">
                                  This description will be used to generate your
                                  AI avatar's speech. Be clear and specific.
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
                                  const emailRegex =
                                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                  if (!emailRegex.test(email)) {
                                    setError(
                                      "Please enter a valid email address"
                                    );
                                    return;
                                  }
                                  setLoading(true);
                                  setError(null);
                                  try {
                                    if (!submissionId) {
                                      throw new Error(
                                        "Submission not found. Please go back and upload your video first."
                                      );
                                    }
                                    const promptResponse = await fetch(
                                      `/api/v1/submissions/${submissionId}/custom-prompt`,
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
                                className="w-full py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
                                    <Loader2
                                      className="animate-spin"
                                      size={18}
                                    />
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
                      STEP 1 — Purchase Your AI Clone
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

              {/* Step 2: Record & Upload Video + Write Script */}
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
                      STEP 2 — Upload Video
                    </h3>
                    <p className="text-white">
                      Payment confirmed — please record yourself following the
                      script below and upload your video
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Script Display */}
                    <div className="bg-[#2a2a2a] border border-[#C89356] rounded-lg p-6">
                      <label className="block text-sm font-semibold text-white mb-3">
                        Please record yourself following this script:
                      </label>
                      <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#92400E]">
                        <p className="text-white whitespace-pre-line leading-relaxed text-base">
                          {RECORDING_SCRIPT}
                        </p>
                      </div>
                      <p className="mt-3 text-sm text-white">
                        Record in a quiet room. Keep camera at eye level. Speak
                        clearly and naturally.
                      </p>
                    </div>

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
                        <p className="text-white text-sm mb-3">OR</p>
                      </div>
                    )}

                    {/* Show either VideoRecorder or Upload Zone */}
                    {recordingMode ? (
                      <VideoRecorder
                        onRecordingComplete={handleRecordingComplete}
                        onCancel={() => setRecordingMode(false)}
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
                                  Max 2GB per file (.mp4, .mov, or .webm)
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

                    {files.length > 0 && uploadedFiles.length === 0 && (
                      <motion.button
                        onClick={async () => {
                          if (
                            files.length === 0 &&
                            uploadedFiles.length === 0
                          ) {
                            setError("Please upload your video recording");
                            return;
                          }
                          setLoading(true);
                          setError(null);
                          try {
                            let currentSubmissionId = submissionId;
                            if (files.length > 0) {
                              const newSubmissionId = await handleUpload();
                              if (newSubmissionId) {
                                currentSubmissionId = newSubmissionId;
                                setSubmissionId(newSubmissionId);
                              } else {
                                throw new Error(
                                  "Failed to upload video. Please try again."
                                );
                              }
                            }
                            if (!currentSubmissionId) {
                              throw new Error(
                                "Submission not found. Please upload your video first."
                              );
                            }
                          } catch (err: any) {
                            setError(
                              err.message ||
                                "Failed to upload. Please try again."
                            );
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={
                          loading ||
                          (files.length === 0 && uploadedFiles.length === 0)
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
                          "Proceed to Final Step & Add Info"
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
                      STEP 3 — Contact Information
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
                        avatar's speech. Be clear and specific.
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

                        // Validate email format
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(email)) {
                          setError("Please enter a valid email address");
                          return;
                        }

                        setLoading(true);
                        setError(null);

                        try {
                          let currentSubmissionId = submissionId;

                          // Ensure we have a submissionId
                          if (!currentSubmissionId) {
                            throw new Error(
                              "Submission not found. Please go back and upload your video first."
                            );
                          }

                          // Save custom prompt first
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

                          // Update order with contact information
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

      {/* Completion Popup Modal - Rendered outside section to avoid overflow issues */}
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
              // Prevent closing on backdrop click to maintain flow
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


