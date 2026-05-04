import React from "react";
import { ChevronUp } from "lucide-react";

const AdminView = ({
  children,
  searchTerm,
  onSearchChange,
  stepFilterOptions,
  selectedStep,
  onStepChange,
  activeFilter,
  onFilterChange,
}) => {
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(
        (window.scrollY || document.documentElement.scrollTop) > 300
      );
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const tabs = [
    { key: "active", label: "En cours" },
    { key: "processing", label: "En traitement" },
    { key: "completed", label: "Terminés" },
  ];

  const currentTab = activeFilter || "active";

  return (
    <div style={{ position: "relative" }}>
    <div className="card" style={{ borderRadius: "0.428rem", boxShadow: "0 4px 24px 0 rgba(34,41,47,.1)" }}>
    <div className="card-body">
      {/* ── Titre + sous-titre ── */}
      <div className="mb-1">
        <h2 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
          Suivi Administratif
        </h2>
        <p className="text-muted mb-0">
          Avancement des dossiers et étapes en cours.
        </p>
      </div>

      {/* ── Barre d'outils : recherche + filtre étape ── */}
      <div
        className="mb-1 d-flex align-items-center"
        style={{ gap: "0.75rem", flexWrap: "wrap" }}
      >
        {/* Recherche */}
        <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
          <svg
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
              pointerEvents: "none",
            }}
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm || ""}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="form-control"
            style={{ paddingLeft: 32 }}
          />
        </div>

        {/* Filtre étape */}
        {stepFilterOptions && stepFilterOptions.length > 0 && (
          <div
            style={{
              position: "relative",
              flex: "0 1 220px",
              minWidth: "160px",
            }}
          >
            <select
              value={selectedStep || ""}
              onChange={(e) => onStepChange && onStepChange(e.target.value)}
              className="form-control"
              style={{
                paddingRight: 32,
                appearance: "none",
                WebkitAppearance: "none",
                cursor: "pointer",
                color: selectedStep ? "#374151" : "#6b7280",
              }}
            >
              <option value="">Toutes les étapes</option>
              {stepFilterOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <svg
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "#9ca3af",
              }}
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Onglets de filtres (style Contacts) ── */}
      {onFilterChange && (
        <div
          className="mb-1 d-flex align-items-center"
          style={{ gap: "2.5rem", overflowX: "auto" }}
        >
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <div
                key={tab.key}
                className={`cursor-pointer ${isActive ? "text-primary font-weight-bold" : "text-secondary"}`}
                style={{
                  borderBottom: isActive
                    ? "2px solid #7367f0"
                    : "2px solid transparent",
                  paddingBottom: 5,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
                onClick={() => onFilterChange(tab.key)}
              >
                {tab.label}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Contenu table ── */}
      {children ? (
        children
      ) : (
        <div className="text-center text-muted py-5">
          Aucun tableau de suivi chargé.
        </div>
      )}

      {/* ── Scroll to top ── */}
      <button
        onClick={scrollToTop}
        style={{
          position: "fixed",
          bottom: 30,
          right: 30,
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "#7367f0",
          border: "none",
          boxShadow: "0 4px 14px rgba(115,103,240,0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: showScrollTop ? 1 : 0,
          visibility: showScrollTop ? "visible" : "hidden",
          transform: showScrollTop ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.2s, transform 0.2s, visibility 0.2s",
          zIndex: 9999,
        }}
        title="Remonter en haut"
      >
        <ChevronUp size={20} color="#fff" />
      </button>
    </div>
    </div>
    </div>
  );
};

export default AdminView;
