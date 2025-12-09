// app/api/v1/uploads/finalize-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Submission from "@/lib/models/Submission";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { submissionId, uploadResult, filename, fileSize } = body;

    if (!submissionId || !uploadResult || !filename) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Add video to submission
    const newVideo = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      filename: filename,
      size: fileSize || uploadResult.bytes || 0,
      uploadedAt: new Date(),
    };
    submission.videos = [...(submission.videos || []), newVideo];

    // Add activity log
    submission.activityLogs = [
      ...(submission.activityLogs || []),
      {
        action: "upload" as const,
        videoUrl: uploadResult.secure_url,
        videoFilename: filename,
        publicId: uploadResult.public_id,
        status: "success" as const,
        message: `Video uploaded successfully (chunked): ${filename}`,
        response: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          size: fileSize || uploadResult.bytes || 0,
          uploadedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
      },
    ];

    submission.status = "uploaded";
    await submission.save();

    console.log("Chunked video upload finalized:", {
      submissionId: submission._id,
      filename: filename,
      publicId: uploadResult.public_id,
    });

    return NextResponse.json({
      success: true,
      video: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        filename: filename,
        size: fileSize || uploadResult.bytes || 0,
      },
    });
  } catch (error: any) {
    console.error("Finalize upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to finalize upload" },
      { status: 500 }
    );
  }
}
