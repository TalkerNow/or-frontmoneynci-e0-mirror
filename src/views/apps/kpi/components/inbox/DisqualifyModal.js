import React from "react";
import { X, XCircle, Loader } from "lucide-react";
import { DISQUALIFICATION_REASONS } from "./constants";

const DisqualifyModal = ({
    isOpen,
    onClose,
    onConfirm,
    isDisqualifying,
    reason,
    setReason,
    comment,
    setComment,
    prospectName,
}) => {
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
                zIndex: 10000,
                backdropFilter: "blur(2px)",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
                    width: "100%",
                    maxWidth: "480px",
                    margin: "16px",
                    overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: "20px 24px",
                        borderBottom: "1px solid #f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                backgroundColor: "#fef2f2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <XCircle size={20} color="#dc2626" />
                        </div>
                        <h3
                            style={{
                                margin: 0,
                                fontSize: "18px",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            Disqualifier le prospect
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "8px",
                            borderRadius: "6px",
                            color: "#6b7280",
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                            e.currentTarget.style.color = "#111827";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#6b7280";
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "24px" }}>
                    <p
                        style={{
                            margin: "0 0 20px",
                            fontSize: "14px",
                            color: "#374151",
                            lineHeight: "1.6",
                        }}
                    >
                        Vous êtes sur le point de disqualifier{" "}
                        <strong style={{ color: "#111827" }}>{prospectName}</strong>. Cette
                        action ne supprimera pas le prospect mais le retirera de votre flux
                        actif.
                    </p>

                    {/* Reason Select */}
                    <div style={{ marginBottom: "16px" }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "#111827",
                                marginBottom: "8px",
                            }}
                        >
                            Motif de disqualification{" "}
                            <span style={{ color: "#7367f0" }}>*</span>
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px 14px",
                                fontSize: "14px",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                backgroundColor: "#fff",
                                color: reason ? "#111827" : "#6b7280",
                                cursor: "pointer",
                                outline: "none",
                                appearance: "none",
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 12px center",
                                transition: "border-color 0.2s, box-shadow 0.2s",
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = "#7367f0";
                                e.target.style.boxShadow =
                                    "0 0 0 3px rgba(115, 103, 240, 0.15)";
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#e5e7eb";
                                e.target.style.boxShadow = "none";
                            }}
                        >
                            <option value="" style={{ color: "#6b7280" }}>
                                Sélectionnez un motif...
                            </option>
                            {DISQUALIFICATION_REASONS.map((r) => (
                                <option
                                    key={r.value}
                                    value={r.value}
                                    style={{ color: "#111827" }}
                                >
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Comment Textarea */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "#111827",
                                marginBottom: "8px",
                            }}
                        >
                            Commentaire{" "}
                            <span style={{ color: "#6b7280", fontWeight: 400 }}>
                                (optionnel)
                            </span>
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Ajoutez un commentaire pour préciser le contexte..."
                            style={{
                                width: "100%",
                                padding: "12px 14px",
                                fontSize: "14px",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                backgroundColor: "#fff",
                                minHeight: "100px",
                                resize: "vertical",
                                outline: "none",
                                fontFamily: "inherit",
                                transition: "border-color 0.2s, box-shadow 0.2s",
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = "#7367f0";
                                e.target.style.boxShadow =
                                    "0 0 0 3px rgba(115, 103, 240, 0.15)";
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = "#e5e7eb";
                                e.target.style.boxShadow = "none";
                            }}
                        />
                    </div>
                </div>

                {/* Modal Footer */}
                <div
                    className="modal-footer-responsive"
                    style={{
                        padding: "16px 24px",
                        borderTop: "1px solid #f3f4f6",
                        display: "flex",
                        justifyContent: "flex-end",
                        flexWrap: "wrap",
                        gap: "12px",
                        backgroundColor: "#f9fafb",
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={isDisqualifying}
                        style={{
                            padding: "10px 20px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#fff",
                            backgroundColor: isDisqualifying ? "#a5b4fc" : "#7367f0",
                            border: "none",
                            borderRadius: "8px",
                            cursor: isDisqualifying ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            opacity: isDisqualifying ? 0.5 : 1,
                        }}
                        onMouseOver={(e) => {
                            if (!isDisqualifying) {
                                e.currentTarget.style.backgroundColor = "#5a4ed1";
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isDisqualifying) {
                                e.currentTarget.style.backgroundColor = "#7367f0";
                            }
                        }}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDisqualifying || !reason}
                        style={{
                            padding: "10px 20px",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#fff",
                            backgroundColor:
                                isDisqualifying || !reason ? "#fca5a5" : "#dc2626",
                            border: "none",
                            borderRadius: "8px",
                            cursor: isDisqualifying || !reason ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                        onMouseOver={(e) => {
                            if (!isDisqualifying && reason) {
                                e.currentTarget.style.backgroundColor = "#b91c1c";
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isDisqualifying && reason) {
                                e.currentTarget.style.backgroundColor = "#dc2626";
                            }
                        }}
                    >
                        {isDisqualifying ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                Disqualification...
                            </>
                        ) : (
                            <>
                                <XCircle size={16} />
                                Confirmer la disqualification
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DisqualifyModal;
