import { useState } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "../utils/date.js";

export default function Sidebar({
  currentUser,
  isSearching,
  onAvatarUpload,
  onSearchChange,
  users,
  searchQuery,
  searchResults,
  selectedUser,
  onSelectUser,
  onLogout
}) {
  const [previewImage, setPreviewImage] = useState("");

  const renderAvatar = (
    user,
    className = "avatar",
    previewable = false,
    insideButton = false
  ) => {
    const avatarNode = user.avatar ? (
      <div className={`${className} has-image`}>
        <img src={user.avatar} alt={`${user.name} avatar`} />
        {user.isOnline ? <span className="presence-dot" /> : null}
      </div>
    ) : (
      <div className={className}>
        {user.name.slice(0, 1).toUpperCase()}
        {user.isOnline ? <span className="presence-dot" /> : null}
      </div>
    );

    if (!previewable || !user.avatar) {
      return avatarNode;
    }

    if (insideButton) {
      return (
        <span
          className="avatar-preview-button"
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            setPreviewImage(user.avatar);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              setPreviewImage(user.avatar);
            }
          }}
        >
          {avatarNode}
        </span>
      );
    }

    return (
      <button
        className="avatar-preview-button"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setPreviewImage(user.avatar);
        }}
      >
        {avatarNode}
      </button>
    );
  };

  const renderUserItem = (user) => {
    const isActive = selectedUser?._id === user._id;
    const subtitle = user.lastMessage
      ? user.lastMessage.image
        ? "Photo"
        : user.lastMessage.text
      : user.email;

    return (
      <button
        key={user._id}
        className={`conversation-item ${isActive ? "active" : ""}`}
        type="button"
        onClick={() => onSelectUser(user)}
      >
        {renderAvatar(user, "avatar", true, true)}

        <div className="conversation-body">
          <div className="conversation-topline">
            <strong>{user.name}</strong>
            <span className="conversation-meta">
              {user.isOnline
                ? "Online"
                : user.lastSeen
                  ? formatDistanceToNow(user.lastSeen)
                  : "Offline"}
            </span>
          </div>
          <div className="conversation-bottomline">
            <span className="conversation-preview">{subtitle}</span>
            {user.unreadCount ? (
              <span className="unread-badge">{user.unreadCount}</span>
            ) : null}
          </div>
        </div>
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-box sidebar-profile-box">
        <div className="sidebar-header">
          {renderAvatar(currentUser, "avatar large profile-avatar", true)}
          <div className="profile-meta">
            <div className="profile-info-card">
              <p className="eyebrow">Username</p>
              <h2>{currentUser.name}</h2>
            </div>

            <div className="profile-info-card">
              <p className="eyebrow">Email</p>
              <p className="profile-email">{currentUser.email}</p>
            </div>
          </div>
        </div>
        <label className="ghost-button profile-upload-button">
          <input
            accept="image/*"
            type="file"
            hidden
            onChange={(event) => {
              onAvatarUpload?.(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />
          Upload profile image
        </label>
        <button className="ghost-button profile-logout-button" onClick={onLogout} type="button">
          Logout
        </button>
      </div>

      <div className="sidebar-box search-panel">
        <p className="eyebrow section-label">Search user</p>
        <input
          className="search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by username or email"
        />
        {searchQuery.trim() ? (
          <div className="search-results">
            <p className="eyebrow section-label">Search results</p>
            {isSearching ? <p className="muted">Searching...</p> : null}
            {!isSearching && !searchResults.length ? (
              <p className="muted">No user found with that name or email.</p>
            ) : null}
            {searchResults.map(renderUserItem)}
          </div>
        ) : (
          <p className="muted search-hint">
            Search by username or email to open a private chat with a user.
          </p>
        )}
      </div>

      <div className="sidebar-box conversation-section">
        <p className="eyebrow section-label">Your conversations</p>
        <div className="conversation-list">
          {users.length ? (
            users.map(renderUserItem)
          ) : (
            <p className="muted">
              Abhi koi existing conversation nahi hai. Kisi user ko search karke chat
              start karo.
            </p>
          )}
        </div>
      </div>

      {previewImage
        ? createPortal(
            <div
              className="image-lightbox"
              role="presentation"
              onClick={() => setPreviewImage("")}
            >
              <div
                className="image-lightbox-card profile-preview-card"
                role="dialog"
                aria-modal="true"
                aria-label="Profile image preview"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="ghost-button image-lightbox-close"
                  type="button"
                  onClick={() => setPreviewImage("")}
                >
                  Close
                </button>
                <img src={previewImage} alt="Profile preview" />
              </div>
            </div>,
            document.body
          )
        : null}
    </aside>
  );
}
