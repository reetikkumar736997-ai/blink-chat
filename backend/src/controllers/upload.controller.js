import streamifier from "streamifier";
import { cloudinary } from "../config/cloudinary.js";

export const uploadImage = async (req, res, next) => {
  try {
    const file =
      req.files?.file?.[0] ||
      req.files?.image?.[0] ||
      req.files?.audio?.[0] ||
      req.file;

    if (!file) {
      const error = new Error("File is required");
      error.statusCode = 400;
      throw error;
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "realtime-chat",
          resource_type: "auto"
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(uploadResult);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    res.status(201).json({
      fileUrl: result.secure_url,
      imageUrl: result.secure_url,
      resourceType: result.resource_type,
      publicId: result.public_id
    });
  } catch (error) {
    next(error);
  }
};
