import React from "react";
import { Button, FormGroup, Label, Spinner } from "reactstrap";
import { FileText, Plus, X, Check } from "react-feather";
import ContractButton from "../../Buttons/Contract";
import CreateContractButton from "../components/CreateContractButton";

const ContractsSection = ({
  userDetails,
  visibleDocuments,
  showCreateContractForm,
  creatingContract,
  contractTemplateLoading,
  contractFormData,
  contractTemplateValues,
  onToggleCreateForm,
  onRequestDeleteContract,
  onServiceToggle,
  onCreateContract,
  getRowLabel,
}) => {
  const selectedRows = contractFormData?.selectedRows || [];

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center justify-content-between mb-50">
        <h6
          className="mb-0 d-flex align-items-center"
          style={{ fontSize: "0.85rem", fontWeight: 700 }}
        >
          <FileText size={14} className="mr-50" />
          Contrats
        </h6>
        <Button
          size="sm"
          color={showCreateContractForm ? "danger" : "primary"}
          outline
          onClick={onToggleCreateForm}
          className="d-flex align-items-center"
          title={showCreateContractForm ? "Annuler" : "Créer un contrat rapide"}
        >
          {showCreateContractForm ? (
            <>
              <X size={14} className="mr-25" />
              Annuler
            </>
          ) : (
            <>
              <Plus size={14} className="mr-25" />
              Créer contrat
            </>
          )}
        </Button>
      </div>

      {/* Formulaire de création rapide */}
      {showCreateContractForm && (
        <div
          style={{
            backgroundColor: "#f0f4ff",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "12px",
            border: "1px solid #d8d6de",
          }}
        >
          <h6
            style={{
              fontSize: "0.8rem",
              fontWeight: "bold",
              marginBottom: "12px",
              color: "#7367f0",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <span role="img" aria-label="lightning">
              ⚡
            </span>{" "}
            Création express
          </h6>

          <FormGroup className="mb-2">
            <Label
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#5e5873",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Sélectionnez les prestations{" "}
              <span role="img" aria-label="target">
                🎯
              </span>
            </Label>
            {contractTemplateLoading ? (
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                Chargement des prestations...
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                }}
              >
                {["r1", "r2", "r3", "r4", "r5", "r6", "r7"].map((rowId) => {
                  const isSelected = selectedRows.includes(rowId);
                  const label = getRowLabel(
                    rowId,
                    contractTemplateValues || {},
                  );
                  return (
                    <div
                      key={rowId}
                      onClick={() => onServiceToggle(rowId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        padding: "8px 10px",
                        backgroundColor: isSelected ? "#7367f0" : "#fff",
                        color: isSelected ? "#fff" : "#5e5873",
                        border: `2px solid ${
                          isSelected ? "#7367f0" : "#d8d6de"
                        }`,
                        borderRadius: "6px",
                        fontWeight: isSelected ? "600" : "500",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span>{label}</span>
                      {isSelected && (
                        <Check size={14} style={{ marginLeft: "4px" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </FormGroup>

          <Button
            color="success"
            block
            onClick={onCreateContract}
            disabled={creatingContract || selectedRows.length === 0}
            className="d-flex align-items-center justify-content-center"
          >
            {creatingContract ? (
              <>
                <Spinner size="sm" className="mr-50" />
                Création en cours...
              </>
            ) : (
              <>
                <Check size={14} className="mr-50" />
                Créer le contrat ({selectedRows.length} prestation
                {selectedRows.length > 1 ? "s" : ""})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Liste des contrats */}
      <div style={{ fontSize: "0.85rem" }}>
        {visibleDocuments && visibleDocuments.length > 0 ? (
          <div>
            <div className="mb-1">
              <strong>Montant total :</strong>{" "}
              <span style={{ color: "#28c76f", fontWeight: 700 }}>
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(
                  visibleDocuments.reduce(
                    (sum, doc) => sum + (doc.advanced_payment || 0),
                    0,
                  ),
                )}
              </span>
            </div>
            <div className="mb-50">
              <div
                className="d-flex flex-wrap"
                style={{ marginTop: "4px", gap: "6px" }}
              >
                {visibleDocuments.map((doc) => (
                  <ContractButton
                    key={doc.id}
                    doc={doc}
                    onDelete={onRequestDeleteContract}
                  />
                ))}
                <CreateContractButton
                  onClick={onToggleCreateForm}
                  disabled={showCreateContractForm}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="text-muted"
            style={{
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "6px",
              borderLeft: "3px solid #7367f0",
              fontSize: "0.85rem",
            }}
          >
            Aucun contrat pour le moment.
            <div
              className="d-flex flex-wrap"
              style={{ marginTop: "8px", gap: "6px" }}
            >
              <CreateContractButton
                onClick={onToggleCreateForm}
                disabled={showCreateContractForm}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractsSection;
