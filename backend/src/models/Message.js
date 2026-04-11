import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      default: "",
      trim: true
    },
    image: {
      type: String,
      default: ""
    },
    imagePublicId: {
      type: String,
      default: ""
    },
    imageResourceType: {
      type: String,
      default: ""
    },
    audio: {
      type: String,
      default: ""
    },
    audioPublicId: {
      type: String,
      default: ""
    },
    audioResourceType: {
      type: String,
      default: ""
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        }
      }
    ],
    replyTo: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      text: {
        type: String,
        default: "",
        trim: true
      },
      senderName: {
        type: String,
        default: "",
        trim: true
      },
      image: {
        type: String,
        default: ""
      }
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    },
    readAt: {
      type: Date,
      default: null
    },
    editedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
