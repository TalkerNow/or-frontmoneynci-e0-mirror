import React from "react";
import { Card, CardBody } from "reactstrap";
import GeneratedDocumentItem from "../components/GeneratedDocumentItem";

const GeneratedDocsSection = ({
    generatedDocs,
    handleOpenDoc,
    requestDeleteGenerated,
    handleRenameDoc,
}) => {
    return (
        <div className="notes-documents-block">
            <h6>Documents générés</h6>
            {generatedDocs && generatedDocs.length ? (
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
            )}
        </div>
    );
};

export default GeneratedDocsSection;
