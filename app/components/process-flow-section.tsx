"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Upload, FileText, CreditCard, Loader2, X, User } from "lucide-react"

const RECORDING_SCRIPT = `Hello! I'm feeling confident and relaxed right now. The lighting is good, and my pronunciation is clear. This process is enjoyable. I'll smile and include natural and general hand movements.

My face is clearly visible. I'm speaking in a steady pace with a natural tone. I'm taking pauses between sentences. This recording is fun and I'm in a great mood. I'll continue doing my best until the end.`

const PACKAGES = [
  { id: "multiple-ai", name: "Multiple AI Content Avatar", amount: 499 },
  { id: "plug-play", name: "Plug & Play System", amount: 999 },
]

export default function ProcessFlowSection() {
  const [currentStep, setCurrentStep] = useState(1)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed">("pending")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  const [buyerInfo, setBuyerInfo] = useState<{ email: string; phone: string; name?: string } | null>(null)

  // Handle hash routing to scroll to process flow section
  useEffect(() => {
    const hash = window.location.hash
    if (hash === "#process-flow" || hash === "#the-process") {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 300)
    }
  }, [])

  // Form state
  const [customPrompt, setCustomPrompt] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  // Upload state
  const [files, setFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  // Check for session_id in URL (return from Stripe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get("session_id")

    if (sessionId && !orderId) {
      checkPaymentStatus(sessionId)
    }
  }, [])

  // Scroll to section when step changes after payment
  useEffect(() => {
    if (currentStep === 2 && paymentStatus === "paid" && sectionRef.current) {
      // Remove session_id from URL
      const url = new URL(window.location.href)
      url.searchParams.delete("session_id")
      window.history.replaceState({}, "", url.toString())

      // Scroll to section smoothly
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }, [currentStep, paymentStatus])

  const checkPaymentStatus = async (sessionId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/orders/confirm?session_id=${sessionId}`)
      const data = await response.json()

      if (data.orderId) {
        setOrderId(data.orderId)
        setPaymentStatus(data.paymentStatus)
        if (data.buyer) {
          setBuyerInfo(data.buyer)
        }

        if (data.paymentStatus === "paid") {
          setCompletedSteps([1])
          setCurrentStep(2)
          // Scroll to section after a brief delay
          setTimeout(() => {
            sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }, 300)
        } else {
          setTimeout(() => checkPaymentStatus(sessionId), 2000)
        }
      }
    } catch (err) {
      console.error("Payment check error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (packageId: string, amount: number) => {
    setLoading(true)
    setError(null)

    try {
      // Stripe will collect email during checkout, phone can be optional
      const response = await fetch("/api/v1/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          amount,
          currency: "usd",
          buyer: {
            email: buyerInfo?.email || "customer@example.com", // Will be updated from Stripe
            phone: buyerInfo?.phone || "+1234567890", // Will be updated from Stripe if provided
          },
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        const errorMessage = data.error || "Failed to create checkout session"
        setError(errorMessage)
        console.error("Checkout error:", errorMessage)
      }
    } catch (err: any) {
      setError(err.message || "Failed to start checkout")
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const validFiles = selectedFiles.filter((file) => {
      const ext = file.name.toLowerCase().match(/\.[^.]+$/)
      const allowedTypes = [".mp4", ".mov"]
      if (!ext || !allowedTypes.includes(ext[0])) {
        alert(`Invalid file type: ${file.name}. Only .mp4 and .mov are allowed.`)
        return false
      }
      if (file.size > 2 * 1024 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 2GB.`)
        return false
      }
      return true
    })

    setFiles((prev) => [...prev, ...validFiles])
  }

  const handleUpload = async (): Promise<string | undefined> => {
    if (files.length === 0) {
      setError("Please select at least one file")
      return undefined
    }

    if (!orderId) {
      setError("Order not found. Please complete payment first.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create submission if it doesn't exist (for video upload)
      let currentSubmissionId = submissionId
      if (!currentSubmissionId) {
        // Use buyer info from order or defaults
        const buyerEmail = buyerInfo?.email || "customer@example.com"
        const buyerPhone = buyerInfo?.phone || "+1234567890"
        const buyerName = buyerInfo?.name || "User"
        
        // Create submission with the recording script as placeholder
        // The real custom script for AI avatar will be saved in step 3
        const submissionResponse = await fetch(`/api/v1/orders/${orderId}/submission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scriptText: RECORDING_SCRIPT, // Use recording script as placeholder
            greenScreen: false,
            email: buyerEmail,
            phone: buyerPhone,
            name: buyerName,
          }),
        })

        const submissionData = await submissionResponse.json()
        if (submissionData.submissionId) {
          currentSubmissionId = submissionData.submissionId
          setSubmissionId(currentSubmissionId)
        } else {
          throw new Error(submissionData.error || "Failed to create submission")
        }
      }

      const uploadErrors: string[] = []
      const successfulUploads: string[] = []

      console.log(`Starting upload of ${files.length} file(s)...`)

      // Upload each file through our server-side API
      for (const file of files) {
        try {
          console.log(`Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

          const formData = new FormData()
          formData.append("file", file)
          if (currentSubmissionId) {
            formData.append("submissionId", currentSubmissionId)
          }

          const uploadResponse = await fetch("/api/v1/uploads/upload-video", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({ error: "Upload failed" }))
            console.error(`Upload failed for ${file.name}:`, errorData)
            throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`)
          }

          const uploadData = await uploadResponse.json()
          console.log(`✓ Successfully uploaded: ${file.name}`, uploadData)
          successfulUploads.push(file.name)
        } catch (fileError: any) {
          console.error(`Error uploading ${file.name}:`, fileError)
          uploadErrors.push(`${file.name}: ${fileError.message}`)
        }
      }

      if (successfulUploads.length === 0) {
        throw new Error(
          uploadErrors.length > 0
            ? `All uploads failed:\n${uploadErrors.join("\n")}`
            : "No files were successfully uploaded"
        )
      }

      if (uploadErrors.length > 0) {
        setError(`Some files failed:\n${uploadErrors.join("\n")}`)
      }

      // Update UI
      setUploadedFiles([...uploadedFiles, ...successfulUploads])
      setFiles([])
      // Don't move to step 3 here - let step 2 button handle it after both upload and script are done

      console.log(`Upload complete: ${successfulUploads.length} successful, ${uploadErrors.length} failed`)
      
      // Return the submissionId so it can be used immediately
      return currentSubmissionId || undefined
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err.message || "Failed to upload files")
      throw err // Re-throw so the calling function knows it failed
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCustomPrompt = async () => {
    if (!submissionId || !customPrompt.trim()) {
      return false
    }

    try {
      const response = await fetch(`/api/v1/submissions/${submissionId}/custom-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt }),
      })

      if (!response.ok) {
        throw new Error("Failed to save custom prompt")
      }

      return true
    } catch (err) {
      console.error("Failed to save custom prompt:", err)
      return false
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <section ref={sectionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-black" id="process-flow">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-4xl md:text-5xl font-bold mb-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <span className="text-white">The </span>
          <span className="text-[#F59E0B]">Process</span>
        </motion.h2>

        {/* Stepper */}
        <div className="flex flex-col md:flex-row items-center justify-center mb-12 gap-4 md:gap-8">
          {[1, 2, 3].map((step) => {
            const isCompleted = completedSteps.includes(step)
            const isCurrent = currentStep === step
            // Step is clickable only if all previous steps are completed
            const isClickable = 
              step === 1 || 
              (step === 2 && completedSteps.includes(1) && paymentStatus === "paid") ||
              (step === 3 && completedSteps.includes(1) && completedSteps.includes(2) && paymentStatus === "paid" && (uploadedFiles.length > 0 || submissionId))
            
            return (
              <div key={step} className="flex flex-col md:flex-row items-center w-full md:w-auto">
                {/* Mobile: Vertical layout with hand on left */}
                <div className="flex md:hidden items-center w-full gap-4">
                  {/* Pointing Hand Emoji with Animation - Mobile (Left side) */}
                  {isCurrent && (
                    <motion.div
                      className="text-3xl"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        animate={{
                          x: [0, 8, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
                      >
                        👉
                      </motion.div>
                    </motion.div>
                  )}
                  {!isCurrent && <div className="w-10" />}
                  
                  <div className="flex flex-col items-center flex-1">
                    <motion.div
                      className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl border-4 cursor-pointer transition-all ${
                        isCompleted
                          ? "bg-green-500 text-white border-green-500"
                          : isCurrent
                            ? "bg-white text-[#B45309] border-[#F59E0B]"
                            : "bg-gray-700 text-gray-400 border-gray-600"
                      } ${isClickable ? "hover:scale-110 cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                      onClick={() => {
                        if (!isClickable) {
                          // Show error message based on which step is missing
                          if (step === 2) {
                            setError("Please complete Step 1 (Purchase) first before proceeding to Step 2.")
                          } else if (step === 3) {
                            if (!completedSteps.includes(1) || paymentStatus !== "paid") {
                              setError("Please complete Step 1 (Purchase) first before proceeding to Step 3.")
                            } else if (!completedSteps.includes(2) || (uploadedFiles.length === 0 && !submissionId)) {
                              setError("Please complete Step 2 (Upload) first before proceeding to Step 3.")
                            }
                          }
                          setTimeout(() => {
                            sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                          }, 100)
                          return
                        }
                        
                        // Only allow navigation if previous steps are completed
                        if (step === 1) {
                          setCurrentStep(1)
                          setError(null)
                        } else if (step === 2) {
                          // Only allow if step 1 is completed
                          if (completedSteps.includes(1) && paymentStatus === "paid") {
                            setCurrentStep(2)
                            setError(null)
                          } else {
                            setError("Please complete Step 1 (Purchase) first before proceeding to Step 2.")
                          }
                        } else if (step === 3) {
                          // Only allow if steps 1 and 2 are completed
                          if (!completedSteps.includes(1) || paymentStatus !== "paid") {
                            setError("Please complete Step 1 (Purchase) first before proceeding to Step 3.")
                          } else if (!completedSteps.includes(2) || (uploadedFiles.length === 0 && !submissionId)) {
                            setError("Please complete Step 2 (Upload) first before proceeding to Step 3.")
                          } else {
                            setCurrentStep(3)
                            setError(null)
                          }
                        }
                        setTimeout(() => {
                          sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                        }, 100)
                      }}
                      whileHover={isClickable ? { scale: 1.1 } : {}}
                      whileTap={isClickable ? { scale: 0.95 } : {}}
                    >
                      {isCompleted ? <Check size={32} /> : step}
                    </motion.div>
                    <div className="mt-2 text-sm font-medium text-white text-center italic">
                      {step === 1 && "Purchase"}
                      {step === 2 && "Upload"}
                      {step === 3 && "Contact"}
                    </div>
                  </div>
                </div>

                {/* Desktop: Horizontal layout with hand above */}
                <div className="hidden md:flex items-center">
                  <div className="flex flex-col items-center relative">
                    <motion.div
                      className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl border-4 cursor-pointer transition-all ${
                        isCompleted
                          ? "bg-green-500 text-white border-green-500"
                          : isCurrent
                            ? "bg-white text-[#B45309] border-[#F59E0B]"
                            : "bg-gray-700 text-gray-400 border-gray-600"
                      } ${isClickable ? "hover:scale-110 cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                      onClick={() => {
                        if (!isClickable) {
                          // Show error message based on which step is missing
                          if (step === 2) {
                            setError("Please complete Step 1 (Purchase) first before proceeding to Step 2.")
                          } else if (step === 3) {
                            if (!completedSteps.includes(1) || paymentStatus !== "paid") {
                              setError("Please complete Step 1 (Purchase) first before proceeding to Step 3.")
                            } else if (!completedSteps.includes(2) || (uploadedFiles.length === 0 && !submissionId)) {
                              setError("Please complete Step 2 (Upload) first before proceeding to Step 3.")
                            }
                          }
                          setTimeout(() => {
                            sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                          }, 100)
                          return
                        }
                        
                        // Only allow navigation if previous steps are completed
                        if (step === 1) {
                          setCurrentStep(1)
                          setError(null)
                        } else if (step === 2) {
                          // Only allow if step 1 is completed
                          if (completedSteps.includes(1) && paymentStatus === "paid") {
                            setCurrentStep(2)
                            setError(null)
                          } else {
                            setError("Please complete Step 1 (Purchase) first before proceeding to Step 2.")
                          }
                        } else if (step === 3) {
                          // Only allow if steps 1 and 2 are completed
                          if (!completedSteps.includes(1) || paymentStatus !== "paid") {
                            setError("Please complete Step 1 (Purchase) first before proceeding to Step 3.")
                          } else if (!completedSteps.includes(2) || (uploadedFiles.length === 0 && !submissionId)) {
                            setError("Please complete Step 2 (Upload) first before proceeding to Step 3.")
                          } else {
                            setCurrentStep(3)
                            setError(null)
                          }
                        }
                        setTimeout(() => {
                          sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                        }, 100)
                      }}
                      whileHover={isClickable ? { scale: 1.1 } : {}}
                      whileTap={isClickable ? { scale: 0.95 } : {}}
                    >
                      {isCompleted ? <Check size={32} /> : step}
                    </motion.div>
                    {/* Pointing Hand Emoji with Animation - Desktop (Above) */}
                    {isCurrent && (
                      <motion.div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 text-3xl"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.div
                          animate={{
                            y: [0, 8, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
                        >
                          👇
                        </motion.div>
                      </motion.div>
                    )}
                    <div className="mt-2 text-sm font-medium text-white text-center italic">
                      {step === 1 && "Purchase"}
                      {step === 2 && "Upload"}
                      {step === 3 && "Contact"}
                    </div>
                  </div>
                </div>

                {/* Connecting Lines */}
                {step < 3 && (
                  <>
                    {/* Mobile: Vertical line */}
                    <div
                      className={`md:hidden w-0.5 h-16 my-2 transition-colors ${
                        completedSteps.includes(step + 1) || currentStep > step ? "bg-green-500" : "bg-white/30"
                      }`}
                    />
                    {/* Desktop: Horizontal line */}
                    <div
                      className={`hidden md:block h-0.5 w-16 md:w-24 mx-4 transition-colors ${
                        completedSteps.includes(step + 1) || currentStep > step ? "bg-green-500" : "bg-white/30"
                      }`}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
        )}

        {/* Step 1: Purchase */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#1a1a1a] rounded-xl p-8 border border-[#B45309]"
            >
              <div className="text-center mb-8">
                <CreditCard className="mx-auto mb-4 text-[#F59E0B]" size={48} />
                <h3 className="text-2xl font-bold text-white mb-4">STEP 1 — Purchase Your AI Clone</h3>
              </div>

              <div className="space-y-4">
                {PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="border-2 border-[#B45309] rounded-lg p-6 hover:border-[#F59E0B] transition-colors"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xl font-bold text-white">{pkg.name}</h4>
                      <span className="text-2xl font-bold text-[#F59E0B]">${pkg.amount}</span>
                    </div>
                    <button
                      onClick={() => handleCheckout(pkg.id, pkg.amount)}
                      disabled={loading}
                      className="w-full py-3 bg-[#B45309] text-white rounded-lg font-semibold hover:bg-[#92400E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin" size={20} />
                          Processing...
                        </span>
                      ) : (
                        "Pay & Unlock"
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {paymentStatus === "pending" && orderId && (
                <div className="mt-6 p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg text-center">
                  <p className="text-yellow-200">Waiting for payment confirmation...</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Record & Upload Video + Write Script */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#1a1a1a] rounded-xl p-8 border border-[#B45309]"
            >
              <div className="text-center mb-8">
                <Upload className="mx-auto mb-4 text-[#F59E0B]" size={48} />
                <h3 className="text-2xl font-bold text-white mb-4">STEP 2 — Upload Video</h3>
                <p className="text-gray-400">Payment confirmed — please record yourself following the script below and upload your video</p>
              </div>

              <div className="space-y-6">
                {/* Script Display */}
                <div className="bg-[#2a2a2a] border border-[#B45309] rounded-lg p-6">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Please record yourself following this script:
                  </label>
                  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#92400E]">
                    <p className="text-white whitespace-pre-line leading-relaxed text-base">{RECORDING_SCRIPT}</p>
                  </div>
                  <p className="mt-3 text-sm text-gray-400">
                    Record in a quiet room. Keep camera at eye level. Speak clearly and naturally.
                  </p>
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Upload Your Recording <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-[#B45309] rounded-lg p-8 text-center hover:border-[#F59E0B] transition-colors">
                    <input
                      type="file"
                      accept=".mp4,.mov"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload-step2"
                    />
                    <label htmlFor="file-upload-step2" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload size={32} className="text-gray-400" />
                      <span className="text-gray-300">Drag & drop or click to select</span>
                      <span className="text-sm text-gray-500">Max 2GB per file (.mp4 or .mov)</span>
                    </label>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">Selected File:</h4>
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg"
                      >
                        <span className="text-sm text-gray-300">{file.name}</span>
                        <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="p-4 bg-green-900/50 border border-green-600 rounded-lg">
                    <p className="text-green-200 font-semibold mb-2">✓ Video uploaded successfully!</p>
                    <p className="text-green-300 text-sm">Proceed to the next step to provide your contact information and script.</p>
                  </div>
                )}

                <button
                  onClick={async () => {
                    if (files.length === 0 && uploadedFiles.length === 0) {
                      setError("Please upload your video recording")
                      return
                    }

                    setLoading(true)
                    setError(null)
                    
                    try {
                      let currentSubmissionId = submissionId
                      
                      // Upload video first if not already uploaded
                      if (files.length > 0) {
                        const newSubmissionId = await handleUpload()
                        if (newSubmissionId) {
                          currentSubmissionId = newSubmissionId
                          setSubmissionId(newSubmissionId) // Update state for future use
                        } else {
                          throw new Error("Failed to upload video. Please try again.")
                        }
                      } else if (uploadedFiles.length > 0 && !currentSubmissionId) {
                        // Files already uploaded but submissionId missing (e.g., page refresh)
                        // Try to fetch submission from order
                        if (orderId) {
                          try {
                            const orderResponse = await fetch(`/api/v1/orders/${orderId}`)
                            if (orderResponse.ok) {
                              const orderData = await orderResponse.json()
                              // Try to get submissionId from order's submissions
                              // For now, we'll need to create a new submission or fetch existing one
                              // This is an edge case - ideally submissionId should be persisted
                              throw new Error("Please upload your video again or refresh the page.")
                            }
                          } catch (fetchErr) {
                            // Fall through to error below
                          }
                        }
                        throw new Error("Submission not found. Please upload your video again.")
                      }
                      
                      // Ensure we have a submissionId before proceeding
                      if (!currentSubmissionId) {
                        throw new Error("Submission not found. Please upload your video first.")
                      }
                      
                      // Move to step 3 after upload is complete
                      setCompletedSteps([1, 2])
                      setCurrentStep(3)
                      setTimeout(() => {
                        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }, 300)
                    } catch (err: any) {
                      setError(err.message || "Failed to upload. Please try again.")
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || (files.length === 0 && uploadedFiles.length === 0)}
                  className="w-full py-3 bg-[#B45309] text-white rounded-lg font-semibold hover:bg-[#92400E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      Uploading...
                    </span>
                  ) : (
                    "Continue to Contact Information"
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Contact Information */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#1a1a1a] rounded-xl p-8 border border-[#B45309]"
            >
              <div className="text-center mb-8">
                <User className="mx-auto mb-4 text-[#F59E0B]" size={48} />
                <h3 className="text-2xl font-bold text-white mb-4">STEP 3 — Contact Information</h3>
                <p className="text-gray-400">Please provide your contact information and script description to complete the process</p>
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
                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#B45309] text-white rounded-lg focus:outline-none focus:border-[#F59E0B]"
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
                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#B45309] text-white rounded-lg focus:outline-none focus:border-[#F59E0B]"
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
                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#B45309] text-white rounded-lg focus:outline-none focus:border-[#F59E0B]"
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Script/Prompt Description for Your AI Avatar <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#B45309] text-white rounded-lg focus:outline-none focus:border-[#F59E0B] resize-none"
                    placeholder="Write the script or prompt description you want your AI avatar to say. For example: 'Hello! Welcome to our real estate services. I'm here to help you find your dream home...'"
                  />
                  <p className="mt-2 text-sm text-gray-400">
                    This description will be used to generate your AI avatar's speech. Be clear and specific.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (!name.trim() || !email.trim() || !phone.trim()) {
                      setError("Please fill in all contact information fields")
                      return
                    }

                    if (!customPrompt.trim()) {
                      setError("Please write a script description for your AI avatar")
                      return
                    }

                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!emailRegex.test(email)) {
                      setError("Please enter a valid email address")
                      return
                    }

                    setLoading(true)
                    setError(null)
                    
                    try {
                      let currentSubmissionId = submissionId
                      
                      // Ensure we have a submissionId
                      if (!currentSubmissionId) {
                        throw new Error("Submission not found. Please go back and upload your video first.")
                      }

                      // Save custom prompt first
                      const promptResponse = await fetch(`/api/v1/submissions/${currentSubmissionId}/custom-prompt`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ customPrompt: customPrompt.trim() }),
                      })

                      if (!promptResponse.ok) {
                        throw new Error("Failed to save script description")
                      }

                      // Update order with contact information
                      if (orderId) {
                        const response = await fetch(`/api/v1/orders/${orderId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            buyer: {
                              name: name.trim(),
                              email: email.trim(),
                              phone: phone.trim(),
                            },
                          }),
                        })

                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({ error: "Failed to save contact information" }))
                          throw new Error(errorData.error || "Failed to save contact information")
                        }
                      }

                      setCompletedSteps([1, 2, 3])
                      setError(null)
                    } catch (err: any) {
                      setError(err.message || "Failed to save. Please try again.")
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !name.trim() || !email.trim() || !phone.trim() || !customPrompt.trim()}
                  className="w-full py-3 bg-[#B45309] text-white rounded-lg font-semibold hover:bg-[#92400E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      Saving...
                    </span>
                  ) : (
                    "Complete & Submit"
                  )}
                </button>

                {completedSteps.includes(3) && (
                  <div className="p-4 bg-green-900/50 border border-green-600 rounded-lg">
                    <p className="text-green-200 font-semibold mb-2">✓ All steps completed!</p>
                    <p className="text-green-300 text-sm">
                      Your video has been uploaded, your script has been saved, and your contact information has been recorded. Our team will process your AI avatar and contact you soon.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

