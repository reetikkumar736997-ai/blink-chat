import { cloudinary } from "../config/cloudinary.js";

export const deleteMessageMedia = async (message) => {
  const destroyRequests = [];

  if (message.imagePublicId) {
    destroyRequests.push(
      cloudinary.uploader.destroy(message.imagePublicId, {
        resource_type: message.imageResourceType || "image"
      })
    );
  }

  if (message.audioPublicId) {
    destroyRequests.push(
      cloudinary.uploader.destroy(message.audioPublicId, {
        resource_type: message.audioResourceType || "video"
      })
    );
  }

  await Promise.allSettled(destroyRequests);
};
