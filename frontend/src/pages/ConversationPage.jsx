import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api/client.js";
import ChatHeader from "../components/ChatHeader.jsx";
import MessageComposer from "../components/MessageComposer.jsx";
import MessageList from "../components/MessageList.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { getSocket } from "../socket/socket.js";

export default function ConversationPage() {
  const createTempMessageId = () =>
    `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const isMatchingOptimisticMessage = (pendingMessage, confirmedMessage) => {
    if (!pendingMessage?.pending) {
      return false;
    }

    const pendingTime = new Date(pendingMessage.createdAt).getTime();
    const confirmedTime = new Date(confirmedMessage.createdAt).getTime();

    return (
      pendingMessage.senderId === confirmedMessage.senderId &&
      pendingMessage.receiverId === confirmedMessage.receiverId &&
      (pendingMessage.text || "") === (confirmedMessage.text || "") &&
      Boolean(pendingMessage.image) === Boolean(confirmedMessage.image) &&
      Boolean(pendingMessage.audio) === Boolean(confirmedMessage.audio) &&
      Math.abs(pendingTime - confirmedTime) < 60000
    );
  };

  const revokeMessagePreviewUrls = (message) => {
    if (message?.image?.startsWith?.("blob:")) {
      URL.revokeObjectURL(message.image);
    }

    if (message?.audio?.startsWith?.("blob:")) {
      URL.revokeObjectURL(message.audio);
    }
  };

  const getMissedCallsForChat = (currentUserId, partnerId) => {
    if (!currentUserId || !partnerId) {
      return [];
    }

    try {
      const notifications = JSON.parse(
        localStorage.getItem(`chat_missed_calls_${currentUserId}`) || "[]"
      );
      return notifications.filter((item) => item.userId === partnerId);
    } catch {
      return [];
    }
  };

  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { userId } = useParams();
  const [selectedUser, setSelectedUser] = useState(
    location.state?.selectedUser || null
  );
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [sending, setSending] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [draftText, setDraftText] = useState("");
  const [missedCallEntries, setMissedCallEntries] = useState([]);
  const [callStatus, setCallStatus] = useState("");
  const [callType, setCallType] = useState("");
  const [callDuration, setCallDuration] = useState("00:00");
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [remoteStreamReady, setRemoteStreamReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const remoteCandidateQueueRef = useRef([]);
  const audioContextRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);
  const incomingTimeoutRef = useRef(null);
  const disconnectTimeoutRef = useRef(null);
  const callStartedAtRef = useRef(null);
  const callConnectedRef = useRef(false);
  const incomingCallRef = useRef(null);

  const rtcConfig = useMemo(
    () => ({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    }),
    []
  );

  const displayMessages = useMemo(() => {
    const missedCallMessages = missedCallEntries.map((item) => ({
      _id: `missed-${item.id}`,
      notificationId: item.id,
      type: "missed-call",
      callType: item.callType,
      createdAt: item.createdAt,
      senderId: item.userId
    }));

    return [...messages, ...missedCallMessages].sort(
      (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
    );
  }, [messages, missedCallEntries]);

  useEffect(() => {
    setMissedCallEntries(getMissedCallsForChat(user?._id, userId));
  }, [user?._id, userId]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!userId || !user) {
      return;
    }

    setLoadingUser(true);

    api
      .get(`/users/${userId}`)
      .then((response) => {
        setSelectedUser(response.data.user);
      })
      .catch(() => {
        if (!location.state?.selectedUser) {
          navigate("/chat", { replace: true });
        }
      })
      .finally(() => {
        setLoadingUser(false);
      });
  }, [location.state?.selectedUser, navigate, user, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadMessages = async () => {
      const response = await api.get(`/messages/${userId}`);
      setMessages(response.data.messages);
      await api.patch(`/messages/${userId}/read`);
      getSocket()?.emit("message:read", { partnerId: userId });
    };

    loadMessages().catch(() => null);
  }, [userId]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current || null;
      localVideoRef.current.play?.().catch(() => null);
    }
  }, [callType, isCameraOff, localStreamReady]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current || null;
      remoteVideoRef.current.play?.().catch(() => null);
    }
  }, [callType, remoteStreamReady]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current || null;
      remoteAudioRef.current.play?.().catch(() => null);
    }
  }, [remoteStreamReady]);

  const cleanupCall = () => {
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }

    if (incomingTimeoutRef.current) {
      window.clearTimeout(incomingTimeoutRef.current);
      incomingTimeoutRef.current = null;
    }

    if (disconnectTimeoutRef.current) {
      window.clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;

    pendingOfferRef.current = null;
    remoteCandidateQueueRef.current = [];
    incomingCallRef.current = null;
    setCallStatus("");
    setCallType("");
    setCallDuration("00:00");
    setIncomingCall(null);
    setLocalStreamReady(false);
    setRemoteStreamReady(false);
    setIsMuted(false);
    setIsCameraOff(false);
    callStartedAtRef.current = null;
    callConnectedRef.current = false;
  };

  const startCallTimer = () => {
    if (!callStartedAtRef.current) {
      callStartedAtRef.current = Date.now();
    }
  };

  const markCallConnected = () => {
    callConnectedRef.current = true;
    setCallStatus("In call");
    startCallTimer();
  };

  const syncUpdatedMessage = (nextMessage) => {
    setMessages((prev) =>
      prev.map((message) => (message._id === nextMessage._id ? nextMessage : message))
    );
  };

  useEffect(() => {
    if (!callType || callStatus !== "In call") {
      setCallDuration("00:00");
      return;
    }

    startCallTimer();

    const intervalId = window.setInterval(() => {
      const elapsedMs = Date.now() - (callStartedAtRef.current || Date.now());
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      setCallDuration(`${minutes}:${seconds}`);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [callStatus, callType]);

  const saveMissedCall = (notificationUser, type) => {
    if (!user?._id || !notificationUser?._id) {
      return;
    }

    const storageKey = `chat_missed_calls_${user._id}`;
    const nextNotification = {
      id: `${notificationUser._id}-${Date.now()}`,
      userId: notificationUser._id,
      name: notificationUser.name,
      callType: type,
      createdAt: new Date().toISOString()
    };

    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const nextNotifications = [nextNotification, ...current].slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(nextNotifications));
      if (notificationUser._id === userId) {
        setMissedCallEntries(nextNotifications.filter((item) => item.userId === userId));
      }
    } catch {
      localStorage.setItem(storageKey, JSON.stringify([nextNotification]));
      if (notificationUser._id === userId) {
        setMissedCallEntries([nextNotification]);
      }
    }
  };

  const startRingtone = () => {};

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      window.clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  const ensureLocalMedia = async (type) => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video"
    });

    localStreamRef.current = stream;
    setLocalStreamReady((current) => !current);
    return stream;
  };

  const applyQueuedCandidates = async () => {
    if (!peerConnectionRef.current || !remoteCandidateQueueRef.current.length) {
      return;
    }

    for (const candidate of remoteCandidateQueueRef.current) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }

    remoteCandidateQueueRef.current = [];
  };

  const createPeerConnection = (partnerId) => {
    const socket = getSocket();
    const peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      socket?.emit("call:ice-candidate", {
        receiverId: partnerId,
        candidate: event.candidate
      });
    };

    peerConnection.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });

      setRemoteStreamReady((current) => !current);
      markCallConnected();
      stopRingtone();
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        if (disconnectTimeoutRef.current) {
          window.clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
        markCallConnected();
        return;
      }

      if (
        peerConnection.connectionState === "new" ||
        peerConnection.connectionState === "connecting"
      ) {
        if (!callConnectedRef.current) {
          setCallStatus("Connecting call...");
        }
        return;
      }

      if (peerConnection.connectionState === "disconnected") {
        setCallStatus("Reconnecting call...");
        if (disconnectTimeoutRef.current) {
          window.clearTimeout(disconnectTimeoutRef.current);
        }
        disconnectTimeoutRef.current = window.setTimeout(() => {
          cleanupCall();
        }, 12000);
        return;
      }

      if (peerConnection.connectionState === "failed") {
        setCallStatus("Reconnecting call...");
        peerConnection.restartIce?.();
        if (disconnectTimeoutRef.current) {
          window.clearTimeout(disconnectTimeoutRef.current);
        }
        disconnectTimeoutRef.current = window.setTimeout(() => {
          cleanupCall();
        }, 12000);
      }

      if (peerConnection.connectionState === "closed") {
        cleanupCall();
      }
    };

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user || !userId) {
      return;
    }

    const handleNewMessage = (message) => {
      const partnerId =
        message.senderId === user._id ? message.receiverId : message.senderId;

      if (partnerId !== userId) {
        return;
      }

      setMessages((prev) => {
        const optimisticIndex = prev.findIndex((entry) =>
          isMatchingOptimisticMessage(entry, message)
        );

        if (optimisticIndex === -1) {
          return [...prev, message];
        }

        const nextMessages = [...prev];
        revokeMessagePreviewUrls(nextMessages[optimisticIndex]);
        nextMessages[optimisticIndex] = message;
        return nextMessages;
      });
      if (message.senderId === userId) {
        api.patch(`/messages/${userId}/read`).catch(() => null);
        socket.emit("message:read", { partnerId: userId });
      }
    };

    const handleTypingUpdate = ({ userId: typingUserId, isTyping }) => {
      if (typingUserId !== userId) {
        return;
      }

      setTypingUsers((prev) => ({
        ...prev,
        [typingUserId]: isTyping
      }));
    };

    const handlePresenceUpdate = ({ userId: updatedUserId, isOnline, lastSeen }) => {
      if (updatedUserId !== userId) {
        return;
      }

      setSelectedUser((prev) => (prev ? { ...prev, isOnline, lastSeen } : prev));
    };

    const handleReadUpdate = ({ readerId }) => {
      if (readerId !== userId) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.senderId === user._id ? { ...message, status: "read" } : message
        )
      );
    };

    const handleDeletedMessage = ({ messageId }) => {
      setMessages((prev) => prev.filter((message) => message._id !== messageId));
    };

    const handleUpdatedMessage = (updatedMessage) => {
      const partnerId =
        updatedMessage.senderId === user._id
          ? updatedMessage.receiverId
          : updatedMessage.senderId;

      if (partnerId !== userId) {
        return;
      }

      syncUpdatedMessage(updatedMessage);
    };

    const handleCallOffer = ({ callerId, callerName, offer, callType: nextCallType }) => {
      if (callerId !== userId) {
        return;
      }

      pendingOfferRef.current = offer;
      incomingCallRef.current = {
        callerId,
        callerName,
        callType: nextCallType
      };
      setIncomingCall({
        callerId,
        callerName,
        callType: nextCallType
      });
      setCallType(nextCallType);
      setCallStatus(`Incoming ${nextCallType} call`);
      startRingtone("incoming");
      if (incomingTimeoutRef.current) {
        window.clearTimeout(incomingTimeoutRef.current);
      }
      incomingTimeoutRef.current = window.setTimeout(() => {
        saveMissedCall(
          { _id: callerId, name: callerName },
          nextCallType
        );
        rejectIncomingCall({
          callerId,
          skipNotification: true
        });
      }, 30000);
    };

    const handleCallAnswer = async ({ answer, responderId }) => {
      if (responderId !== userId || !peerConnectionRef.current) {
        return;
      }

      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      await applyQueuedCandidates();
      markCallConnected();
      stopRingtone();
    };

    const handleIceCandidate = async ({ senderId, candidate }) => {
      if (senderId !== userId || !candidate) {
        return;
      }

      if (!peerConnectionRef.current?.remoteDescription) {
        remoteCandidateQueueRef.current.push(candidate);
        return;
      }

      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const handleCallReject = ({ userId: rejectingUserId }) => {
      if (rejectingUserId !== userId) {
        return;
      }

      const pendingIncomingCall = incomingCallRef.current;
      if (pendingIncomingCall && !callConnectedRef.current) {
        saveMissedCall(
          {
            _id: rejectingUserId,
            name: selectedUser?.name || pendingIncomingCall.callerName || "User"
          },
          pendingIncomingCall.callType || "audio"
        );
      }

      cleanupCall();
      setCallStatus("Call declined");
      window.setTimeout(() => setCallStatus(""), 2200);
    };

    const handleCallEnd = ({ userId: endingUserId }) => {
      if (endingUserId !== userId) {
        return;
      }

      const pendingIncomingCall = incomingCallRef.current;

      if (pendingIncomingCall && !callConnectedRef.current) {
        saveMissedCall(
          {
            _id: endingUserId,
            name: selectedUser?.name || pendingIncomingCall.callerName || "User"
          },
          pendingIncomingCall.callType || "audio"
        );
      }

      cleanupCall();
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("message:read:update", handleReadUpdate);
    socket.on("message:deleted", handleDeletedMessage);
    socket.on("message:updated", handleUpdatedMessage);
    socket.on("call:offer", handleCallOffer);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:reject", handleCallReject);
    socket.on("call:end", handleCallEnd);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("message:read:update", handleReadUpdate);
      socket.off("message:deleted", handleDeletedMessage);
      socket.off("message:updated", handleUpdatedMessage);
      socket.off("call:offer", handleCallOffer);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:reject", handleCallReject);
      socket.off("call:end", handleCallEnd);
    };
  }, [incomingCall, rtcConfig, selectedUser?.name, user, userId]);

  useEffect(() => () => cleanupCall(), []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  const handleSendMessage = async ({ text, imageFile, audioFile, replyTo }) => {
    if (!userId) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    if (editingMessage?._id) {
      setSending(true);

      try {
        const updatedMessage = await new Promise((resolve, reject) => {
          socket.emit(
            "message:edit",
            {
              messageId: editingMessage._id,
              text
            },
            (response) => {
              if (response?.success) {
                resolve(response.message);
              } else {
                reject(new Error(response?.message || "Message edit nahi ho paaya."));
              }
            }
          );
        });

        syncUpdatedMessage(updatedMessage);
        setEditingMessage(null);
        setDraftText("");
        return;
      } finally {
        setSending(false);
      }
    }

    const createdAt = new Date().toISOString();
    const optimisticMessageId = createTempMessageId();
    const previewImageUrl = imageFile ? URL.createObjectURL(imageFile) : "";
    const previewAudioUrl = audioFile ? URL.createObjectURL(audioFile) : "";
    const optimisticMessage = {
      _id: optimisticMessageId,
      senderId: user._id,
      receiverId: userId,
      text,
      image: previewImageUrl,
      audio: previewAudioUrl,
      imageMeta: null,
      audioMeta: null,
      createdAt,
      status: "sent",
      reactions: [],
      replyTo,
      pending: true
    };

    setSending(true);
    setReplyingTo(null);
    setDraftText("");
    setSelectedMessageId("");
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      let image = "";
      let audio = "";
      let imageMeta = null;
      let audioMeta = null;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadResponse = await api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        image = uploadResponse.data.imageUrl;
        imageMeta = {
          publicId: uploadResponse.data.publicId,
          resourceType: uploadResponse.data.resourceType
        };
      }

      if (audioFile) {
        const formData = new FormData();
        formData.append("file", audioFile);
        const uploadResponse = await api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        audio = uploadResponse.data.fileUrl;
        audioMeta = {
          publicId: uploadResponse.data.publicId,
          resourceType: uploadResponse.data.resourceType
        };
      }

      const sentMessage = await new Promise((resolve, reject) => {
        socket.emit(
          "message:send",
          {
            receiverId: userId,
            text,
            image,
            imageMeta,
            audio,
            audioMeta,
            replyTo
          },
          (response) => {
            if (response.success) {
              resolve(response.message);
            } else {
              reject(new Error(response.message));
            }
          }
        );
      });

      setMessages((prev) => {
        const messageIndex = prev.findIndex((message) => message._id === optimisticMessageId);
        if (messageIndex === -1) {
          return prev;
        }

        const nextMessages = [...prev];
        revokeMessagePreviewUrls(nextMessages[messageIndex]);
        nextMessages[messageIndex] = sentMessage;
        return nextMessages;
      });
      socket.emit("typing:stop", { receiverId: userId });
    } catch (error) {
      setMessages((prev) => {
        const messageIndex = prev.findIndex((message) => message._id === optimisticMessageId);
        if (messageIndex === -1) {
          return prev;
        }

        const nextMessages = [...prev];
        revokeMessagePreviewUrls(nextMessages[messageIndex]);
        nextMessages.splice(messageIndex, 1);
        return nextMessages;
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const handleStartEditing = (message) => {
    setEditingMessage(message);
    setDraftText(message.text || "");
    setReplyingTo(null);
    setSelectedMessageId("");
  };

  const handleReactionToggle = async (messageId, emoji) => {
    const socket = getSocket();
    if (!socket) {
      return;
    }

    try {
      const updatedMessage = await new Promise((resolve, reject) => {
        socket.emit("message:reaction", { messageId, emoji }, (response) => {
          if (response?.success) {
            resolve(response.message);
          } else {
            reject(new Error(response?.message || "Reaction update nahi ho paaya."));
          }
        });
      });

      syncUpdatedMessage(updatedMessage);
      setSelectedMessageId("");
    } catch {
      return;
    }
  };

  const handleDeleteMissedCall = (notificationId) => {
    if (!user?._id || !notificationId) {
      return;
    }

    const storageKey = `chat_missed_calls_${user._id}`;
    const nextEntries = missedCallEntries.filter((item) => item.id !== notificationId);
    setMissedCallEntries(nextEntries);
    localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id) {
      return;
    }

    setDeletingMessageId(deleteTarget._id);
    setDeleteError("");

    try {
      const socket = getSocket();
      let deleted = false;

      if (socket?.connected) {
        try {
          await new Promise((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
              reject(new Error("Socket delete timeout"));
            }, 2500);

            socket.emit("message:delete", { messageId: deleteTarget._id }, (response) => {
              window.clearTimeout(timeoutId);

              if (response?.success) {
                resolve(response);
              } else {
                reject(new Error(response?.message || "Message delete nahi ho paaya."));
              }
            });
          });
          deleted = true;
        } catch {
          deleted = false;
        }
      }

      if (!deleted) {
        try {
          await api.delete(`/messages/id/${deleteTarget._id}`);
        } catch (primaryError) {
          if (primaryError.response?.status === 403) {
            throw primaryError;
          }

          if (primaryError.response?.status !== 404) {
            throw primaryError;
          }

          await api.delete(`/messages/${deleteTarget._id}`);
        }
      }

      setDeleteTarget(null);
      setMessages((prev) =>
        prev.filter((message) => message._id !== deleteTarget._id)
      );
      setSelectedMessageId("");
    } catch (error) {
      const statusCode = error.response?.status;
      setDeleteError(
        statusCode === 403
          ? "You can only delete your own messages."
          : error.response?.data?.message || error.message || "Message delete nahi ho paaya."
      );
    } finally {
      setDeletingMessageId("");
    }
  };

  const startCall = async (type) => {
    try {
      setCallType(type);
      setCallStatus(`Starting ${type} call...`);
      await ensureLocalMedia(type);
      const peerConnection = createPeerConnection(userId);
      startRingtone("outgoing");
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video"
      });
      await peerConnection.setLocalDescription(offer);
      getSocket()?.emit("call:offer", {
        receiverId: userId,
        offer,
        callType: type
      });
      setCallStatus(`Calling ${selectedUser?.name || "user"}...`);
    } catch (_error) {
      cleanupCall();
      setCallStatus("Call start nahi ho paayi");
      window.setTimeout(() => setCallStatus(""), 2500);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall || !pendingOfferRef.current) {
      return;
    }

    try {
      setCallType(incomingCall.callType);
      setCallStatus(`Connecting ${incomingCall.callType} call...`);
      await ensureLocalMedia(incomingCall.callType);
      const peerConnection = createPeerConnection(incomingCall.callerId);
      stopRingtone();
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(pendingOfferRef.current)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await applyQueuedCandidates();
      getSocket()?.emit("call:answer", {
        receiverId: incomingCall.callerId,
        answer
      });
      setIncomingCall(null);
      setCallStatus("Connecting call...");
    } catch (_error) {
      cleanupCall();
      setCallStatus("Call connect nahi ho paayi");
      window.setTimeout(() => setCallStatus(""), 2500);
    }
  };

  const rejectIncomingCall = (options = {}) => {
    const activeIncomingCall = options.callerId
      ? { callerId: options.callerId, callType: options.callType || callType }
      : incomingCall;

    if (!activeIncomingCall) {
      return;
    }

    getSocket()?.emit("call:reject", {
      receiverId: activeIncomingCall.callerId
    });
    cleanupCall();
  };

  const endCall = () => {
    getSocket()?.emit("call:end", {
      receiverId: userId
    });
    cleanupCall();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) {
      return;
    }

    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  const toggleCamera = async () => {
    if (callType !== "video" || !localStreamRef.current) {
      return;
    }

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) {
      return;
    }

    const nextCameraOff = !isCameraOff;
    videoTrack.enabled = !nextCameraOff;
    setIsCameraOff(nextCameraOff);
  };

  if (!user) {
    return null;
  }

  if (loadingUser && !selectedUser) {
    return (
      <div className="conversation-shell">
        <div className="empty-state">
          <h2>Opening chat...</h2>
          <p>Conversation load ho rahi hai.</p>
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="conversation-shell">
        <div className="empty-state">
          <h2>Conversation unavailable</h2>
          <p>User load nahi ho paya. Dobara search karke open karo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-shell">
      <audio ref={remoteAudioRef} className="call-media-hidden" autoPlay playsInline />

      <main className="chat-panel conversation-panel">
        <ChatHeader
          callDuration={callDuration}
          callStatus={callStatus}
          isInCall={Boolean(callType)}
          isMuted={isMuted}
          onAvatarPreview={setPreviewImage}
          onEndCall={endCall}
          onStartAudioCall={() => startCall("audio")}
          onStartVideoCall={() => startCall("video")}
          onToggleMute={toggleMute}
          user={selectedUser}
          typingUsers={typingUsers}
        />
        <MessageList
          currentUser={user}
          editingMessageId={editingMessage?._id || ""}
          deletingMessageId={deletingMessageId}
          messages={displayMessages}
          onClearSelection={() => setSelectedMessageId("")}
          onDeleteMessage={setDeleteTarget}
          onDeleteMissedCall={handleDeleteMissedCall}
          onEditMessage={handleStartEditing}
          onImageClick={setPreviewImage}
          onReplyMessage={(message) =>
            setReplyingTo({
              messageId: message._id,
              senderId: message.senderId,
              text: message.text,
              image: message.image,
              currentUserId: user._id,
              senderName:
                message.senderId === user._id
                  ? "You"
                  : selectedUser?.name || message.replyTo?.senderName || "User"
            })
          }
          onReactionToggle={handleReactionToggle}
          onSelectMessage={setSelectedMessageId}
          selectedMessageId={selectedMessageId}
          selectedUser={selectedUser}
          typingUserName={typingUsers[userId] ? selectedUser?.name || "User" : ""}
        />
        <MessageComposer
          draftText={draftText}
          isEditing={Boolean(editingMessage)}
          onSend={handleSendMessage}
          onDraftTextChange={setDraftText}
          onCancelEdit={() => {
            setEditingMessage(null);
            setDraftText("");
          }}
          onTypingStart={() => getSocket()?.emit("typing:start", { receiverId: userId })}
          onTypingStop={() => getSocket()?.emit("typing:stop", { receiverId: userId })}
          onCancelReply={() => setReplyingTo(null)}
          replyingTo={replyingTo}
          sending={sending}
        />
      </main>

      {incomingCall ? (
        <div className="confirm-overlay" role="presentation">
          <div
            className="confirm-card"
            role="dialog"
            aria-modal="true"
            aria-label="Incoming call"
          >
            <h3>Incoming {incomingCall.callType} call</h3>
            <p>{incomingCall.callerName} is calling you.</p>
            <div className="confirm-actions">
              <button className="ghost-button" type="button" onClick={rejectIncomingCall}>
                Decline
              </button>
              <button className="primary-button" type="button" onClick={acceptIncomingCall}>
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="confirm-card"
            role="dialog"
            aria-modal="true"
            aria-label="Delete message"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Delete this message?</h3>
            <p>
              {deleteTarget.text ||
                (deleteTarget.image
                  ? "This photo message will be deleted."
                  : "This message will be deleted.")}
            </p>
            {deleteError ? <p className="error-text">{deleteError}</p> : null}
            <div className="confirm-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setDeleteError("");
                  setDeleteTarget(null);
                }}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingMessageId === deleteTarget._id}
              >
                {deletingMessageId === deleteTarget._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {callType === "video" ? (
        <div className="call-overlay" role="presentation">
          <div className="call-panel call-panel-centered">
            <div className="call-panel-header">
              <div>
                <strong>Video call</strong>
                <p className="muted">
                  {callStatus || (selectedUser?.name ? `Talking to ${selectedUser.name}` : "")}
                </p>
              </div>
              <div className="call-panel-timer">{callDuration}</div>
            </div>

            <div className="call-video-stage">
              <div className="call-media-card call-media-card-remote">
                <span className="call-badge call-badge-remote">
                  {selectedUser?.name || "User"}
                </span>
                {remoteStreamReady ? (
                  <video ref={remoteVideoRef} autoPlay playsInline />
                ) : (
                  <div className="call-avatar-card call-avatar-card-remote">
                    {selectedUser?.avatar ? (
                      <img src={selectedUser.avatar} alt={`${selectedUser.name} avatar`} />
                    ) : (
                      <span>{(selectedUser?.name || "U").slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="call-media-card call-media-card-local">
                <span className="call-badge call-badge-local">You</span>
                {!isCameraOff ? (
                  <video ref={localVideoRef} autoPlay muted playsInline />
                ) : (
                  <div className="call-avatar-card call-avatar-card-local">
                    {user.avatar ? (
                      <img src={user.avatar} alt={`${user.name} avatar`} />
                    ) : (
                      <span>{user.name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="call-control-row call-control-row-video">
              <button
                className="ghost-button call-toggle-button"
                type="button"
                onClick={toggleMute}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
              <button
                className="ghost-button call-toggle-button"
                type="button"
                onClick={toggleCamera}
              >
                {isCameraOff ? "Camera on" : "Camera off"}
              </button>
              <button className="call-end-button" type="button" onClick={endCall}>
                End
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewImage ? (
        <div
          className="image-lightbox"
          role="presentation"
          onClick={() => setPreviewImage("")}
        >
          <div
            className="image-lightbox-card"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="ghost-button image-lightbox-close"
              type="button"
              onClick={() => setPreviewImage("")}
            >
              Close
            </button>
            <img src={previewImage} alt="Opened chat attachment" />
            <a
              className="link-button image-lightbox-link"
              href={previewImage}
              target="_blank"
              rel="noreferrer"
            >
              Open in new tab
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
