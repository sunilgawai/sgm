import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Submission from "@/lib/models/Submission";
import { verifyAdminAuth } from "@/lib/auth";
import getCloudinary from "@/lib/cloudinary.old";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!verifyAdminAuth(authHeader)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const videoUrl = searchParams.get("url");

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    const submission = await Submission.findById(id);

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Find the video in the submission
    const video = submission.videos.find((v: any) => v.url === videoUrl);

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Use Cloudinary to generate secure download URL
    try {
      const cloudinary = getCloudinary();

      // Generate secure URL for download using the stored public_id
      const downloadUrl = cloudinary.url(video.publicId, {
        resource_type: "video",
        secure: true,
        flags: "attachment",
      });

      // Fetch the video from Cloudinary
      const videoResponse = await fetch(downloadUrl);
      if (!videoResponse.ok) {
        throw new Error("Failed to fetch video from Cloudinary");
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const videoBlob = Buffer.from(videoBuffer);

      // Log successful download
      submission.activityLogs = [
        ...(submission.activityLogs || []),
        {
          action: "download",
          videoUrl: video.url,
          videoFilename: video.filename,
          publicId: video.publicId,
          status: "success",
          message: `Video downloaded successfully: ${video.filename}`,
          response: {
            size: videoBlob.length,
            contentType: "video/mp4",
            downloadedAt: new Date().toISOString(),
          },
          timestamp: new Date(),
          performedBy: "admin",
        },
      ];
      await submission.save();

      // Return the video file
      return new NextResponse(videoBlob, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${
            video.filename || "video.mp4"
          }"`,
          "Content-Length": videoBlob.length.toString(),
        },
      });
    } catch (fetchError: any) {
      console.error("Error downloading video:", fetchError);

      // Log failed download
      submission.activityLogs = [
        ...(submission.activityLogs || []),
        {
          action: "download",
          videoUrl: video.url,
          videoFilename: video.filename,
          publicId: video.publicId,
          status: "failed",
          message: `Failed to download video: ${fetchError.message}`,
          error: fetchError.message,
          timestamp: new Date(),
          performedBy: "admin",
        },
      ];
      await submission.save();

      return NextResponse.json(
        { error: "Failed to download video" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Download video error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download video" },
      { status: 500 }
    );
  }
}
