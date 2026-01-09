import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, Spinner, Input, Badge } from "reactstrap";
import {
  X,
  Phone,
  Mail,
  Calendar,
  User,
  Search,
  ChevronRight,
} from "react-feather";
import axios from "axios";

// Mois français pour affichage
const FRENCH_MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// Formatage téléphone
const formatPhone = (val) => {
  if (!val) return "-";
  const digits = String(val).replace(/\D/g, "");
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return val;
};

// Formatage date
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const MODAL_CSS = `
  .prospects-modal .modal-content {
    border-radius: 16px;
    border: none;
    box-shadow: 0 10px 40px rgba(0,0,0,0.12);
    overflow: hidden;
  }
  .prospects-modal .modal-header {
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
    padding: 1.5rem;
    position: relative;
  }
  .prospects-modal .modal-title {
    display: flex;
    align-items: center;
    font-weight: 700;
    color: #2c3e50;
    font-size: 1.25rem;
    width: 100%;
  }
  .prospects-modal .close-btn {
    position: absolute;
    right: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    background: #f8f9fa;
    border: none;
    border-radius: 8px;
    padding: 8px;
    color: #636e72;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .prospects-modal .close-btn:hover {
    background: #ffeaa7;
    color: #d63031;
    background: rgba(234, 84, 85, 0.1);
    color: #ea5455;
  }

  .prospects-modal .search-wrapper {
    position: relative;
    margin-bottom: 1.5rem;
  }
  .prospects-modal .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #b2bec3;
  }
  .prospects-modal .search-input {
    padding-left: 3rem;
    height: 48px;
    border-radius: 12px;
    border: 1px solid #e1e8ed;
    background: #fcfdfe;
    transition: border-color 0.2s, box-shadow 0.2s;
    font-size: 0.95rem;
  }
  .prospects-modal .search-input:focus {
    border-color: #7367f0;
    box-shadow: 0 0 0 3px rgba(115, 103, 240, 0.1);
    background: #fff;
  }

  /* Grid Layout for Desktop */
  .prospects-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 992px) {
    .prospects-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .prospect-card {
    background: #fff;
    border: 1px solid #edf2f7;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    align-items: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }
  .prospect-card:hover {
    border-color: #7367f0;
    box-shadow: 0 4px 12px rgba(115, 103, 240, 0.08);
    transform: translateY(-2px);
  }
  .prospect-card::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #7367f0;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .prospect-card:hover::after {
    opacity: 1;
  }

  .premium-avatar {
    width: 48px;
    height: 48px;
    min-width: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #7367f0, #9e95f5);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.1rem;
    margin-right: 1rem;
    box-shadow: 0 4px 6px rgba(115, 103, 240, 0.2);
  }

  .prospect-info {
    flex: 1;
    min-width: 0;
  }
  .prospect-name {
    font-weight: 600;
    color: #2d3436;
    margin-bottom: 2px;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .prospect-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: #636e72;
  }
  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
  }
  .meta-item span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    display: block;
  }
  .meta-item svg {
    color: #b2bec3;
    flex-shrink: 0;
  }

  .prospect-date {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.75rem;
    color: #5e6c84; /* Darker color as requested */
    font-weight: 500;
    padding-left: 0.5rem;
    min-width: 80px; /* Ensure date stays stable */
  }
  .chevron-indic {
    color: #dfe6e9;
    margin-left: 0.5rem;
    transition: transform 0.2s;
  }
  .prospect-card:hover .chevron-indic {
    color: #7367f0;
    transform: translateX(3px);
  }

  /* Empty State */
  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
    color: #b2bec3;
  }
  .empty-icon {
    background: #f8f9fa;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    color: #dfe6e9;
  }

  /* Responsive Adjustments */
  @media (max-width: 576px) {
    .prospects-modal .modal-header {
      padding: 1rem;
    }
    .prospects-modal .modal-title {
      font-size: 1.1rem;
      padding-right: 3.5rem; /* Increased to avoid overlap with close btn */
    }
    .prospects-modal .close-btn {
      right: 0.5rem; /* Pushed slightly more to edge */
      padding: 4px;
    }
    .prospects-modal .modal-body { /* Assuming default ModalBody renders with this class or we target style override */
        padding: 1rem !important;
    }
    
    .search-wrapper {
      margin-bottom: 1rem;
    }
    
    .prospect-card {
      padding: 0.75rem;
    }
    
    .premium-avatar {
      width: 40px;
      height: 40px;
      min-width: 40px;
      font-size: 0.9rem;
      border-radius: 10px;
      margin-right: 0.75rem;
    }
    
    .prospect-name {
      font-size: 0.95rem;
    }
    
    .prospect-meta {
      font-size: 0.75rem;
      gap: 0.5rem;
    }

    .prospect-date {
        display: none; /* Optional: hide date on very small screens if cluttering, or stack it */
    }
    /* If we want to keep date but style differently: */
    /*
    .prospect-date {
        position: static;
        flex-direction: row;
        margin-top: 4px;
        padding-left: 0;
    }
    */
  }
  /* Custom Width for intermediate size */
  @media (min-width: 992px) {
    .prospects-modal .modal-dialog {
      max-width: 650px;
    }
  }
`;

