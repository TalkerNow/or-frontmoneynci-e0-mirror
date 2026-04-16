import React, { useState, useCallback } from "react";
import { Card, CardBody, Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { sanitizeSalaryInput } from "./utils";

const ManualCareerTable = ({
    manualCareerRows,
    setManualCareerRows,
    handleSalaryChange,
    handleDeplafonnerChange,
    handleManualAddLine,
    handleManualImport,
    isImportingRIS,
}) => {
    const [showCadreModal, setShowCadreModal] = useState(false);

    const handleImportClick = useCallback(() => {
        setShowCadreModal(true);
    }, []);

    const handleCadreConfirm = useCallback((isCadre) => {
        setShowCadreModal(false);
        handleManualImport({ isCadre });
    }, [handleManualImport]);

    return (
        <Card className="notes-card manual-entry-card mt-2">
            <CardBody>
                <div className="manual-header">
                    <h5 className="notes-card-title mb-1">
                        Saisie de carrière manuelle
                    </h5>
                    <div className="manual-header-actions">
                        <Button
                            color="light"
                            className="notes-action-btn manual-add-btn"
                            onClick={handleManualAddLine}
                            style={{ marginBottom: "8px" }}
                        >
                            + Ajouter une ligne
                        </Button>
                    </div>
                </div>
                <div className="bilan-wrap manual-table-wrap">
                    <div className="table-responsive">
                        <table className="manual-table">
                            <thead>
                                <tr>
                                    <th className="col-year">Année</th>
                                    <th className="col-large">Rémunération annuelle brute</th>
                                    <th className="col-small">Déplafonner</th>
                                    <th className="col-micro">TRIM</th>
                                    <th className="col-micro">AR</th>
                                    <th className="col-micro">TOT</th>
                                    <th className="col-medium">CNAV</th>
                                    <th className="col-medium">ARRCO</th>
                                    <th className="col-ircantec">IRCANTEC</th>
                                    <th className="col-medium">RCI</th>
                                    <th className="col-medium">CIPAV</th>
                                    <th className="col-small">Tranche A</th>
                                    <th className="col-small">Tranche B</th>
                                    <th className="actions-col">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {manualCareerRows.map((row, idx) => (
                                    <tr key={row.id || idx}>
                                        <td className="col-year">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={4}
                                                className={`manual-input ${row.errY ? "err" : ""}`}
                                                value={row.annee ?? ""}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                        .replace(/[^0-9]/g, "")
                                                        .slice(0, 4);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id
                                                                ? { ...r, annee: v, errY: false }
                                                                : r
                                                        )
                                                    );
                                                }}
                                                onBlur={(e) => {
                                                    const v = (e.target.value || "").trim();
                                                    const ok = /^\d{4}$/.test(v);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id ? { ...r, errY: !ok } : r
                                                        )
                                                    );
                                                }}
                                                placeholder="2020"
                                                aria-label="Année"
                                            />
                                        </td>
                                        <td className="col-large">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className={`manual-input ${row.errR ? "err" : ""}`}
                                                value={row.revenu ?? ""}
                                                onChange={(e) => {
                                                    handleSalaryChange(row.id, sanitizeSalaryInput(e.target.value));
                                                }}
                                                onBlur={() => {
                                                    const raw = (row.revenu || "")
                                                        .toString()
                                                        .replace(/\s/g, "")
                                                        .replace(",", ".");
                                                    const num = parseFloat(raw);
                                                    const ok = !isNaN(num) && num >= 0;
                                                    const formatted = ok
                                                        ? new Intl.NumberFormat("fr-FR", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        }).format(num)
                                                        : row.revenu;
                                                    if (ok) {
                                                        handleSalaryChange(row.id, formatted);
                                                    } else {
                                                        setManualCareerRows((prev) =>
                                                            prev.map((r) =>
                                                                r.id === row.id
                                                                    ? { ...r, revenu: formatted, errR: true }
                                                                    : r
                                                            )
                                                        );
                                                    }
                                                }}
                                                placeholder="0,00"
                                                aria-label="Rémunération annuelle brute"
                                            />
                                        </td>
                                        <td className="col-small" style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={row.deplafonner || false}
                                                onChange={(e) =>
                                                    handleDeplafonnerChange(row.id, e.target.checked)
                                                }
                                                aria-label="Déplafonner"
                                                title="Déplafonner le salaire au-dessus du PASS"
                                            />
                                        </td>
                                        <td className="col-micro">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className="manual-input"
                                                value={row.trimBase ?? ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "") {
                                                        setManualCareerRows((prev) =>
                                                            prev.map((r) =>
                                                                r.id === row.id ? { ...r, trimBase: "" } : r
                                                            )
                                                        );
                                                        return;
                                                    }
                                                    if (/^\d+$/.test(val)) {
                                                        let n = parseInt(val, 10);
                                                        if (n > 40) n = 40;
                                                        setManualCareerRows((prev) =>
                                                            prev.map((r) =>
                                                                r.id === row.id
                                                                    ? { ...r, trimBase: String(n) }
                                                                    : r
                                                            )
                                                        );
                                                    }
                                                }}
                                                placeholder="0"
                                                aria-label="Trimestres de base"
                                            />
                                        </td>
                                        <td className="col-micro">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className="manual-input"
                                                value={row.trimAR ?? ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "") {
                                                        setManualCareerRows((prev) =>
                                                            prev.map((r) =>
                                                                r.id === row.id ? { ...r, trimAR: "" } : r
                                                            )
                                                        );
                                                        return;
                                                    }
                                                    if (/^\d+$/.test(val)) {
                                                        let n = parseInt(val, 10);
                                                        if (n > 40) n = 40;
                                                        setManualCareerRows((prev) =>
                                                            prev.map((r) =>
                                                                r.id === row.id
                                                                    ? { ...r, trimAR: String(n) }
                                                                    : r
                                                            )
                                                        );
                                                    }
                                                }}
                                                placeholder="0"
                                                aria-label="Trimestres assimilés (AR)"
                                            />
                                        </td>
                                        <td className="col-micro">
                                            <span>
                                                {(() => {
                                                    const a = parseInt(row.trimBase || "0", 10) || 0;
                                                    const b = parseInt(row.trimAR || "0", 10) || 0;
                                                    return a + b;
                                                })()}
                                            </span>
                                        </td>
                                        <td className="col-medium">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="manual-num"
                                                value={row.cnavPoints ?? ""}
                                                onChange={(e) => {
                                                    const val = sanitizeSalaryInput(e.target.value);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id ? { ...r, cnavPoints: val } : r
                                                        )
                                                    );
                                                }}
                                                aria-label="CNAV"
                                                placeholder="Points"
                                            />
                                        </td>
                                        <td className="col-medium">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="manual-num"
                                                value={row.arrcoPoints ?? ""}
                                                onChange={(e) => {
                                                    const val = sanitizeSalaryInput(e.target.value);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id ? { ...r, arrcoPoints: val } : r
                                                        )
                                                    );
                                                }}
                                                aria-label="ARRCO"
                                                placeholder="Points"
                                            />
                                        </td>
                                        <td className="col-ircantec">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="manual-num-left"
                                                value={row.ircantecPoints ?? ""}
                                                onChange={(e) => {
                                                    const val = sanitizeSalaryInput(e.target.value);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id
                                                                ? { ...r, ircantecPoints: val }
                                                                : r
                                                        )
                                                    );
                                                }}
                                                aria-label="IRCANTEC"
                                                placeholder="Points"
                                            />
                                        </td>
                                        <td className="col-medium">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="manual-num"
                                                value={row.rciPoints ?? ""}
                                                onChange={(e) => {
                                                    const val = sanitizeSalaryInput(e.target.value);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id ? { ...r, rciPoints: val } : r
                                                        )
                                                    );
                                                }}
                                                aria-label="RCI"
                                                placeholder="Points"
                                            />
                                        </td>
                                        <td className="col-medium">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="manual-num"
                                                value={row.cipavPoints ?? ""}
                                                onChange={(e) => {
                                                    const val = sanitizeSalaryInput(e.target.value);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id ? { ...r, cipavPoints: val } : r
                                                        )
                                                    );
                                                }}
                                                aria-label="CIPAV"
                                                placeholder="Points"
                                            />
                                        </td>
                                        <td className="col-small">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="manual-num"
                                                value={row.ta ?? ""}
                                                onChange={(e) => {
                                                    const val = sanitizeSalaryInput(e.target.value);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id ? { ...r, ta: val } : r
                                                        )
                                                    );
                                                }}
                                                aria-label="Tranche A (TA)"
                                            />
                                        </td>
                                        <td className="col-small">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="manual-num"
                                                value={row.tb ?? ""}
                                                onChange={(e) => {
                                                    const val = sanitizeSalaryInput(e.target.value);
                                                    setManualCareerRows((prev) =>
                                                        prev.map((r) =>
                                                            r.id === row.id ? { ...r, tb: val } : r
                                                        )
                                                    );
                                                }}
                                                aria-label="Tranche B (TB)"
                                            />
                                        </td>
                                        <td className="actions-col">
                                            <div className="manual-actions">
                                                {idx > 0 && (
                                                    <button
                                                        type="button"
                                                        className="action-btn danger"
                                                        title="Supprimer la ligne"
                                                        onClick={() =>
                                                            setManualCareerRows((prev) =>
                                                                prev.filter((r) => r && r.id !== row.id)
                                                            )
                                                        }
                                                    >
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            aria-hidden="true"
                                                        >
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                                            <path d="M10 11v6"></path>
                                                            <path d="M14 11v6"></path>
                                                            <path d="M9 6V4h6v2"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="manual-entry-actions mt-1">
                    <Button
                        color="primary"
                        className="notes-action-btn manual-import-btn"
                        onClick={handleImportClick}
                        disabled={isImportingRIS}
                    >
                        {isImportingRIS ? "Import RIS en cours…" : "Importer les données"}
                    </Button>
                </div>
            </CardBody>

            <Modal isOpen={showCadreModal} toggle={() => setShowCadreModal(false)} centered>
                <ModalHeader toggle={() => setShowCadreModal(false)}>
                    Statut professionnel
                </ModalHeader>
                <ModalBody>
                    <p style={{ marginBottom: 0 }}>
                        Pour le calcul des points ARRCO / AGIRC-ARRCO, veuillez indiquer le statut du client :
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowCadreModal(false)}>
                        Annuler
                    </Button>
                    <Button color="primary" onClick={() => handleCadreConfirm(false)}>
                        Non-Cadre
                    </Button>
                    <Button color="info" onClick={() => handleCadreConfirm(true)}>
                        Cadre
                    </Button>
                </ModalFooter>
            </Modal>
        </Card>
    );
};

export default ManualCareerTable;
