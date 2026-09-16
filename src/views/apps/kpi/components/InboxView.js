import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useHistory, useLocation } from "react-router-dom";
import "./InboxView.css";

// Extracted Modules
import {
  calculateComplexityScore,
  mapConversationToInboxItem,
  mapInboundEmailToInboxItem,
} from "./inbox/utils";
import { generateStrategicAnalysis, generateGeminiContent } from "./inbox/api";
import InboxList from "./inbox/InboxList";
import InboxDetail from "./inbox/InboxDetail";
import DisqualifyModal from "./inbox/DisqualifyModal";

const InboxView = ({
  items = [],
  filter = "all",
  loading,
  error,
  onSelect,
  onDataRefresh, // Nouveau callback pour déclencher le refresh des données
}) => {
  const routerHistory = useHistory();
  const location = useLocation();

  // States that need to be declared early
  const [kanbanUserIds, setKanbanUserIds] = useState(new Set());
  const [disqualifiedIds, setDisqualifiedIds] = useState(new Set());

  // Track mounted state for async operations
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Sort and Map Items
  const allInboxItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items
      .map((raw) => {
        const src = raw?._source || raw?.type;
        if (src === "email" || raw?.gmail_message_id != null) {
          return mapInboundEmailToInboxItem(raw);
        }
        return mapConversationToInboxItem(raw);
      })
      .filter(Boolean)
      .sort((a, b) => {
        const parse = (v) => {
          if (!v) return 0;
          let s = String(v);
          if (/^\d{4}-\d{2}-\d{2} \d{2}:/.test(s)) s = s.replace(" ", "T");
          const d = new Date(s);
          return Number.isNaN(d.getTime()) ? 0 : d.getTime();
        };
        const dateA = parse(
          a.raw?.received_at || a.raw?.created_at || a.raw?.kpi_date,
        );
        const dateB = parse(
          b.raw?.received_at || b.raw?.created_at || b.raw?.kpi_date,
        );
        return dateB - dateA;
      });
  }, [items]);

  // Filter Items
  const inboxItems = useMemo(() => {
    let filtered = allInboxItems;

    // Filtre par type (all/chatbot/diagnostic/etc)
    if (filter !== "all") {
      filtered = filtered.filter((item) => item.type === filter);
    }

    // Mail channel = inbound_emails — no Client/kanban CRM filters
    if (filter !== "email") {
      filtered = filtered.filter((item) => item.raw?.user?.role !== "Client");
      filtered = filtered.filter(
        (item) => !item.raw?.user_id || !kanbanUserIds.has(item.raw.user_id),
      );
    }

    return filtered;
  }, [allInboxItems, filter, kanbanUserIds]);

  const [selectedItem, setSelectedItem] = useState(inboxItems[0] || {});

  // Persist readIds
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_read_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("inbox_read_ids", JSON.stringify([...readIds]));
    } catch (e) {
      console.error("Failed to save read IDs:", e);
    }
  }, [readIds]);

  // Persist manualUnreadIds
  const [manualUnreadIds, setManualUnreadIds] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_manual_unread_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "inbox_manual_unread_ids",
        JSON.stringify([...manualUnreadIds]),
      );
    } catch (e) {
      console.error("Failed to save manual unread IDs:", e);
    }
  }, [manualUnreadIds]);

  // Strategic Analysis state
  const [strategicAnalysisCache, setStrategicAnalysisCache] = useState(() => {
    try {
      const stored = localStorage.getItem("inbox_strategic_analyses");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        "inbox_strategic_analyses",
        JSON.stringify(strategicAnalysisCache),
      );
    } catch (e) {
      console.error("Failed to save analyses:", e);
    }
  }, [strategicAnalysisCache]);

  const strategicAnalysis = selectedItem?.id
    ? strategicAnalysisCache[selectedItem.id]
    : null;

  // AI Reply State
  const [aiDraft, setAiDraft] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Disqualify Modal State
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("mail_non_pertinent");
  const [disqualifyComment, setDisqualifyComment] = useState("");
  const [isDisqualifying, setIsDisqualifying] = useState(false);

  // Fetch user-kanbans to get user_id list
  useEffect(() => {
    const fetchKanbanUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          global.config.server_url + "/user-kanbans",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const userKanbans = Array.isArray(response.data) ? response.data : [];
        const userIds = new Set(
          userKanbans.map((uk) => uk.user_id).filter((id) => id != null),
        );
        setKanbanUserIds(userIds);
      } catch (error) {
        console.error("Error fetching user-kanbans:", error);
      }
    };
    fetchKanbanUsers();
  }, []);

  // Derived visible items (filtre uniquement les disqualified/invisible)
  const visibleInboxItems = inboxItems.filter(
    (item) =>
      !disqualifiedIds.has(item.id) &&
      !item.raw?.invisible &&
      item.raw?.invisible !== 1 &&
      item.raw?.status !== "DISQUALIFIED",
  );

  // Restore context from navigation
  useEffect(() => {
    if (location.state?.fromInbox && location.state?.conversationId) {
      const targetItem = allInboxItems.find(
        (item) => item.id === location.state.conversationId,
      );
      if (targetItem) {
        setSelectedItem(targetItem);
        routerHistory.replace({ pathname: "/kpi/inbox", state: {} });
        return;
      }
    }

    // Default selection if current selection is invalid
    // Default selection if current selection is invalid
    if (visibleInboxItems.length > 0) {
      const currentInList = visibleInboxItems.find(
        (i) => i.id === selectedItem.id,
      );
      if (currentInList) {
        // Update to fresh object from list to reflect changes (e.g. score update)
        if (currentInList !== selectedItem) {
          setSelectedItem(currentInList);
        }
      } else {
        setSelectedItem(visibleInboxItems[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, visibleInboxItems, location.state]);

  // Reset AI state on item change
  useEffect(() => {
    setAiDraft(null);
    setIsGenerating(false);
  }, [selectedItem.id]);

  const unreadCount = visibleInboxItems.filter(
    (item) =>
      (item.status === "new" ||
        manualUnreadIds.has(`${item.type}-${item.id}`)) &&
      !readIds.has(`${item.type}-${item.id}`),
  ).length;

  // Handlers
  const handleSelect = (item) => {
    setSelectedItem(item);
    setReadIds((prev) => new Set(prev).add(`${item.type}-${item.id}`));
    setManualUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(`${item.type}-${item.id}`);
      return next;
    });
    // Persist read on inbound_emails (always — idempotent; covers mark-unread then reopen)
    if (item?.type === "email" && item?.id) {
      const token = localStorage.getItem("token");
      axios
        .patch(
          `${global.config.server_url}/inbound-emails/${item.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .then(() => {
          try {
            window.dispatchEvent(new Event("eor-inbox-badge-refresh"));
          } catch (e) {}
        })
        .catch((err) => console.error("mark inbound email read", err));
    }
    // Persist read on conversation_archives (always — idempotent; covers mark-unread then reopen)
    if (
      (item?.type === "chatbot" ||
        item?.type === "conversations-archives") &&
      item?.id
    ) {
      const token = localStorage.getItem("token");
      axios
        .patch(
          `${global.config.server_url}/conversation-archives/${item.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .then(() => {
          try {
            window.dispatchEvent(new Event("eor-inbox-badge-refresh"));
          } catch (e) {}
        })
        .catch((err) => console.error("mark chatbot read", err));
    }
    if (onSelect) onSelect(item.id);
  };

  const handleMarkAsUnread = (e, item = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const target = item || selectedItem;

    if (!target?.id) return;
    setReadIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(`${target.type}-${target.id}`);
      return newSet;
    });
    setManualUnreadIds((prev) =>
      new Set(prev).add(`${target.type}-${target.id}`),
    );

    // Persist unread on inbound_emails
    if (target.type === "email" && target.id) {
      const token = localStorage.getItem("token");
      axios
        .patch(
          `${global.config.server_url}/inbound-emails/${target.id}/unread`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .then(() => {
          try {
            window.dispatchEvent(new Event("eor-inbox-badge-refresh"));
          } catch (e) {}
        })
        .catch((err) => console.error("mark inbound email unread", err));
    }

    // Persist unread on conversation_archives (Chatbot badge)
    if (
      target.type === "chatbot" ||
      target.type === "conversations-archives"
    ) {
      const token = localStorage.getItem("token");
      axios
        .patch(
          `${global.config.server_url}/conversation-archives/${target.id}/unread`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .then(() => {
          try {
            window.dispatchEvent(new Event("eor-inbox-badge-refresh"));
          } catch (e) {}
        })
        .catch((err) => console.error("mark chatbot unread", err));
    }

    // Toast notification could be moved to a utility or separate component
    const toast = document.createElement("div");
    toast.innerHTML = `
        <div style="background: #3b82f6; color: white; padding: 12px 20px; border-radius: 8px; position: fixed; bottom: 24px; right: 24px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 14px; font-weight: 500;">
          Marqué comme non lu
        </div>
      `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleGenerateStrategicAnalysis = async () => {
    if (!selectedItem?.raw || !selectedItem?.id) return;
    setIsAnalyzing(true);
    const result = await generateStrategicAnalysis(selectedItem.raw);
    if (!isMounted.current) return; // Prevent state update if unmounted
    if (result) {
      setStrategicAnalysisCache((prev) => ({
        ...prev,
        [selectedItem.id]: result,
      }));
    } else {
      window.alert("Erreur lors de la génération de l'analyse.");
    }
    setIsAnalyzing(false);
  };

  const handleDeleteStrategicAnalysis = () => {
    if (!selectedItem?.id) return;
    setStrategicAnalysisCache((prev) => {
      const newCache = { ...prev };
      delete newCache[selectedItem.id];
      return newCache;
    });
  };

  const handleGenerateReply = async () => {
    setIsGenerating(true);
    setAiDraft(null);

    const prompt = `
      CONTEXTE DU PROSPECT :
      - Nom: ${selectedItem.name}
      - Type : ${selectedItem.type}
      - Points clés : ${selectedItem.summary?.join(", ")}
      ${
        selectedItem.type === "diagnostic"
          ? `- Score complexité : ${calculateComplexityScore(
              selectedItem.raw?.attributes,
            )}/100`
          : ""
      }
      TÂCHE : Rédige un email de premier contact.
    `;

    const result = await generateGeminiContent(prompt);
    if (!isMounted.current) return; // Prevent state update if unmounted
    setAiDraft(result);
    setIsGenerating(false);
  };

  const handleConvert = async (e, item = null) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    const target = item || selectedItem;
    if (!target) return;
    if (item) setSelectedItem(item);

    // Lot1: CF7/inbound Mail Convertir → upsert Contact + open fiche (TEST)
    if (target.type === "email" && target.id) {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          global.config.server_url +
            `/inbound-emails/${target.id}/convert-contact`,
          {},
          { headers: { Authorization: "Bearer " + token } },
        );
        const clientId = res.data?.client_id;
        if (clientId) {
          routerHistory.push(`/app/user/edit/${clientId}/2`);
          return;
        }
      } catch (err) {
        console.error("convert-contact failed", err);
        window.alert(
          err?.response?.data?.message ||
            "Impossible de créer/lier le contact depuis ce mail.",
        );
        return;
      }
    }

    const fullName = target.name || "";
    const nameParts = fullName.trim().split(" ");
    let firstName = "";
    let lastName = "";
    if (nameParts.length > 0) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    const attrs = target.raw?.attributes || {};
    let civility = "";
    if (attrs.CIVILITE === "M") civility = "Monsieur";
    else if (attrs.CIVILITE === "Mme") civility = "Madame";

    const birthDateRaw =
      target.raw?.birth_date ||
      target.raw?.date_naissance ||
      attrs.DATE_NAISSANCE;
    let birth_date = null;
    if (birthDateRaw) {
      try {
        birth_date = new Date(birthDateRaw).toISOString().split("T")[0];
      } catch (e) {}
    }

    const prefillData = {
      first_name: firstName,
      last_name: lastName,
      email: target.email || attrs.EMAIL,
      mobile_number: target.phone || attrs.TELEPHONE,
      children_number: attrs.NBR_ENFANTS,
      birth_date: birth_date,
      military_service:
        attrs.SIMULATEUR_DIFFICULTE_Q11?.toLowerCase() === "oui"
          ? "oui"
          : "non",
      civility: civility,
    };

    routerHistory.push("/app/user/createUser", prefillData);
  };

  const handleConfirmDisqualify = async () => {
    if (!disqualifyReason) {
      window.alert("Veuillez sélectionner un motif de disqualification.");
      return;
    }
    if (!selectedItem?.id) return;

    setIsDisqualifying(true);
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      if (
        selectedItem.type === "chatbot" ||
        selectedItem.type === "conversations-archives"
      ) {
        await axios.put(
          global.config.server_url +
            `/conversation-archives/${selectedItem.id}`,
          { invisible: true },
          config,
        );
      } else if (
        selectedItem.type === "diagnostic" ||
        selectedItem.type === "simulator-difficulty-result"
      ) {
        await axios.put(
          global.config.server_url +
            `/v1/simulator-difficulty-results/${selectedItem.id}`,
          { invisible: true },
          config,
        );
      } else {
        await fetch(
          `${
            process.env.REACT_APP_API_URL || window.location.origin
          }/api/prospects/${selectedItem.id}/disqualify`,
          {
            method: "PATCH",
            headers: config.headers,
            body: JSON.stringify({
              status: "DISQUALIFIED",
              disqualification_reason: disqualifyReason,
              disqualification_comment: disqualifyComment,
            }),
          },
        );
      }
      if (!isMounted.current) return; // Prevent state update if unmounted

      setDisqualifiedIds((prev) => new Set([...prev, selectedItem.id]));
      setShowDisqualifyModal(false);
      setDisqualifyReason("mail_non_pertinent");
      setDisqualifyComment("");

      // Move selection
      const currentIndex = visibleInboxItems.findIndex(
        (item) => item.id === selectedItem.id,
      );
      const nextItem =
        visibleInboxItems[currentIndex + 1] || visibleInboxItems[0];
      if (nextItem && nextItem.id !== selectedItem.id) {
        setSelectedItem(nextItem);
      }
    } catch (error) {
      console.error("Disqualify error:", error);
      if (!isMounted.current) return; // Prevent state update if unmounted
      window.alert(
        "Une erreur est survenue, mais l'élément est masqué localement.",
      );
      setDisqualifiedIds((prev) => new Set([...prev, selectedItem.id]));
      setShowDisqualifyModal(false);
    } finally {
      if (isMounted.current) {
        setIsDisqualifying(false);
      }
    }
  };

  // Render components
  return (
    <div
      className="inbox-container"
      style={{
        display: "flex",
        height: "calc(100vh - 180px)",
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <InboxList
        loading={loading}
        visibleInboxItems={visibleInboxItems}
        selectedItem={selectedItem}
        onSelect={handleSelect}
        unreadCount={unreadCount}
        readIds={readIds}
        manualUnreadIds={manualUnreadIds}
        onMarkAsUnread={handleMarkAsUnread}
        onDisqualify={(e, item) => {
          if (e && e.stopPropagation) e.stopPropagation();
          if (item) setSelectedItem(item);
          setDisqualifyReason("mail_non_pertinent");
          setShowDisqualifyModal(true);
        }}
        onConvert={handleConvert}
        filter={filter}
      />

      <InboxDetail
        selectedItem={selectedItem}
        onMarkAsUnread={handleMarkAsUnread}
        onDisqualify={() => { setDisqualifyReason("mail_non_pertinent"); setShowDisqualifyModal(true); }}
        onConvert={handleConvert}
        strategicAnalysis={strategicAnalysis}
        isAnalyzing={isAnalyzing}
        onGenerateStrategicAnalysis={handleGenerateStrategicAnalysis}
        onDeleteStrategicAnalysis={handleDeleteStrategicAnalysis}
        aiDraft={aiDraft}
        isGeneratingAi={isGenerating}
        onGenerateAiReply={handleGenerateReply}
        setAiDraft={setAiDraft}
        onProspectCreated={(newId) => {
          if (onDataRefresh) {
            onDataRefresh();
          }
        }}
      />

      <DisqualifyModal
        isOpen={showDisqualifyModal}
        onClose={() => setShowDisqualifyModal(false)}
        onConfirm={handleConfirmDisqualify}
        isDisqualifying={isDisqualifying}
        reason={disqualifyReason}
        setReason={setDisqualifyReason}
        comment={disqualifyComment}
        setComment={setDisqualifyComment}
        prospectName={selectedItem?.name}
      />
    </div>
  );
};

export default InboxView;
