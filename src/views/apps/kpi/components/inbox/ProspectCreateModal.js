import React, { useState, useEffect } from "react";
import axios from "axios";
// import SweetAlert from "react-bootstrap-sweetalert";
import { toast } from "react-toastify";

const ProspectCreateModal = ({
  isOpen,
  onClose,
  onSuccess,
  prospectData = {},
  type,
  prospectId,
}) => {
  const [isCreatingProspect, setIsCreatingProspect] = useState(false);
  const [prospectForm, setProspectForm] = useState({
    firstName: prospectData.firstName || "",
    lastName: prospectData.lastName || "",
    email: prospectData.email || "",
    phone: prospectData.phone || "",
  });

  // Update form if props change
  useEffect(() => {
    setProspectForm((prev) => ({
      ...prev,
      firstName: prospectData.firstName || "",
      lastName: prospectData.lastName || "",
      email: prospectData.email || "",
      phone: prospectData.phone || "",
    }));
  }, [prospectData]);

  /* State to hold new user ID for callback */
  // const [createdUserId, setCreatedUserId] = useState(null);

  // Modal content state: 'form' | 'loading' | 'success' | 'error'
  const [modalState, setModalState] = useState("form");
  const [statusMessage, setStatusMessage] = useState("");

  const handleCreateProspect = async () => {
    const { firstName, lastName, email, phone } = prospectForm;

    const normalizeNullable = (value) => {
      if (value === null || value === undefined) return null;
      const trimmed = String(value).trim();
      return trimmed ? trimmed : null;
    };
    const normalizedFirstName = normalizeNullable(firstName);
    const normalizedLastName = normalizeNullable(lastName);
    const fullName =
      [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ") ||
      null;
    const normalizedPhone = fullName ? phone : null;

    setIsCreatingProspect(true);
    setModalState("loading");
    setStatusMessage("Création du prospect en cours...");

    try {
      const token = localStorage.getItem("token");
      const currentUserId = localStorage.getItem("userid");
      const roleStr = (localStorage.getItem("role") || "").toLowerCase();
      const isConsultant = roleStr.includes("consultant");

      const parentId = isConsultant ? currentUserId : null;
      const businessIntroducerId = isConsultant ? null : currentUserId;

      // 1. Register User
      const registerPayload = {
        name: fullName,
        email: email || `prospect_${Date.now()}@placeholder.com`, // Fallback if email missing
        password: Math.random().toString(36).slice(-10) + "1!", // Random password
        role: "Prospect",
        parent_id: parentId,
        business_introducer_id: businessIntroducerId,
      };

      const registerResponse = await axios.post(
        global.config.server_url + "/register",
        registerPayload,
        { headers: { Authorization: "Bearer " + token } },
      );

      if (registerResponse.data && registerResponse.data.user) {
        const newUserId = registerResponse.data.user.id;
        // setCreatedUserId(newUserId);

        // 2. Add Personal Info
        const infoPayload = {
          id: newUserId,
          user_id: 10, // Legacy/Default
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          email: email,
          mobile_number: normalizedPhone,
          parent_id: parentId,
          business_introducer_id: businessIntroducerId,
          civility: "Monsieur", // Default
          martial_status: null, // pas de défaut : vide reste vide
        };

        await axios.post(
          global.config.server_url + "/personal_information",
          infoPayload,
          { headers: { Authorization: "Bearer " + token } },
        );

        // 3. Link User ID to Source Item (Chatbot or Simulator)
        try {
          if (type === "chatbot" || type === "conversations-archives") {
            await axios.put(
              global.config.server_url + `/conversation-archives/${prospectId}`,
              { user_id: newUserId },
              { headers: { Authorization: "Bearer " + token } },
            );
          } else if (
            type === "diagnostic" ||
            type === "simulator-difficulty-result"
          ) {
            await axios.put(
              global.config.server_url +
                `/v1/simulator-difficulty-results/${prospectId}`,
              { user_id: newUserId },
              { headers: { Authorization: "Bearer " + token } },
            );
          }
        } catch (linkError) {
          console.error("Failed to link user to source item:", linkError);
          toast.success("Prospect créé avec succès");

          // Réinitialiser le formulaire et notifier
          setProspectForm({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
          });

          if (onSuccess) onSuccess(newUserId);
          onClose();
          setModalState("form");
          setStatusMessage("");
          // setCreatedUserId(null);
          return;
        }

        toast.success("Prospect créé avec succès");

        // Réinitialiser le formulaire et notifier
        setProspectForm({ firstName: "", lastName: "", email: "", phone: "" });

        if (onSuccess) onSuccess(newUserId);
        onClose();
        setModalState("form");
        setStatusMessage("");
        // setCreatedUserId(null);
      } else {
        throw new Error("Aucune donnée utilisateur reçue du serveur.");
      }
    } catch (error) {
      console.error("Create Prospect Error:", error);
      setModalState("error");
      setStatusMessage(
        "❌ Erreur lors de la création du prospect.\n\n" +
          (error.response?.data?.message || error.message),
      );

      // Revenir au formulaire après 3 secondes
      setTimeout(() => {
        setModalState("form");
        setStatusMessage("");
      }, 3000);
    } finally {
      setIsCreatingProspect(false);
    }
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

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            width: "90%",
            maxWidth: "500px",
            padding: "24px",
            textAlign: "left",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "20px",
              color: "#1f2937",
            }}
          >
            {modalState === "form" && "Créer un compte Prospect"}
            {modalState === "loading" && "Création en cours..."}
            {modalState === "success" && "Succès !"}
            {modalState === "error" && "Erreur"}
          </h3>

          {/* Afficher le message de statut pour loading/success/error */}
          {modalState !== "form" && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                minHeight: "200px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {modalState === "loading" && (
                <div
                  className="spinner-border text-primary"
                  style={{
                    width: "48px",
                    height: "48px",
                    marginBottom: "16px",
                  }}
                  role="status"
                >
                  <span className="sr-only">Chargement...</span>
                </div>
              )}
              {modalState === "success" && (
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  <span role="img" aria-label="success">
                    ✅
                  </span>
                </div>
              )}
              {modalState === "error" && (
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  <span role="img" aria-label="error">
                    ❌
                  </span>
                </div>
              )}
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  whiteSpace: "pre-line",
                  lineHeight: "1.6",
                }}
              >
                {statusMessage}
              </p>
              {modalState === "success" && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginTop: "12px",
                  }}
                >
                  Fermeture automatique dans 3 secondes...
                </p>
              )}
            </div>
          )}

          {/* Formulaire visible uniquement en mode 'form' */}
          {modalState === "form" && (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#374151",
                        marginBottom: "4px",
                      }}
                    >
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={prospectForm.firstName}
                      onChange={(e) =>
                        setProspectForm({
                          ...prospectForm,
                          firstName: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Prénom"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#374151",
                        marginBottom: "4px",
                      }}
                    >
                      Nom
                    </label>
                    <input
                      type="text"
                      value={prospectForm.lastName}
                      onChange={(e) =>
                        setProspectForm({
                          ...prospectForm,
                          lastName: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Nom"
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "4px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={prospectForm.email}
                    onChange={(e) =>
                      setProspectForm({
                        ...prospectForm,
                        email: e.target.value,
                      })
                    }
                    style={inputStyle}
                    placeholder="email@exemple.com"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "4px",
                    }}
                  >
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={prospectForm.phone}
                    onChange={(e) =>
                      setProspectForm({
                        ...prospectForm,
                        phone: e.target.value,
                      })
                    }
                    style={inputStyle}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    backgroundColor: "#dc3545",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateProspect}
                  disabled={isCreatingProspect}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    backgroundColor: "#7367f0",
                    border: "none",
                    color: "white",
                    fontWeight: 500,
                    cursor: "pointer",
                    opacity: isCreatingProspect ? 0.7 : 1,
                  }}
                >
                  {isCreatingProspect ? "Création..." : "Créer le prospect"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProspectCreateModal;
