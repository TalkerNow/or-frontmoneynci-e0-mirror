import React from "react";
import { Loader, MessageSquare } from "lucide-react";
import {
    getTypeIcon,
    formatPhoneNumber,
    calculateComplexityScore,
} from "./utils";

const InboxList = ({
    loading,
    visibleInboxItems,
    selectedItem,
    onSelect,
    unreadCount,
    readIds,
    manualUnreadIds,
}) => {
    return (
        <div
            className="inbox-left-panel"
            style={{
                width: "380px",
                flexShrink: 0,
                borderRight: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
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
                    Non lus ({unreadCount})
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
                ) : visibleInboxItems.length === 0 ? (
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
                            Aucune conversation
                        </p>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "#9ca3af",
                                maxWidth: "250px",
                            }}
                        >
                            Les conversations avec vos clients apparaîtront ici
                            automatiquement.
                        </p>
                    </div>
                ) : (
                    visibleInboxItems.map((item, index) => (
                        <div
                            key={`${item.id}-${index}`}
                            onClick={() => onSelect(item)}
                            style={{
                                padding: "16px",
                                borderBottom: "1px solid #f3f4f6",
                                cursor: "pointer",
                                backgroundColor:
                                    selectedItem.id === item.id ? "#eef2ff" : "transparent",
                                borderLeft: `4px solid ${item.type === "diagnostic"
                                        ? "#f97316"
                                        : item.type === "call"
                                            ? "#22c55e"
                                            : item.type === "email"
                                                ? "#6366f1"
                                                : "#3b82f6"
                                    }`,
                                transition: "background-color 0.2s",
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
                                        color: item.status === "new" ? "#111827" : "#4b5563",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {formatPhoneNumber(item.name) || item.name}
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
                                    {item.summary[0]}
                                </span>
                            </div>
                            <div
                                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                            >
                                {(item.status === "new" || manualUnreadIds.has(item.id)) &&
                                    !readIds.has(item.id) && (
                                        <span
                                            style={{
                                                display: "inline-block",
                                                width: "8px",
                                                height: "8px",
                                                backgroundColor: "#3b82f6",
                                                borderRadius: "50%",
                                            }}
                                        ></span>
                                    )}
                                {item.type === "diagnostic" && (
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            backgroundColor: "#ffedd5",
                                            color: "#c2410c",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            fontWeight: 500,
                                        }}
                                    >
                                        Score: {calculateComplexityScore(item.raw?.attributes)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default InboxList;
