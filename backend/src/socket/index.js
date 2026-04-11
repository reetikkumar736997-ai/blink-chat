import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { deleteMessageMedia } from "../utils/mediaCleanup.js";

const onlineUsers = new Map();

const emitPresence = async (io, userId, isOnline) => {
  const update = {
    isOnline,
    lastSeen: isOnline ? null : new Date()
  };

  await User.findByIdAndUpdate(userId, update);
  io.emit("presence:update", {
    userId,
    ...update
  });
};

export const registerSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = user;
      next();
    } catch (_error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    await emitPresence(io, userId, true);

    socket.on("message:send", async (payload, callback) => {
      try {
        const {
          receiverId,
          text = "",
          image = "",
          imageMeta = null,
          audio = "",
          audioMeta = null,
          replyTo = null
        } = payload;

        if (!receiverId || (!text.trim() && !image && !audio)) {
          throw new Error("Message content is required");
        }

        const receiverSocketId = onlineUsers.get(receiverId);
        const status = receiverSocketId ? "delivered" : "sent";

        const replyPayload =
          replyTo?.messageId && replyTo?.senderId
            ? {
                messageId: replyTo.messageId,
                senderId: replyTo.senderId,
                text: replyTo.text?.trim?.() || "",
                senderName: replyTo.senderName?.trim?.() || "",
                image: replyTo.image || ""
              }
            : null;

        const message = await Message.create({
          senderId: userId,
          receiverId,
          text: text.trim(),
          image,
          imagePublicId: imageMeta?.publicId || "",
          imageResourceType: imageMeta?.resourceType || "",
          audio,
          audioPublicId: audioMeta?.publicId || "",
          audioResourceType: audioMeta?.resourceType || "",
          replyTo: replyPayload,
          status
        });

        const fullMessage = await Message.findById(message._id);

        io.to(userId).emit("message:new", fullMessage);
        io.to(receiverId).emit("message:new", fullMessage);

        callback?.({ success: true, message: fullMessage });
      } catch (error) {
        callback?.({
          success: false,
          message: error.message || "Failed to send message"
        });
      }
    });

    socket.on("typing:start", ({ receiverId }) => {
      io.to(receiverId).emit("typing:update", {
        userId,
        isTyping: true
      });
    });

    socket.on("typing:stop", ({ receiverId }) => {
      io.to(receiverId).emit("typing:update", {
        userId,
        isTyping: false
      });
    });

    socket.on("message:read", async ({ partnerId }) => {
      await Message.updateMany(
        {
          senderId: partnerId,
          receiverId: userId,
          status: { $ne: "read" }
        },
        {
          $set: {
            status: "read",
            readAt: new Date()
          }
        }
      );

      io.to(partnerId).emit("message:read:update", {
        readerId: userId,
        partnerId
      });
    });

    socket.on("message:delete", async ({ messageId }, callback) => {
      try {
        const message = await Message.findById(messageId);

        if (!message || message.senderId.toString() !== userId) {
          throw new Error("You can only delete your own messages.");
        }

        await deleteMessageMedia(message);
        await Message.deleteOne({ _id: message._id });

        io.to(message.senderId.toString()).emit("message:deleted", {
          messageId: message._id.toString()
        });
        io.to(message.receiverId.toString()).emit("message:deleted", {
          messageId: message._id.toString()
        });

        callback?.({ success: true, messageId: message._id.toString() });
      } catch (error) {
        callback?.({
          success: false,
          message: error.message || "Message delete nahi ho paaya."
        });
      }
    });

    socket.on("message:edit", async ({ messageId, text }, callback) => {
      try {
        const message = await Message.findById(messageId);

        if (!message || message.senderId.toString() !== userId) {
          throw new Error("Message not found");
        }

        if (!text?.trim()) {
          throw new Error("Message text is required");
        }

        message.text = text.trim();
        message.editedAt = new Date();
        await message.save();

        io.to(message.senderId.toString()).emit("message:updated", message);
        io.to(message.receiverId.toString()).emit("message:updated", message);

        callback?.({ success: true, message });
      } catch (error) {
        callback?.({
          success: false,
          message: error.message || "Message edit nahi ho paaya."
        });
      }
    });

    socket.on("message:reaction", async ({ messageId, emoji }, callback) => {
      try {
        const message = await Message.findById(messageId);

        if (!message) {
          throw new Error("Message not found");
        }

        const existingReactionIndex = message.reactions.findIndex(
          (reaction) =>
            reaction.userId.toString() === userId && reaction.emoji === emoji
        );

        if (existingReactionIndex >= 0) {
          message.reactions.splice(existingReactionIndex, 1);
        } else {
          message.reactions = message.reactions.filter(
            (reaction) => reaction.userId.toString() !== userId
          );
          message.reactions.push({
            emoji,
            userId
          });
        }

        await message.save();

        io.to(message.senderId.toString()).emit("message:updated", message);
        io.to(message.receiverId.toString()).emit("message:updated", message);

        callback?.({ success: true, message });
      } catch (error) {
        callback?.({
          success: false,
          message: error.message || "Reaction update nahi ho paaya."
        });
      }
    });

    socket.on("call:offer", ({ receiverId, offer, callType }) => {
      io.to(receiverId).emit("call:offer", {
        callerId: userId,
        callerName: socket.user.name,
        offer,
        callType
      });
    });

    socket.on("call:answer", ({ receiverId, answer }) => {
      io.to(receiverId).emit("call:answer", {
        answer,
        responderId: userId
      });
    });

    socket.on("call:ice-candidate", ({ receiverId, candidate }) => {
      io.to(receiverId).emit("call:ice-candidate", {
        senderId: userId,
        candidate
      });
    });

    socket.on("call:reject", ({ receiverId }) => {
      io.to(receiverId).emit("call:reject", {
        userId
      });
    });

    socket.on("call:end", ({ receiverId }) => {
      io.to(receiverId).emit("call:end", {
        userId
      });
    });

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      await emitPresence(io, userId, false);
    });
  });
};
