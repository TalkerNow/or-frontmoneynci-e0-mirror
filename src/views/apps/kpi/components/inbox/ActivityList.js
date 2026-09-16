import React, { useState, useEffect } from "react";
import {
    MessageSquare,
    Phone,
    CheckCircle,
    Clock,
    Edit2,
    Trash2,
} from "lucide-react";
import { getTaskText } from "./utils";

const formatDateFr = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatDateShort = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const getPreview = (item) => {
    if (!item) return "Élément";
    if (item.type === "TASK") {
        return getTaskText(item) || item.title || item.desc || "Tâche";
    }
    return (
        item.call_report ||
        item.content ||
        item.report ||
        item.message ||
        "Élément"
    );
};

const getEcheance = (item) => {
    // Cap'tain: Call Report has no due date → display —
    if (!item || item.type === "CALLREPORT" || item.type === "LOG") return "—";
    return formatDateShort(item.end_date || item.date);
};

const ActivityList = ({
    items = [],
    onEdit,
    onDelete,
    editingItem,
    saveEditHandler,
    cancelEditHandler,
    editText,
    setEditText,
    initialFilter = "ALL",
    limit,
    hideFilters = false,
    compact = false,
}) => {
    const [historyFilter, setHistoryFilter] = useState(initialFilter); // ALL, CALLREPORT, TASK

    useEffect(() => {
        setHistoryFilter(initialFilter || "ALL");
    }, [initialFilter]);

    const filteredItems = items.filter((item) => {
        if (historyFilter === "ALL") return true;
        if (historyFilter === "CALLREPORT") return item.type === "CALLREPORT";
        if (historyFilter === "TASK") return item.type === "TASK";
        return true;
    });

    const displayItems =
        typeof limit === "number" ? filteredItems.slice(0, limit) : filteredItems;

    const callReportCount = items.filter((i) => i.type === "CALLREPORT").length;
    const taskCount = items.filter((i) => i.type === "TASK").length;
    const isEmpty = displayItems.length === 0;

    // Styles
    const listItemStyle = {
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: compact ? "8px 0" : "12px 0",
        borderBottom: "1px solid #f3f4f6",
    };

    const inputStyle = {
        width: "100%",
        padding: "10px 12px",
        fontSize: "14px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        marginBottom: "12px",
        outline: "none",
    };

    const buttonStyle = {
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 500,
        color: "#fff",
        backgroundColor: "#4f46e5",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
    };

    const secondaryButtonStyle = {
        ...buttonStyle,
        backgroundColor: "#f3f4f6",
        color: "#374151",
    };

    const emptyStateStyle = {
        textAlign: "center",
        padding: "24px 16px",
        color: "#9ca3af",
    };

    const metaStyle = {
        margin: "4px 0 0",
        fontSize: "12px",
        color: "#9ca3af",
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
    };

    return (
        <div>
            {/* Filter Tabs */}
            {!hideFilters && (
                <div
                    style={{
                        display: "flex",
                        borderBottom: "1px solid #e5e7eb",
                        marginBottom: "16px",
                        gap: "24px",
                    }}
                >
                    <button
                        onClick={() =>
                            setHistoryFilter(
                                historyFilter === "CALLREPORT" ? "ALL" : "CALLREPORT"
                            )
                        }
                        style={{
                            padding: "8px 0",
                            background: "none",
                            border: "none",
                            borderBottom:
                                historyFilter === "CALLREPORT"
                                    ? "2px solid #7367f0"
                                    : "2px solid transparent",
                            color: historyFilter === "CALLREPORT" ? "#7367f0" : "#6b7280",
                            fontWeight: 500,
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        Call Reports <span style={{ opacity: 0.7 }}>({callReportCount})</span>
                    </button>
                    <button
                        onClick={() =>
                            setHistoryFilter(historyFilter === "TASK" ? "ALL" : "TASK")
                        }
                        style={{
                            padding: "8px 0",
                            background: "none",
                            border: "none",
                            borderBottom:
                                historyFilter === "TASK"
                                    ? "2px solid #7367f0"
                                    : "2px solid transparent",
                            color: historyFilter === "TASK" ? "#7367f0" : "#6b7280",
                            fontWeight: 500,
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        Tâches <span style={{ opacity: 0.7 }}>({taskCount})</span>
                    </button>
                </div>
            )}

            {isEmpty ? (
                <div style={emptyStateStyle}>
                    <MessageSquare
                        size={32}
                        style={{ marginBottom: "8px", opacity: 0.5 }}
                    />
                    <p style={{ margin: 0, fontWeight: 500 }}>Aucune activité</p>
                    <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                        Aucun élément dans cette catégorie
                    </p>
                </div>
            ) : (
                <div>
                    {displayItems.map((item, index) => (
                        <div key={item.id || index} style={listItemStyle}>
                            <div
                                style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    backgroundColor:
                                        item.type === "CALLREPORT"
                                            ? "#3b82f615"
                                            : item.type === "TASK"
                                                ? "#f9731615"
                                                : "#6b728015",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                {item.type === "CALLREPORT" && (
                                    <Phone size={16} color="#3b82f6" />
                                )}
                                {item.type === "TASK" && (
                                    <CheckCircle size={16} color="#f97316" />
                                )}
                                {item.type === "LOG" && <Clock size={16} color="#6b7280" />}
                            </div>

                            {/* Edit Mode */}
                            {editingItem && editingItem.id === item.id ? (
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        style={{ ...inputStyle, marginBottom: "8px" }}
                                        autoFocus
                                    />
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            onClick={saveEditHandler}
                                            style={buttonStyle}
                                        >
                                            Sauvegarder
                                        </button>
                                        <button
                                            onClick={cancelEditHandler}
                                            style={secondaryButtonStyle}
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "14px",
                                                color: "#374151",
                                                fontWeight: 500,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: compact ? "nowrap" : "normal",
                                            }}
                                            title={getPreview(item)}
                                        >
                                            {getPreview(item)}
                                        </p>
                                        <p style={metaStyle}>
                                            <span>
                                                Création:{" "}
                                                {formatDateFr(
                                                    item.created_at || item.date || null
                                                )}
                                            </span>
                                            <span>·</span>
                                            <span>Échéance: {getEcheance(item)}</span>
                                        </p>
                                    </div>
                                    {/* Action Buttons */}
                                    {item.type !== "LOG" && !compact && (
                                        <div style={{ display: "flex", gap: "4px" }}>
                                            <button
                                                onClick={() => onEdit(item)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    padding: "6px",
                                                    color: "#6b7280",
                                                    borderRadius: "4px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                                title="Modifier"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(item)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    padding: "6px",
                                                    color: "#ef4444",
                                                    borderRadius: "4px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                                title="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityList;
