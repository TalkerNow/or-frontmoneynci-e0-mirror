export default (type) => {
  const colors = {
    // Types de clients
    autre: "light-secondary",
    bilan: "light-primary",
    entreprise: "light-success",
    particulier: "light-warning",

    // Codes de services
    ch: "light-success", // Compte de résultat Hors Taxes (vert)
    ar: "light-warning", // Arrêté de compte (jaune/orange)
    tfd: "light-info", // TFD (cyan)
    simu: "light-primary", // Simulation (bleu)
    actu: "light-secondary", // Actualisation (gris)
    rac: "light-danger", // RAC (rouge)
  };

  // Nettoyer le type (trim + lowercase)
  const cleanType = type?.trim().toLowerCase();
  return colors[cleanType] || "light-secondary";
};
