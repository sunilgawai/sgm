import { v2 as cloudinary } from "cloudinary"

// Lazy initialization - only configures when actually used
let isConfigured = false

function configureCloudinary() {
  if (isConfigured) return

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Please add Cloudinary credentials to your .env file")
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  isConfigured = true
}

// Export a function that ensures cloudinary is configured before use
const getCloudinary = () => {
  configureCloudinary()
  return cloudinary
}

export default getCloudinary

