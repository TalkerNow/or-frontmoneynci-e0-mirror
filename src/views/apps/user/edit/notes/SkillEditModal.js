import React, { useEffect, useState, useCallback } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Nav, NavItem, NavLink, TabContent, TabPane, Spinner } from "reactstrap";
import { toast } from "react-toastify";
import api from "../../../../../services/api";

/**
 * Modale d'édition d'un skill (skill_md + regles_json).
 *
 * Props :
 *  - isOpen          : boolean
 *  - skillCode       : string — ex "RACL" (utilisé pour GET /v1/skills/{code})
 *  - onClose         : () => void
 *  - onSaved         : (updatedSkill) => void — déclenché après save ou restore
 */
const SkillEditModal = ({ isOpen, skillCode, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skill, setSkill] = useState(null);
  const [skillMd, setSkillMd] = useState("");
  const [editedReglesJson, setEditedReglesJson] = useState("");
  const [tab, setTab] = useState("edit"); // edit | history
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadSkill = useCallback(() => {
    if (!skillCode) return;
    setLoading(true);
    api.get(`/v1/skills/${skillCode}`)
      .then((res) => {
        setSkill(res.data);
        setSkillMd(res.data.skill_md || "");
        const rj = res.data.regles_json;
        setEditedReglesJson(rj ? JSON.stringify(rj, null, 2) : "");
      })
      .catch((err) => {
        const msg = err.response?.data?.error || "Impossible de charger le skill";
        toast.error(msg);
        onClose();
      })
      .finally(() => setLoading(false));
  }, [skillCode, onClose]);

  const loadHistory = useCallback(() => {
    if (!skill?.id) return;
    setHistoryLoading(true);
    api.get(`/v1/skills/${skill.id}/history`)
      .then((res) => setHistory(res.data))
      .catch((err) => {
        const msg = err.response?.data?.error || "Impossible de charger l'historique";
        toast.error(msg);
      })
      .finally(() => setHistoryLoading(false));
  }, [skill]);

  useEffect(() => {
    if (isOpen) {
      setTab("edit");
      loadSkill();
    }
  }, [isOpen, loadSkill]);

  useEffect(() => {
    if (tab === "history" && skill?.id) {
      loadHistory();
    }
  }, [tab, skill, loadHistory]);

  const handleSave = () => {
    if (!skillMd.trim()) {
      toast.error("Le contenu Markdown ne peut pas être vide");
      return;
    }
    let parsedReglesJson = null;
    if (editedReglesJson.trim()) {
      try {
        parsedReglesJson = JSON.parse(editedReglesJson);
      } catch (e) {
        toast.error("Le JSON des règles est invalide — vérifiez la syntaxe");
        return;
      }
    }
    setSaving(true);
    api.put(`/v1/skills/${skill.id}`, { skill_md: skillMd, regles_json: parsedReglesJson })
      .then((res) => {
        toast.success("Skill mis à jour");
        setSkill(res.data.skill);
        if (onSaved) onSaved(res.data.skill);
        onClose();
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          toast.error("Action réservée aux admins");
        } else if (err.response?.status === 404) {
          toast.error("Skill introuvable");
        } else if (err.response?.status === 422) {
          toast.error("Données invalides");
        } else {
          toast.error("Erreur serveur, réessayez");
        }
      })
      .finally(() => setSaving(false));
  };

  const handleRestore = (version) => {
    if (!window.confirm(`Restaurer la version ${version} ? La version courante sera sauvegardée dans l'historique.`)) return;
    api.post(`/v1/skills/${skill.id}/restore/${version}`)
      .then((res) => {
        toast.success(`Version ${version} restaurée`);
        setSkill(res.data.skill);
        setSkillMd(res.data.skill.skill_md || "");
        loadHistory();
        if (onSaved) onSaved(res.data.skill);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          toast.error("Version introuvable");
        } else if (err.response?.status === 403) {
          toast.error("Action réservée aux admins");
        } else {
          toast.error("Erreur serveur, réessayez");
        }
      });
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="xl" backdrop="static">
      <ModalHeader toggle={onClose}>
        {skill ? `${skill.code} — ${skill.description || skill.nom}` : "Chargement…"}
      </ModalHeader>

      <ModalBody>
        {loading && <div className="text-center p-4"><Spinner size="sm" /> Chargement du skill…</div>}

        {!loading && skill && (
          <>
            <Nav tabs>
              <NavItem>
                <NavLink active={tab === "edit"} onClick={() => setTab("edit")} style={{ cursor: "pointer" }}>
                  Édition
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink active={tab === "history"} onClick={() => setTab("history")} style={{ cursor: "pointer" }}>
                  Historique
                </NavLink>
              </NavItem>
            </Nav>

            <TabContent activeTab={tab} className="pt-3">
              <TabPane tabId="edit">
                <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>
                  <strong>Type :</strong> {skill.type} &nbsp;·&nbsp;
                  <strong>Version :</strong> {skill.version} &nbsp;·&nbsp;
                  <strong>Dernière modif :</strong> {skill.updated_at ? new Date(skill.updated_at).toLocaleString("fr-FR") : "—"}
                </div>

                <label style={{ fontSize: 12, fontWeight: 600 }}>Contenu Markdown (skill_md)</label>
                <textarea
                  value={skillMd}
                  onChange={(e) => setSkillMd(e.target.value)}
                  style={{ width: "100%", minHeight: 400, fontFamily: "monospace", fontSize: 12, padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
                />

                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Configuration JSON (regles_json)</label>
                  <textarea
                    value={editedReglesJson}
                    onChange={(e) => setEditedReglesJson(e.target.value)}
                    style={{ width: "100%", minHeight: 200, fontFamily: "monospace", fontSize: 12, padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
                    placeholder="{}"
                  />
                </div>

                {skill.calcul_py && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>calcul_py (lecture seule)</label>
                    <pre style={{ background: "#f5f5f5", padding: 10, maxHeight: 200, overflow: "auto", fontSize: 10, borderRadius: 4 }}>
                      {skill.calcul_py}
                    </pre>
                  </div>
                )}
              </TabPane>

              <TabPane tabId="history">
                {historyLoading && <div className="text-center p-3"><Spinner size="sm" /> Chargement…</div>}
                {!historyLoading && history.length === 0 && (
                  <div style={{ fontSize: 12, color: "#777", padding: 20, textAlign: "center" }}>
                    Aucun historique pour ce skill — il n'a jamais été modifié.
                  </div>
                )}
                {!historyLoading && history.length > 0 && (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Modifié par</th>
                        <th>Date</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td>v{h.version}</td>
                          <td>{h.creator?.name || "—"}</td>
                          <td>{new Date(h.created_at).toLocaleString("fr-FR")}</td>
                          <td>
                            <Button size="sm" color="warning" onClick={() => handleRestore(h.version)}>
                              Restaurer
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TabPane>
            </TabContent>
          </>
        )}
      </ModalBody>

      <ModalFooter>
        <Button color="secondary" onClick={onClose} disabled={saving}>Annuler</Button>
        <Button color="primary" onClick={handleSave} disabled={saving || loading || tab !== "edit"}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default SkillEditModal;
