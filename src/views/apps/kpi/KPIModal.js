import React, { useState, useEffect } from "react";
import { Modal, ModalBody, Input } from "reactstrap";
import { UserPlus, Mail, PhoneIncoming, PhoneOutgoing } from "react-feather";

// Configuration constantes
const CONTACT_TYPES = [
  { id: "Appel entrant", label: "Appel entrant", icon: PhoneIncoming },
  { id: "Appel sortant", label: "Appel sortant", icon: PhoneOutgoing },
  { id: "Email", label: "Email", icon: Mail },
];

const ACTIONS = [
  { id: "Rendez-vous pris", label: "Rendez-vous pris", color: "#10b981" },
  {
    id: "Mail prestation envoyé",
    label: "Mail prestation envoyé",
    color: "#17a2b8",
  },
  { id: "NUL", label: "NUL", color: "#ef4444" },
  { id: "Autre", label: "Autre", color: "#6b7280" },
];

// Helper functions
function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPhone(val) {
  if (!val) return "";
  const clean = val.replace(/[^0-9+]/g, "");
  if (clean.startsWith("0")) {
    return clean.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return clean;
}

export default function KPIModal({
  isOpen,
  toggle,
  onSave,
  loading,
  error,
  history,
}) {
  // États du formulaire
  const [selectedType, setSelectedType] = useState("Appel entrant");
  const [kpiDate, setKpiDate] = useState(todayStr());
  const [nomPrenom, setNomPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [note, setNote] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  // État pour la section "Récupérer diagnostic"
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  // Reset au montage
  useEffect(() => {
    if (isOpen) {
      setSelectedType("Appel entrant");
      setKpiDate(todayStr());
      setNomPrenom("");
      setEmail("");
      setTelephone("");
      setNote("");
      setSelectedAction("");
      setEmailBody("");
      setSendMsg("");
    }
  }, [isOpen]);

  const actionsDisabled = selectedType === "Email";

  const sendEmailWebhook = async () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSendMsg("✅ Message envoyé (Simulation)");
    }, 1000);
  };

  const handleCreate = () => {
    const data = {
      objet: selectedType,
      kpi_date: kpiDate,
      nom_prenom: nomPrenom,
      email,
      telephone,
      note,
      action: actionsDisabled ? "Email reçu" : selectedAction,
    };
    onSave(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      className="modal-dialog-centered"
      style={{ maxWidth: "700px", width: "100%" }}
    >
      <ModalBody style={{ padding: 0 }}>
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px" }}>
          {/* Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Créer un KPI
            </h2>
            <button
              onClick={() => history && history.push("/app/user/createUser")}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
              title="Créer un utilisateur"
            >
              <UserPlus size={18} color="#6b7280" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "20px 24px" }}>
            {/* Error Message */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "24px",
                  color: "#b91c1c",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            {/* Segmented Control - Type de contact */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                Type de contact
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    borderRadius: "10px",
                    padding: "4px",
                    display: "inline-flex",
                    gap: "4px",
                    flex: 1,
                  }}
                >
                  {CONTACT_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isActive = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        style={{
                          flex: 1,
                          backgroundColor: isActive ? "#ffffff" : "transparent",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          boxShadow: isActive
                            ? "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
                            : "none",
                          color: isActive ? "#6366f1" : "#6b7280",
                          fontWeight: isActive ? 600 : 500,
                          fontSize: "13px",
                        }}
                      >
                        <Icon size={16} />
                        <span className="d-none d-sm-inline">{type.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Date Picker */}
                <Input
                  type="date"
                  value={kpiDate}
                  onChange={(e) => setKpiDate(e.target.value)}
                  max={todayStr()}
                  style={{
                    width: "auto",
                    minWidth: "140px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#374151",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Section Récupérer diagnostic (Appel sortant uniquement) */}
            {selectedType === "Appel sortant" && (
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                }}
              >
                <h6
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "12px",
                  }}
                >
                  Récupérer le diagnostic
                </h6>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <Input
                    type="text"
                    placeholder="Email du client"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    style={{
                      maxWidth: "300px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "14px",
                    }}
                  />
                  <button
                    onClick={sendEmailWebhook}
                    disabled={sending || !emailBody.trim()}
                    style={{
                      backgroundColor: "#6366f1",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor:
                        sending || !emailBody.trim()
                          ? "not-allowed"
                          : "pointer",
                      opacity: sending || !emailBody.trim() ? 0.6 : 1,
                    }}
                  >
                    {sending ? "Envoi..." : "Recevoir"}
                  </button>
                </div>
                {sendMsg && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "13px",
                      color: "#059669",
                    }}
                  >
                    {sendMsg}
                  </div>
                )}
              </div>
            )}

            {/* Formulaire - Champs de contact */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                marginBottom: "12px",
              }}
            >
              {/* Nom / Prénom */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                  }}
                >
                  Nom / Prénom
                </label>
                <Input
                  type="text"
                  placeholder="Nom Prénom"
                  value={nomPrenom}
                  onChange={(e) => setNomPrenom(e.target.value)}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#374151",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                  }}
                >
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#374151",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Téléphone */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "6px",
                  }}
                >
                  Téléphone
                </label>
                <Input
                  type="text"
                  placeholder="06 12 34 56 78"
                  value={telephone}
                  onChange={(e) => setTelephone(formatPhone(e.target.value))}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#374151",
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Note - Full width */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "6px",
                }}
              >
                Note
              </label>
              <Input
                type="textarea"
                placeholder="Quelques notes…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "14px",
                  color: "#374151",
                  transition: "all 0.2s",
                  minHeight: "80px",
                  resize: "vertical",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(99, 102, 241, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Section Action - Chips sélectionnables */}
            {!actionsDisabled && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "12px",
                  }}
                >
                  Action
                </label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {ACTIONS.map((action) => {
                    const isSelected = selectedAction === action.id;
                    return (
                      <button
                        key={action.id}
                        onClick={() => setSelectedAction(action.id)}
                        style={{
                          backgroundColor: isSelected
                            ? action.color
                            : "#f3f4f6",
                          color: isSelected ? "#ffffff" : "#374151",
                          border: "none",
                          borderRadius: "20px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          whiteSpace: "nowrap",
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "#e5e7eb";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                          }
                        }}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 24px",
              borderTop: "1px solid #f3f4f6",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            {/* Bouton Annuler - Ghost */}
            <button
              onClick={toggle}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "#6b7280",
                padding: "10px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Annuler
            </button>

            {/* Bouton Créer - Primary */}
            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                backgroundColor: "#6366f1",
                border: "none",
                color: "#ffffff",
                padding: "10px 24px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "#4f46e5";
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "#6366f1";
                }
              }}
            >
              {loading ? "Création..." : "Créer le KPI"}
            </button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
