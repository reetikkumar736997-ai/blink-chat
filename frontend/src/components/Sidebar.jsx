import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "../utils/date.js";

export default function Sidebar({
  currentUser,
  isSearching,
  onAvatarUpload,
  onAvatarRemove,
  onSearchChange,
  users,
  searchQuery,
  searchResults,
  selectedUser,
  onSelectUser,
  onLogout
}) {
  const [previewImage, setPreviewImage] = useState("");
  const [cropImageSource, setCropImageSource] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [cropImageMeta, setCropImageMeta] = useState(null);
  const [cropFileName, setCropFileName] = useState("profile.jpg");
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const cropImageRef = useRef(null);
  const CROP_FRAME_SIZE = 280;
  const OUTPUT_SIZE = 512;

  const cropLayout = useMemo(() => {
    if (!cropImageMeta) {
      return null;
    }

    const baseScale = Math.max(
      CROP_FRAME_SIZE / cropImageMeta.width,
      CROP_FRAME_SIZE / cropImageMeta.height
    );
    const renderedWidth = cropImageMeta.width * baseScale * cropZoom;
    const renderedHeight = cropImageMeta.height * baseScale * cropZoom;
    const left = (CROP_FRAME_SIZE - renderedWidth) / 2 + cropOffsetX;
    const top = (CROP_FRAME_SIZE - renderedHeight) / 2 + cropOffsetY;

    return {
      left,
      top,
      width: renderedWidth,
      height: renderedHeight
    };
  }, [cropImageMeta, cropOffsetX, cropOffsetY, cropZoom]);

  const closeCropModal = () => {
    setCropImageSource("");
    setCropImageMeta(null);
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setCropFileName("profile.jpg");
    setIsSavingCrop(false);
  };

  const openCropModal = (file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSource(reader.result?.toString() || "");
      setCropZoom(1);
      setCropOffsetX(0);
      setCropOffsetY(0);
      setCropFileName(file.name || `profile-${Date.now()}.jpg`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCroppedAvatar = async () => {
    if (!cropImageSource || !cropLayout || !cropImageRef.current) {
      return;
    }

    setIsSavingCrop(true);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    const scaleFactor = OUTPUT_SIZE / CROP_FRAME_SIZE;

    context.drawImage(
      cropImageRef.current,
      cropLayout.left * scaleFactor,
      cropLayout.top * scaleFactor,
      cropLayout.width * scaleFactor,
      cropLayout.height * scaleFactor
    );

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsSavingCrop(false);
        return;
      }

      const extension = cropFileName.split(".").pop() || "jpg";
      const croppedFile = new File([blob], `cropped-${cropFileName}`, {
        type: `image/${extension === "png" ? "png" : "jpeg"}`
      });

      try {
        await onAvatarUpload?.(croppedFile);
        closeCropModal();
      } finally {
        setIsSavingCrop(false);
      }
    }, "image/jpeg", 0.92);
  };

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
              openCropModal(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />
          Upload profile image
        </label>
        {currentUser.avatar ? (
          <button
            className="ghost-button profile-upload-button"
            type="button"
            onClick={onAvatarRemove}
          >
            Remove profile image
          </button>
        ) : null}
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

      {cropImageSource
        ? createPortal(
            <div
              className="image-lightbox cropper-overlay"
              role="presentation"
              onClick={closeCropModal}
            >
              <div
                className="image-lightbox-card cropper-card"
                role="dialog"
                aria-modal="true"
                aria-label="Crop profile image"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="cropper-header">
                  <div>
                    <p className="eyebrow">Profile image</p>
                    <h3>Crop photo</h3>
                  </div>
                  <button
                    className="ghost-button image-lightbox-close"
                    type="button"
                    onClick={closeCropModal}
                  >
                    Cancel
                  </button>
                </div>

                <div
                  className="cropper-frame"
                  style={{ width: `${CROP_FRAME_SIZE}px`, height: `${CROP_FRAME_SIZE}px` }}
                >
                  <img
                    ref={cropImageRef}
                    src={cropImageSource}
                    alt="Crop source"
                    className="cropper-image"
                    style={cropLayout}
                    onLoad={(event) => {
                      setCropImageMeta({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight
                      });
                    }}
                  />
                </div>

                <div className="cropper-controls">
                  <label className="cropper-control">
                    <span>Zoom</span>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={cropZoom}
                      onChange={(event) => setCropZoom(Number(event.target.value))}
                    />
                  </label>
                  <label className="cropper-control">
                    <span>Left / Right</span>
                    <input
                      type="range"
                      min="-160"
                      max="160"
                      step="1"
                      value={cropOffsetX}
                      onChange={(event) => setCropOffsetX(Number(event.target.value))}
                    />
                  </label>
                  <label className="cropper-control">
                    <span>Up / Down</span>
                    <input
                      type="range"
                      min="-160"
                      max="160"
                      step="1"
                      value={cropOffsetY}
                      onChange={(event) => setCropOffsetY(Number(event.target.value))}
                    />
                  </label>
                </div>

                <div className="cropper-actions">
                  <button className="ghost-button" type="button" onClick={closeCropModal}>
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleSaveCroppedAvatar}
                    disabled={isSavingCrop || !cropImageMeta}
                  >
                    {isSavingCrop ? "Saving..." : "Set profile photo"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </aside>
  );
}
