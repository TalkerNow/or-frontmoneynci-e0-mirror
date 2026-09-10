/**
 * MVP Espace client public (gratuit) — JF 2026-09-10
 * Auth: role Client (séparé admin/consultant). Pas de production PDF consultation/audit.
 * APIs: voir /workspace/handoff/eor-or-espace-client-mvp-api-todos-20260910.md
 */
import React, { useMemo, useRef, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  Alert,
  Progress,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
import { Upload, FileText, HelpCircle, Activity, LogOut } from "react-feather";
import { history } from "../../../history";
import { toast } from "react-toastify";
import "./EspaceClient.scss";

const STEPS = [
  { id: "diagnostic", label: "Diagnostic", icon: Activity },
  { id: "ris", label: "Déposer mon RIS", icon: Upload },
  { id: "questions", label: "Questions carrière", icon: HelpCircle },
];

export default function EspaceClient() {
  const [active, setActive] = useState("diagnostic");
  const [risFile, setRisFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [diag, setDiag] = useState({
    anneeNaissance: "",
    debutActivite: "",
    statut: "salarie",
    objectif: "age_depart",
  });
  const [questions, setQuestions] = useState({
    periodesChomage: "",
    enfants: "",
    periodesEtranger: "",
    commentaireRis: "",
  });
  const fileRef = useRef(null);

  const username = useMemo(
    () =>
      (typeof window !== "undefined" && window.localStorage.getItem("username")) ||
      "Client",
    []
  );

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("userid");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
    } catch (e) {
      /* ignore */
    }
    history.push("/pages/login");
  };

  const handleDiagSubmit = (e) => {
    e.preventDefault();
    // TODO(API): POST /v1/espace-client/diagnostic — stub front only
    toast.info(
      "Diagnostic enregistré localement (MVP). Branchement API à venir."
    );
    setActive("ris");
  };

  const handleRisPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setRisFile(f);
  };

  const handleRisUpload = async () => {
    if (!risFile) {
      toast.warn("Choisissez un fichier RIS (PDF) d'abord.");
      return;
    }
    setUploading(true);
    try {
      // TODO(API): POST /v1/espace-client/ris (multipart) — stub front only
      await new Promise((r) => setTimeout(r, 600));
      toast.success(
        `RIS « ${risFile.name} » prêt côté navigateur (MVP — pas encore envoyé au serveur).`
      );
      setActive("questions");
    } finally {
      setUploading(false);
    }
  };

  const handleQuestionsSubmit = (e) => {
    e.preventDefault();
    // TODO(API): POST /v1/espace-client/carriere-questions — stub front only
    toast.success(
      "Réponses enregistrées localement. Un conseiller pourra reprendre votre dossier. Aucun PDF consultation/audit en MVP gratuit."
    );
  };

  return (
    <div className="espace-client">
      <div className="espace-client__top">
        <div>
          <h1 className="espace-client__title">Mon espace retraite</h1>
          <p className="espace-client__subtitle">
            Bonjour {username} — diagnostic léger, dépôt RIS et questions carrière.
            <strong> Aucune production de rapport / audit PDF</strong> dans cet
            espace gratuit.
          </p>
        </div>
        <Button color="flat-secondary" size="sm" onClick={handleLogout}>
          <LogOut size={14} className="mr-50" /> Déconnexion
        </Button>
      </div>

      <Nav pills className="espace-client__nav mb-2">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <NavItem key={s.id}>
              <NavLink
                className={active === s.id ? "active" : ""}
                onClick={() => setActive(s.id)}
                href="#"
              >
                <Icon size={14} className="mr-50" />
                {s.label}
              </NavLink>
            </NavItem>
          );
        })}
      </Nav>

      <TabContent activeTab={active}>
        <TabPane tabId="diagnostic">
          <Card className="espace-client__card">
            <CardHeader>
              <CardTitle tag="h4">
                <Activity size={18} className="mr-50" />
                Diagnostic / analyse légère
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Alert color="primary" className="mb-2">
                Quelques questions pour situer votre parcours. Calculs détaillés
                et livrables restent côté consultant.
              </Alert>
              <Form onSubmit={handleDiagSubmit}>
                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label>Année de naissance</Label>
                      <Input
                        type="number"
                        min="1940"
                        max="2010"
                        value={diag.anneeNaissance}
                        onChange={(e) =>
                          setDiag({ ...diag, anneeNaissance: e.target.value })
                        }
                        required
                        placeholder="ex. 1968"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Début d&apos;activité (année)</Label>
                      <Input
                        type="number"
                        min="1955"
                        max="2030"
                        value={diag.debutActivite}
                        onChange={(e) =>
                          setDiag({ ...diag, debutActivite: e.target.value })
                        }
                        required
                        placeholder="ex. 1988"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Statut principal</Label>
                      <Input
                        type="select"
                        value={diag.statut}
                        onChange={(e) =>
                          setDiag({ ...diag, statut: e.target.value })
                        }
                      >
                        <option value="salarie">Salarié</option>
                        <option value="independant">Indépendant / TNS</option>
                        <option value="fonction_publique">
                          Fonction publique
                        </option>
                        <option value="mixte">Parcours mixte</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="12">
                    <FormGroup>
                      <Label>Objectif principal</Label>
                      <Input
                        type="select"
                        value={diag.objectif}
                        onChange={(e) =>
                          setDiag({ ...diag, objectif: e.target.value })
                        }
                      >
                        <option value="age_depart">
                          Connaître mon âge de départ possible
                        </option>
                        <option value="decote">
                          Comprendre décote / surcote
                        </option>
                        <option value="ris">
                          Vérifier mon relevé de carrière (RIS)
                        </option>
                        <option value="conseil">
                          Échanger avec un conseiller
                        </option>
                      </Input>
                    </FormGroup>
                  </Col>
                </Row>
                <Button color="primary" type="submit">
                  Enregistrer et continuer
                </Button>
              </Form>
            </CardBody>
          </Card>
        </TabPane>

        <TabPane tabId="ris">
          <Card className="espace-client__card">
            <CardHeader>
              <CardTitle tag="h4">
                <FileText size={18} className="mr-50" />
                Déposer mon RIS
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-muted">
                Importez votre Relevé Individuel de Situation (PDF). Le fichier
                reste local en MVP tant que l&apos;API n&apos;est pas branchée.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                onChange={handleRisPick}
              />
              <div className="espace-client__drop">
                <Button
                  color="primary"
                  outline
                  onClick={() => fileRef.current && fileRef.current.click()}
                >
                  <Upload size={14} className="mr-50" />
                  Choisir un PDF
                </Button>
                {risFile && (
                  <span className="espace-client__filechip">
                    <FileText size={14} /> {risFile.name}
                  </span>
                )}
              </div>
              {uploading && <Progress animated value={70} className="mt-1" />}
              <div className="mt-2">
                <Button
                  color="primary"
                  disabled={!risFile || uploading}
                  onClick={handleRisUpload}
                >
                  {uploading ? "Envoi…" : "Valider le dépôt"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </TabPane>

        <TabPane tabId="questions">
          <Card className="espace-client__card">
            <CardHeader>
              <CardTitle tag="h4">
                <HelpCircle size={18} className="mr-50" />
                Questions carrière / RIS
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Form onSubmit={handleQuestionsSubmit}>
                <FormGroup>
                  <Label>Périodes de chômage (années ou commentaire)</Label>
                  <Input
                    type="textarea"
                    rows="2"
                    value={questions.periodesChomage}
                    onChange={(e) =>
                      setQuestions({
                        ...questions,
                        periodesChomage: e.target.value,
                      })
                    }
                    placeholder="ex. 2009–2010 indemnisé"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Enfants (nombre / dates de naissance)</Label>
                  <Input
                    type="text"
                    value={questions.enfants}
                    onChange={(e) =>
                      setQuestions({ ...questions, enfants: e.target.value })
                    }
                    placeholder="ex. 2 enfants — 1995, 1998"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Périodes à l&apos;étranger</Label>
                  <Input
                    type="textarea"
                    rows="2"
                    value={questions.periodesEtranger}
                    onChange={(e) =>
                      setQuestions({
                        ...questions,
                        periodesEtranger: e.target.value,
                      })
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Points d&apos;attention sur votre RIS</Label>
                  <Input
                    type="textarea"
                    rows="3"
                    value={questions.commentaireRis}
                    onChange={(e) =>
                      setQuestions({
                        ...questions,
                        commentaireRis: e.target.value,
                      })
                    }
                    placeholder="Années manquantes, régimes non listés…"
                  />
                </FormGroup>
                <Alert color="warning">
                  MVP gratuit : pas de génération de consultation, simulation ou
                  audit PDF ici.
                </Alert>
                <Button color="primary" type="submit">
                  Envoyer mes réponses
                </Button>
              </Form>
            </CardBody>
          </Card>
        </TabPane>
      </TabContent>
    </div>
  );
}
