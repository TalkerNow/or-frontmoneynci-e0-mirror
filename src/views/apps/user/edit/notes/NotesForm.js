import React from "react";
import { Card, CardBody, Form, Input, Button } from "reactstrap";

const NotesForm = ({
    notes,
    handleNotesChange,
    handleSubmit,
    hasChanged,
    isSaving,
}) => {
    return (
        <Card className="notes-card notes-card--compact">
            <CardBody>
                <Form className="notes-form" onSubmit={handleSubmit}>
                    <h5 className="notes-card-title">Notes</h5>
                    <Input
                        id="notes"
                        type="textarea"
                        placeholder="Notes"
                        className="notes-textarea"
                        value={notes}
                        onChange={handleNotesChange}
                    />
                    <div className="notes-form-actions notes-action-row">
                        <Button
                            className="notes-action-btn"
                            color={hasChanged ? "primary" : "secondary"}
                            type="submit"
                            disabled={!hasChanged || isSaving}
                        >
                            {isSaving ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </Form>
            </CardBody>
        </Card>
    );
};

export default NotesForm;
