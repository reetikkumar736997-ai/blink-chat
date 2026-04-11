const TELEGRAM_API_BASE = "https://api.telegram.org";

const getTelegramConfig = () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return null;
  }

  return { botToken, chatId };
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const sendTelegramMessage = async (text) => {
  const config = getTelegramConfig();
  if (!config || !text) {
    return false;
  }

  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${config.botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "HTML"
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Telegram request failed with ${response.status}${errorText ? `: ${errorText}` : ""}`
    );
  }

  return true;
};

export const sendLoginAlert = async ({ user, ipAddress, userAgent }) => {
  if (!user) {
    return false;
  }

  const loginTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium"
  });

  const lines = [
    "<b>Login Alert</b>",
    `Name: <b>${escapeHtml(user.name || "Unknown")}</b>`,
    `Email: <code>${escapeHtml(user.email || "Unknown")}</code>`,
    `Time: ${escapeHtml(loginTime)}`,
    `IP: <code>${escapeHtml(ipAddress || "Unknown")}</code>`
  ];

  if (userAgent) {
    lines.push(`Device: ${escapeHtml(userAgent.slice(0, 180))}`);
  }

  return sendTelegramMessage(lines.join("\n"));
};
