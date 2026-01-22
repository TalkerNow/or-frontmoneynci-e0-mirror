import React from "react";
import { X, MessageSquare } from "lucide-react";

const ConversationModal = ({ isOpen, onClose, messages = [] }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    width: "90%",
                    maxWidth: "600px",
                    maxHeight: "80vh",
                    overflow: "hidden",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: "20px 24px",
                        borderBottom: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <h3
                        style={{
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: 600,
                            color: "#1f2937",
                        }}
                    >
                        Conversation complète
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            color: "#374151",
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body - Conversation */}
                <div
                    style={{
                        padding: "24px",
                        overflowY: "auto",
                        maxHeight: "calc(80vh - 80px)",
                    }}
                >
                    {messages.length > 0 ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "16px",
                            }}
                        >
                            {messages
                                .filter((msg) => msg.role !== "system")
                                .map((msg, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems:
                                                msg.role === "user" ? "flex-start" : "flex-end",
                                        }}
                                    >
                                        <div
                                            style={{
                                                maxWidth: "80%",
                                                padding: "12px 16px",
                                                borderRadius:
                                                    msg.role === "user"
                                                        ? "16px 16px 16px 4px"
                                                        : "16px 16px 4px 16px",
                                                backgroundColor:
                                                    msg.role === "user" ? "#f3f4f6" : "#4f46e5",
                                                color: msg.role === "user" ? "#374151" : "#fff",
                                            }}
                                        >
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: "14px",
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {msg.content}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: "12px",
                                                color: "#9ca3af",
                                                marginTop: "4px",
                                                paddingLeft: msg.role === "user" ? "4px" : "0",
                                                paddingRight: msg.role === "user" ? "0" : "4px",
                                            }}
                                        >
                                            {msg.role === "user" ? "Client" : "Chatbot"}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div
                            style={{
                                textAlign: "center",
                                color: "#374151",
                                padding: "32px",
                            }}
                        >
                            <MessageSquare
                                size={32}
                                style={{ marginBottom: "8px", opacity: 0.5 }}
                            />
                            <p>Aucun message dans cette conversation</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationModal;
