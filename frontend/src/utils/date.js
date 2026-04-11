export const formatMessageTime = (dateValue) =>
  new Date(dateValue).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

export const formatDateSeparator = (dateValue) => {
  const target = new Date(dateValue);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (left, right) =>
    left.getDate() === right.getDate() &&
    left.getMonth() === right.getMonth() &&
    left.getFullYear() === right.getFullYear();

  if (sameDay(target, today)) {
    return "Today";
  }

  if (sameDay(target, yesterday)) {
    return "Yesterday";
  }

  return target.toLocaleDateString([], {
    day: "numeric",
    month: "short"
  });
};

export const formatDistanceToNow = (dateValue) => {
  const date = new Date(dateValue);
  const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
