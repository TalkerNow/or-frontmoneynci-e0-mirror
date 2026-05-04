import React, { useState, useEffect } from "react"
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Form, FormGroup, Label, Input, Button, Alert, Spinner,
} from "reactstrap"
import api from "../../../services/api"

const EMPTY_FORM = {
  access_type: "credits",
  remaining_credits: 0,
  pass_expiration_date: "",
}

function ConsultantAccessFormModal({ isOpen, toggle, onSaved, consultant }) {
  const [form, setForm]       = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const isEdit = Boolean(consultant?.access_id)

  useEffect(() => {
    if (isEdit) {
      setForm({
        access_type:          consultant.access_type || "credits",
        remaining_credits:    consultant.remaining_credits ?? 0,
        pass_expiration_date: consultant.pass_expiration_date
          ? consultant.pass_expiration_date.slice(0, 10)
          : "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [consultant, isOpen])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const payload = { ...form }
    if (payload.access_type === "unlimited_pass") {
      payload.remaining_credits = 0
    } else {
      payload.pass_expiration_date = null
    }

    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/v1/consultant-access/${consultant.access_id}`, payload)
      } else {
        await api.post("/v1/consultant-access", {
          user_id: consultant.user_id,
          ...payload,
        })
      }
      onSaved()
      toggle()
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || "Erreur serveur.")
    } finally {
      setLoading(false)
    }
  }

  const fullName = [consultant?.first_name, consultant?.last_name].filter(Boolean).join(" ") || consultant?.name || ""

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered>
      <ModalHeader toggle={toggle}>
        {isEdit ? "Modifier l'accès" : "Ajouter un accès"} — {fullName}
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {error && <Alert color="danger">{error}</Alert>}

          <FormGroup>
            <Label>Type d'accès</Label>
            <Input
              type="select"
              value={form.access_type}
              onChange={(e) => set("access_type", e.target.value)}
            >
              <option value="credits">Crédits</option>
              <option value="unlimited_pass">Pass illimité</option>
            </Input>
          </FormGroup>

          {form.access_type === "credits" && (
            <FormGroup>
              <Label>Nombre de crédits</Label>
              <Input
                type="number"
                min="0"
                value={form.remaining_credits}
                onChange={(e) => set("remaining_credits", parseInt(e.target.value, 10))}
                required
              />
            </FormGroup>
          )}

          {form.access_type === "unlimited_pass" && (
            <FormGroup>
              <Label>Date d'expiration du pass</Label>
              <Input
                type="date"
                value={form.pass_expiration_date}
                onChange={(e) => set("pass_expiration_date", e.target.value)}
                required
              />
            </FormGroup>
          )}
        </ModalBody>

        <ModalFooter>
          <Button color="secondary" outline onClick={toggle} disabled={loading}>
            Annuler
          </Button>
          <Button color="primary" type="submit" disabled={loading}>
            {loading && <Spinner size="sm" className="mr-1" />}
            {isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default ConsultantAccessFormModal
