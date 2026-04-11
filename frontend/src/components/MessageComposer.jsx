import { useEffect, useRef, useState } from "react";

export default function MessageComposer({
  draftText,
  isEditing,
  onSend,
  onDraftTextChange,
  onCancelEdit,
  onTypingStart,
  onTypingStop,
  onCancelReply,
  replyingTo,
  sending
}) {
  const safeDraftText = draftText ?? "";
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLabel, setRecordingLabel] = useState("");
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const handleTyping = (value) => {
    onDraftTextChange?.(value);
    onTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 1200);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAudioFile(null);
    setRecordingLabel("");
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsMenuOpen(false);
  };

  const cleanupRecording = () => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    streamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm"
        });
        setImageFile(null);
        setPreviewUrl("");
        setAudioFile(file);
        setRecordingLabel("Voice note ready");
        cleanupRecording();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingLabel("Recording voice note...");
      setIsMenuOpen(false);
    } catch {
      setRecordingLabel("Microphone access denied");
    }
  };

  const resetComposer = () => {
    onDraftTextChange?.("");
    setImageFile(null);
    setAudioFile(null);
    setPreviewUrl("");
    setRecordingLabel("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSend({
      text: safeDraftText,
      imageFile,
      audioFile,
      replyTo: replyingTo
    });
    resetComposer();
  };

  useEffect(() => {
    if (isEditing) {
      setImageFile(null);
      setAudioFile(null);
      setPreviewUrl("");
      setRecordingLabel("");
      setIsMenuOpen(false);
    }
  }, [isEditing]);

  useEffect(() => () => cleanupRecording(), []);

  return (
    <form className="composer" onSubmit={handleSubmit}>
      {isEditing ? (
        <div className="reply-preview-card edit-preview-card">
          <div>
            <p className="eyebrow">Editing message</p>
          </div>
          <button className="ghost-button" type="button" onClick={onCancelEdit}>
            Cancel
          </button>
        </div>
      ) : null}

      {replyingTo ? (
        <div className="reply-preview-card">
          <div>
            <p className="eyebrow">Replying to</p>
            <p className="reply-preview-text">
              {replyingTo.senderId === replyingTo.currentUserId
                ? "You"
                : replyingTo.senderName || "Message"}
              :{" "}
              {replyingTo.text || (replyingTo.image ? "Photo" : "Message")}
            </p>
          </div>
          <button className="ghost-button" type="button" onClick={onCancelReply}>
            Cancel
          </button>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="image-preview-card">
          <img src={previewUrl} alt="Preview" />
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setImageFile(null);
              setPreviewUrl("");
            }}
          >
            Remove
          </button>
        </div>
      ) : null}

      {audioFile ? (
        <div className="audio-preview-card">
          <div>
            <p className="eyebrow">Audio selected</p>
            <p className="reply-preview-text">{recordingLabel || audioFile.name}</p>
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setAudioFile(null);
              setRecordingLabel("");
            }}
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="composer-row">
        {isEditing ? (
          <div className="composer-spacer" aria-hidden="true" />
        ) : (
          <div className="composer-menu-anchor">
            <button
              className="upload-pill"
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              <span className="composer-icon" aria-hidden="true">+</span>
              <span className="sr-only">Open attachment menu</span>
            </button>

            {isMenuOpen ? (
              <div className="composer-menu">
                <button
                  className="composer-menu-item"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Image
                </button>
                <button
                  className="composer-menu-item"
                  type="button"
                  onClick={isRecording ? cleanupRecording : handleStartRecording}
                >
                  {isRecording ? "Stop audio" : "Audio"}
                </button>
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              accept="image/*"
              type="file"
              onChange={handleImageChange}
              hidden
            />
          </div>
        )}

        <input
          className="composer-input"
          value={safeDraftText}
          onChange={(event) => handleTyping(event.target.value)}
          onBlur={onTypingStop}
          placeholder={isEditing ? "Edit your message..." : "Type a message..."}
        />

        <button
          className="primary-button composer-send-button"
          type="submit"
          aria-label={
            sending
              ? isEditing
                ? "Saving message"
                : "Sending message"
              : isEditing
                ? "Save message"
                : "Send message"
          }
          disabled={sending || (!safeDraftText.trim() && !imageFile && !audioFile)}
        >
          {sending ? (
            <span className="composer-icon" aria-hidden="true">...</span>
          ) : isEditing ? (
            <svg
              className="composer-send-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5 10 17.5 19 7.5" />
            </svg>
          ) : (
            <svg
              className="composer-send-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M5 7.5 19 12 5 16.5 7.9 12 5 7.5Z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
