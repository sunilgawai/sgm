import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Submission from "@/lib/models/Submission";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary - use CLOUDINARY_CLOUD_NAME (not NEXT_PUBLIC_)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Threshold for chunked upload (20MB)
const CHUNKED_UPLOAD_THRESHOLD = 20 * 1024 * 1024;
// Maximum file size (2GB)
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Debug: Log environment variables
    console.log("Cloudinary config check:", {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? "SET" : "MISSING",
      apiKey: process.env.CLOUDINARY_API_KEY ? "SET" : "MISSING",
      apiSecret: process.env.CLOUDINARY_API_SECRET ? "SET" : "MISSING",
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const submissionId = formData.get("submissionId") as string;

    if (!file || !submissionId) {
      return NextResponse.json(
        { error: "Missing file or submissionId" },
        { status: 400 }
      );
    }

    console.log("Upload request received:", {
      filename: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
    });

    // Validate file type
    const ext = file.name.toLowerCase().match(/\.[^.]+$/);
    const allowedTypes = [".mp4", ".mov", ".webm"];
    if (!ext || !allowedTypes.includes(ext[0])) {
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.name}. Allowed: ${allowedTypes.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${file.name}. Maximum size is 2GB.` },
        { status: 400 }
      );
    }

    // Check submission exists
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // For large files, return upload params for client-side chunked upload
    if (file.size > CHUNKED_UPLOAD_THRESHOLD) {
      console.log(
        `File size ${(file.size / 1024 / 1024).toFixed(
          2
        )}MB exceeds threshold, using chunked upload`
      );

      const timestamp = Math.round(Date.now() / 1000);
      const folder = `submissions/${submissionId}`;
      const publicId = `${Date.now()}_${file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "_")}`;

      const paramsToSign = {
        folder,
        public_id: publicId,
        timestamp,
      };

      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET!
      );

      // Log the params for debugging
      console.log("Chunked upload params:", {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
        publicId,
        timestamp,
      });

      return NextResponse.json({
        useChunkedUpload: true,
        uploadParams: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
          apiKey: process.env.CLOUDINARY_API_KEY!,
          timestamp,
          signature,
          folder,
          publicId,
        },
      });
    }

    // For smaller files, upload directly through the server
    console.log("Uploading small file directly to Cloudinary...");

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: `submissions/${submissionId}`,
          public_id: `${Date.now()}_${file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[^a-zA-Z0-9-_]/g, "_")}`,
          timeout: 120000, // 2 minute timeout for small files
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

      uploadStream.end(buffer);
    });

    if (!uploadResult.secure_url || !uploadResult.public_id) {
      return NextResponse.json(
        { error: "Failed to upload to Cloudinary" },
        { status: 500 }
      );
    }

    // Add video to submission
    const newVideo = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      filename: file.name,
      size: file.size,
      duration: uploadResult.duration,
      width: uploadResult.width,
      height: uploadResult.height,
      uploadedAt: new Date(),
    };

    submission.videos = [...(submission.videos || []), newVideo];

    // Add activity log
    submission.activityLogs = [
      ...(submission.activityLogs || []),
      {
        action: "upload" as const,
        videoUrl: uploadResult.secure_url,
        videoFilename: file.name,
        publicId: uploadResult.public_id,
        status: "success" as const,
        message: `Video uploaded successfully: ${file.name}`,
        response: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          size: file.size,
          duration: uploadResult.duration,
          uploadedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
      },
    ];

    submission.status = "uploaded";
    await submission.save();

    console.log("Video uploaded successfully:", {
      submissionId: submission._id,
      filename: file.name,
      publicId: uploadResult.public_id,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });

    return NextResponse.json({
      success: true,
      video: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        filename: file.name,
        size: file.size,
      },
    });
  } catch (error: any) {
    console.error("Upload video error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload video" },
      { status: 500 }
    );
  }
}

// Increase body size limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb", // Allow up to 25MB for direct uploads
    },
  },
};
