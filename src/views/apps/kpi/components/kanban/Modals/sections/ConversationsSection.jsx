import React from "react";
import { Badge, Button, Collapse } from "reactstrap";
import { MessageSquare, ChevronDown, ChevronUp } from "react-feather";

const ConversationsSection = ({
  conversationArchives,
  expandedConversations,
  onToggleConversation,
  formatRelativeTime,
}) => {
  if (!conversationArchives || conversationArchives.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "#f0f9ff",
        borderRadius: "8px",
        padding: "12px",
        border: "1px solid #bfdbfe",
      }}
    >
      <h3
        style={{
          fontSize: "0.8rem",
          fontWeight: "bold",
          color: "#1e40af",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <MessageSquare size={14} /> Notes
        <Badge
          color="primary"
          pill
          style={{ fontSize: "10px", marginLeft: "4px" }}
        >
          {conversationArchives.length}
        </Badge>
      </h3>
      {conversationArchives.map((conv, idx) => {
        const isExpanded = expandedConversations[idx];
        const previewLength = 100;
        const needsTruncate =
          conv.comment && conv.comment.length > previewLength;
        const displayText = isExpanded
          ? conv.comment
          : needsTruncate
            ? conv.comment.substring(0, previewLength) + "..."
            : conv.comment;

        return (
          <div
            key={idx}
            style={{
              backgroundColor: "#fff",
              borderRadius: "6px",
              padding: "8px",
              marginBottom: "8px",
              border: "1px solid #dbeafe",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#1e40af",
                  }}
                >
                  {conv.createdBy?.firstname} {conv.createdBy?.lastname}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#6b7280",
                  }}
                >
                  {formatRelativeTime
                    ? formatRelativeTime(conv.createdAt)
                    : new Date(conv.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
              {needsTruncate && (
                <Button
                  size="sm"
                  color="link"
                  onClick={() => onToggleConversation(idx)}
                  style={{
                    padding: "0",
                    fontSize: "12px",
                    color: "#2563eb",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isExpanded ? (
                    <>
                      Réduire <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      Voir plus <ChevronDown size={14} />
                    </>
                  )}
                </Button>
              )}
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#374151",
                lineHeight: "1.4",
                whiteSpace: "pre-wrap",
              }}
            >
              {displayText}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConversationsSection;
