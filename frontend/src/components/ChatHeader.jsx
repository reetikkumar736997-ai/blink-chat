import { formatDistanceToNow } from "../utils/date.js";

const PhoneIcon = () => (
  <svg className="call-button-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M15.8 14.6 17.8 16.6C16.9 17.5 15.7 18 14.5 17.8 10.6 17.2 6.8 13.4 6.2 9.5 6 8.3 6.5 7.1 7.4 6.2L9.4 8.2 8.2 9.4C8.8 11.2 10 12.6 11.8 13.2L13 12 15 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VideoIcon = () => (
  <svg className="call-button-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4.8 8.5C4.8 7.3 5.8 6.3 7 6.3H13C14.2 6.3 15.2 7.3 15.2 8.5V10L18.3 7.8C18.7 7.5 19.2 7.8 19.2 8.3V15.7C19.2 16.2 18.7 16.5 18.3 16.2L15.2 14V15.5C15.2 16.7 14.2 17.7 13 17.7H7C5.8 17.7 4.8 16.7 4.8 15.5V8.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ChatHeader({
  callDuration,
  callStatus,
  isInCall,
  isMuted,
  onToggleMute,
  onAvatarPreview,
  onStartAudioCall,
  onStartVideoCall,
  onEndCall,
  user,
  typingUsers
}) {
  const isTyping = typingUsers[user._id];
  const showCallTimer = isInCall && callStatus === "In call" && callDuration;
  const avatarContent = user.avatar ? (
    <div className="avatar large has-image">
      <img src={user.avatar} alt={`${user.name} avatar`} />
    </div>
  ) : (
    <div className="avatar large">{user.name.slice(0, 1).toUpperCase()}</div>
  );

  return (
    <header className="chat-header">
      <div className="chat-header-main">
        {user.avatar ? (
          <button
            className="avatar-preview-button"
            type="button"
            onClick={() => onAvatarPreview?.(user.avatar)}
          >
            {avatarContent}
          </button>
        ) : (
          avatarContent
        )}
        <div className="chat-header-info">
          <h3>{user.name}</h3>
          <p className="muted chat-header-status">
            {isTyping
              ? "typing..."
              : callStatus
                ? callStatus
                : user.isOnline
                  ? "Online now"
                  : user.lastSeen
                    ? `Last seen ${formatDistanceToNow(user.lastSeen)}`
                    : "Offline"}
          </p>
          {showCallTimer ? (
            <p className="call-timer-badge">{callDuration}</p>
          ) : null}
        </div>
      </div>

      <div className="call-actions">
        {isInCall ? (
          <button
            className="ghost-button call-button"
            type="button"
            onClick={onToggleMute}
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        ) : (
          <>
            <button
              className="ghost-button call-button icon-call-button"
              type="button"
              onClick={onStartAudioCall}
              aria-label="Start audio call"
              title="Audio call"
            >
              <PhoneIcon />
            </button>
            <button
              className="ghost-button call-button icon-call-button"
              type="button"
              onClick={onStartVideoCall}
              aria-label="Start video call"
              title="Video call"
            >
              <VideoIcon />
            </button>
          </>
        )}
        {isInCall ? (
          <button className="call-end-button" type="button" onClick={onEndCall}>
            End
          </button>
        ) : null}
      </div>
    </header>
  );
}
