const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const PRODUCTION_API_ORIGIN = "https://backend-production-b90dd.up.railway.app";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const isLocalRuntime = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return LOCAL_HOSTS.has(window.location.hostname);
};

const resolveOrigin = (envValue) => {
  if (envValue) {
    return trimTrailingSlash(envValue);
  }

  return isLocalRuntime() ? "http://localhost:5000" : PRODUCTION_API_ORIGIN;
};

const resolveApiBaseUrl = () => {
  if (isLocalRuntime()) {
    return `${resolveOrigin(import.meta.env.VITE_API_URL).replace(/\/api$/, "")}/api`;
  }

  // Keep production API calls same-origin so mobile networks only talk to Vercel.
  return "/api";
};

export const API_BASE_URL = resolveApiBaseUrl();
export const SOCKET_BASE_URL = resolveOrigin(import.meta.env.VITE_SOCKET_URL);
