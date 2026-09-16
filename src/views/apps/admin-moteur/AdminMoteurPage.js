import React from "react";
import SimulatorIntegration from "../user/edit/notes/SimulatorIntegration";

/**
 * Admin moteur — standalone page (relocated from fiche Infos, JF 2026-09-08).
 * Reuses SimulatorIntegration mode="admin" (AdminEngineChat + panels). No rebuild.
 */
export default function AdminMoteurPage() {
  return (
    <div className="admin-moteur-page">
      <SimulatorIntegration mode="admin" />
    </div>
  );
}
