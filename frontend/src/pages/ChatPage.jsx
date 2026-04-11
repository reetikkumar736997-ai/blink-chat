import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../state/AuthContext.jsx";

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, logout, loading, updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const aDate = a.lastMessage?.createdAt || a.createdAt;
        const bDate = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bDate) - new Date(aDate);
      }),
    [users]
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const mergedSearchResults = useMemo(() => {
    if (normalizedSearchQuery.length < 2) {
      return [];
    }

    const localMatches = sortedUsers.filter((chatUser) => {
      const name = chatUser.name?.toLowerCase() || "";
      const email = chatUser.email?.toLowerCase() || "";
      return (
        name.includes(normalizedSearchQuery) || email.includes(normalizedSearchQuery)
      );
    });

    const combined = [...localMatches, ...searchResults];
    return combined.filter(
      (userItem, index) =>
        combined.findIndex(
          (candidate) => candidate._id === userItem._id
        ) === index
    );
  }, [normalizedSearchQuery, searchResults, sortedUsers]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    api
      .get("/users")
      .then((response) => {
        setUsers(response.data.users);
      })
      .catch(() => null);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      api
        .get("/users/search", {
          params: {
            query: normalizedQuery
          }
        })
        .then((response) => {
          setSearchResults(response.data.users);
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  const handleSelectUser = (chatUser) => {
    navigate(`/chat/${chatUser._id}`, {
      state: {
        selectedUser: chatUser
      }
    });
  };

  const handleAvatarUpload = async (file) => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    const uploadResponse = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    const avatar = uploadResponse.data.imageUrl;
    await api.patch("/users/me/avatar", { avatar });
    updateUser({ avatar });
  };

  const handleAvatarRemove = async () => {
    await api.patch("/users/me/avatar", { avatar: "" });
    updateUser({ avatar: "" });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="chat-shell discovery-shell">
      <Sidebar
        currentUser={user}
        isSearching={isSearching}
        onSearchChange={setSearchQuery}
        onAvatarUpload={handleAvatarUpload}
        onAvatarRemove={handleAvatarRemove}
        users={sortedUsers}
        searchQuery={searchQuery}
        searchResults={mergedSearchResults}
        missedCalls={[]}
        onOpenMissedCall={() => {}}
        selectedUser={null}
        onSelectUser={handleSelectUser}
        onLogout={logout}
      />

      <main className="discovery-panel">
        <div className="empty-state">
          <h2>Private chat search</h2>
          <p>
            Search for a user by username or email. Click the result to open a
            private chat on a separate page.
          </p>
        </div>
      </main>
    </div>
  );
}
