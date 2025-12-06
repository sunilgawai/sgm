import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Order from "@/lib/models/Order"
import Submission from "@/lib/models/Submission"

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    await connectDB()

    const { orderId } = await params
    const body = await request.json()
    const { scriptText, greenScreen, email, phone, name } = body

    // Validate order exists and is paid
    const order = await Order.findById(orderId)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.paymentStatus !== "paid") {
      return NextResponse.json({ error: "Order not paid" }, { status: 400 })
    }

    // Validate script
    if (!scriptText || scriptText.length < 10) {
      return NextResponse.json({ error: "Script must be at least 10 characters" }, { status: 400 })
    }

    // Validate email and phone
    if (!email || !phone) {
      return NextResponse.json({ error: "Email and phone are required" }, { status: 400 })
    }

    // Update order with real buyer information from the form
    order.buyer.email = email
    order.buyer.phone = phone
    // Use provided name, or extract from email if not provided
    if (name && name.trim()) {
      order.buyer.name = name.trim()
    } else if (!order.buyer.name || order.buyer.name === "N/A" || order.buyer.name.includes("customer@")) {
      const emailName = email.split("@")[0]
      // Capitalize first letter of each word
      order.buyer.name = emailName
        .split(/[._-]/)
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    }
    await order.save()

    // Create submission
    const submission = await Submission.create({
      orderId: order._id,
      scriptText,
      greenScreen: greenScreen || false,
      status: "awaiting_upload",
    })

    // Generate signed upload URLs (using Cloudinary unsigned upload preset)
    // For production, you might want to use signed URLs with expiration
    const uploadUrls = []

    // Generate upload preset URL for Cloudinary
    // In production, you'd generate signed URLs with expiration
    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`

    uploadUrls.push({
      url: uploadUrl,
      key: `submissions/${submission._id}/video`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    })

    return NextResponse.json({
      submissionId: submission._id.toString(),
      uploadUrls,
    })
  } catch (error: any) {
    console.error("Submission creation error:", error)
    return NextResponse.json({ error: error.message || "Failed to create submission" }, { status: 500 })
  }
}

