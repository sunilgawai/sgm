import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Submission from "@/lib/models/Submission";
import { verifyAdminAuth } from "@/lib/auth";
import getCloudinary from "@/lib/cloudinary.old";

export async function DELETE(
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
    const body = await request.json();
    const { videoUrl } = body;

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

    // Find the video in submission
    const video = submission.videos.find((v: any) => v.url === videoUrl);

    if (!video) {
      return NextResponse.json(
        { error: "Video not found in submission" },
        { status: 404 }
      );
    }

    // Get public_id from stored video data
    const publicId = video.publicId;

    if (!publicId) {
      return NextResponse.json(
        { error: "Video public_id not found" },
        { status: 400 }
      );
    }

    // Delete from Cloudinary first
    let deleteResult: any = null;
    let deleteSuccess = false;

    try {
      const cloudinary = getCloudinary();

      console.log("Deleting Cloudinary video with public_id:", publicId);

      deleteResult = await cloudinary.uploader.destroy(publicId, {
        resource_type: "video",
      });

      console.log("Cloudinary deletion result:", deleteResult);

      if (deleteResult.result === "ok" || deleteResult.result === "not found") {
        deleteSuccess = true;
      } else {
        console.warn("Cloudinary deletion returned:", deleteResult.result);
      }
    } catch (cloudinaryError: any) {
      console.error("Error deleting from Cloudinary:", cloudinaryError);

      // Log failed deletion
      submission.activityLogs = [
        ...(submission.activityLogs || []),
        {
          action: "delete",
          videoUrl: videoUrl,
          videoFilename: video.filename,
          publicId: publicId,
          status: "failed",
          message: `Failed to delete video from Cloudinary: ${cloudinaryError.message}`,
          error: cloudinaryError.message,
          response: deleteResult,
          timestamp: new Date(),
          performedBy: "admin",
        },
      ];
      await submission.save();

      return NextResponse.json(
        {
          error: `Failed to delete from Cloudinary: ${cloudinaryError.message}`,
        },
        { status: 500 }
      );
    }

    // Remove video from submission after successful Cloudinary deletion
    submission.videos = submission.videos.filter(
      (v: any) => v.url !== videoUrl
    );

    // If no videos left, update status
    if (submission.videos.length === 0) {
      submission.status = "awaiting_upload";
    }

    // Log successful deletion
    submission.activityLogs = [
      ...(submission.activityLogs || []),
      {
        action: "delete",
        videoUrl: videoUrl,
        videoFilename: video.filename,
        publicId: publicId,
        status: "success",
        message: `Video deleted successfully: ${video.filename}`,
        response: deleteResult,
        timestamp: new Date(),
        performedBy: "admin",
      },
    ];

    await submission.save();

    console.log(
      "Video removed from submission. Remaining videos:",
      submission.videos.length
    );

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete video error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete video" },
      { status: 500 }
    );
  }
}
