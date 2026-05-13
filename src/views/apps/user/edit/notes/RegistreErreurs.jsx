import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import api from "../../../../../services/api";

function formatDate(str) {
  if (!str) return "";
  return str;
}

const isActif = (r) => (r.statut || "").includes("✅");

export default function RegistreErreurs({ onOpenChat }) {
  const [loading, setLoading]           = useState(true);
  const [data, setData]                 = useState(null);
  const [selectedRule, setSelectedRule] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // rule to delete
  const [toggling, setToggling]         = useState(null);   // code en cours de toggle
  const [deleting, setDeleting]         = useState(null);   // code en cours de delete
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/v1/admin-chat/registry")
      .then((res) => setData(res.data))
      .catch(() => toast.error("Impossible de charger le registre."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    window.addEventListener("registre-updated", load);
    return () => window.removeEventListener("registre-updated", load);
  }, [load]);

  const handleToggle = (r) => {
    setToggling(r.code);
    api.patch(`/v1/admin-chat/registry/rules/${r.code}/status`)
      .then((res) => {
        const nextActif = res.data.statut.includes("✅");
        toast.success(`Règle ${r.code} ${nextActif ? "activée" : "désactivée"}.`);
        setShowInactive(!nextActif); // basculer sur l'onglet de destination
        load();
      })
      .catch(() => toast.error("Erreur lors du changement de statut."))
      .finally(() => setToggling(null));
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const code = confirmDelete.code;
    setDeleting(code);
    setConfirmDelete(null);
    api.delete(`/v1/admin-chat/registry/rules/${code}`)
      .then(() => { toast.success(`Règle ${code} supprimée.`); load(); })
      .catch(() => toast.error("Erreur lors de la suppression."))
      .finally(() => setDeleting(null));
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 32, color: "#aaa", fontSize: 13 }}>Chargement du registre…</div>;
  }

  if (!data) return null;

  const { parsed } = data;
  const stats    = parsed?.stats || {};
  const allRules = [...(parsed?.active_rules || []), ...(parsed?.archived_rules || [])];
  const active   = allRules.filter(isActif);
  const inactive = allRules.filter((r) => !isActif(r));
  const displayed = showInactive ? inactive : active;

  return (
    <>
      {/* Confirm delete modal */}
      <Modal isOpen={!!confirmDelete} toggle={() => setConfirmDelete(null)} centered>
        <ModalHeader toggle={() => setConfirmDelete(null)}>Supprimer la règle</ModalHeader>
        <ModalBody style={{ fontSize: 13 }}>
          Supprimer définitivement <strong>{confirmDelete?.code}</strong> — <em>{confirmDelete?.title}</em> ?
          <br /><br />
          <span style={{ color: "#D63031", fontSize: 12 }}>Cette action est irréversible.</span>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" onClick={handleDelete} disabled={!!deleting}>Supprimer</Button>
          <Button color="primary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
        </ModalFooter>
      </Modal>

      {/* Rule detail modal */}
      <Modal isOpen={!!selectedRule} toggle={() => setSelectedRule(null)} centered size="lg">
        {selectedRule && (
          <>
            <ModalHeader toggle={() => setSelectedRule(null)} style={{ background: "#D6303108", borderBottom: "1px solid #D6303120" }}>
              <span style={{ color: "#D63031", fontWeight: 800 }}>{selectedRule.code}</span>
              <span style={{ marginLeft: 8, fontWeight: 600, color: "#1a1a2e" }}>{selectedRule.title}</span>
            </ModalHeader>
            <ModalBody style={{ fontSize: 13 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Date d'ajout", selectedRule.date_ajout],
                    ["Cas origine", selectedRule.cas_origine],
                    ["Prompt concerné", selectedRule.prompt_concerne],
                    ["Consultant", selectedRule.consultant],
                    ["Niveau", selectedRule.niveau],
                    ["Statut", selectedRule.statut],
                  ].map(([label, val]) => val && (
                    <tr key={label} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 700, color: "#555", width: 160, whiteSpace: "nowrap" }}>{label}</td>
                      <td style={{ padding: "7px 10px", color: "#333" }}>{val}</td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "#555", verticalAlign: "top" }}>Erreur détectée</td>
                    <td style={{ padding: "7px 10px", color: "#333" }}>{selectedRule.erreur_detectee}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "#555", verticalAlign: "top" }}>Condition Python</td>
                    <td style={{ padding: "7px 10px" }}>
                      <code style={{ fontSize: 12, background: "#f5f5f5", padding: "3px 7px", borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {selectedRule.condition_python}
                      </code>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "#555", verticalAlign: "top" }}>Message d'erreur</td>
                    <td style={{ padding: "7px 10px", color: "#D63031", fontWeight: 600 }}>{selectedRule.message_erreur}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "#555", verticalAlign: "top" }}>Impact</td>
                    <td style={{ padding: "7px 10px", color: "#333" }}>{selectedRule.impact}</td>
                  </tr>
                </tbody>
              </table>
            </ModalBody>
            <ModalFooter style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  color={isActif(selectedRule) ? "warning" : "success"}
                  disabled={toggling === selectedRule.code}
                  onClick={() => { handleToggle(selectedRule); setSelectedRule(null); }}
                >
                  {toggling === selectedRule.code ? "…" : isActif(selectedRule) ? "Désactiver" : "Activer"}
                </Button>
                <Button
                  color="danger"
                  disabled={!!deleting}
                  onClick={() => { setSelectedRule(null); setConfirmDelete(selectedRule); }}
                >
                  Supprimer
                </Button>
              </div>
              <Button color="primary" onClick={() => setSelectedRule(null)}>Fermer</Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Add rule modal */}
      <Modal isOpen={addModalOpen} toggle={() => setAddModalOpen(false)} centered>
        <ModalHeader toggle={() => setAddModalOpen(false)}>Ajouter une règle</ModalHeader>
        <ModalBody style={{ fontSize: 13 }}>
          Ouvrez le chat Assistant Moteur IA et tapez :<br /><br />
          <code style={{ background: "#f5f5f5", padding: "6px 10px", borderRadius: 5, display: "block", fontSize: 12 }}>
            "cette erreur ne doit plus se reproduire"
          </code>
          <br />
          L'assistant vous guidera pour formaliser la règle.
        </ModalBody>
        <ModalFooter>
          <Button color="danger" onClick={() => { setAddModalOpen(false); onOpenChat && onOpenChat(); }}>
            Ouvrir le chat
          </Button>
          <Button color="secondary" onClick={() => setAddModalOpen(false)}>Annuler</Button>
        </ModalFooter>
      </Modal>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>📚</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#D63031" }}>Registre d'erreurs</span>
        <button onClick={load} style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 5, border: "1px solid #ddd", background: "#fafafa", color: "#555", cursor: "pointer" }}>
          ↻ Actualiser
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>
        Règles Gate #2 — chaque erreur capturée bloque automatiquement les calculs incohérents
      </div>

      {/* Stats */}
      <div className="simu-auto-results-strip" style={{ marginBottom: 16 }}>
        {[
          { label: "Règles actives",   val: active.length,   color: "#D63031" },
          { label: "Règles inactives", val: inactive.length, color: "#aaa" },
          { label: "Dernière màj",     val: formatDate(stats.last_updated), color: "#555" },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "#fafafa", border: "1px solid #eee", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toggle actives/inactives */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[
          { label: `Actives (${active.length})`,    val: false, color: "#D63031" },
          { label: `Inactives (${inactive.length})`, val: true,  color: "#aaa" },
        ].map((tab) => (
          <button
            key={String(tab.val)}
            onClick={() => setShowInactive(tab.val)}
            style={{
              fontSize: 12, padding: "4px 12px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${showInactive === tab.val ? tab.color : "#ddd"}`,
              background: showInactive === tab.val ? tab.color : "#fafafa",
              color: showInactive === tab.val ? "#fff" : "#555",
              fontWeight: showInactive === tab.val ? 700 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rules list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {displayed.map((r) => {
          const actif = isActif(r);
          return (
            <div
              key={r.code}
              style={{
                borderRadius: 8,
                border: `1px solid ${actif ? "#D6303120" : "#ddd"}`,
                background: actif ? "#fff" : "#fafafa",
                overflow: "hidden",
                opacity: actif ? 1 : 0.7,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px" }}>
                {/* Code badge */}
                <span style={{
                  fontSize: 12, fontWeight: 800, color: "#fff",
                  background: actif ? "#D63031" : "#aaa",
                  borderRadius: 4, padding: "2px 7px", flexShrink: 0,
                }}>
                  {actif ? "🔴" : "⚫"} {r.code}
                </span>

                {/* Title — clickable to detail */}
                <button
                  onClick={() => setSelectedRule(r)}
                  style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#1a1a2e", padding: 0 }}
                >
                  {r.title}
                </button>

                {/* Actions */}
                <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{r.date_ajout}</span>

                  {/* Toggle statut */}
                  <button
                    onClick={() => handleToggle(r)}
                    disabled={toggling === r.code}
                    title={actif ? "Désactiver" : "Activer"}
                    style={{
                      fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                      border: `1px solid ${actif ? "#FDCB6E" : "#00B894"}`,
                      background: "transparent",
                      color: actif ? "#e17055" : "#00B894",
                      fontWeight: 700, opacity: toggling === r.code ? 0.5 : 1,
                    }}
                  >
                    {toggling === r.code ? "…" : actif ? "Désactiver" : "Activer"}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(r)}
                    disabled={deleting === r.code}
                    title="Supprimer"
                    style={{
                      fontSize: 11, padding: "3px 7px", borderRadius: 4, cursor: "pointer",
                      border: "1px solid #D6303140", background: "transparent",
                      color: "#D63031", fontWeight: 700, opacity: deleting === r.code ? 0.5 : 1,
                    }}
                  >
                    {deleting === r.code ? "…" : "✕"}
                  </button>

                  <span style={{ fontSize: 11, color: "#6C5CE7", cursor: "pointer" }} onClick={() => setSelectedRule(r)}>👁</span>
                </div>
              </div>

              <div style={{ padding: "0 13px 8px 13px", borderTop: "1px solid #f5f5f5" }}>
                <code style={{ fontSize: 11, color: "#555", background: "#f5f5f5", padding: "3px 7px", borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {r.condition_python}
                </code>
                <span style={{ fontSize: 11, color: "#555", marginLeft: 8 }}>{r.erreur_detectee}</span>
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div style={{ textAlign: "center", color: "#bbb", fontSize: 12, padding: 20 }}>
            {showInactive ? "Aucune règle inactive." : "Aucune règle active."}
          </div>
        )}
      </div>

      {/* Add rule button */}
      <button
        onClick={() => setAddModalOpen(true)}
        style={{ marginTop: 12, width: "100%", padding: "9px 0", borderRadius: 8, border: "2px dashed #D6303140", background: "transparent", color: "#D63031", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        + Ajouter une règle
      </button>
    </>
  );
}
