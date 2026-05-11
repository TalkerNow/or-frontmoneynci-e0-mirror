import React, { useEffect, useState, useCallback } from "react";
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import { Clock } from "react-feather";
import { toast } from "react-toastify";
import {
  fetchLatestReport,
  fetchReportVersions,
  restoreReportVersion,
} from "../risService";

const SOURCE_LABEL = {
  initial: "Génération initiale",
  ai_chat: "Modif. via chat IA",
  manual_edit: "Édition manuelle",
  restore: "Restauration",
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

/**
 * Menu déroulant qui liste les versions d'un livrable et permet de restaurer.
 *
 * Props:
 *   - clientId: number
 *   - skillCode: string (ex: "simulation_retraite")
 *   - onRestored: (newHtml) => void   appelé après restauration
 *   - reloadSignal: number             incrémenté par le parent pour forcer un refresh
 */
const VersionHistoryDropdown = ({ clientId, skillCode, onRestored, reloadSignal }) => {
  const [reportId, setReportId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);

  const loadVersions = useCallback(async () => {
    if (!clientId || !skillCode) return;
    setLoading(true);
    try {
      const report = await fetchLatestReport(clientId, skillCode);
      if (!report?.id) {
        setVersions([]);
        return;
      }
      setReportId(report.id);
      const list = await fetchReportVersions(report.id);
      setVersions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("VersionHistoryDropdown load error:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId, skillCode]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions, reloadSignal]);

  const handleRestore = async (versionId) => {
    if (!reportId) return;
    setRestoring(versionId);
    try {
      const res = await restoreReportVersion(reportId, versionId);
      const newHtml =
        (res.analysis_report?.result_json &&
          (typeof res.analysis_report.result_json === "string"
            ? res.analysis_report.result_json
            : res.analysis_report.result_json.htmlContent)) || "";
      onRestored(newHtml);
      toast.success("Version restaurée.");
      loadVersions();
    } catch (err) {
      console.error("restoreReportVersion error:", err);
      toast.error(err?.response?.data?.message || "Erreur lors de la restauration");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <UncontrolledDropdown>
      <DropdownToggle
        color="light"
        caret
        className="d-flex align-items-center"
        style={{ border: "1px solid #dee2e6", borderRadius: "8px", padding: "8px 12px" }}
      >
        <Clock size={14} className="mr-1" />
        Versions {versions.length > 0 && <span className="badge badge-secondary ml-1">{versions.length}</span>}
      </DropdownToggle>
      <DropdownMenu right style={{ minWidth: 320, maxHeight: 360, overflowY: "auto" }}>
        {loading && <DropdownItem disabled>Chargement…</DropdownItem>}
        {!loading && versions.length === 0 && (
          <DropdownItem disabled>Aucune version archivée.</DropdownItem>
        )}
        {!loading &&
          versions.map((v, idx) => (
            <DropdownItem
              key={v.id}
              onClick={() => handleRestore(v.id)}
              disabled={restoring === v.id || idx === 0}
              title={idx === 0 ? "Version courante" : "Cliquer pour restaurer"}
            >
              <div style={{ fontSize: "13px", fontWeight: 600 }}>
                {SOURCE_LABEL[v.source] || v.source}
                {idx === 0 && (
                  <span className="badge badge-primary ml-2" style={{ fontWeight: 400 }}>
                    Courante
                  </span>
                )}
              </div>
              <div className="text-muted" style={{ fontSize: "11px" }}>
                {formatDate(v.created_at)}
                {restoring === v.id && " · restauration…"}
              </div>
            </DropdownItem>
          ))}
      </DropdownMenu>
    </UncontrolledDropdown>
  );
};

export default VersionHistoryDropdown;
