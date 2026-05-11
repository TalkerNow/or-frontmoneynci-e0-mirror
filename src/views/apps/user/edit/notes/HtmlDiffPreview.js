import React from "react";

/**
 * Aperçu côte-à-côte d'un HTML "avant" vs "après".
 * Utilise 2 iframes en lecture seule pour rendre fidèlement le HTML produit.
 *
 * Pour v1, on n'affiche pas un diff ligne-à-ligne (compliqué avec du HTML brut),
 * mais l'aperçu visuel des deux versions, avec étiquettes "Avant" et "Après".
 *
 * Props:
 *   - beforeHtml: string
 *   - afterHtml: string
 *   - onApply: () => void
 *   - onReject: () => void
 *   - applying: boolean
 */
const HtmlDiffPreview = ({ beforeHtml, afterHtml, onApply, onReject, applying }) => {
  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: "#f8f9fa" }}>
      <div
        className="d-flex"
        style={{ borderBottom: "1px solid #dee2e6", backgroundColor: "#fff", padding: "8px 12px" }}
      >
        <div className="flex-fill text-center font-weight-bold" style={{ color: "#6c757d" }}>
          Avant
        </div>
        <div style={{ width: "1px", backgroundColor: "#dee2e6" }} />
        <div className="flex-fill text-center font-weight-bold" style={{ color: "#28a745" }}>
          Après (proposition IA)
        </div>
      </div>

      <div className="d-flex flex-grow-1" style={{ minHeight: 0 }}>
        <iframe
          title="diff-before"
          srcDoc={beforeHtml || "<em style=\"color:#999\">(aucun contenu)</em>"}
          style={{ flex: 1, border: "none", backgroundColor: "#fff" }}
        />
        <div style={{ width: "1px", backgroundColor: "#dee2e6" }} />
        <iframe
          title="diff-after"
          srcDoc={afterHtml || "<em style=\"color:#999\">(aucune proposition)</em>"}
          style={{ flex: 1, border: "none", backgroundColor: "#fff" }}
        />
      </div>

      <div
        className="d-flex justify-content-end p-2"
        style={{ borderTop: "1px solid #dee2e6", backgroundColor: "#fff", gap: "8px" }}
      >
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onReject}
          disabled={applying}
        >
          Rejeter
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={onApply}
          disabled={applying || !afterHtml}
        >
          {applying ? (
            <>
              <span className="spinner-border spinner-border-sm mr-2" />
              Application…
            </>
          ) : (
            "Appliquer"
          )}
        </button>
      </div>
    </div>
  );
};

export default HtmlDiffPreview;
