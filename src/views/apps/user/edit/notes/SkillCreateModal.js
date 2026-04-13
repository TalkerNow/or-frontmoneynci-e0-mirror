import React, { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, Row, Col } from "reactstrap";
import { toast } from "react-toastify";
import api from "../../../../../services/api";

/**
 * Modale de création d'un skill.
 * regles_json est saisi en brut (textarea JSON), validé en front avant POST.
 * Une fois créé, regles_json et calcul_py ne seront plus modifiables via l'UI.
 *
 * Props :
 *  - isOpen
 *  - onClose
 *  - onCreated : (newSkill) => void
 *  - existingTypes : string[] — liste de types distincts déjà présents, pour le select
 */
const SkillCreateModal = ({ isOpen, onClose, onCreated, existingTypes = [] }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    code: "",
    skill_id: "",
    type: "",
    description: "",
    skill_md: "",
    regles_json: "",
    calcul_py: "",
    tags: "",
    priority: 5,
  });
  const [errors, setErrors] = useState({});

  const reset = () => {
    setForm({
      nom: "", code: "", skill_id: "", type: "", description: "",
      skill_md: "", regles_json: "", calcul_py: "", tags: "", priority: 5,
    });
    setErrors({});
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const validate = () => {
    const e = {};
    if (!form.nom.trim()) e.nom = "Requis";
    if (!form.code.trim()) e.code = "Requis";
    if (!form.skill_id.trim()) e.skill_id = "Requis";
    if (!form.type.trim()) e.type = "Requis";
    if (!form.skill_md.trim()) e.skill_md = "Requis";
    if (!form.regles_json.trim()) {
      e.regles_json = "Requis";
    } else {
      try {
        JSON.parse(form.regles_json);
      } catch (err) {
        e.regles_json = "JSON invalide : " + err.message;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      nom: form.nom,
      code: form.code.toUpperCase(),
      skill_id: form.skill_id,
      type: form.type,
      description: form.description || null,
      skill_md: form.skill_md,
      regles_json: JSON.parse(form.regles_json),
      calcul_py: form.calcul_py || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      priority: parseInt(form.priority, 10) || 5,
    };

    api.post("/v1/skills", payload)
      .then((res) => {
        toast.success("Skill créé avec succès");
        if (onCreated) onCreated(res.data.skill);
        reset();
        onClose();
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          toast.error("Action réservée aux admins");
        } else if (err.response?.status === 422) {
          const backendErrors = err.response.data?.errors || {};
          const flat = {};
          Object.keys(backendErrors).forEach((k) => { flat[k] = backendErrors[k][0]; });
          setErrors(flat);
          toast.error("Données invalides — voir les champs");
        } else {
          toast.error("Erreur serveur, réessayez");
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="xl" backdrop="static">
      <ModalHeader toggle={onClose}>Créer un nouveau skill</ModalHeader>
      <ModalBody>
        <Form>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={(e) => handleChange("nom", e.target.value)} invalid={!!errors.nom} />
                {errors.nom && <small className="text-danger">{errors.nom}</small>}
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label>Code * (uppercase)</Label>
                <Input value={form.code} onChange={(e) => handleChange("code", e.target.value.toUpperCase())} invalid={!!errors.code} />
                {errors.code && <small className="text-danger">{errors.code}</small>}
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label>skill_id *</Label>
                <Input value={form.skill_id} onChange={(e) => handleChange("skill_id", e.target.value)} invalid={!!errors.skill_id} />
                {errors.skill_id && <small className="text-danger">{errors.skill_id}</small>}
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Type *</Label>
                <Input type="select" value={form.type} onChange={(e) => handleChange("type", e.target.value)} invalid={!!errors.type}>
                  <option value="">— Choisir —</option>
                  {existingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </Input>
                {errors.type && <small className="text-danger">{errors.type}</small>}
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label>Priority</Label>
                <Input type="number" min={0} value={form.priority} onChange={(e) => handleChange("priority", e.target.value)} />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label>Tags (séparés par virgule)</Label>
                <Input value={form.tags} onChange={(e) => handleChange("tags", e.target.value)} placeholder="racl, carriere_longue" />
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label>Description</Label>
            <Input type="textarea" rows={2} value={form.description} onChange={(e) => handleChange("description", e.target.value)} />
          </FormGroup>

          <FormGroup>
            <Label>skill_md * (Markdown)</Label>
            <textarea
              value={form.skill_md}
              onChange={(e) => handleChange("skill_md", e.target.value)}
              style={{ width: "100%", minHeight: 200, fontFamily: "monospace", fontSize: 12, padding: 10, border: errors.skill_md ? "1px solid red" : "1px solid #ccc", borderRadius: 4 }}
            />
            {errors.skill_md && <small className="text-danger">{errors.skill_md}</small>}
          </FormGroup>

          <FormGroup>
            <Label>regles_json * (JSON valide — non modifiable après création)</Label>
            <textarea
              value={form.regles_json}
              onChange={(e) => handleChange("regles_json", e.target.value)}
              placeholder='{"conditions": [], "seuils": {}}'
              style={{ width: "100%", minHeight: 150, fontFamily: "monospace", fontSize: 12, padding: 10, border: errors.regles_json ? "1px solid red" : "1px solid #ccc", borderRadius: 4 }}
            />
            {errors.regles_json && <small className="text-danger">{errors.regles_json}</small>}
          </FormGroup>

          <FormGroup>
            <Label>calcul_py (optionnel, non modifiable après création)</Label>
            <textarea
              value={form.calcul_py}
              onChange={(e) => handleChange("calcul_py", e.target.value)}
              style={{ width: "100%", minHeight: 120, fontFamily: "monospace", fontSize: 12, padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={() => { reset(); onClose(); }} disabled={saving}>Annuler</Button>
        <Button color="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? "Création…" : "Créer"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default SkillCreateModal;
