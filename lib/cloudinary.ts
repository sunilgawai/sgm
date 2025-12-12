import { v2 as cloudinary, ConfigOptions } from "cloudinary";

// Lazy initialization - only configures when actually used
let isConfigured = false;

function configureCloudinary() {
  if (isConfigured) return;

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Please add Cloudinary credentials to your .env file");
  }

  const config: ConfigOptions = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    // Add additional config for better large file handling
    secure: true,
    upload_timeout: 600000, // 10 minutes for large files
  };

  cloudinary.config(config);

  console.log("Cloudinary configured successfully:", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    secure: true,
  });

  isConfigured = true;
}

// Export a function that ensures cloudinary is configured before use
const getCloudinary = () => {
  configureCloudinary();
  return cloudinary;
};

export default getCloudinary;
