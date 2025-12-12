import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Submission from "@/lib/models/Submission";
import getCloudinary from "@/lib/cloudinary";
import fs from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    await connectDB();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const submissionId = formData.get("submissionId") as string;

    if (!file || !submissionId) {
      return NextResponse.json(
        { error: "Missing file or submissionId" },
        { status: 400 }
      );
    }

    console.log("Received file:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });

    // Validate file type
    const ext = file.name.toLowerCase().match(/\.[^.]+$/);
    const allowedTypes = [".mp4", ".mov", ".webm"];
    if (!ext || !allowedTypes.includes(ext[0])) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.name}` },
        { status: 400 }
      );
    }

    // Validate file size (2GB max)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large: ${file.name}. Maximum size is 2GB` },
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

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cloudinary = getCloudinary();
    const fileSizeInMB = file.size / (1024 * 1024);
    let uploadResult: any;

    // For files larger than 20MB, use chunked upload
    if (fileSizeInMB > 20) {
      console.log(
        `Using chunked upload for large file (${fileSizeInMB.toFixed(2)} MB)`
      );

      // Save to temporary file
      const tempDir = os.tmpdir();
      const tempFileName = `upload_${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;
      tempFilePath = path.join(tempDir, tempFileName);

      await fs.promises.writeFile(tempFilePath, buffer);
      console.log(`Saved to temp file: ${tempFilePath}`);
      console.log(`File stats:`, {
        exists: fs.existsSync(tempFilePath),
        size: fs.statSync(tempFilePath).size,
        sizeOnDisk: `${(fs.statSync(tempFilePath).size / 1024 / 1024).toFixed(
          2
        )} MB`,
      });

      // Try upload_large first
      try {
        console.log("Attempting upload_large...");

        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_large(
            tempFilePath as string,
            {
              resource_type: "video",
              folder: `submissions/${submissionId}`,
              public_id: `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`,
              chunk_size: 6000000, // 6MB chunks
              timeout: 600000, // 10 minutes
            },
            (error: any, result: any) => {
              if (error) {
                console.error("upload_large callback error:", error);
                reject(error);
              } else {
                console.log("upload_large callback success:", {
                  hasResult: !!result,
                  hasSecureUrl: !!result?.secure_url,
                  hasPublicId: !!result?.public_id,
                });
                resolve(result);
              }
            }
          );
        });

        console.log("upload_large completed:", {
          hasResult: !!uploadResult,
          publicId: uploadResult?.public_id,
          secureUrl: uploadResult?.secure_url ? "present" : "missing",
        });

        if (
          !uploadResult ||
          !uploadResult.secure_url ||
          !uploadResult.public_id
        ) {
          throw new Error(
            `upload_large returned incomplete result: ${JSON.stringify(
              uploadResult
            )}`
          );
        }
      } catch (uploadLargeError: any) {
        console.error(
          "upload_large failed, trying fallback method:",
          uploadLargeError
        );

        // Fallback: Use upload with file system read stream
        console.log("Attempting fallback upload method...");

        uploadResult = await new Promise((resolve, reject) => {
          const readStream = fs.createReadStream(tempFilePath as string);

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "video",
              folder: `submissions/${submissionId}`,
              public_id: `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`,
              timeout: 600000,
              chunk_size: 6000000,
            },
            (error: any, result: any) => {
              if (error) {
                console.error("Fallback upload error:", error);
                reject(error);
              } else {
                console.log("Fallback upload success");
                resolve(result);
              }
            }
          );

          readStream.pipe(uploadStream);

          readStream.on("error", (err) => {
            console.error("Read stream error:", err);
            reject(err);
          });
        });
      }
    } else {
      console.log(
        `Using stream upload for small file (${fileSizeInMB.toFixed(2)} MB)`
      );

      // Use upload_stream for smaller files
      uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: `submissions/${submissionId}`,
            public_id: `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`,
            timeout: 300000, // 5 minutes timeout
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload_stream error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        uploadStream.end(buffer);
      });
    }

    if (!uploadResult || !uploadResult.secure_url || !uploadResult.public_id) {
      throw new Error(
        `Failed to get upload URL from Cloudinary. Response: ${JSON.stringify(
          uploadResult
        )}`
      );
    }

    console.log("Upload successful:", {
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });

    // Add video to submission
    const newVideo = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      filename: file.name,
      size: file.size,
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
        message: `Video uploaded successfully: ${
          file.name
        } (${fileSizeInMB.toFixed(2)} MB)`,
        response: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadMethod: fileSizeInMB > 20 ? "chunked" : "stream",
        },
        timestamp: new Date(),
      },
    ];

    submission.status = "uploaded";
    await submission.save();

    console.log("Video saved to database:", {
      submissionId: submission._id,
      filename: file.name,
      publicId: uploadResult.public_id,
    });

    // Clean up temp file if it was created
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
        console.log(`Cleaned up temp file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error("Failed to clean up temp file:", cleanupError);
      }
    }

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
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      cloudinaryError: error.error,
    });

    // Clean up temp file if it exists and there was an error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
        console.log(`Cleaned up temp file after error: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up temp file after error:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to upload video",
        details: error.error?.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
