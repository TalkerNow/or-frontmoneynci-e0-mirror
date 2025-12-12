import React from "react";
import { FileCheck, Filter } from "lucide-react";

// AdminView receives real data via `children` prop (the table from index.jsx)
// No need for mock data here

const AdminView = ({ children, searchTerm, onSearchChange, filters }) => {
  const [showFilters, setShowFilters] = React.useState(false);

  return (
    <div
      style={{
        height: "calc(100vh - 180px)",
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        border: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <h2
          style={{
            fontWeight: 700,
            color: "#1f2937",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "18px",
            margin: 0,
          }}
        >
          <FileCheck className="text-indigo-600" />
          Suivi Administratif
        </h2>
        <div style={{ display: "flex", gap: "8px", position: "relative" }}>
          <input
            type="text"
            placeholder="Rechercher un dossier..."
            value={searchTerm || ""}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              outline: "none",
              minWidth: "250px",
            }}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "6px",
              backgroundColor: showFilters ? "#e5e7eb" : "#fff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              color: "#4b5563",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Filtres"
          >
            <Filter size={18} />
          </button>
          {showFilters && filters && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                padding: "12px",
                zIndex: 50,
                minWidth: "200px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6b7280",
                  marginBottom: "4px",
                }}
              >
                AFFICHER
              </div>
              {filters}
            </div>
          )}
        </div>
      </div>

      <div style={{ overflow: "auto", flex: 1, padding: "20px" }}>
        {/* 
                    LEGACY TABLE INTEGRATION 
                    We render the children here, which will be the old "Suivi des contrats" table passed from index.jsx
                 */}
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
    </div>
  );
};

export default AdminView;
