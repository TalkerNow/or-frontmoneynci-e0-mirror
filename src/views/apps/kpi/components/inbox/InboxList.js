import React, { useState } from "react";
import { Loader, MessageSquare, EyeOff, Search, X, UserPlus } from "lucide-react";
import {
  getTypeIcon,
  formatPhoneNumber,
} from "./utils";

const InboxList = ({
  loading,
  visibleInboxItems,
  selectedItem,
  onSelect,
  unreadCount,
  readIds,
  manualUnreadIds,
  onMarkAsUnread,
  onDisqualify,
  onConvert,
  filter = "all",
}) => {
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Logique de filtrage
  const filteredItems = visibleInboxItems.filter((item) => {
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    const name = item.name ? item.name.toLowerCase() : "";
    const email = item.email ? item.email.toLowerCase() : "";
    const phone = item.phone ? item.phone.toString() : "";
    const summary =
      item.summary && item.summary[0] ? item.summary[0].toLowerCase() : "";
    const subject = item.subject ? item.subject.toLowerCase() : "";
    const snippet = item.snippet ? item.snippet.toLowerCase() : "";

    return (
      name.includes(lowerTerm) ||
      email.includes(lowerTerm) ||
      phone.includes(lowerTerm) ||
      summary.includes(lowerTerm) ||
      subject.includes(lowerTerm) ||
      snippet.includes(lowerTerm)
    );
  });

  return (
    <div className="inbox-left-panel">
      {/* Search Bar */}
      <div style={{ padding: "16px", borderBottom: "1px solid #f3f4f6" }}>
        <div className="inbox-search-container">
          <Search size={16} color="#9ca3af" style={{ marginRight: "8px" }} />
          <input
            type="text"
            className="inbox-search-input"
            placeholder="Rechercher expéditeur, sujet, extrait..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #f3f4f6",
          backgroundColor: "#f9fafb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontWeight: 600, color: "#374151", margin: 0 }}>
          {searchTerm
            ? `Résultats (${filteredItems.length})`
            : filter === "email"
              ? `Mails (${filteredItems.length}) · ${unreadCount} non lus`
              : `Non lus (${unreadCount})`}
        </h3>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#9ca3af",
              gap: "12px",
            }}
          >
            <Loader size={32} className="animate-spin" />
            <p>Chargement des conversations...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#9ca3af",
              padding: "24px",
              textAlign: "center",
            }}
          >
            {searchTerm ? (
              <>
                <Search
                  size={48}
                  style={{ marginBottom: "16px", color: "#d1d5db" }}
                />
                <p
                  style={{
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#6b7280",
                    marginBottom: "8px",
                  }}
                >
                  Aucun résultat
                </p>
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  Aucune conversation ne correspond à "{searchTerm}"
                </p>
              </>
            ) : (
              <>
                <MessageSquare
                  size={48}
                  style={{ marginBottom: "16px", color: "#d1d5db" }}
                />
                <p
                  style={{
                    fontWeight: 500,
                    fontSize: "16px",
                    color: "#6b7280",
                    marginBottom: "8px",
                  }}
                >
                  Aucun mail
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#9ca3af",
                    maxWidth: "250px",
                  }}
                >
                  Les mails entrants (formulaires / chatbot) apparaîtront ici
                  automatiquement.
                </p>
              </>
            )}
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              style={{
                padding: "16px",
                borderBottom: "1px solid #f3f4f6",
                cursor: "pointer",
                backgroundColor:
                  selectedItem.id === item.id ? "#eef2ff" : "transparent",
                borderLeft: `4px solid ${
                  item.type === "diagnostic"
                    ? "#f97316"
                    : item.type === "call"
                    ? "#22c55e"
                    : item.type === "email"
                    ? "#6366f1"
                    : "#3b82f6"
                }`,
                transition: "background-color 0.2s",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontWeight: 500,
                    color:
                      (item.status === "new" ||
                        manualUnreadIds.has(`${item.type}-${item.id}`)) &&
                      !readIds.has(`${item.type}-${item.id}`)
                        ? "#111827"
                        : "#4b5563",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.type === "email"
                    ? item.name
                    : formatPhoneNumber(item.name) || item.name}
                  {item.hasMultipleChannels && (
                    <span title="Multi-Canal" style={{ marginLeft: "6px" }}>
                      <span role="img" aria-label="fire">
                        🔥
                      </span>
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginLeft: "8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.date}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                {getTypeIcon(item.type)}
                <span
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.type === "email"
                    ? [item.subject, item.snippet].filter(Boolean).join(" · ") ||
                      (item.summary && item.summary[0]) ||
                      ""
                    : item.summary && item.summary[0]}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "24px", // Fixed height to prevent layout jump
                }}
              >
                {(item.status === "new" || manualUnreadIds.has(`${item.type}-${item.id}`)) &&
                !readIds.has(`${item.type}-${item.id}`) ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#3b82f6",
                      borderRadius: "50%",
                    }}
                  ></span>
                ) : hoveredItemId === item.id ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMarkAsUnread) onMarkAsUnread(e, item);
                      }}
                      title="Lu / non-lu"
                      aria-label="Marquer comme non lu"
                      style={{
                        background: "#f3f4f6",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        color: "#4b5563",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <EyeOff size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDisqualify) onDisqualify(e, item);
                      }}
                      title="Disqualifier"
                      aria-label="Disqualifier"
                      style={{
                        background: "#fef2f2",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        color: "#dc2626",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onConvert) onConvert(e, item);
                      }}
                      title="Convertir"
                      aria-label="Convertir"
                      style={{
                        background: "#d1fae5",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        color: "#059669",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InboxList;
