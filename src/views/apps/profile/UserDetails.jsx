import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card, CardBody, Button, Badge, UncontrolledTooltip } from "reactstrap";
import { User as UserIcon, Disc, ArrowLeft, Trash2 } from "react-feather";
import { history } from "../../../history";
import SweetAlert from "react-bootstrap-sweetalert";
import ReactDOM from "react-dom";

export default function UserDetails({
  user = {},
  onEdit,
  onSuspend,
  showCollapse = false,
  onCollapse,
  cardClassName = "",
}) {
  const [members, setMembers] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmDeleted, setConfirmDeleted] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- FETCH des membres (experts) DANS CETTE FONCTION ---
  useEffect(() => {
    let isMounted = true;
    const fetchMembers = async () => {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const base = (global?.config?.server_url || "").replace(/\/+$/, "");
        const { data } = await axios.get(`${base}/users?kind=member`, Config);
        if (isMounted) setMembers(Array.isArray(data) ? data : []);
      } catch (e) {
        if (isMounted) setMembers([]);
        // Optionnel: console.warn("Erreur fetch members:", e);
      }
    };
    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Utilisateur";

  const formatPhoneFR = (val) => {
    if (!val) return "";
    try {
      let digits = String(val).replace(/\D/g, "");
      // Normaliser indicatif FR -> 0
      if (/^(?:0033)/.test(String(val)))
        digits = "0" + digits.replace(/\D/g, "").slice(4);
      else if (/^(?:\+33)/.test(String(val))) digits = "0" + digits.slice(2);
      else if (/^(?:33)/.test(digits)) digits = "0" + digits.slice(2);
      return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    } catch (e) {
      return String(val);
    }
  };

  const formatAddress = (l1, l2) => {
    const a = [l1, l2].map((v) => (v || "").trim()).filter(Boolean);
    return a.length ? a.join(" ") : "—";
  };

  // Nom de l'expert (au-dessus du téléphone)
  const expertName = useMemo(() => {
    if (!user) return "—";

    // 1) Résolution via members + parent_id
    if (Array.isArray(members) && user.parent_id != null) {
      const m = members.find((m) => String(m.id) === String(user.parent_id));
      if (m) {
        const s = `${m.first_name || ""} ${m.last_name || ""}`.trim();
        if (s) return s;
      }
    }

    // 2) Fallback via user.parent
    if (user.parent && (user.parent.first_name || user.parent.last_name)) {
      const s = `${user.parent.first_name || ""} ${
        user.parent.last_name || ""
      }`.trim();
      if (s) return s;
    }

    // 3) Fallback via champ direct
    if (user.expert_name && String(user.expert_name).trim()) {
      return String(user.expert_name).trim();
    }

    return "—";
  }, [user, members]);

  const handleSaveConsultant = async (consultantId) => {
    if (!consultantId || consultantId === "null") return;
    setIsSaving(true);
    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };
      const base = (global?.config?.server_url || "").replace(/\/+$/, "");

      // On met à jour l'utilisateur
      await axios.put(
        `${base}/users/${user.id}`,
        {
          parent_id: consultantId,
        },
        Config
      );

      // Et optionnellement dans personal_information si nécessaire (comme dans Informations.js)
      await axios.put(
        `${base}/personal_information/${user.id}`,
        {
          parent_id: consultantId,
        },
        Config
      );

      // On recharge la page pour voir les changements ou on notifie
      // (UserDetails reçoit souvent ses datas du parent, idéalement on appellerait un onUpdate)
      window.location.reload();
    } catch (e) {
      console.error("Erreur lors de la sauvegarde du consultant", e);
    } finally {
      setIsSaving(false);
      setShowSelector(false);
    }
  };

  return (
    <Card className={`h-100 profile-card ${cardClassName}`}>
      <CardBody
        className="d-flex flex-column h-100 p-1 pb-0"
        style={{ position: "relative" }}
      >
        {showDelete &&
          ReactDOM.createPortal(
            <SweetAlert
              title="Êtes-vous sûr de supprimer ce client ?"
              warning
              show={true}
              showCancel
              reverseButtons
              confirmBtnBsStyle="danger"
              cancelBtnBsStyle="primary"
              confirmBtnText="Oui, supprimer"
              cancelBtnText="Annuler"
              onConfirm={async () => {
                try {
                  const Config = {
                    headers: {
                      Authorization: "Bearer " + localStorage.getItem("token"),
                    },
                  };
                  await axios.delete(
                    `${global.config.server_url}/users/${user.id}`,
                    Config
                  );
                  setShowDelete(false);
                  history.push("/app/user/clientslist");
                } catch (e) {
                  setShowDelete(false);
                }
              }}
              onCancel={() => setShowDelete(false)}
            >
              Vous ne pourrez pas revenir en arrière
            </SweetAlert>,
            document.body
          )}

        {confirmDeleted &&
          ReactDOM.createPortal(
            <SweetAlert
              success
              title="Supprimé!"
              confirmBtnBsStyle="success"
              show={true}
              onConfirm={() => {
                setConfirmDeleted(false);
                history.push("/app/user/clientslist");
              }}
            >
              <p className="sweet-alert-text">L'utilisateur a été supprimé.</p>
            </SweetAlert>,
            document.body
          )}
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5 }}>
          <Button.Ripple
            color="primary"
            aria-label="Retour"
            title="Retour"
            className="btn-icon rounded-circle p-0 d-flex align-items-center justify-content-center"
            style={{ width: 32, height: 32 }}
            onClick={() => history.push("/app/user/clientslist")}
          >
            <ArrowLeft size={16} />
          </Button.Ripple>
        </div>
        {showCollapse && (
          <div
            className="nav-link modern-nav-toggle"
            style={{ position: "absolute", top: 10, right: 10, zIndex: 5 }}
          >
            <Disc
              id="profileCardCollapseToggle"
              onClick={onCollapse}
              className="toggle-icon icon-x d-none d-xl-block text-primary"
              size={20}
            />
            <UncontrolledTooltip
              placement="left"
              target="profileCardCollapseToggle"
            >
              Masquer la fiche
            </UncontrolledTooltip>
          </div>
        )}

        {/* En-tête avec icône utilisateur */}
        <div className="d-flex justify-content-center mb-50">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "1px solid #c4b5fd",
              backgroundColor: "#f5f5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserIcon size={22} color="#7367f0" />
          </div>
        </div>

        <h5 className="mb-25 text-center">{fullName}</h5>

        {user.role ? (
          <div className="d-flex justify-content-center mb-75">
            <Badge color="light-primary" pill>
              {String(user.role).toUpperCase()}
            </Badge>
          </div>
        ) : null}

        <div className="mt-1">
          <div className="users-page-view-table compact-rows">
            <div
              className="d-flex user-info align-items-center flex-wrap"
              style={{ marginLeft: 0 }}
            >
              <div className="user-info-title font-weight-bold">
                Consultant :
              </div>
              {expertName !== "—" ? (
                <div className="text-truncate">{expertName}</div>
              ) : (
                <div className="d-flex align-items-center">
                  {!showSelector ? (
                    <Button.Ripple
                      color="primary"
                      outline
                      size="sm"
                      className="py-25 px-1"
                      style={{ fontSize: "0.85rem", fontWeight: "500" }}
                      onClick={() => setShowSelector(true)}
                    >
                      Assigner un consultant
                    </Button.Ripple>
                  ) : (
                    <div className="d-flex align-items-center">
                      <select
                        className="form-control form-control-sm mr-50"
                        style={{
                          height: "30px",
                          fontSize: "0.8rem",
                          width: "auto",
                        }}
                        defaultValue=""
                        disabled={isSaving}
                        onChange={(e) => handleSaveConsultant(e.target.value)}
                      >
                        <option value="" disabled>
                          Choisir...
                        </option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.first_name} {m.last_name}
                          </option>
                        ))}
                      </select>
                      <Button.Ripple
                        color="danger"
                        outline
                        size="sm"
                        className="p-25"
                        style={{ fontSize: "0.7rem" }}
                        onClick={() => setShowSelector(false)}
                        disabled={isSaving}
                      >
                        X
                      </Button.Ripple>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid #ebe9f1",
              margin: "0.25rem 0 0.5rem",
            }}
          />
          <div className="users-page-view-table compact-rows">
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Prénom :</div>
              <div>{user.first_name || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Nom :</div>
              <div>{user.last_name || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Email :</div>
              <div
                className="text-break"
                style={{ overflowWrap: "anywhere" }}
                title={user.email || ""}
              >
                {user.email || "—"}
              </div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Né(e) le :</div>
              <div>
                {user.birth_date
                  ? new Date(user.birth_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">
                Nombre d'enfants :
              </div>
              <div>
                {user.children_number != null ? user.children_number : "—"}
              </div>
            </div>
            {user.civility === "Monsieur" && (
              <div className="d-flex user-info">
                <div className="user-info-title font-weight-bold">
                  Service militaire :
                </div>
                <div>
                  {user.military_service === "oui" ||
                  user.military_service === true
                    ? "Oui"
                    : "Non"}
                </div>
              </div>
            )}
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Tél :</div>
              <div>
                {formatPhoneFR(user.mobile_number || user.office_number) || "—"}
              </div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Adresse :</div>
              <div>
                {formatAddress(user.personal_address, user.personal_address_2)}
              </div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">CP :</div>
              <div>{user.personal_zip_code || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Ville :</div>
              <div>{user.personal_city || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Pays :</div>
              <div>{user.personal_country || "—"}</div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-center justify-content-sm-end flex-wrap mt-auto mb-0 pb-0">
          <Button.Ripple
            color="primary"
            aria-label="Détails"
            title="Détails"
            className="mr-1"
            style={{ height: 40, padding: "0 12px", marginBottom: "10px" }}
            onClick={onEdit}
          >
            Détails
          </Button.Ripple>
          <Button.Ripple
            color="danger"
            aria-label="Supprimer"
            title="Supprimer"
            className="mr-1"
            style={{ height: 40, padding: "0 12px", marginBottom: "10px" }}
            onClick={() => setShowDelete(true)}
          >
            <Trash2 size={15} />
          </Button.Ripple>
        </div>
      </CardBody>
    </Card>
  );
}
