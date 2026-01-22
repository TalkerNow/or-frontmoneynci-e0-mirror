import React, { useState, useEffect } from "react";
import axios from "axios";
import SweetAlert from "react-bootstrap-sweetalert";

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

    // Alert States
    const [successAlertVisible, setSuccessAlertVisible] = useState(false);
    const [successAlertMessage, setSuccessAlertMessage] = useState("");
    const [warningAlertVisible, setWarningAlertVisible] = useState(false);
    const [warningAlertMessage, setWarningAlertMessage] = useState("");
    const [errorAlertVisible, setErrorAlertVisible] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState("");

    /* State to hold new user ID for callback */
    const [createdUserId, setCreatedUserId] = useState(null);

    const handleCreateProspect = async () => {
        const { firstName, lastName, email, phone } = prospectForm;

        if (!firstName || !lastName) {
            alert("Nom et prénom sont obligatoires");
            return;
        }

        setIsCreatingProspect(true);
        try {
            const token = localStorage.getItem("token");
            const currentUserId = localStorage.getItem("userid");
            const roleStr = (localStorage.getItem("role") || "").toLowerCase();
            const isConsultant = roleStr.includes("consultant");

            const parentId = isConsultant ? currentUserId : null;
            const businessIntroducerId = isConsultant ? null : currentUserId;

            // 1. Register User
            const registerPayload = {
                name: `${firstName} ${lastName}`,
                email: email || `prospect_${Date.now()}@placeholder.com`, // Fallback if email missing
                password: Math.random().toString(36).slice(-10) + "1!", // Random password
                role: "Prospect",
                parent_id: parentId,
                business_introducer_id: businessIntroducerId,
            };

            const registerResponse = await axios.post(
                global.config.server_url + "/register",
                registerPayload,
                { headers: { Authorization: "Bearer " + token } }
            );

            if (registerResponse.data && registerResponse.data.user) {
                const newUserId = registerResponse.data.user.id;
                setCreatedUserId(newUserId);

                // 2. Add Personal Info
                const infoPayload = {
                    id: newUserId,
                    user_id: 10, // Legacy/Default
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    mobile_number: phone,
                    parent_id: parentId,
                    business_introducer_id: businessIntroducerId,
                    civility: "Monsieur", // Default
                    martial_status: "Célibataire", // Default
                };

                await axios.post(
                    global.config.server_url + "/personal_information",
                    infoPayload,
                    { headers: { Authorization: "Bearer " + token } }
                );

                // 3. Link User ID to Source Item (Chatbot or Simulator)
                try {
                    if (type === "chatbot" || type === "conversations-archives") {
                        await axios.put(
                            global.config.server_url + `/conversation-archives/${prospectId}`,
                            { user_id: newUserId },
                            { headers: { Authorization: "Bearer " + token } }
                        );
                    } else if (
                        type === "diagnostic" ||
                        type === "simulator-difficulty-result"
                    ) {
                        await axios.put(
                            global.config.server_url +
                            `/v1/simulator-difficulty-results/${prospectId}`,
                            { user_id: newUserId },
                            { headers: { Authorization: "Bearer " + token } }
                        );
                    }
                } catch (linkError) {
                    console.error("Failed to link user to source item:", linkError);
                    setWarningAlertMessage(
                        "Prospect créé, mais la liaison avec la conversation a échoué. " +
                        (linkError.response?.data?.message || linkError.message)
                    );
                    setWarningAlertVisible(true);
                    // Wait for user to acknowledge warning before closing? 
                    // Or just proceed. We will proceed when alert is closed.
                    // For now, let's call onSuccess but with a flag? 
                    // Actually onSuccess handles switching view.
                }

                // Show success popup
                setSuccessAlertMessage(
                    "Prospect créé avec succès ! Vous pouvez maintenant ajouter des actions."
                );
                setSuccessAlertVisible(true);
            }
        } catch (error) {
            console.error("Create Prospect Error:", error);
            setErrorAlertMessage(
                "Erreur lors de la création du prospect. " +
                (error.response?.data?.message || error.message)
            );
            setErrorAlertVisible(true);
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
                        Créer un compte Prospect
                    </h3>

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
                                    Prénom *
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
                                    Nom *
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
                </div>
            </div>

            <SweetAlert
                success
                title="Succès !"
                show={successAlertVisible}
                confirmBtnText="OK"
                confirmBtnBsStyle="success"
                onConfirm={() => {
                    setSuccessAlertVisible(false);
                    if (onSuccess) onSuccess(createdUserId);
                }}
            >
                <p className="sweet-alert-text">{successAlertMessage}</p>
            </SweetAlert>

            <SweetAlert
                warning
                title="Attention"
                show={warningAlertVisible}
                confirmBtnText="OK"
                confirmBtnBsStyle="warning"
                onConfirm={() => {
                    setWarningAlertVisible(false);
                    if (onSuccess) onSuccess(createdUserId);
                }}
            >
                <p className="sweet-alert-text">{warningAlertMessage}</p>
            </SweetAlert>

            <SweetAlert
                error
                title="Erreur"
                show={errorAlertVisible}
                confirmBtnText="OK"
                confirmBtnBsStyle="danger"
                onConfirm={() => setErrorAlertVisible(false)}
            >
                <p className="sweet-alert-text">{errorAlertMessage}</p>
            </SweetAlert>
        </>
    );
};

export default ProspectCreateModal;
