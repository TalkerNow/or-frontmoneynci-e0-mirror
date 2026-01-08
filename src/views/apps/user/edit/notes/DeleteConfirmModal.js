import React from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";

const DeleteConfirmModal = ({
    target,
    onCancel,
    onConfirm,
}) => {
    return (
        <Modal
            isOpen={!!target}
            toggle={onCancel}
            centered
        >
            <ModalHeader toggle={onCancel}>
                Confirmation
            </ModalHeader>
            <ModalBody>
                Êtes-vous sûr de vouloir supprimer{" "}
                {target?.doc?.name
                    ? `« ${target.doc.name} »`
                    : "ce document"}{" "}
                ?
            </ModalBody>
            <ModalFooter>
                <Button
                    color="secondary"
                    onClick={onCancel}
                >
                    Annuler
                </Button>
                <Button color="danger" onClick={onConfirm}>
                    Supprimer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default DeleteConfirmModal;
