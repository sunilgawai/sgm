# AI Clone Flow Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# MongoDB
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# App
APP_BASE_URL=https://yourdomain.com
```

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Set up a webhook endpoint:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `${APP_BASE_URL}/api/v1/webhooks/stripe` (e.g., `https://signatureglobalmedia.com/api/v1/webhooks/stripe`)
   - **Important:** Use the same `APP_BASE_URL` value from your `.env.local` file
   - Select events: `checkout.session.completed` and `payment_intent.succeeded`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 3. Cloudinary Setup

1. Create a Cloudinary account at https://cloudinary.com
2. Get your credentials from the Dashboard
3. Create an unsigned upload preset:
   - Go to Settings → Upload → Upload presets
   - Create a new unsigned preset named `unsigned_preset`
   - Set folder to `submissions/` (optional)
   - Enable "Use filename" if you want to keep original filenames

### 4. MongoDB Setup

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string and replace `<password>` with your actual password
4. Add your IP address to the whitelist

### 5. Run the Application

```bash
npm run dev
```

## API Endpoints

### Public Endpoints

- `POST /api/v1/checkout/create-session` - Create Stripe checkout session
- `GET /api/v1/orders/confirm?session_id={id}` - Confirm order payment status
- `POST /api/v1/orders/:orderId/submission` - Create submission after payment
- `POST /api/v1/uploads/callback` - Callback after file upload
- `POST /api/v1/submissions/:submissionId/custom-prompt` - Save custom prompt

### Admin Endpoints (Protected)

- `GET /api/v1/admin/submissions` - List all submissions
- `GET /api/v1/admin/submissions/:id` - Get submission details
- `POST /api/v1/admin/submissions/:id/set-processed` - Mark submission as processed

**Note:** Admin endpoints currently use a simple authorization header check. Implement proper JWT authentication for production.

## Flow Overview

1. **Step 1 - Purchase**: User selects package and pays via Stripe
2. **Step 2 - Contact & Script**: After payment confirmation, user fills form with email, phone, and script
3. **Step 3 - Upload**: User uploads raw video files (.mp4 or .mov, max 2GB each)

## Database Schemas

### Order
- `packageId`: Package identifier
- `amount`: Payment amount
- `currency`: Currency code (default: "usd")
- `stripeSessionId`: Stripe checkout session ID
- `paymentStatus`: "pending" | "paid" | "failed"
- `buyer`: { email, phone, name? }
- `createdAt`: Timestamp

### Submission
- `orderId`: Reference to Order
- `scriptText`: User's script (min 10 chars)
- `customPrompt`: Optional custom prompt
- `greenScreen`: Boolean flag
- `videos`: Array of { url, filename, size, uploadedAt }
- `status`: "awaiting_upload" | "uploaded" | "processing" | "ready" | "delivered" | "failed"
- `adminNotes`: Admin notes
- `processedVideoUrl`: Final processed video URL
- `createdAt`, `updatedAt`: Timestamps

## Admin Process

1. Admin logs into protected admin panel
2. Views new submissions via `/api/v1/admin/submissions`
3. Downloads raw footage from submission
4. Edits/processes video
5. Uploads final video to Cloudinary/S3
6. Updates submission via `/api/v1/admin/submissions/:id/set-processed` with `processedVideoUrl`
7. Manually contacts user via email/WhatsApp (outside system)

## Security Notes

- All Stripe secrets must be kept in `.env.local` (never commit to git)
- Webhook signature verification is implemented
- File uploads are validated for type (.mp4, .mov) and size (max 2GB)
- Admin endpoints need proper authentication (currently placeholder)
- Use signed upload URLs in production for better security

