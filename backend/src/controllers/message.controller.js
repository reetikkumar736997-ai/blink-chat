import Message from "../models/Message.js";
import { deleteMessageMedia } from "../utils/mediaCleanup.js";

export const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

export const markConversationRead = async (req, res, next) => {
  try {
    const { userId } = req.params;

    await Message.updateMany(
      {
        senderId: userId,
        receiverId: req.user._id,
        status: { $ne: "read" }
      },
      {
        $set: {
          status: "read",
          readAt: new Date()
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message || message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages." });
    }

    await deleteMessageMedia(message);
    await Message.deleteOne({ _id: message._id });

    const io = req.app.get("io");
    io?.to(message.senderId.toString()).emit("message:deleted", {
      messageId: message._id.toString()
    });
    io?.to(message.receiverId.toString()).emit("message:deleted", {
      messageId: message._id.toString()
    });

    res.json({ success: true, messageId: message._id.toString() });
  } catch (error) {
    next(error);
  }
};