export default function ProspectsDetailsModal({
  isOpen,
  toggle,
  year,
  monthIndex,
  trimIndex,
  activeTab,
  weekNumber,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prospects, setProspects] = useState([]);
  const [searchVal, setSearchVal] = useState("");

  const getDateRange = useCallback(() => {
    const y = year || new Date().getFullYear();
    let startDate, endDate;

    switch (activeTab) {
      case "1": // Mois
        const mi = monthIndex ?? new Date().getMonth();
        startDate = new Date(y, mi, 1);
        endDate = new Date(y, mi + 1, 0, 23, 59, 59);
        break;
      case "2": // Trimestre
        const ti = trimIndex ?? Math.floor(new Date().getMonth() / 3);
        const startMonth = ti * 3;
        startDate = new Date(y, startMonth, 1);
        endDate = new Date(y, startMonth + 3, 0, 23, 59, 59);
        break;
      case "3": // Année
        startDate = new Date(y, 0, 1);
        endDate = new Date(y, 11, 31, 23, 59, 59);
        break;
      case "4": // Semaine
        const wn = weekNumber || 1;
        const simple = new Date(y, 0, 1 + (wn - 1) * 7);
        const dow = (simple.getDay() + 6) % 7;
        const monday = new Date(simple);
        monday.setDate(simple.getDate() - dow);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59);
        startDate = monday;
        endDate = sunday;
        break;
      default:
        startDate = new Date(y, 0, 1);
        endDate = new Date(y, 11, 31, 23, 59, 59);
    }
    return { startDate, endDate };
  }, [year, monthIndex, trimIndex, activeTab, weekNumber]);

  const getTitle = () => {
    const y = year || new Date().getFullYear();
    switch (activeTab) {
      case "1":
        return `Prospects • ${FRENCH_MONTHS[monthIndex ?? 0]} ${y}`;
      case "2":
        return `Prospects • Trimestre ${(trimIndex ?? 0) + 1} ${y}`;
      case "3":
        return `Prospects • Année ${y}`;
      case "4":
        return `Prospects • Semaine ${weekNumber || 1} ${y}`;
      default:
        return `Prospects`;
    }
  };

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("jwt");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(
        `${global.config.server_url}/users?kind=client`,
        { headers }
      );
      const allClients = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      const { startDate, endDate } = getDateRange();
      const filtered = allClients.filter((client) => {
        const d = new Date(client.created_at || client.createdAt);
        return d >= startDate && d <= endDate;
      });
      // Sort by date desc
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setProspects(filtered);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les prospects.");
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    if (isOpen) {
      fetchProspects();
      setSearchVal("");
    }
  }, [isOpen, fetchProspects]);

  const filteredProspects = prospects.filter((p) => {
    if (!searchVal.trim()) return true;
    const s = searchVal.toLowerCase();
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(s) ||
      (p.email || "").toLowerCase().includes(s) ||
      (p.mobile_number || p.office_number || "").includes(s)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      size="lg"
      centered
      className="prospects-modal"
      backdropClassName="premium-backdrop"
    >
      <style>{MODAL_CSS}</style>
      <div className="modal-header">
        <h5 className="modal-title">
          <div
            className="avatar-stats p-50 mr-1"
            style={{
              background: "rgba(115, 103, 240, 0.1)",
              borderRadius: "8px",
            }}
          >
            <User size={22} style={{ color: "#7367f0" }} />
          </div>
          {getTitle()}
          <Badge
            pill
            color="primary"
            className="ml-1"
            style={{ fontSize: "0.8rem", padding: "0.4em 0.8em" }}
          >
            {filteredProspects.length}
          </Badge>
        </h5>
        <button className="close-btn" onClick={toggle}>
          <X size={18} />
        </button>
      </div>

      <ModalBody style={{ padding: "1.5rem", background: "#fcfdfe" }}>
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <Input
            className="search-input"
            type="text"
            placeholder="Rechercher un prospect..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner
              style={{ width: "3rem", height: "3rem", color: "#7367f0" }}
            />
            <p className="mt-1 text-muted font-italic">
              Récupération des données...
            </p>
          </div>
        ) : error ? (
          <div className="alert alert-danger shadow-sm border-0 rounded-lg">
            {error}
          </div>
        ) : filteredProspects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <User size={32} />
            </div>
            <h5>Aucun prospect trouvé</h5>
            <p className="text-muted">
              Il n'y a pas de données pour cette recherche ou période.
            </p>
          </div>
        ) : (
          <div className="prospects-grid">
            {filteredProspects.map((p) => (
              <div
                key={p.id}
                className="prospect-card shadow-sm"
                onClick={() => {
                  window.location.href = `/app/user/edit/${p.id}/2`;
                }}
              >
                <div className="premium-avatar">
                  {(p.first_name?.[0] || "").toUpperCase()}
                  {(p.last_name?.[0] || "").toUpperCase()}
                </div>
                <div className="prospect-info">
                  <div className="prospect-name">
                    {p.first_name} {p.last_name}
                  </div>
                  <div className="prospect-meta">
                    {p.email && (
                      <div className="meta-item">
                        <Mail size={13} />
                        <span title={p.email}>{p.email}</span>
                      </div>
                    )}
                    {(p.mobile_number || p.office_number) && (
                      <div className="meta-item">
                        <Phone size={13} />
                        <span>
                          {formatPhone(p.mobile_number || p.office_number)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="prospect-date">
                  <div className="meta-item">
                    <Calendar size={12} />
                    {formatDate(p.created_at)}
                  </div>
                </div>
                <ChevronRight size={18} className="chevron-indic" />
              </div>
            ))}
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}
