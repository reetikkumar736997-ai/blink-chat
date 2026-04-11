import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import { connectSocket, disconnectSocket } from "../socket/socket.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("chat_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
        connectSocket(token);
      } catch {
        localStorage.removeItem("chat_token");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();

    return () => {
      disconnectSocket();
    };
  }, []);

  const saveSession = (token, nextUser) => {
    localStorage.setItem("chat_token", token);
    setUser(nextUser);
    connectSocket(token);
  };

  const logout = () => {
    localStorage.removeItem("chat_token");
    setUser(null);
    disconnectSocket();
  };

  const updateUser = (updates) => {
    setUser((currentUser) =>
      currentUser ? { ...currentUser, ...updates } : currentUser
    );
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      saveSession,
      logout,
      updateUser
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
