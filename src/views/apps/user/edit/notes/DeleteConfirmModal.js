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
                {target?.type === "generated-all" ? (
                    <>
                        Êtes-vous sûr de vouloir supprimer{" "}
                        <strong>tous les {target?.count ?? ""} documents générés</strong> ?
                        <br />
                        Cette action est irréversible.
                    </>
                ) : (
                    <>
                        Êtes-vous sûr de vouloir supprimer{" "}
                        {target?.doc?.name
                            ? `« ${target.doc.name} »`
                            : "ce document"}{" "}
                        ?
                    </>
                )}
            </ModalBody>
            <ModalFooter>
                <Button color="primary" onClick={onConfirm}>
                    Supprimer
                </Button>{" "}
                <Button
                    color="danger"
                    onClick={onCancel}
                >
                    Annuler
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default DeleteConfirmModal;
