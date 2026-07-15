import React from "react";

export const Badge = ({ children, color }) => {
  // Mapping colors to Tailwind-like or Reactstrap classes
  // Utilizing custom styles or mapped helper classes if Tailwind isn't fully available
  // But since the user provided code uses Tailwind classes (e.g. bg-blue-100), we'll try to keep them if Tailwind is configured,
  // OR map them to standard Bootstrap classes + inline styles for the specific look.
  // Given this is a legacy projece likely using Bootstrap/SCSS, we might need inline styles to mimic the "modern" look if Tailwind isn't active.
  // However, the user provided code explicitly uses Tailwind classes. I will keep them but provide fallbacks or inline styles if needed.
  // Assuming the project might not have Tailwind extracted, I will use inline styles to mimic exactly the look requested.

  const colorStyles = {
    blue: { backgroundColor: "#dbeafe", color: "#1d4ed8" }, // bg-blue-100 text-blue-700
    green: { backgroundColor: "#dcfce7", color: "#15803d" },
    yellow: { backgroundColor: "#fef9c3", color: "#854d0e" },
    fluo: { backgroundColor: "#FFFF00", color: "#713f12" }, // chatbot expert-retraite.com
    red: { backgroundColor: "#fee2e2", color: "#b91c1c" },
    purple: { backgroundColor: "#f3e8ff", color: "#7e22ce" },
    gray: { backgroundColor: "#f3f4f6", color: "#374151" },
    orange: { backgroundColor: "#ffedd5", color: "#9a3412" },
    indigo: { backgroundColor: "#e0e7ff", color: "#3730a3" },
  };

  const style = {
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "600",
    ...(colorStyles[color] || colorStyles.gray),
    display: "inline-block",
  };

  return (
    <span style={style} className="kpi-badge">
      {children}
    </span>
  );
};

export const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s",
      border: "none",
      background: active ? "#eef2ff" : "transparent", // indigo-50
      color: active ? "#4338ca" : "#6b7280", // indigo-700 : gray-500
      borderRight: active ? "4px solid #4338ca" : "none",
      cursor: "pointer",
      textAlign: "left",
    }}
    className={`kpi-sidebar-item ${active ? "active" : ""}`}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <Icon size={20} />
      <span>{label}</span>
    </div>
    {count && (
      <span
        style={{
          fontSize: "11px",
          padding: "2px 6px",
          borderRadius: "999px",
          backgroundColor: active ? "#e0e7ff" : "#f3f4f6",
          color: active ? "#4338ca" : "#4b5563",
        }}
      >
        {count}
      </span>
    )}
  </button>
);
