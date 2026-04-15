const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://blink-chat-frontend-three.vercel.app",
  "https://tend-three.vercel.app",
  "https://laxreet-22.vercel.app"
];

export const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ORIGINS, ...configuredOrigins])];
};

export const corsOriginHandler = (origin, callback) => {
  const allowedOrigins = getAllowedOrigins();

  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("CORS origin not allowed"));
};
