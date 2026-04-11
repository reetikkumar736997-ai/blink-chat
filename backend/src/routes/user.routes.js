import { Router } from "express";
import {
  getUserById,
  getUsers,
  searchUsers,
  updateMyAvatar
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getUsers);
router.patch("/me/avatar", protect, updateMyAvatar);
router.get("/search", protect, searchUsers);
router.get("/:userId", protect, getUserById);

export default router;
