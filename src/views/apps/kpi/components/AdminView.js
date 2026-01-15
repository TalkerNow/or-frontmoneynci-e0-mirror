import React from "react";
import { FileCheck, ChevronDown, ChevronUp, Search } from "lucide-react";

// AdminView receives real data via `children` prop (the table from index.jsx)
// No need for mock data here

// Shared input styles for uniformity
const inputBaseStyle = {
  padding: "9px 12px",
  fontSize: "14px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  outline: "none",
  backgroundColor: "#fff",
  color: "#374151",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  height: "40px",
  boxSizing: "border-box",
};

const AdminView = ({
  children,
  searchTerm,
  onSearchChange,
  filters,
  stepFilterOptions,
  selectedStep,
  onStepChange,
}) => {
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  // Handle window scroll to show/hide button
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="admin-view-container"
      style={{
        backgroundColor: "#fff",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        className="responsive-padding"
        style={{
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#fafafa",
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          minHeight: "64px",
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontWeight: 600,
            color: "#111827",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "17px",
            margin: 0,
            whiteSpace: "nowrap",
          }}
        >
          <FileCheck size={20} style={{ color: "#6366f1" }} />
          Suivi Administratif
        </h2>

        {/* Controls Container - responsive */}
        <div
          className="admin-controls"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            flex: "1 1 auto",
            justifyContent: "flex-end",
            minWidth: 0,
          }}
        >
          {/* Step Filter Dropdown */}
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
                style={{
                  ...inputBaseStyle,
                  width: "100%",
                  paddingRight: "36px",
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  cursor: "pointer",
                  fontWeight: selectedStep ? 500 : 400,
                  color: selectedStep ? "#111827" : "#6b7280",
                }}
              >
                <option value="">Toutes les étapes</option>
                {stepFilterOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "#9ca3af",
                }}
              />
            </div>
          )}

          {/* Search Input */}
          <div
            style={{
              position: "relative",
              flex: "0 1 200px",
              minWidth: "140px",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm || ""}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              style={{
                ...inputBaseStyle,
                width: "100%",
                paddingLeft: "36px",
              }}
            />
          </div>

          {/* <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...inputBaseStyle,
              width: "40px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backgroundColor: showFilters ? "#f3f4f6" : "#fff",
              flexShrink: 0,
            }}
            title="Filtres avancés"
          >
            <Filter
              size={16}
              style={{ color: showFilters ? "#4f46e5" : "#6b7280" }}
            />
          </button> */}

          {/* {showFilters && filters && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: "16px",
                marginTop: "8px",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                padding: "14px",
                zIndex: 100,
                minWidth: "200px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "10px",
                }}
              >
                Afficher
              </div>
              <div onClick={() => setShowFilters(false)}>{filters}</div>
            </div>
          )} */}
        </div>
      </div>

      {/* Table Content */}
      <div className="responsive-padding" style={{ overflow: "auto", flex: 1 }}>
        {children ? (
          <div className="legacy-table-wrapper">{children}</div>
        ) : (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}
          >
            Aucun tableau de suivi chargé.
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="scroll-to-top-btn"
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "48px",
          height: "48px",
          borderRadius: "20%",
          backgroundColor: "#6366f1",
          border: "none",
          boxShadow: "0 4px 14px rgba(99, 102, 241, 0.45)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: showScrollTop ? 1 : 0,
          visibility: showScrollTop ? "visible" : "hidden",
          transform: showScrollTop ? "translateY(0)" : "translateY(10px)",
          transition:
            "opacity 0.25s ease, transform 0.25s ease, visibility 0.25s ease, background-color 0.15s ease",
          zIndex: 9999,
        }}
        title="Remonter en haut"
      >
        <ChevronUp size={22} style={{ color: "#fff" }} />
      </button>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .admin-controls {
            width: 100%;
            justify-content: stretch !important;
          }
          .admin-controls > div,
          .admin-controls > button {
            flex: 1 1 100% !important;
            min-width: 0 !important;
          }
          .admin-controls > button {
            flex: 0 0 40px !important;
          }
        }
        @media (max-width: 480px) {
          .admin-view-container h2 {
            font-size: 15px !important;
          }
        }
        .scroll-to-top-btn:hover {
          background-color: #4f46e5 !important;
          transform: translateY(-2px) !important;
        }
        .scroll-to-top-btn:active {
          transform: translateY(0) !important;
        }
      `}</style>
    </div>
  );
};

export default AdminView;
