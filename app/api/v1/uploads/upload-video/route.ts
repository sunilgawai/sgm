import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Submission from "@/lib/models/Submission"
import getCloudinary from "@/lib/cloudinary"

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const formData = await request.formData()
    const file = formData.get("file") as File
    const submissionId = formData.get("submissionId") as string

    if (!file || !submissionId) {
      return NextResponse.json({ error: "Missing file or submissionId" }, { status: 400 })
    }

    console.log("file.type:", file.type);
    console.log("file.name:", file.name);
    console.log("file.size:", file.size);

    
    // Validate file type
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)
    const allowedTypes = [".mp4", ".mov", ".webm"];
    if (!ext || !allowedTypes.includes(ext[0])) {
      return NextResponse.json({ error: `Invalid file type: ${file.name}` }, { status: 400 })
    }

    // Validate file size (2GB max)
    const maxSize = 2 * 1024 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 })
    }

    // Check submission exists
    const submission = await Submission.findById(submissionId)
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // Upload to Cloudinary
    const cloudinary = getCloudinary()
    
    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: `submissions/${submissionId}`,
          public_id: `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`,
          // allowed_formats: ["mp4", "mov", "webm"],
          // folder: `submissions/${submissionId}`,
          // public_id: `${submissionId}/${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      uploadStream.end(buffer)
    })

    const uploadData = uploadResult

    if (!uploadData.secure_url || !uploadData.public_id) {
      return NextResponse.json({ error: "Failed to upload to Cloudinary" }, { status: 500 })
    }

    // Add video to submission
    const newVideo = {
      url: uploadData.secure_url,
      publicId: uploadData.public_id,
      filename: file.name,
      size: file.size,
      uploadedAt: new Date(),
    }

    submission.videos = [...(submission.videos || []), newVideo]

    // Add activity log
    submission.activityLogs = [
      ...(submission.activityLogs || []),
      {
        action: "upload" as const,
        videoUrl: uploadData.secure_url,
        videoFilename: file.name,
        publicId: uploadData.public_id,
        status: "success" as const,
        message: `Video uploaded successfully: ${file.name}`,
        response: {
          url: uploadData.secure_url,
          publicId: uploadData.public_id,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
      },
    ]

    submission.status = "uploaded"
    await submission.save()

    console.log("Video uploaded successfully:", {
      submissionId: submission._id,
      filename: file.name,
      publicId: uploadData.public_id,
    })

    return NextResponse.json({
      success: true,
      video: {
        url: uploadData.secure_url,
        publicId: uploadData.public_id,
        filename: file.name,
        size: file.size,
      },
    })
  } catch (error: any) {
    console.error("Upload video error:", error)
    return NextResponse.json({ error: error.message || "Failed to upload video" }, { status: 500 })
  }
}

