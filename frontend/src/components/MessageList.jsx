import { useEffect, useRef, useState } from "react";
import { formatDateSeparator, formatMessageTime } from "../utils/date.js";

const REACTION_OPTIONS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}"];

const SelectedMessagePopup = ({
  deletingMessageId,
  editingMessageId,
  message,
  mine,
  currentUser,
  onDeleteMessage,
  onDeleteMissedCall,
  onEditMessage,
  onReactionToggle,
  onReplyMessage
}) => {
  if (message.type === "missed-call") {
    return (
      <div className="message-popup system" onClick={(event) => event.stopPropagation()}>
        <div className="message-popup-actions">
          <button
            className="message-action-button"
            type="button"
            onClick={() => onDeleteMissedCall?.(message.notificationId)}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`message-popup ${mine ? "mine" : "theirs"}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="message-popup-reactions">
        {REACTION_OPTIONS.map((emoji) => {
          const active = message.reactions?.some(
            (reaction) => reaction.userId === currentUser._id && reaction.emoji === emoji
          );

          return (
            <button
              key={emoji}
              className={`reaction-pill popup ${active ? "active" : ""}`}
              type="button"
              onClick={() => onReactionToggle?.(message._id, emoji)}
            >
              <span>{emoji}</span>
            </button>
          );
        })}
      </div>

      <div className="message-popup-actions">
        <button
          className="message-action-button"
          type="button"
          onClick={() => onReplyMessage?.(message)}
        >
          Reply
        </button>

        {mine && message.text ? (
          <button
            className="message-action-button"
            type="button"
            onClick={() => onEditMessage?.(message)}
            disabled={editingMessageId === message._id}
          >
            {editingMessageId === message._id ? "Editing..." : "Edit"}
          </button>
        ) : null}

        {mine ? (
          <button
            className="message-action-button"
            type="button"
            onClick={() => onDeleteMessage?.(message)}
            disabled={deletingMessageId === message._id}
          >
            {deletingMessageId === message._id ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </div>
    </div>
  );
};

const formatAudioTime = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const remainingSeconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

const AudioMessagePlayer = ({ src, mine }) => {
  const audioRef = useRef(null);
  const waveform = [10, 18, 14, 24, 16, 28, 12, 22, 14, 20, 12, 26, 16, 18, 11, 24];
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  const togglePlayback = async (event) => {
    event.stopPropagation();

    if (!audioRef.current) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    await audioRef.current.play().catch(() => null);
    setIsPlaying(true);
  };

  return (
    <div className={`audio-message-player ${mine ? "mine" : "theirs"}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      >
        <source src={src} />
      </audio>

      <button className="audio-play-button" type="button" onClick={togglePlayback}>
        {isPlaying ? "||" : ">"}
      </button>

      <div className="audio-waveform" aria-hidden="true">
        {waveform.map((height, index) => {
          const threshold = ((index + 1) / waveform.length) * 100;
          const active = threshold <= progress;

          return (
            <span
              key={`${height}-${index}`}
              className={`audio-wave-bar ${active ? "active" : ""}`}
              style={{ height: `${height + 6}px` }}
            />
          );
        })}
      </div>

      <span className="audio-duration">
        {formatAudioTime(currentTime || duration)}
      </span>
    </div>
  );
};

const MessageStatusIcon = ({ status }) => {
  const doubleTick = status === "delivered" || status === "read";

  return (
    <span className={`message-status-icon ${status}`}>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4.5 10.5 7.4 13.4 13 7.8" />
        {doubleTick ? <path d="M8.6 10.5 11.5 13.4 17.1 7.8" /> : null}
      </svg>
    </span>
  );
};

export default function MessageList({
  editingMessageId,
  currentUser,
  deletingMessageId,
  messages,
  onClearSelection,
  onDeleteMissedCall,
  onDeleteMessage,
  onEditMessage,
  onImageClick,
  onReactionToggle,
  onReplyMessage,
  onSelectMessage,
  selectedMessageId,
  selectedUser,
  typingUserName
}) {
  const endRef = useRef(null);
  const messageRefs = useRef({});

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  return (
    <div
      className="message-list"
      onClick={() => onClearSelection?.()}
      role="presentation"
    >
      {messages.map((message, index) => {
        if (message.type === "missed-call") {
          const isSelected = selectedMessageId === message._id;
          const previousMessage = messages[index - 1];
          const showDateSeparator =
            !previousMessage ||
            formatDateSeparator(previousMessage.createdAt) !==
              formatDateSeparator(message.createdAt);

          return (
            <div key={message._id}>
              {showDateSeparator ? (
                <div className="date-separator">
                  <span>{formatDateSeparator(message.createdAt)}</span>
                </div>
              ) : null}

              <div className="message-row system">
                <div
                  className={`system-message-bubble missed-call-bubble ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectMessage?.(message._id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectMessage?.(message._id);
                    }
                  }}
                >
                  <strong>
                    Missed {message.callType === "video" ? "video" : "audio"} call
                  </strong>
                  <span>{formatMessageTime(message.createdAt)}</span>
                </div>
                {isSelected ? (
                  <SelectedMessagePopup
                    currentUser={currentUser}
                    deletingMessageId={deletingMessageId}
                    editingMessageId={editingMessageId}
                    message={message}
                    mine={false}
                    onDeleteMessage={onDeleteMessage}
                    onDeleteMissedCall={onDeleteMissedCall}
                    onEditMessage={onEditMessage}
                    onReactionToggle={onReactionToggle}
                    onReplyMessage={onReplyMessage}
                  />
                ) : null}
              </div>
            </div>
          );
        }

        const mine = message.senderId === currentUser._id;
        const isSelected = selectedMessageId === message._id;
        const previousMessage = messages[index - 1];
        const showDateSeparator =
          !previousMessage ||
          formatDateSeparator(previousMessage.createdAt) !==
            formatDateSeparator(message.createdAt);

        const reactionSummary = REACTION_OPTIONS.map((emoji) => {
          const count =
            message.reactions?.filter((reaction) => reaction.emoji === emoji).length || 0;
          const active = message.reactions?.some(
            (reaction) => reaction.userId === currentUser._id && reaction.emoji === emoji
          );

          return count ? { emoji, count, active } : null;
        }).filter(Boolean);

        return (
          <div key={message._id}>
            {showDateSeparator ? (
              <div className="date-separator">
                <span>{formatDateSeparator(message.createdAt)}</span>
              </div>
            ) : null}

            <div
              ref={(element) => {
                if (element) {
                  messageRefs.current[message._id] = element;
                }
              }}
              className={`message-row ${mine ? "mine" : "theirs"}`}
            >
              <div
                className={`message-bubble ${mine ? "mine" : "theirs"} ${
                  isSelected ? "selected" : ""
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectMessage?.(message._id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectMessage?.(message._id);
                  }
                }}
              >
                {message.replyTo?.messageId ? (
                  <button
                    className="reply-chip"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      messageRefs.current[message.replyTo.messageId]?.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                      });
                    }}
                  >
                    <span className="reply-chip-label">
                      Reply to{" "}
                      {message.replyTo.senderId === currentUser._id
                        ? "You"
                        : message.replyTo.senderName || "message"}
                    </span>
                    <span>
                      {message.replyTo.text ||
                        (message.replyTo.image ? "Photo" : "Message")}
                    </span>
                  </button>
                ) : null}

                {message.text ? <p>{message.text}</p> : null}

                {message.image ? (
                  <button
                    className="message-image-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onImageClick?.(message.image);
                    }}
                  >
                    <img
                      className="message-image"
                      src={message.image}
                      alt="Chat attachment"
                    />
                  </button>
                ) : null}

                {message.audio ? <AudioMessagePlayer src={message.audio} mine={mine} /> : null}

                {reactionSummary.length ? (
                  <div className="reaction-row">
                    {reactionSummary.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        className={`reaction-pill ${reaction.active ? "active" : ""}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onReactionToggle?.(message._id, reaction.emoji);
                        }}
                      >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="message-meta">
                  <span>{formatMessageTime(message.createdAt)}</span>
                  <span className="message-edited-flag">
                    {message.editedAt ? "edited" : ""}
                  </span>
                  {mine ? (
                    <span className={`message-status ${message.status}`}>
                      <MessageStatusIcon status={message.status} />
                    </span>
                  ) : null}
                </div>
              </div>
              {isSelected ? (
                <SelectedMessagePopup
                  currentUser={currentUser}
                  deletingMessageId={deletingMessageId}
                  editingMessageId={editingMessageId}
                  message={message}
                  mine={mine}
                  onDeleteMessage={onDeleteMessage}
                  onDeleteMissedCall={onDeleteMissedCall}
                  onEditMessage={onEditMessage}
                  onReactionToggle={onReactionToggle}
                  onReplyMessage={onReplyMessage}
                />
              ) : null}
            </div>
          </div>
        );
      })}
      {typingUserName ? (
        <div className="message-row theirs typing-row">
          <div className="message-bubble theirs typing-bubble">
            <span className="typing-label">{typingUserName} is typing</span>
            <span className="typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
