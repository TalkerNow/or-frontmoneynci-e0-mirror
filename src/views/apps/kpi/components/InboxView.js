import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useHistory, useLocation } from "react-router-dom";
import "./InboxView.css";

// Extracted Modules
import {
  calculateComplexityScore,
  mapConversationToInboxItem,
} from "./inbox/utils";
import {
  generateStrategicAnalysis,
  generateGeminiContent,
} from "./inbox/api";
import InboxList from "./inbox/InboxList";
import InboxDetail from "./inbox/InboxDetail";
import DisqualifyModal from "./inbox/DisqualifyModal";

const InboxView = ({
  items = [],
  filter = "all",
  loading,
  error,
  onSelect,
}) => {
  const routerHistory = useHistory();
  const location = useLocation();

  // Sort and Map Items
  const allInboxItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.map(mapConversationToInboxItem).sort((a, b) => {
      const dateA = new Date(a.raw?.created_at || a.raw?.kpi_date || 0);
      const dateB = new Date(b.raw?.created_at || b.raw?.kpi_date || 0);
      return dateB - dateA; // Most recent first
    });
  }, [items]);

  // Filter Items
  const inboxItems = useMemo(() => {
    if (filter === "all") return allInboxItems;
    return allInboxItems.filter((item) => item.type === filter);
  }, [allInboxItems, filter]);

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
        JSON.stringify([...manualUnreadIds])
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
        JSON.stringify(strategicAnalysisCache)
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
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [disqualifyComment, setDisqualifyComment] = useState("");
  const [isDisqualifying, setIsDisqualifying] = useState(false);
  const [disqualifiedIds, setDisqualifiedIds] = useState(new Set());

  // Derived visible items
  const visibleInboxItems = inboxItems.filter(
    (item) =>
      !disqualifiedIds.has(item.id) &&
      !item.raw?.invisible &&
      item.raw?.invisible !== 1 &&
      item.raw?.status !== "DISQUALIFIED"
  );

  // Restore context from navigation
  useEffect(() => {
    if (location.state?.fromInbox && location.state?.conversationId) {
      const targetItem = allInboxItems.find(
        (item) => item.id === location.state.conversationId
      );
      if (targetItem) {
        setSelectedItem(targetItem);
        routerHistory.replace({ pathname: "/kpi/inbox", state: {} });
        return;
      }
    }

    // Default selection if current selection is invalid
    if (visibleInboxItems.length > 0) {
      const currentInList = visibleInboxItems.find(
        (i) => i.id === selectedItem.id
      );
      if (!currentInList) {
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



  const unreadCount = inboxItems.filter(
    (item) =>
      (item.status === "new" || manualUnreadIds.has(item.id)) &&
      !readIds.has(item.id)
  ).length;

  // Handlers
  const handleSelect = (item) => {
    setSelectedItem(item);
    setReadIds((prev) => new Set(prev).add(item.id));
    setManualUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    if (onSelect) onSelect(item.id);
  };

  const handleMarkAsUnread = (e) => {
    e.stopPropagation();
    if (!selectedItem?.id) return;
    setReadIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(selectedItem.id);
      return newSet;
    });
    setManualUnreadIds((prev) => new Set(prev).add(selectedItem.id));

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
      ${selectedItem.type === "diagnostic"
        ? `- Score complexité : ${calculateComplexityScore(
          selectedItem.raw?.attributes
        )}/100`
        : ""
      }
      TÂCHE : Rédige un email de premier contact.
    `;

    const result = await generateGeminiContent(prompt);
    setAiDraft(result);
    setIsGenerating(false);
  };

  const handleConvert = () => {
    if (!selectedItem) return;

    const fullName = selectedItem.name || "";
    const nameParts = fullName.trim().split(" ");
    let firstName = "";
    let lastName = "";
    if (nameParts.length > 0) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    const attrs = selectedItem.raw?.attributes || {};
    let civility = "";
    if (attrs.CIVILITE === "M") civility = "Monsieur";
    else if (attrs.CIVILITE === "Mme") civility = "Madame";

    const birthDateRaw =
      selectedItem.raw?.birth_date ||
      selectedItem.raw?.date_naissance ||
      attrs.DATE_NAISSANCE;
    let birth_date = null;
    if (birthDateRaw) {
      try {
        birth_date = new Date(birthDateRaw).toISOString().split("T")[0];
      } catch (e) { }
    }

    const prefillData = {
      first_name: firstName,
      last_name: lastName,
      email: selectedItem.email || attrs.EMAIL,
      mobile_number: selectedItem.phone || attrs.TELEPHONE,
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
          config
        );
      } else if (
        selectedItem.type === "diagnostic" ||
        selectedItem.type === "simulator-difficulty-result"
      ) {
        await axios.put(
          global.config.server_url +
          `/v1/simulator-difficulty-results/${selectedItem.id}`,
          { invisible: true },
          config
        );
      } else {
        await fetch(
          `${process.env.REACT_APP_API_URL || window.location.origin
          }/api/prospects/${selectedItem.id}/disqualify`,
          {
            method: "PATCH",
            headers: config.headers,
            body: JSON.stringify({
              status: "DISQUALIFIED",
              disqualification_reason: disqualifyReason,
              disqualification_comment: disqualifyComment,
            }),
          }
        );
      }

      setDisqualifiedIds((prev) => new Set([...prev, selectedItem.id]));
      setShowDisqualifyModal(false);
      setDisqualifyReason("");
      setDisqualifyComment("");

      // Move selection
      const currentIndex = visibleInboxItems.findIndex(
        (item) => item.id === selectedItem.id
      );
      const nextItem =
        visibleInboxItems[currentIndex + 1] || visibleInboxItems[0];
      if (nextItem && nextItem.id !== selectedItem.id) {
        setSelectedItem(nextItem);
      }
    } catch (error) {
      console.error("Disqualify error:", error);
      window.alert("Une erreur est survenue, mais l'élément est masqué localement.");
      setDisqualifiedIds((prev) => new Set([...prev, selectedItem.id]));
      setShowDisqualifyModal(false);
    } finally {
      setIsDisqualifying(false);
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
      />

      <InboxDetail
        selectedItem={selectedItem}
        onMarkAsUnread={handleMarkAsUnread}
        onDisqualify={() => setShowDisqualifyModal(true)}
        onConvert={handleConvert}
        strategicAnalysis={strategicAnalysis}
        isAnalyzing={isAnalyzing}
        onGenerateStrategicAnalysis={handleGenerateStrategicAnalysis}
        onDeleteStrategicAnalysis={handleDeleteStrategicAnalysis}
        aiDraft={aiDraft}
        isGeneratingAi={isGenerating}
        onGenerateAiReply={handleGenerateReply}
        setAiDraft={setAiDraft}
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
