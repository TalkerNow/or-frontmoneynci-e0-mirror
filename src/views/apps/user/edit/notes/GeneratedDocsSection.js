import React, { useState } from "react";
import { Card, CardBody } from "reactstrap";
import GeneratedDocumentItem from "../components/GeneratedDocumentItem";

const GeneratedDocsSection = ({
    generatedDocs,
    handleOpenDoc,
    requestDeleteGenerated,
    requestDeleteAllGenerated,
    handleRenameDoc,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const count = generatedDocs ? generatedDocs.length : 0;

    return (
        <div className="notes-documents-block">
            <button
                onClick={() => setIsOpen((v) => !v)}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    padding: "4px 0 6px 0",
                    cursor: "pointer",
                    textAlign: "left",
                }}
            >
                <h6 style={{ margin: 0 }}>Documents générés</h6>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {count > 0 && (
                        <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#6C5CE7",
                            background: "#6C5CE712",
                            borderRadius: 10,
                            padding: "1px 8px",
                        }}>
                            {count}
                        </span>
                    )}
                    <span style={{
                        fontSize: 11,
                        color: "#888",
                        transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.15s",
                        display: "inline-block",
                    }}>
                        ▼
                    </span>
                </div>
            </button>

            {isOpen && count > 0 && requestDeleteAllGenerated && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteAllGenerated();
                        }}
                        style={{
                            background: "none",
                            border: "1px solid #EA5455",
                            color: "#EA5455",
                            borderRadius: 6,
                            padding: "2px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Tout supprimer
                    </button>
                </div>
            )}

            {isOpen && (
                count > 0 ? (
                    <div className="notes-documents-list">
                        {generatedDocs.map((doc) => (
                            <GeneratedDocumentItem
                                key={doc.id}
                                doc={doc}
                                onOpen={() => handleOpenDoc(doc)}
                                onDelete={() => requestDeleteGenerated(doc)}
                                onRename={handleRenameDoc}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="notes-empty-doc-card">
                        <CardBody className="text-muted">
                            Aucun document généré pour le moment.
                        </CardBody>
                    </Card>
                )
            )}
        </div>
    );
};

export default GeneratedDocsSection;
