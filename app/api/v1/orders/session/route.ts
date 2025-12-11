import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/lib/models/Order";
import Submission from "@/lib/models/Submission";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Find associated submission if exists
    const submission = await Submission.findOne({ orderId: order._id });

    // Return session data
    return NextResponse.json({
      success: true,
      session: {
        orderId: order._id.toString(),
        paymentStatus: order.paymentStatus,
        buyer: order.buyer,
        submissionId: submission?._id.toString() || null,
        submissionStatus: submission?.status || null,
        hasVideos: submission?.videos && submission.videos.length > 0,
        customPrompt: submission?.customPrompt || null,
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Session retrieval error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
