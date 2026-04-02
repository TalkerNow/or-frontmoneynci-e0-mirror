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
  handleCancelNotesEdit,
  notePrompts,
  selectedNotePromptId,
  setSelectedNotePromptId,
  isGeneratingNotes,
  handleGenerateNotesWithPrompt,
  previousNotesSnapshot,
  handleRestorePreviousNotes,
}) => {
  return (
    <Card className="notes-card notes-card--compact h-100">
      <CardBody className="d-flex flex-column">
        <Form className="notes-form" onSubmit={handleSubmit}>
          <div className="d-flex align-items-center justify-content-between mb-50">
            <h5 className="notes-card-title mb-0">Notes</h5>
            {selectedNotePromptId && (
              <Button
                className="notes-action-btn"
                color="primary"
                outline
                size="sm"
                type="button"
                onClick={handleGenerateNotesWithPrompt}
                disabled={isGeneratingNotes}
              >
                {isGeneratingNotes ? "Génération…" : "Générer avec l'IA"}
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
          />
          <div
            className="notes-form-actions notes-action-row d-flex align-items-center flex-wrap"
            style={{ marginTop: "0.75rem", gap: "0.5rem" }}
          >
            <div className="w-100">
              <Input
                type="select"
                className="notes-prompt-select"
                value={selectedNotePromptId}
                onChange={(e) => setSelectedNotePromptId(e.target.value)}
                disabled={isGeneratingNotes}
              >
                <option value="">Choisir un prompt (optionnel)</option>
                {(notePrompts || []).map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name || `Prompt #${prompt.id}`}
                  </option>
                ))}
              </Input>
            </div>
            <div
              className="d-flex align-items-center"
              style={{ gap: "0.5rem", flexWrap: "wrap" }}
            >
              {isEditingNotes ? (
                <>
                  <Button
                    className="notes-action-btn"
                    color="secondary"
                    type="button"
                    onClick={handleCancelNotesEdit}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="notes-action-btn"
                    color={hasChanged ? "primary" : "secondary"}
                    type="submit"
                    disabled={!hasChanged || isSaving}
                  >
                    {isSaving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                </>
              ) : (
                <Button
                  className="notes-action-btn"
                  color="secondary"
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                >
                  Modifier
                </Button>
              )}
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
            </div>
          </div>
        </Form>
      </CardBody>
    </Card>
  );
};

export default NotesForm;
