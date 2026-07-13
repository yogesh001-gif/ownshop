import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function hasCloudinaryConfiguration() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}

export function signedInvoiceUrl(publicId: string, version?: number) {
  return cloudinary.url(publicId, {
    resource_type: 'image',
    type: 'authenticated',
    secure: true,
    sign_url: true,
    version,
  });
}

export { cloudinary };
