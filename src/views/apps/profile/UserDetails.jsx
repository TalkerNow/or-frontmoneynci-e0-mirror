import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card, CardBody, Button, Badge, UncontrolledTooltip, Input } from "reactstrap";
import { User as UserIcon, Disc, ArrowLeft, Trash2 } from "react-feather";
import api from "../../../services/api";
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
  backUrl,
}) {
  const [members, setMembers] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmDeleted, setConfirmDeleted] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parentName, setParentName] = useState(null);
  const [consultantHistory, setConsultantHistory] = useState([]);
  const [consultantAccess, setConsultantAccess] = useState(null);
  // Tip D: CF7 flag (chatbot/diag from include already on user)
  const [hasCf7, setHasCf7] = useState(false);

  // Tip identité editable: lock = left card only (localStorage). Détails reste éditable.
  const lockStorageKey = (id) => `or_identity_card_locked_${id}`;
  const readLocked = (id) => {
    if (!id) return false;
    try {
      return localStorage.getItem(lockStorageKey(id)) === "1";
    } catch (e) {
      return false;
    }
  };
  const toDateInput = (val) => {
    if (!val) return "";
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    try {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return "";
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      return "";
    }
  };
  const buildFormFromUser = (u = {}) => ({
    first_name: u.first_name ?? "",
    last_name: u.last_name ?? "",
    email: u.email ?? "",
    birth_date: toDateInput(u.birth_date),
    children_number:
      u.children_number != null && u.children_number !== ""
        ? String(u.children_number)
        : "",
    military_service:
      u.military_service === true ||
      String(u.military_service || "").toLowerCase() === "oui"
        ? "oui"
        : u.military_service != null && u.military_service !== ""
          ? "Non"
          : "Non",
    mobile_number: u.mobile_number || u.office_number || "",
    personal_address: u.personal_address ?? "",
    personal_zip_code: u.personal_zip_code ?? "",
    personal_city: u.personal_city ?? "",
    personal_country: u.personal_country ?? "",
  });
  const [identityLocked, setIdentityLocked] = useState(() => readLocked(user?.id));
  const [identityForm, setIdentityForm] = useState(() => buildFormFromUser(user));
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [identitySaveError, setIdentitySaveError] = useState(null);

  useEffect(() => {
    setIdentityLocked(readLocked(user?.id));
    setIdentityForm(buildFormFromUser(user));
    setIdentitySaveError(null);
  }, [user?.id, user?.first_name, user?.last_name, user?.email, user?.birth_date,
      user?.children_number, user?.military_service, user?.mobile_number,
      user?.office_number, user?.personal_address, user?.personal_zip_code,
      user?.personal_city, user?.personal_country]);

  const setField = (key, value) => {
    setIdentityForm((prev) => ({ ...prev, [key]: value }));
  };

  const ADMIN_IDS = [4, 1271, 1638];
  const currentUserId = parseInt(localStorage.getItem("userid"), 10);

  // --- FETCH des membres ---
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
      }
    };
    fetchMembers();
    return () => { isMounted = false; };
  }, []);

  // --- FETCH accès consultant (visible admins uniquement) ---
  useEffect(() => {
    if (!user?.id || user?.role !== "Consultant" || !ADMIN_IDS.includes(currentUserId)) return;
    let isMounted = true;
    api.get(`/v1/consultant-access/user/${user.id}`)
      .then(({ data }) => { if (isMounted) setConsultantAccess(data) })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [user?.id, user?.role]);

  // --- FETCH historique consultants ---
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
        const base = (global?.config?.server_url || "").replace(/\/+$/, "");
        const { data } = await axios.get(`${base}/users/${user.id}/consultant-history`, Config);
        if (isMounted) setConsultantHistory(Array.isArray(data) ? data : []);
      } catch (e) {}
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [user?.id]);

  // --- FETCH direct du consultant si parent_id connu ---
  useEffect(() => {
    if (!user?.parent_id) return;
    let isMounted = true;
    const fetchParent = async () => {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const base = (global?.config?.server_url || "").replace(/\/+$/, "");
        const { data } = await axios.get(`${base}/users/${user.parent_id}`, Config);
        if (!isMounted) return;
        const n = (data.first_name || data.last_name)
          ? `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim()
          : (data.name ?? null);
        setParentName(n);
      } catch (e) {}
    };
    fetchParent();
    return () => { isMounted = false; };
  }, [user?.parent_id]);

  // Tip D: CF7 via inbound-emails?client_id= (Notes pattern); bot/diag from include
  useEffect(() => {
    if (!user?.id) {
      setHasCf7(false);
      return;
    }
    let cancelled = false;
    const token = localStorage.getItem("token");
    const base = (global?.config?.server_url || "").replace(/\/+$/, "");
    axios
      .get(base + "/inbound-emails", {
        params: { client_id: user.id, source: "cf7", per_page: 5 },
        headers: { Authorization: "Bearer " + token },
      })
      .then((res) => {
        if (cancelled) return;
        const rows = res.data?.data || res.data || [];
        const list = Array.isArray(rows) ? rows : [];
        const ok = list.some((r) => {
          const cid = r.client_id ?? r.clientId;
          const src = String(r.source || "").toLowerCase();
          if (cid != null && String(cid) !== String(user.id)) return false;
          return !src || src === "cf7";
        });
        setHasCf7(ok);
      })
      .catch(() => {
        if (!cancelled) setHasCf7(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const archives =
    user.conversationArchives || user.conversation_archives || [];
  const hasChatbot = Array.isArray(archives) && archives.length > 0;
  const diags =
    user.simulatorDifficultyResults ||
    user.simulator_difficulty_results ||
    [];
  const hasDiagnostic = Array.isArray(diags) && diags.length > 0;

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
        const s = (m.first_name || m.last_name)
          ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
          : (m.name ?? "");
        if (s) return s;
      }
    }

    // 2) Fallback via user.parent
    if (user.parent) {
      if (user.parent.first_name || user.parent.last_name) {
        const s = `${user.parent.first_name || ""} ${user.parent.last_name || ""}`.trim();
        if (s) return s;
      }
      if (user.parent.name) return user.parent.name;
    }

    // 3) Fallback via fetch direct du parent
    if (parentName) return parentName;

    // 4) Fallback via champ direct
    if (user.expert_name && String(user.expert_name).trim()) {
      return String(user.expert_name).trim();
    }

    return "—";
  }, [user, members, parentName]);

  const handleValidateIdentity = async () => {
    if (!user?.id || identityLocked || isSavingIdentity) return;
    setIsSavingIdentity(true);
    setIdentitySaveError(null);
    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };
      const base = (global?.config?.server_url || "").replace(/\/+$/, "");
      const firstName = (identityForm.first_name || "").trim();
      const lastName = (identityForm.last_name || "").trim();
      const email = (identityForm.email || "").trim();

      // Keep parent_id/status/role so UsersController partial-update side-effects stay safe
      await axios.put(
        `${base}/users/${user.id}`,
        {
          name: `${firstName} ${lastName}`.trim() || user.name,
          email: email || user.email,
          parent_id: user.parent_id,
          status: user.status,
          status_fa: user.status_fa,
          role: user.role,
        },
        Config
      );

      const piPayload = {
        first_name: firstName,
        last_name: lastName,
        birth_date: identityForm.birth_date || null,
        children_number:
          identityForm.children_number === ""
            ? null
            : identityForm.children_number,
        mobile_number: identityForm.mobile_number || null,
        personal_address: identityForm.personal_address || null,
        personal_zip_code: identityForm.personal_zip_code || null,
        personal_city: identityForm.personal_city || null,
        personal_country: identityForm.personal_country || null,
      };
      if (user.civility === "Monsieur") {
        piPayload.military_service = identityForm.military_service || "Non";
      }
      await axios.put(
        `${base}/personal_information/${user.id}`,
        piPayload,
        Config
      );

      try {
        localStorage.setItem(lockStorageKey(user.id), "1");
      } catch (e) {}
      setIdentityLocked(true);
    } catch (e) {
      console.error("Erreur sauvegarde identité (V)", e);
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "Erreur lors de la sauvegarde";
      setIdentitySaveError(String(msg));
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const inputStyle = {
    height: 28,
    fontSize: "0.85rem",
    padding: "2px 8px",
    maxWidth: "100%",
  };

  const isEmptyIdentityValue = (key) => {
    const raw = identityForm[key];
    if (raw == null) return true;
    const s = String(raw).trim();
    return s === "" || s === "—" || s === "–" || s === "-";
  };

  const renderIdentityValue = (key, displayNode, inputProps = {}) => {
    // Locked + filled → readonly display. Locked + empty → Input. Unlocked → Input.
    if (identityLocked && !isEmptyIdentityValue(key)) return displayNode;
    const { type = "text", ...rest } = inputProps;
    if (type === "select") {
      return (
        <Input
          type="select"
          bsSize="sm"
          style={inputStyle}
          value={identityForm[key] ?? ""}
          onChange={(e) => setField(key, e.target.value)}
          disabled={isSavingIdentity}
        >
          {rest.options}
        </Input>
      );
    }
    return (
      <Input
        type={type}
        bsSize="sm"
        style={inputStyle}
        value={identityForm[key] ?? ""}
        onChange={(e) => setField(key, e.target.value)}
        disabled={isSavingIdentity}
        {...rest}
      />
    );
  };

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
            onClick={() => history.push(backUrl || "/app/user/clientslist")}
          >
            <ArrowLeft size={16} />
          </Button.Ripple>
        </div>
        {showCollapse && (
          <div
            className="nav-link modern-nav-toggle"
            style={{ position: "absolute", top: 14, right: 10, zIndex: 5, cursor: "pointer", lineHeight: 0 }}
          >
            <Disc
              id="profileCardCollapseToggle"
              onClick={onCollapse}
              className="toggle-icon text-primary"
              size={20}
              title="Masquer la fiche"
              aria-label="Masquer la fiche"
            />
            <UncontrolledTooltip placement="left" target="profileCardCollapseToggle">
              Masquer la fiche
            </UncontrolledTooltip>
          </div>
        )}

        {/* En-tête avec icône utilisateur */}
        {/* En-tête avec icône utilisateur */}
        {(() => {
          const role = (user.role || "").toLowerCase();
          const isProspect = role === "prospect";
          const isClient = role === "client";

          // Couleurs pour Prospect (Bleu standard)
          const colorProspect = "#2c6ddf";
          const bgProspect = "#dbeafe";

          // Couleurs pour Client (Vert success)
          const colorClient = "#28c76f";
          const bgClient = "#dcfce7"; // équivalent light-success

          // Par défaut (Violet primary)
          let borderColor = "#c4b5fd";
          let bgColor = "#f5f5ff";
          let iconColor = "#7367f0";

          if (isProspect) {
            borderColor = colorProspect;
            bgColor = bgProspect;
            iconColor = colorProspect;
          } else if (isClient) {
            borderColor = colorClient;
            bgColor = bgClient;
            iconColor = colorClient;
          }

          return (
            <>
              <div className="d-flex justify-content-center mb-50">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: `1px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserIcon size={22} color={iconColor} />
                </div>
              </div>

              <h5 className="mb-25 text-center">{fullName}</h5>

              {user.role ? (
                <div className="d-flex justify-content-center align-items-center mb-75" style={{ gap: 6, flexWrap: "wrap" }}>
                  {isProspect ? (
                    <Badge
                      pill
                      style={{
                        backgroundColor: bgProspect,
                        color: colorProspect,
                      }}
                    >
                      {String(user.role).toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge
                      color={isClient ? "light-success" : "light-primary"}
                      pill
                    >
                      {String(user.role).toUpperCase()}
                    </Badge>
                  )}
                  {/* Tip D source pastilles — CF7 label hardcodé (pas getTypeLabel email→Email) */}
                  {hasCf7 && (
                    <Badge
                      pill
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: "#eef2ff",
                        color: "#4f46e5",
                      }}
                      title="Source Contact Form 7"
                    >
                      CF7
                    </Badge>
                  )}
                  {hasChatbot && (
                    <Badge
                      pill
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: "#e8f4fd",
                        color: "#1e88e5",
                      }}
                      title="Conversation chatbot"
                    >
                      Chatbot
                    </Badge>
                  )}
                  {hasDiagnostic && (
                    <Badge
                      pill
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: "#fff3e0",
                        color: "#ef6c00",
                      }}
                      title="Résultat diagnostic"
                    >
                      Diag
                    </Badge>
                  )}
                  {consultantAccess && ADMIN_IDS.includes(currentUserId) && (
                    !consultantAccess.access_id ? (
                      <span style={{
                        background: "#f0f0f0", color: "#6e6b7b",
                        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                      }}>Aucun accès</span>
                    ) : consultantAccess.access_type === "unlimited_pass" ? (
                      <span style={{
                        background: "#e6f9f0", color: "#1b8a4e",
                        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                      }}>
                        Pass illimité
                        {consultantAccess.pass_expiration_date
                          ? ` · exp. ${new Date(consultantAccess.pass_expiration_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}`
                          : ""}
                      </span>
                    ) : (
                      <span style={{
                        background: "#e8f4fd", color: "#1a73c8",
                        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                      }}>
                        {consultantAccess.remaining_credits ?? 0} crédit(s)
                      </span>
                    )
                  )}
                </div>
              ) : null}
            </>
          );
        })()}

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
                      <input
                        list="consultants-datalist"
                        className="form-control form-control-sm mr-50"
                        style={{ height: 32, fontSize: "0.85rem", maxWidth: 200 }}
                        placeholder="Taper un nom..."
                        disabled={isSaving}
                        onChange={(e) => {
                          const val = e.target.value;
                          const consultants = members.filter((m) =>
                            m.role?.toLowerCase() === "consultant" ||
                            m.role?.toLowerCase() === "expert" ||
                            m.role?.toLowerCase() === "admin"
                          );
                          const match = consultants.find((m) => {
                            const label = (m.first_name || m.last_name)
                              ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
                              : (m.name ?? "");
                            return label === val;
                          });
                          if (match) handleSaveConsultant(match.id);
                        }}
                      />
                      <datalist id="consultants-datalist">
                        {members
                          .filter((m) =>
                            m.role?.toLowerCase() === "consultant" ||
                            m.role?.toLowerCase() === "expert" ||
                            m.role?.toLowerCase() === "admin"
                          )
                          .map((m) => {
                            const label = (m.first_name || m.last_name)
                              ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
                              : (m.name ?? "");
                            return <option key={m.id} value={label} />;
                          })}
                      </datalist>
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
          {consultantHistory.length > 0 && (
            <div className="users-page-view-table compact-rows">
              <div className="d-flex user-info align-items-center flex-wrap" style={{ marginLeft: 0 }}>
                <div className="user-info-title font-weight-bold" style={{ fontSize: "0.85rem" }}>Consultant précédent :</div>
                <select
                  style={{ border: "none", background: "transparent", fontSize: "0.85rem", color: "inherit", cursor: "pointer", padding: 0, outline: "none", WebkitAppearance: "menulist-button", maxWidth: "100%" }}
                  defaultValue={consultantHistory[0]?.id}
                  onChange={() => {}}
                >
                  {consultantHistory.map((h) => (
                    <option key={h.id} value={h.id}>
                      {(() => {
                        if (h.consultant_name) return h.consultant_name;
                        const m = Array.isArray(members) && members.find(m => String(m.id) === String(h.consultant_id));
                        if (!m) return `#${h.consultant_id}`;
                        return (m.first_name || m.last_name) ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() : (m.name ?? `#${h.consultant_id}`);
                      })()} — {new Date(h.changed_at).toLocaleDateString("fr-FR")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div
            style={{
              borderTop: "1px solid #ebe9f1",
              margin: "0.25rem 0 0.5rem",
            }}
          />
          <div className="users-page-view-table compact-rows">
            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">Prénom :</div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "first_name",
                  <div>{identityForm.first_name || user.first_name || "—"}</div>
                )}
              </div>
            </div>
            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">Nom :</div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "last_name",
                  <div>{identityForm.last_name || user.last_name || "—"}</div>
                )}
              </div>
            </div>
            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">Email :</div>
              <div className="flex-grow-1 text-break" style={{ overflowWrap: "anywhere" }}>
                {renderIdentityValue(
                  "email",
                  <div title={identityForm.email || user.email || ""}>
                    {identityForm.email || user.email || "—"}
                  </div>,
                  { type: "email" }
                )}
              </div>
            </div>

            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">Tél :</div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "mobile_number",
                  <div>
                    {formatPhoneFR(
                      identityForm.mobile_number ||
                        user.mobile_number ||
                        user.office_number
                    ) || "—"}
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">Né(e) le :</div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "birth_date",
                  <div>
                    {identityForm.birth_date || user.birth_date
                      ? new Date(identityForm.birth_date || user.birth_date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </div>,
                  { type: "date" }
                )}
              </div>
            </div>
            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">
                Nombre d'enfants :
              </div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "children_number",
                  <div>
                    {identityForm.children_number !== ""
                      ? identityForm.children_number
                      : user.children_number != null
                        ? user.children_number
                        : "—"}
                  </div>,
                  { type: "number", min: 0 }
                )}
              </div>
            </div>
            {user.civility === "Monsieur" && (
              <div className="d-flex user-info align-items-center">
                <div className="user-info-title font-weight-bold">
                  Service militaire :
                </div>
                <div className="flex-grow-1">
                  {renderIdentityValue(
                    "military_service",
                    <div>
                      {identityForm.military_service === "oui" ||
                      identityForm.military_service === true
                        ? "Oui"
                        : "Non"}
                    </div>,
                    {
                      type: "select",
                      options: (
                        <>
                          <option value="oui">Oui</option>
                          <option value="Non">Non</option>
                        </>
                      ),
                    }
                  )}
                </div>
              </div>
            )}            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">Adresse :</div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "personal_address",
                  <div>
                    {formatAddress(
                      identityForm.personal_address || user.personal_address,
                      user.personal_address_2
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">CP :</div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "personal_zip_code",
                  <div>
                    {identityForm.personal_zip_code ||
                      user.personal_zip_code ||
                      "—"}
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">Ville :</div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "personal_city",
                  <div>
                    {identityForm.personal_city || user.personal_city || "—"}
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex user-info align-items-center">
              <div className="user-info-title font-weight-bold">Pays :</div>
              <div className="flex-grow-1">
                {renderIdentityValue(
                  "personal_country",
                  <div>
                    {identityForm.personal_country ||
                      user.personal_country ||
                      "—"}
                  </div>
                )}
              </div>
            </div>
            {identitySaveError ? (
              <div className="text-danger mt-25" style={{ fontSize: "0.8rem" }}>
                {identitySaveError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="d-flex justify-content-center justify-content-sm-end flex-wrap mt-auto mb-0 pb-0">
          {/* Unlocked: Valider+coche + trash. Locked: Détails (escape) + trash. No Valider after lock. */}
          {identityLocked ? (
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
          ) : (
            /* Mint pastille tokens (#dcfce7 / #28c76f) — label Valider + checkmark (right stroke longer) */
            <button
              type="button"
              aria-label="Valider"
              title="Valider"
              data-identity-validate="1"
              className="mr-1"
              disabled={isSavingIdentity}
              onClick={handleValidateIdentity}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 40,
                minWidth: 44,
                padding: "0 14px",
                marginBottom: "10px",
                borderRadius: 20,
                cursor: isSavingIdentity ? "wait" : "pointer",
                backgroundColor: "#dcfce7",
                color: "#28c76f",
                border: "1px solid #28c76f",
                boxShadow: "none",
                outline: "none",
                appearance: "none",
                WebkitAppearance: "none",
                opacity: 1,
                whiteSpace: "nowrap",
              }}
            >
              {isSavingIdentity ? (
                <span
                  style={{
                    color: "#28c76f",
                    WebkitTextFillColor: "#28c76f",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                >
                  …
                </span>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M2.5 8.2L6.2 12.1L13.5 3.6"
                      stroke="#28c76f"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      color: "#28c76f",
                      WebkitTextFillColor: "#28c76f",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      lineHeight: 1,
                      letterSpacing: "0.01em",
                      userSelect: "none",
                    }}
                  >
                    Valider
                  </span>
                </>
              )}
            </button>
          )}
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
