import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  FormGroup,
  Row,
  Col,
} from "reactstrap";
import { Mail, Upload, Download, Trash2, Eye } from "react-feather";
import axios from "axios";
import { toast } from "react-toastify";

export default function CourriersHub({ id, alignOffset = 0, labelId }) {
  const [courriers, setCourriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const contentRef = useRef(null);

  // Animate on mount
  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [alignOffset]);

  // Charger les courriers
  useEffect(() => {
    loadCourriers();
  }, [id]);

  const loadCourriers = async () => {
    try {
      setLoading(true);
      const Config = {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      };
      // Adapter l'endpoint selon votre API
      const response = await axios.get(
        `${global.config.server_url}/courriers/user/${id}`,
        Config
      );
      setCourriers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.warn("Impossible de charger les courriers", error);
      setCourriers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", id);

      const Config = {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
          "Content-Type": "multipart/form-data",
        },
      };

      await axios.post(
        `${global.config.server_url}/courriers/upload`,
        formData,
        Config
      );

      toast.success("Courrier téléchargé avec succès");
      loadCourriers();
    } catch (error) {
      console.error("Erreur lors du téléchargement", error);
      toast.error("Erreur lors du téléchargement du courrier");
    }
  };

  const handleDelete = async (courrierId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce courrier ?"))
      return;

    try {
      const Config = {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      };

      await axios.delete(
        `${global.config.server_url}/courriers/${courrierId}`,
        Config
      );

      toast.success("Courrier supprimé");
      loadCourriers();
    } catch (error) {
      console.error("Erreur lors de la suppression", error);
      toast.error("Erreur lors de la suppression du courrier");
    }
  };

  const handleDownload = async (courrier) => {
    try {
      const Config = {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        responseType: "blob",
      };

      const response = await axios.get(
        `${global.config.server_url}/courriers/download/${courrier.id}`,
        Config
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", courrier.filename || "courrier.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors du téléchargement", error);
      toast.error("Erreur lors du téléchargement du courrier");
    }
  };

  return (
    <div
      ref={contentRef}
      style={{
        marginLeft: Math.max(0, Number(alignOffset) || 0),
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-6px)",
        transition:
          "margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 140ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "margin-left, transform, opacity",
      }}
    >
      <Card className="mb-1 shadow-sm rounded-2xl">
        <CardHeader className="pb-0 d-flex justify-content-between align-items-center">
          <div>
            <Input
              type="file"
              id="courrier-upload"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleUpload}
              style={{ display: "none" }}
            />
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-2">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Chargement...</span>
              </div>
            </div>
          ) : courriers.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nom du fichier</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courriers.map((courrier) => (
                    <tr key={courrier.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <Mail size={16} className="text-primary mr-50" />
                          <span className="font-weight-bold">
                            {courrier.filename || courrier.name || "Courrier"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">
                          {courrier.created_at
                            ? new Date(courrier.created_at).toLocaleDateString(
                                "fr-FR"
                              )
                            : "—"}
                        </small>
                      </td>
                      <td>
                        <span className="badge badge-light-primary">
                          {courrier.type || courrier.category || "Courrier"}
                        </span>
                      </td>
                      <td className="text-right">
                        <Button
                          color="flat-primary"
                          size="sm"
                          className="btn-icon mr-50"
                          onClick={() => handleDownload(courrier)}
                          title="Télécharger"
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          color="flat-danger"
                          size="sm"
                          className="btn-icon"
                          onClick={() => handleDelete(courrier.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-3">
              <Mail size={48} className="text-muted mb-1" />
              <p className="text-muted mb-2">Aucun courrier pour le moment</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
