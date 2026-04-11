import { Router } from "express";
import {
  deleteMessage,
  getMessages,
  markConversationRead
} from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:userId", protect, getMessages);
router.patch("/:userId/read", protect, markConversationRead);
router.delete("/id/:messageId", protect, deleteMessage);

export default router;
