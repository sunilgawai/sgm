import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import connectDB from "@/lib/db"
import Order from "@/lib/models/Order"

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, { status: 500 })
    }
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    await connectDB()

    if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.metadata?.orderId) {
        const order = await Order.findById(session.metadata.orderId)

        if (order && order.paymentStatus === "pending") {
          order.paymentStatus = "paid"
          await order.save()
          console.log(`Order ${order._id} marked as paid`)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

