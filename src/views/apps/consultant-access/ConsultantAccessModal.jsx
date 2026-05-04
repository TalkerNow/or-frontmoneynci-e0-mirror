import React, { useState } from "react"
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert,
  Spinner,
} from "reactstrap"
import { toast } from "react-toastify"
import { verifyConsultantAccess } from "./consultantAccessService"

/**
 * Modale de vérification d'accès consultant (gatekeeper).
 *
 * Props :
 *   isOpen        {boolean}   Contrôle l'ouverture
 *   toggle        {Function}  Ferme la modale
 *   onAuthorized  {Function}  Callback déclenché si accès accordé
 *   actionLabel   {string}    Label de l'action premium (ex: "Générer le rapport")
 */
function ConsultantAccessModal({ isOpen, toggle, onAuthorized, actionLabel = "Accéder" }) {
  const [lastName, setLastName]     = useState("")
  const [firstName, setFirstName]   = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  function resetForm() {
    setLastName("")
    setFirstName("")
    setDateOfBirth("")
    setError(null)
  }

  function handleClose() {
    resetForm()
    toggle()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!lastName.trim() || !firstName.trim() || !dateOfBirth) {
      setError("Tous les champs sont obligatoires.")
      return
    }

    setLoading(true)
    try {
      await verifyConsultantAccess(lastName.trim(), firstName.trim(), dateOfBirth)
      toast.success("Accès accordé.")
      resetForm()
      toggle()
      onAuthorized()
    } catch (err) {
      const status = err?.response?.status
      if (status === 403) {
        setError(
          err?.response?.data?.error ||
          "Accès refusé : identité non reconnue, crédits insuffisants ou pass expiré. Veuillez vérifier vos informations ou recharger vos crédits."
        )
      } else {
        setError("Une erreur est survenue lors de la vérification. Veuillez réessayer.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} toggle={handleClose} centered>
      <ModalHeader toggle={handleClose}>Vérification d'accès consultant</ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          <p className="text-muted mb-3">
            Veuillez confirmer votre identité pour accéder à <strong>{actionLabel}</strong>.
          </p>

          {error && (
            <Alert color="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <FormGroup>
            <Label for="ca-last-name">Nom</Label>
            <Input
              id="ca-last-name"
              type="text"
              placeholder="Nom de famille"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </FormGroup>

          <FormGroup>
            <Label for="ca-first-name">Prénom</Label>
            <Input
              id="ca-first-name"
              type="text"
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />
          </FormGroup>

          <FormGroup>
            <Label for="ca-dob">Date de naissance</Label>
            <Input
              id="ca-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={loading}
            />
          </FormGroup>
        </ModalBody>

        <ModalFooter>
          <Button color="secondary" outline onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button color="primary" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" className="mr-1" /> : null}
            {loading ? "Vérification..." : "Confirmer l'accès"}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default ConsultantAccessModal
