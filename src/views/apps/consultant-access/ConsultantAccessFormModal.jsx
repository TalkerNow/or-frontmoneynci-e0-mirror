import React, { useState, useEffect } from "react"
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Form, FormGroup, Label, Input, Button, Alert, Spinner,
} from "reactstrap"
import api from "../../../services/api"

function defaultExpiration() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

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
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "access_type" && value === "unlimited_pass" && !prev.pass_expiration_date) {
        next.pass_expiration_date = defaultExpiration()
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const payload = { ...form }
    if (payload.access_type === "unlimited_pass") {
      payload.remaining_credits = 0
    } else {
      payload.remaining_credits = parseInt(payload.remaining_credits, 10) || 0
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

  const fullName = consultant?.name || ""

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
                max="100"
                value={form.remaining_credits}
                onChange={(e) => set("remaining_credits", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                onFocus={(e) => e.target.select()}
                required
              />
            </FormGroup>
          )}

          {form.access_type === "unlimited_pass" && (
            <FormGroup>
              <Label>Date d'expiration du pass (JJ/MM/AAAA)</Label>
              <Input
                type="date"
                value={form.pass_expiration_date}
                onChange={(e) => set("pass_expiration_date", e.target.value)}
                required
                lang="fr"
              />
            </FormGroup>
          )}
        </ModalBody>

        <ModalFooter>
          <Button color="danger" onClick={toggle} disabled={loading}>
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
