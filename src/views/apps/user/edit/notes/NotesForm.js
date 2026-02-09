import React from "react";
import { Card, CardBody, Form, Input, Button } from "reactstrap";

const NotesForm = ({
  notes,
  handleNotesChange,
  handleSubmit,
  hasChanged,
  isSaving,
  isEditingNotes,
  setIsEditingNotes,
  notePrompts,
  selectedNotePromptId,
  setSelectedNotePromptId,
  isGeneratingNotes,
  handleGenerateNotesWithPrompt,
  previousNotesSnapshot,
  handleRestorePreviousNotes,
}) => {
  return (
    <Card className="notes-card notes-card--compact">
      <CardBody>
        <Form className="notes-form" onSubmit={handleSubmit}>
          <h5 className="notes-card-title">Notes</h5>
          <div
            className="notes-form-actions notes-action-row"
            style={{ marginBottom: "0.75rem" }}
          >
            <Input
              type="select"
              value={selectedNotePromptId}
              onChange={(e) => setSelectedNotePromptId(e.target.value)}
              disabled={isGeneratingNotes}
            >
              <option value="">Choisir un prompt</option>
              {(notePrompts || []).map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name || `Prompt #${prompt.id}`}
                </option>
              ))}
            </Input>
            <Button
              className="notes-action-btn"
              color="primary"
              type="button"
              onClick={handleGenerateNotesWithPrompt}
              disabled={!selectedNotePromptId || isGeneratingNotes}
            >
              {isGeneratingNotes ? "Génération…" : "Générer avec mon prompt"}
            </Button>
            {previousNotesSnapshot && (
              <Button
                className="notes-action-btn"
                color="warning"
                type="button"
                onClick={handleRestorePreviousNotes}
              >
                Restaurer les notes précédentes
              </Button>
            )}
            {!isEditingNotes && (
              <Button
                className="notes-action-btn"
                color="secondary"
                type="button"
                onClick={() => setIsEditingNotes(true)}
              >
                Modifier
              </Button>
            )}
          </div>
          <Input
            id="notes"
            type="textarea"
            placeholder="Notes"
            className="notes-textarea"
            value={notes}
            onChange={handleNotesChange}
            readOnly={!isEditingNotes}
            onClick={() => {
              if (!isEditingNotes) setIsEditingNotes(true);
            }}
          />
          {isEditingNotes && (
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
          )}
        </Form>
      </CardBody>
    </Card>
  );
};

export default NotesForm;
