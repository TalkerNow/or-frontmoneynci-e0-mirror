import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  CheckCircle,
  Phone,
  User,
  Plus,
} from "lucide-react";
import SweetAlert from "react-bootstrap-sweetalert";

import { getTaskText } from "./utils";
import ProspectCreateModal from "./ProspectCreateModal";
import CreateUserKanbanModal from "../kanban/Modals/CreateUserKanbanModal";
import ActivityList from "./ActivityList";

const todayYmd = () => new Date().toISOString().split("T")[0];

const normalizeTask = (t) => ({
  ...t,
  text: t.text || t.title || t.desc || getTaskText(t) || "",
  type: "TASK",
  customer_id: t.customer_id ?? t.user_id,
  end_date: t.end_date || t.date || null,
  created_at: t.created_at || t.date || null,
});

const ActionsSection = ({
  clientId,
  adminId,
  prospectId,
  type,
  prospectData = {},
  onProspectCreated, // Nouveau callback pour notifier le parent
  hideNav = false,
  controlledView,
  onViewChange,
}) => {
  const [internalView, setInternalView] = useState("HOME");
  const activeView =
    controlledView !== undefined ? controlledView : internalView;
  const setActiveView = (v) => {
    const next = typeof v === "function" ? v(activeView) : v;
    if (onViewChange) onViewChange(next);
    if (controlledView === undefined) setInternalView(next);
  };
  const [newCallReport, setNewCallReport] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [taskDateTime, setTaskDateTime] = useState("");
  const [historyFilter, setHistoryFilter] = useState("ALL");

  // Create Prospect Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create User Kanban Modal State
  const [showKanbanModal, setShowKanbanModal] = useState(false);

  // Local state for prospect creation result
  const [localClientId, setLocalClientId] = useState(null);

  useEffect(() => {
    setLocalClientId(null);
    // Parent owns view when controlled (mail header icons); do not clobber TASK/CALLREPORT.
    if (controlledView === undefined) {
      setInternalView("HOME");
    }
    setNewCallReport("");
    setNewTaskText("");
    setTaskDateTime("");
    setShowCreateModal(false);
    setShowKanbanModal(false);
    setHistoryFilter("ALL");
  }, [clientId, prospectId, type]);

  // Effective Client ID (prop or locally created)
  const effectiveClientId = clientId || localClientId;

  const isBlocked =
    !effectiveClientId &&
    (type === "chatbot" ||
      type === "diagnostic" ||
      type === "conversations-archives" ||
      type === "simulator-difficulty-result");

  // Determine the effective owner ID (Client or Prospect)
  const ownerId = effectiveClientId || prospectId;

  // API State for Call Reports
  const [callReports, setCallReports] = useState([]);
  const [, setIsLoadingReports] = useState(false);

  // API State for Tasks
  const [tasks, setTasks] = useState([]);
  const [, setIsLoadingTasks] = useState(false);

  const logs = []; // Logs can be added later if needed

  // Fetch Call Reports
  useEffect(() => {
    const fetchCallReports = async () => {
      if (!ownerId) {
        setCallReports([]);
        return;
      }
      setIsLoadingReports(true);
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const response = await axios.get(
          global.config.server_url + `/v1/call-reports/client/${ownerId}`,
          Config,
        );
        const reports = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        setCallReports(
          reports.sort(
            (a, b) =>
              new Date(b.created_at || b.date) -
              new Date(a.created_at || a.date),
          ),
        );
      } catch (error) {
        console.error("Failed to fetch call reports", error);
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchCallReports();
  }, [ownerId]);

  // Fetch Tasks — menu model (/tasks via customer_tasks), NOT inbox-tasks
  useEffect(() => {
    const fetchTasks = async () => {
      if (!ownerId) {
        setTasks([]);
        return;
      }
      setIsLoadingTasks(true);
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        // Prefer customer-scoped endpoint; fallback to /tasks?filter=all + client filter
        let tasksData = [];
        try {
          const response = await axios.get(
            global.config.server_url +
              `/customer_tasks?filter=all&user_id=${ownerId}`,
            Config,
          );
          tasksData = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];
        } catch (e) {
          const response = await axios.get(
            global.config.server_url + `/tasks?filter=all`,
            Config,
          );
          const all = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];
          tasksData = all.filter(
            (t) => String(t.customer_id) === String(ownerId),
          );
        }

        setTasks(
          tasksData
            .map(normalizeTask)
            .sort(
              (a, b) =>
                new Date(b.created_at || b.date || 0) -
                new Date(a.created_at || a.date || 0),
            ),
        );
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [ownerId]);

  const refreshTasksBadge = () => {
    try {
      window.dispatchEvent(new CustomEvent("eor-tasks-badge-refresh"));
    } catch (e) {
      /* ignore */
    }
  };

  // ===== HANDLERS =====
  const handleAddCallReport = async () => {
    if (!newCallReport.trim()) return;

    if (!ownerId) {
      window.alert(
        "Erreur: Impossible d'identifier le client ou le prospect pour sauvegarder le rapport.",
      );
      return;
    }

    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };

      const payload = {
        client_id: ownerId,
        admin_id: adminId || localStorage.getItem("userid"),
        call_report: newCallReport.trim(),
      };

      const response = await axios.post(
        global.config.server_url + "/v1/call-reports",
        payload,
        Config,
      );

      const serverData = response.data.data || response.data;
      const savedReport = {
        ...serverData,
        id: serverData.id,
        type: "CALLREPORT",
        created_at: serverData.created_at || new Date().toISOString(),
      };
      setCallReports((prev) => [savedReport, ...prev]);

      setNewCallReport("");
      // Cap'tain: stay on form + refresh list of 5 (do NOT close bandeau)
    } catch (error) {
      console.error("Failed to add call report", error);
      window.alert("Erreur lors de la sauvegarde du rapport.");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;

    if (!ownerId) {
      window.alert(
        "Erreur: Impossible d'identifier le client ou le prospect pour sauvegarder la tâche.",
      );
      return;
    }

    try {
      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      };

      // Cap'tain: user date = échéance (end_date); created_at auto server/now. Empty → today
      const endDate = taskDateTime
        ? taskDateTime.split("T")[0]
        : todayYmd();

      const payload = {
        title: newTaskText.trim(),
        desc: newTaskText.trim(),
        isCompleted: false,
        isImportant: false,
        isRead: false,
        type: "other",
        end_date: endDate,
        customer_id: ownerId,
        creator_id: adminId || localStorage.getItem("userid"),
      };

      const response = await axios.post(
        global.config.server_url + "/tasks",
        payload,
        Config,
      );

      let serverData = response.data.data || response.data;
      if (typeof serverData === "string") {
        try {
          serverData = JSON.parse(serverData);
        } catch (e) {
          console.error("Failed to parse task response", e);
        }
      }

      const savedTask = normalizeTask({
        ...(typeof serverData === "object" ? serverData : {}),
        id: serverData?.id,
        title: newTaskText.trim(),
        desc: newTaskText.trim(),
        text: newTaskText.trim(),
        customer_id: ownerId,
        end_date: endDate,
        created_at:
          (typeof serverData === "object" && serverData?.created_at) ||
          new Date().toISOString(),
        isCompleted: false,
      });

      setTasks((prev) => [savedTask, ...prev]);

      setNewTaskText("");
      setTaskDateTime("");
      // Cap'tain: stay on form; refresh badge so menu Tâches increments
      refreshTasksBadge();
    } catch (error) {
      console.error("Failed to add task", error);
      window.alert("Erreur lors de la sauvegarde de la tâche.");
    }
  };

  const openHistory = (filter) => {
    setHistoryFilter(filter || "ALL");
    setActiveView("HISTORY");
  };

  // ===== EDIT STATE =====
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");

  const handleEditItem = (item) => {
    setEditingItem(item);
    if (item.type === "TASK") {
      setEditText(getTaskText(item) || item.title || item.desc || "");
    } else {
      setEditText(item.report || item.content || item.call_report || "");
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingItem) return;

    if (editingItem.type === "CALLREPORT") {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const updatePayload = {
          call_report: editText.trim(),
        };

        await axios.put(
          global.config.server_url + `/v1/call-reports/${editingItem.id}`,
          updatePayload,
          Config,
        );

        setCallReports((prev) =>
          prev.map((r) =>
            r.id === editingItem.id
              ? {
                  ...r,
                  content: editText.trim(),
                  report: editText.trim(),
                  call_report: editText.trim(),
                }
              : r,
          ),
        );
      } catch (error) {
        console.error("Failed to update call report", error);
        window.alert("Erreur lors de la mise à jour du rapport.");
        return;
      }
    } else if (editingItem.type === "TASK") {
      try {
        const Config = {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        };
        const updatePayload = {
          title: editText.trim(),
          desc: editText.trim(),
        };

        await axios.put(
          global.config.server_url + `/tasks/${editingItem.id}`,
          updatePayload,
          Config,
        );

        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingItem.id
              ? {
                  ...t,
                  title: editText.trim(),
                  desc: editText.trim(),
                  text: editText.trim(),
                }
              : t,
          ),
        );
      } catch (error) {
        console.error("Failed to update task", error);
        window.alert("Erreur lors de la mise à jour de la tâche.");
        return;
      }
    }

    setEditingItem(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditText("");
  };

  // ===== DELETE STATE =====
  const [alertVisible, setAlertVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDeleteItem = (item) => {
    if (!item || !item.id) {
      console.warn("Attempted to delete item without ID:", item);
      window.alert(
        "Impossible de supprimer cet élément (ID manquant). Veuillez rafraîchir la page.",
      );
      return;
    }
    setItemToDelete(item);
    setAlertVisible(true);
  };

  const confirmDelete = async () => {
    setAlertVisible(false);
    if (!itemToDelete) return;

    const item = itemToDelete;

    if (item.type === "CALLREPORT") {
      try {
        const Config = {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        };
        await axios.delete(
          global.config.server_url + `/v1/call-reports/${item.id}`,
          Config,
        );
        setCallReports((prev) => prev.filter((r) => r.id !== item.id));
      } catch (error) {
        console.error("Failed to delete call report", error);
        window.alert("Erreur lors de la suppression du rapport.");
      }
    } else if (item.type === "TASK") {
      try {
        const Config = {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        };
        await axios.delete(
          global.config.server_url + `/tasks/${item.id}`,
          Config,
        );
        setTasks((prev) => prev.filter((t) => t.id !== item.id));
        refreshTasksBadge();
      } catch (error) {
        console.error("Failed to delete task", error);
        window.alert("Erreur lors de la suppression de la tâche.");
      }
    }

    setItemToDelete(null);
  };

  // Render Logic — tasks already scoped to owner via customer_tasks / filter
  const visibleTasks = tasks;

  const allItems = [
    ...callReports.map((r) => ({ ...r, type: "CALLREPORT" })),
    ...visibleTasks.map((t) => ({ ...t, type: "TASK" })),
    ...logs.slice(0, 1).map((l) => ({ ...l, type: "LOG" })),
  ].sort(
    (a, b) =>
      new Date(b.created_at || b.date) - new Date(a.created_at || a.date),
  );

  const latestCalls = callReports
    .map((r) => ({ ...r, type: "CALLREPORT" }))
    .slice(0, 5);
  const latestTasks = visibleTasks.slice(0, 5);

  // Styles
  const iconButtonStyle = (isActive) => ({
    background: isActive ? "#eef2ff" : "none",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    color: isActive ? "#4f46e5" : "#6b7280",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const iconBarStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "8px 0",
    marginBottom: "16px",
    borderBottom: "1px solid #e5e7eb",
  };

  const viewContainerStyle = {
    padding: "8px 0",
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

  const textareaStyle = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#fff",
    backgroundColor: "#4f46e5",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#f3f4f6",
    color: "#374151",
  };

  if (isBlocked) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          backgroundColor: "#f0f9ff",
          borderRadius: "12px",
          border: "1px dashed #bae6fd",
          color: "#0369a1",
        }}
      >
        <User size={32} style={{ marginBottom: "12px", opacity: 0.8 }} />
        <p style={{ margin: "0 0 16px", fontWeight: 500, fontSize: "15px" }}>
          Créer un prospect pour pouvoir ajouter une action
        </p>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: "#7367f0",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 4px rgba(115, 103, 240, 0.3)",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#5e50ee")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#7367f0")
          }
        >
          <Plus size={16} />
          Créer le prospect
        </button>

        <ProspectCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newId) => {
            setLocalClientId(newId);
            setShowCreateModal(false);
            setActiveView("CALLREPORT");
            // Notifier le parent pour recharger les données
            if (onProspectCreated) {
              onProspectCreated(newId);
            }
          }}
          prospectData={prospectData}
          type={type}
          prospectId={prospectId}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Icon nav: chat/kanban/profil parked. hideNav => mail header owns icons. */}
      {!hideNav && (
        <div className="header-flex-wrap" style={iconBarStyle}>
          <button
            style={iconButtonStyle(activeView === "CALLREPORT")}
            onClick={() => setActiveView("CALLREPORT")}
            title="Téléphone"
          >
            <Phone size={20} />
          </button>
          <button
            style={iconButtonStyle(activeView === "TASK")}
            onClick={() => setActiveView("TASK")}
            title="Tâche"
          >
            <CheckCircle size={20} />
          </button>
        </div>
      )}

      {/* Views */}
      <div style={viewContainerStyle}>
        {/* HOME View - Mixed List */}
        {activeView === "HOME" && (
          <ActivityList
            items={allItems}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            editingItem={editingItem}
            saveEditHandler={handleSaveEdit}
            cancelEditHandler={handleCancelEdit}
            editText={editText}
            setEditText={setEditText}
          />
        )}

        {/* HISTORY — full typed history, bandeau stays open (ClientEdit keeps HISTORY) */}
        {activeView === "HISTORY" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Historique
              </h4>
              <button
                style={{ ...secondaryButtonStyle, padding: "6px 12px" }}
                onClick={() =>
                  setActiveView(
                    historyFilter === "TASK" ? "TASK" : "CALLREPORT",
                  )
                }
              >
                Retour
              </button>
            </div>
            <ActivityList
              items={allItems}
              initialFilter={historyFilter}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              editingItem={editingItem}
              saveEditHandler={handleSaveEdit}
              cancelEditHandler={handleCancelEdit}
              editText={editText}
              setEditText={setEditText}
            />
          </div>
        )}

        {/* CALLREPORT View - Form + 5 latest */}
        {activeView === "CALLREPORT" && (
          <div>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Créer un Call Report
            </h4>
            <textarea
              placeholder="Saisissez votre call report..."
              value={newCallReport}
              onChange={(e) => setNewCallReport(e.target.value)}
              style={textareaStyle}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={buttonStyle} onClick={handleAddCallReport}>
                Ajouter
              </button>
              <button
                style={secondaryButtonStyle}
                onClick={() => openHistory("CALLREPORT")}
              >
                Voir historique
              </button>
            </div>
            <div style={{ marginTop: "16px" }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                5 derniers appels
              </p>
              <ActivityList
                items={latestCalls}
                initialFilter="CALLREPORT"
                limit={5}
                hideFilters
                compact
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                editingItem={editingItem}
                saveEditHandler={handleSaveEdit}
                cancelEditHandler={handleCancelEdit}
                editText={editText}
                setEditText={setEditText}
              />
            </div>
          </div>
        )}

        {/* TASK View - Form + 5 latest */}
        {activeView === "TASK" && (
          <div>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Créer une tâche
            </h4>
            <textarea
              placeholder="Description de la tâche..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              style={textareaStyle}
            />
            {/* Cap'tain 2026-09-15: date field = échéance only; created_at auto-stamped on save */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <label
                htmlFor="or-task-echeance"
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#374151",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Échéance
              </label>
              <input
                id="or-task-echeance"
                type="date"
                title="Échéance (rappel) — la date de création est horodatée automatiquement"
                aria-label="Échéance"
                value={taskDateTime}
                onChange={(e) => setTaskDateTime(e.target.value)}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                style={{ ...inputStyle, width: "180px", cursor: "pointer", marginBottom: 0 }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={buttonStyle} onClick={handleAddTask}>
                Ajouter
              </button>
              <button
                style={secondaryButtonStyle}
                onClick={() => openHistory("TASK")}
              >
                Voir historique
              </button>
            </div>
            <div style={{ marginTop: "16px" }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                5 dernières tâches
              </p>
              <ActivityList
                items={latestTasks}
                initialFilter="TASK"
                limit={5}
                hideFilters
                compact
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                editingItem={editingItem}
                saveEditHandler={handleSaveEdit}
                cancelEditHandler={handleCancelEdit}
                editText={editText}
                setEditText={setEditText}
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert */}
      <SweetAlert
        warning
        title="Êtes-vous sûr ?"
        show={alertVisible}
        showCancel
        confirmBtnText="Oui, supprimer"
        cancelBtnText="Annuler"
        confirmBtnBsStyle="danger"
        cancelBtnBsStyle="primary"
        onConfirm={confirmDelete}
        onCancel={() => {
          setAlertVisible(false);
          setItemToDelete(null);
        }}
      >
        <p className="sweet-alert-text">
          Êtes-vous sûr de vouloir supprimer cet élément ?
        </p>
      </SweetAlert>

      {/* Create User Kanban Modal */}
      <CreateUserKanbanModal
        isOpen={showKanbanModal}
        onClose={() => setShowKanbanModal(false)}
        userId={ownerId}
        onSuccess={() => {
          setShowKanbanModal(false);
          // Optionnel: recharger les données si nécessaire
        }}
      />
    </div>
  );
};

export default ActionsSection;
