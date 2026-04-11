import { useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";

const initialForm = {
  name: "",
  email: "",
  password: ""
};

export default function AuthPage() {
  const { user, saveSession } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const endpoint = isSignup ? "/auth/signup" : "/auth/login";
      const payload = isSignup ? form : { email: form.email, password: form.password };
      const response = await api.post(endpoint, payload);
      saveSession(response.data.token, response.data.user);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div>
          <p className="eyebrow">Real-Time Chat</p>
          <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="muted">
            Text aur image messages instant deliver honge with online status and typing updates.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup ? (
            <label>
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Enter your name"
                required
              />
            </label>
          ) : null}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Enter your email"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Enter password"
              required
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : isSignup ? "Create account" : "Login"}
          </button>
        </form>

        <button
          className="link-button"
          type="button"
          onClick={() => {
            setError("");
            setForm(initialForm);
            setIsSignup((prev) => !prev);
          }}
        >
          {isSignup ? "Already have an account? Login" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
