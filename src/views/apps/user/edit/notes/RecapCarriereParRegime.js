/**
 * RecapCarriereParRegime.js
 * Affichage LECTURE SEULE des totaux carrière d'un régime, sous forme de
 * vignettes. Nourri par une entrée `recap` produite par buildRecapRegimes
 * (dérivée de l'état existant). Aucune saisie, aucun appel réseau.
 *
 * Spec : docs/superpowers/specs/2026-06-03-recap-carriere-par-regime-design.md
 */

import React from "react";

const fmtInt = (v) => Number(v || 0).toLocaleString("fr-FR");
const fmtEur = (v) =>
  Number(v || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
const fmtPts = (v) =>
  Number(v || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const AR_COLOR = "#E17055";

function Vignette({ value, label, color, emphasis }) {
  return (
    <div
      style={{
        background: `${color}0A`,
        border: `1px solid ${color}30`,
        borderRadius: 7,
        padding: "8px 14px",
        textAlign: "center",
        minWidth: 78,
      }}
    >
      <div
        style={{
          fontSize: emphasis ? 20 : 18,
          fontWeight: 800,
          color,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{label}</div>
    </div>
  );
}

/**
 * Vignettes de totaux pour un régime (lecture seule).
 * @param {Object} recap entrée produite par buildRecapRegimes
 * @param {number} [sam] SAM CNAV si disponible (post-calcul)
 */
export function RegimeRecapVignettes({ recap, sam }) {
  if (!recap) return null;
  const color = recap.color;

  if (recap.code === "CIPAV") {
    const t = recap.totals;
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Vignette value={fmtPts(t.base)} label="Base" color={color} />
        <Vignette value={fmtPts(t.compl)} label="Complémentaire" color={color} />
        <Vignette value={fmtPts(t.points)} label="Total pts" color={color} emphasis />
      </div>
    );
  }

  if (recap.code === "CNAV") {
    const t = recap.totals;
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Vignette value={fmtInt(t.cotises)} label="Cotisés" color={color} />
        <Vignette value={fmtInt(t.assimiles)} label="Assimilés" color={color} />
        <Vignette
          value={fmtInt(t.ar)}
          label="AR"
          color={t.ar > 0 ? AR_COLOR : color}
        />
        <Vignette
          value={fmtInt(t.total)}
          label="Total trim."
          color={color}
          emphasis
        />
        {sam != null && Number(sam) > 0 && (
          <Vignette value={`${fmtEur(sam)} €`} label="SAM" color={color} />
        )}
      </div>
    );
  }

  // Complémentaires : total points
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Vignette
          value={fmtPts(recap.totals.points)}
          label="Points"
          color={color}
          emphasis
        />
      </div>
      {recap.agrege && (
        <div style={{ fontSize: 11, color: "#9a9aa5", fontStyle: "italic" }}>
          Total agrégé — RIS sans ventilation annuelle.
        </div>
      )}
    </div>
  );
}
