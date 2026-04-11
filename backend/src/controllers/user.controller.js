import Message from "../models/Message.js";
import User from "../models/User.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildUsersWithMeta = async (currentUserId, users) =>
  Promise.all(
    users.map(async (user) => {
      const lastMessage = await Message.findOne({
        $or: [
          { senderId: currentUserId, receiverId: user._id },
          { senderId: user._id, receiverId: currentUserId }
        ]
      }).sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        senderId: user._id,
        receiverId: currentUserId,
        status: { $ne: "read" }
      });

      return {
        ...user.toObject(),
        lastMessage,
        unreadCount
      };
    })
  );

export const getUsers = async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }]
    }).select("senderId receiverId");

    const partnerIds = [
      ...new Set(
        messages
          .map((message) =>
            message.senderId.toString() === req.user._id.toString()
              ? message.receiverId.toString()
              : message.senderId.toString()
          )
          .filter(Boolean)
      )
    ];

    if (!partnerIds.length) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      _id: { $in: partnerIds, $ne: req.user._id }
    }).select("-password");

    const usersWithMeta = await buildUsersWithMeta(req.user._id, users);

    res.json({ users: usersWithMeta });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const query = req.query.query?.trim();

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const searchPattern = new RegExp(escapeRegex(query), "i");
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: searchPattern }, { email: searchPattern }]
    })
      .select("-password")
      .limit(10);

    const usersWithMeta = await buildUsersWithMeta(req.user._id, users);
    res.json({ users: usersWithMeta });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");

    if (!user || user._id.toString() === req.user._id.toString()) {
      return res.status(404).json({ message: "User not found" });
    }

    const [userWithMeta] = await buildUsersWithMeta(req.user._id, [user]);
    res.json({ user: userWithMeta });
  } catch (error) {
    next(error);
  }
};

export const updateMyAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;

    if (typeof avatar !== "string" || !avatar.trim()) {
      return res.status(400).json({ message: "Avatar image is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatar.trim() },
      { new: true }
    ).select("-password");

    res.json({ user });
  } catch (error) {
    next(error);
  }
};
