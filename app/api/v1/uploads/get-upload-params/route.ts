import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Submission from "@/lib/models/Submission";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { submissionId, filename, fileSize } = body;

    if (!submissionId || !filename) {
      return NextResponse.json(
        { error: "Missing submissionId or filename" },
        { status: 400 }
      );
    }

    // Validate submission exists
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Validate file size (2GB max)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2GB." },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = filename.toLowerCase().match(/\.[^.]+$/);
    const allowedTypes = [".mp4", ".mov", ".webm"];
    if (!ext || !allowedTypes.includes(ext[0])) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate upload parameters
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `submissions/${submissionId}`;
    const publicId = `${Date.now()}_${filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")}`;

    // Create signature for the upload
    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      success: true,
      uploadParams: {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder,
        publicId,
      },
      // Include threshold for client to decide upload method
      chunkedUploadThreshold: 20 * 1024 * 1024, // 20MB
    });
  } catch (error: any) {
    console.error("Get upload params error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get upload parameters" },
      { status: 500 }
    );
  }
}
