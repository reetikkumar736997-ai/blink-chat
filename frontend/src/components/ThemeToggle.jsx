const SunIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="theme-toggle-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.75v2.5" />
    <path d="M12 18.75v2.5" />
    <path d="M4.93 4.93l1.77 1.77" />
    <path d="M17.3 17.3l1.77 1.77" />
    <path d="M2.75 12h2.5" />
    <path d="M18.75 12h2.5" />
    <path d="M4.93 19.07l1.77-1.77" />
    <path d="M17.3 6.7l1.77-1.77" />
  </svg>
);

const MoonIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="theme-toggle-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a8.75 8.75 0 1 0 9.5 9.5Z" />
  </svg>
);

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? "is-dark" : "is-light"}`}
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="theme-toggle-ring">
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}
