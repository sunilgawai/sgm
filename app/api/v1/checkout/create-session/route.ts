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
  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your .env file." },
        { status: 500 }
      )
    }

    if (!process.env.MONGO_URL) {
      return NextResponse.json(
        { error: "Database is not configured. Please add MONGO_URL to your .env file." },
        { status: 500 }
      )
    }

    await connectDB()

    const body = await request.json()
    const { packageId, amount, currency, buyer } = body

    if (!packageId || !amount || !buyer?.email || !buyer?.phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create order
    const order = await Order.create({
      packageId,
      amount,
      currency: currency || "usd",
      buyer: {
        email: buyer.email,
        phone: buyer.phone,
        name: buyer.name,
      },
      paymentStatus: "pending",
    })

    // Create Stripe checkout session
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency || "usd",
            product_data: {
              name: `AI Clone Package ${packageId}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.APP_BASE_URL || "http://localhost:3000"}/ai-clone?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL || "http://localhost:3000"}/ai-clone`,
      metadata: {
        orderId: order._id.toString(),
        email: buyer.email,
        phone: buyer.phone,
      },
    })

    // Update order with session ID
    order.stripeSessionId = session.id
    await order.save()

    return NextResponse.json({
      url: session.url,
      orderId: order._id.toString(),
    })
  } catch (error: any) {
    console.error("Checkout error:", error)
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 })
  }
}

