import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ConversationPage from "./pages/ConversationPage.jsx";
import { useAuth } from "./state/AuthContext.jsx";

const getInitialTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem("chat-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
};

export default function App() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(getInitialTheme);
  const location = useLocation();
  const showThemeToggle = !/^\/chat\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("chat-theme", theme);
  }, [theme]);

  return (
    <>
      {showThemeToggle ? (
        <ThemeToggle
          theme={theme}
          onToggle={() =>
            setTheme((currentTheme) =>
              currentTheme === "dark" ? "light" : "dark"
            )
          }
        />
      ) : null}

      <Routes>
        <Route
          path="/"
          element={<Navigate to={user ? "/chat" : "/auth"} replace />}
        />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:userId"
          element={
            <ProtectedRoute>
              <ConversationPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
