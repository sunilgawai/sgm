// app/api/v1/uploads/finalize-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Submission from "@/lib/models/Submission";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { submissionId, uploadResult, filename, fileSize } =
      await request.json();

    if (!submissionId || !uploadResult) {
      return NextResponse.json(
        { error: "Missing submissionId or uploadResult" },
        { status: 400 }
      );
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const newVideo = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      filename: filename || `video-${Date.now()}.webm`,
      size: fileSize || uploadResult.bytes || 0,
      duration: uploadResult.duration,
      width: uploadResult.width,
      height: uploadResult.height,
      uploadedAt: new Date(),
    };

    submission.videos = [...(submission.videos || []), newVideo];
    submission.status = "uploaded";
    await submission.save();

    console.log("Chunked upload finalized:", {
      submissionId,
      publicId: uploadResult.public_id,
    });

    return NextResponse.json({ success: true, video: newVideo });
  } catch (error: any) {
    console.error("Finalize upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to finalize" },
      { status: 500 }
    );
  }
}
