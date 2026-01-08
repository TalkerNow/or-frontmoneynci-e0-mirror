import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from "reactstrap";

const ReportErrorModal = ({
    isOpen,
    toggle,
    reportDoc,
    reportDescription,
    setReportDescription,
    handleConfirmReport,
}) => {
    return (
        <Modal isOpen={isOpen} toggle={toggle} centered>
            <ModalHeader toggle={toggle}>Signaler une erreur</ModalHeader>
            <ModalBody>
                <div className="text-muted mb-2">
                    Veuillez décrire le problème rencontré avec le document{" "}
                    <strong>{reportDoc?.name}</strong> :
                </div>
                <Input
                    type="textarea"
                    rows="5"
                    placeholder="Décrivez l'erreur ici..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    style={{ resize: "none" }}
                />
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={toggle}>
                    Annuler
                </Button>
                <Button
                    color="danger"
                    onClick={handleConfirmReport}
                    disabled={!reportDescription.trim()}
                >
                    Envoyer le signalement
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ReportErrorModal;
