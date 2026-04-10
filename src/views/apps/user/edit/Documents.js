/* eslint-disable */
import React from "react";
import {
  Button,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledButtonDropdown,
  Card,
  CardBody,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
  Input,
} from "reactstrap";
import Dropzone from "react-dropzone";
import "../../../../assets/scss/plugins/extensions/dropzone.scss";
import {
  DownloadCloud,
  Folder,
  ArrowLeft,
  MoreVertical,
  FileText,
  Image,
  File as FileIcon,
} from "react-feather";
import axios from "axios";
import { toast } from "react-toastify";
import { waiterHide, waiterShow } from "../../../../helpers/waiter";

// 🔹 Dossiers
const FOLDERS = [
  { id: 1, name: "Contrat / Procuration", color: "#007bff" },
  { id: 2, name: "Documents familiaux", color: "#28a745" },
  { id: 3, name: "Documents carrières", color: "#17a2b8" },
  { id: 4, name: "Échanges avec les organismes", color: "#ffc107" },
  { id: 5, name: "Notifications retraite", color: "#dc3545" },
  { id: 6, name: "Autre", color: "#6f42c1" },
];

class DropzoneBasic extends React.Component {
  state = {
    files: [],
    currentFolder: null,
    folderCounts: {},
    dragOverFolderId: null,
    renameModal: false,
    fileToRenameId: null,
    newFileName: "",
    deleteModal: false,
    fileToDeleteId: null,
  };

  componentDidMount() {
    this.loadFiles();
  }

  // 🔹 Charger les fichiers
  loadFiles = () => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };

    axios
      .get(global.config.server_url + "/files?user_id=" + this.props.id, Config)
      .then((response) => {
        const files = response.data;
        const counts = {};
        counts[0] = files.filter((f) => !f.dossier || f.dossier === 0).length;
        FOLDERS.forEach((folder) => {
          counts[folder.id] = files.filter(
            (f) => f.dossier === folder.id
          ).length;
        });
        this.setState({ files, folderCounts: counts });
      });
  };

  // 🔹 Factorisation : upload dans un dossier donné
  uploadFilesToDossier = (files, dossier) => {
    const acceptedFiles = Array.from(files || []);
    if (acceptedFiles.length === 0) return;

    const formData = new FormData();
    formData.set("user_id", this.props.id);
    formData.set("dossier", dossier || 0);
    acceptedFiles.forEach((file, i) =>
      formData.append("photoUpload" + i, file)
    );

    const Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
        "Content-Type": "multipart/form-data",
      },
    };

    axios
      .post(global.config.server_url + "/uploadFiles", formData, Config)
      .then((response) => {
        if (response.data && response.data.success === true) this.loadFiles();
      });
  };

  // 🔹 Upload depuis la dropzone interne (dans un dossier ouvert)
  onDrop = (acceptedFiles) => {
    this.uploadFilesToDossier(acceptedFiles, this.state.currentFolder || 0);
  };

  // 🔹 Gestion de la modale de suppression
  toggleDeleteModal = () => {
    this.setState((prevState) => ({
      deleteModal: !prevState.deleteModal,
    }));
  };

  openDeleteModal = (fileId) => {
    this.setState({
      deleteModal: true,
      fileToDeleteId: fileId,
    });
  };

  handleDeleteSubmit = () => {
    const { fileToDeleteId } = this.state;
    if (!fileToDeleteId) return;

    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    axios
      .delete(global.config.server_url + "/files/" + fileToDeleteId, Config)
      .then(() => {
        this.loadFiles();
        this.toggleDeleteModal();
      });
  };

  // 🔹 Déplacer un fichier (change le dossier)
  moveFile = (fileId, newFolder) => {
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };
    axios
      .put(
        global.config.server_url + "/files/" + fileId,
        { dossier: newFolder },
        Config
      )
      .then(() => this.loadFiles());
  };

  // 🔹 Gestion de la modale de renommage
  toggleRenameModal = () => {
    this.setState((prevState) => ({
      renameModal: !prevState.renameModal,
    }));
  };

  openRenameModal = (fileId, currentName) => {
    this.setState({
      renameModal: true,
      fileToRenameId: fileId,
      newFileName: currentName,
    });
  };

  handleRenameSubmit = () => {
    const { fileToRenameId, newFileName } = this.state;
    if (!newFileName || newFileName.trim() === "") return;

    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    };

    axios
      .put(
        global.config.server_url + "/files/" + fileToRenameId,
        { filename: newFileName },
        Config
      )
      .then(() => {
        this.loadFiles();
        this.toggleRenameModal();
      })
      .catch((err) => {
        console.error("Erreur lors du renommage", err);
        window.alert("Impossible de renommer le fichier.");
      });
  };

  // 🔹 Télécharger un fichier
  download = (file_id, file_url) => {
    waiterShow();
    const Config = {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      responseType: "blob",
    };

    axios
      .get(
        global.config.server_url + "/downloadFile?file_id=" + file_id,
        Config
      )
      .then((response) => {
        waiterHide();
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        const lst_filename = file_url.split("/");
        link.setAttribute("download", lst_filename[lst_filename.length - 1]);
        document.body.appendChild(link);
        link.click();
      })
      .catch(() => waiterHide());
  };

  // 🔹 Envoyer un fichier vers l'analyse carrière (Notes)
  sendToCareerAnalysis = async (fileId, fileName, fileUrl) => {
    try {
      toast.info("Préparation du fichier pour l'analyse...");

      const Config = {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        responseType: "blob",
      };

      // Télécharger le fichier depuis le serveur
      const response = await axios.get(
        global.config.server_url + "/downloadFile?file_id=" + fileId,
        Config
      );

      const blob = response.data;
      const file = new File([blob], fileName, { type: blob.type || "application/pdf" });

      // Convertir en base64 et stocker dans sessionStorage
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = {
          name: file.name,
          type: file.type,
          dataUrl: reader.result,
        };
        sessionStorage.setItem(
          `notes_file_to_send_${this.props.id}`,
          JSON.stringify(fileData)
        );
        // Dispatch custom event to notify Notes component
        window.dispatchEvent(
          new CustomEvent("careerAnalysisFileReady", {
            detail: { clientId: this.props.id, fileData },
          })
        );
        toast.success(
          `"${fileName}" prêt pour l'analyse ! Rendez-vous dans l'onglet Notes.`
        );
      };
      reader.onerror = () => {
        toast.error("Erreur lors de la préparation du fichier.");
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Erreur sendToCareerAnalysis:", err);
      toast.error("Impossible de préparer le fichier pour l'analyse.");
    }
  };

  openFolder = (folderId) => this.setState({ currentFolder: folderId });
  closeFolder = () => this.setState({ currentFolder: null });

  // 🔹 Helpers pour le type de fichier
  getFileExtension = (filename) => {
    if (!filename) return "";
    const parts = filename.split(".");
    if (parts.length <= 1) return "";
    return parts.pop().toLowerCase();
  };

  getFileIcon = (filename) => {
    const ext = this.getFileExtension(filename);

    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
      return <Image size={18} />;
    }
    if (["pdf"].includes(ext)) {
      return <FileText size={18} />;
    }
    return <FileIcon size={18} />;
  };

  // 🔹 Drag start sur un fichier existant (pour le déplacer dans un dossier)
  handleDragStart = (event, fileId) => {
    event.dataTransfer.setData("text/plain", String(fileId));
    event.dataTransfer.effectAllowed = "move";
  };

  // 🔹 Drag over sur un dossier (pour le highlight)
  handleDragOverFolder = (folderId, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.state.dragOverFolderId !== folderId) {
      this.setState({ dragOverFolderId: folderId });
    }
  };

  // 🔹 Drag leave d’un dossier (on enlève le highlight)
  handleDragLeaveFolder = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.setState({ dragOverFolderId: null });
  };

  // 🔹 Drop sur un dossier : soit upload local, soit move d’un fichier existant
  handleDropOnFolder = (folderId, event) => {
    event.preventDefault();
    event.stopPropagation();

    const dt = event.dataTransfer;
    if (!dt) return;

    this.setState({ dragOverFolderId: null });

    // 1) Fichiers locaux (depuis l'ordi)
    if (dt.files && dt.files.length > 0) {
      this.uploadFilesToDossier(dt.files, folderId);
      return;
    }

    // 2) Fichier existant (drag depuis la liste)
    const fileId = dt.getData("text/plain");
    if (fileId) {
      this.moveFile(fileId, folderId);
    }
  };

  // 🔹 Affichage plus soigné (carte par fichier) + draggable
  renderFileList = (files) => (
    <div style={{ fontSize: "14px", lineHeight: 1.5 }}>
      {files.map((file) => {
        const ext = this.getFileExtension(file.filename);
        const extLabel = ext ? ext.toUpperCase() : "FICHIER";

        return (
          <div
            key={file.id}
            className="d-flex align-items-center justify-content-between"
            draggable
            onDragStart={(e) => this.handleDragStart(e, file.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              backgroundColor: "#f8f9fa",
              border: "1px solid #e9ecef",
              marginBottom: 6,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              cursor: "grab",
            }}
          >
            {/* Partie gauche : icône + nom */}
            <div
              className="d-flex align-items-center flex-grow-1"
              style={{ minWidth: 0 }}
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e9ecef",
                  marginRight: 8,
                  flexShrink: 0,
                }}
              >
                {this.getFileIcon(file.filename)}
              </div>

              <div
                className="d-flex flex-column flex-grow-1"
                style={{ minWidth: 0 }}
              >
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#212529",
                    textDecoration: "none",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={file.filename}
                >
                  {file.filename.length > 200
                    ? file.filename.substring(0, 197) + "..."
                    : file.filename}
                </a>
                <small style={{ color: "#868e96" }}>{extLabel}</small>
              </div>
            </div>

            {/* Bouton d’options à droite */}
            <UncontrolledButtonDropdown>
              <DropdownToggle
                color="light"
                aria-label="Options du fichier"
                style={{
                  padding: 0,
                  width: 34,
                  height: 34,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  border: "1px solid #e5e5e5",
                  backgroundColor: "#ffffff",
                  marginLeft: 8,
                }}
              >
                <MoreVertical size={18} />
              </DropdownToggle>
              <DropdownMenu right>
                <DropdownItem
                  tag="a"
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem header>Déplacer vers</DropdownItem>
                {FOLDERS.map((folder) => (
                  <DropdownItem
                    key={folder.id}
                    onClick={() => this.moveFile(file.id, folder.id)}
                  >
                    {folder.name}
                  </DropdownItem>
                ))}
                <DropdownItem divider />
                <DropdownItem
                  onClick={() =>
                    this.sendToCareerAnalysis(file.id, file.filename, file.url)
                  }
                  style={{ color: "#7367f0", fontWeight: 500 }}
                >
                  📊 Analyse carrière
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem onClick={() => this.download(file.id, file.url)}>
                  Télécharger
                </DropdownItem>
                <DropdownItem
                  onClick={() => this.openRenameModal(file.id, file.filename)}
                >
                  Renommer
                </DropdownItem>
                <DropdownItem
                  onClick={() => this.openDeleteModal(file.id)}
                  className="text-danger"
                >
                  Supprimer
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledButtonDropdown>
          </div>
        );
      })}
    </div>
  );

  // 🔹 Fichiers non triés
  renderUnsortedFiles = () => {
    const unsortedFiles = this.state.files.filter(
      (f) => !f.dossier || f.dossier === 0
    );
    if (unsortedFiles.length === 0) return null;
    return (
      <>
        <h6 className="mb-1 mt-3">Fichiers non triés</h6>
        {this.renderFileList(unsortedFiles)}
        <hr />
      </>
    );
  };

  // 🔹 Vue dossiers : liste verticale + pastille compteur à droite + highlight drag
  renderFolderView = () => (
    <>
      {FOLDERS.map((folder, index) => {
        const count = this.state.folderCounts[folder.id] || 0;
        const isDragOver = this.state.dragOverFolderId === folder.id;

        return (
          <Card
            key={folder.id}
            onClick={() => this.openFolder(folder.id)}
            onDrop={(e) => this.handleDropOnFolder(folder.id, e)}
            onDragOver={(e) => this.handleDragOverFolder(folder.id, e)}
            onDragLeave={this.handleDragLeaveFolder}
            className="mb-2"
            style={{
              cursor: "pointer",
              transition: "0.15s",
              borderRadius: 8,
              border: isDragOver ? "1px solid #adb5bd" : "1px solid #e9ecef",
              backgroundColor: isDragOver ? "#f8f9fa" : "#ffffff",
              boxShadow: isDragOver ? "0 0 0 2px rgba(0,0,0,0.04)" : "none",
            }}
          >
            <CardBody className="d-flex align-items-center justify-content-between py-2">
              {/* Gauche : icône + titre numéroté */}
              <div className="d-flex align-items-center">
                <Folder size={24} className="mr-2" />
                <div className="ml-2">
                  <strong>
                    {index + 1}. {folder.name}
                  </strong>
                </div>
              </div>

              {/* Droite : pastille avec le nombre de fichiers (uniquement si > 0) */}
              {count > 0 && (
                <div
                  style={{
                    minWidth: 28,
                    height: 28,
                    padding: "0 8px",
                    borderRadius: 999,
                    backgroundColor: "#e9ecef",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#212529",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {count}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}

      {/* 🔹 Fichiers non triés en dessous des dossiers */}
      {this.renderUnsortedFiles()}
    </>
  );

  // 🔹 Vue fichiers d’un dossier (dropzone pour upload dans ce dossier)
  renderFileView = () => {
    const currentFolderObj = FOLDERS.find(
      (f) => f.id === this.state.currentFolder
    );
    const filesInFolder = this.state.files.filter(
      (f) => f.dossier === this.state.currentFolder
    );

    return (
      <>
        <div className="d-flex align-items-center mb-2">
          <Button
            color="primary"
            onClick={this.closeFolder}
            size="sm"
            className="mr-2 p-1"
          >
            <ArrowLeft size={16} />
          </Button>
          <Folder size={20} className="mr-2" />
          <div>
            <strong>{currentFolderObj.name}</strong>
            <div style={{ fontSize: "12px", color: "#555" }}>
              {filesInFolder.length} fichier(s)
            </div>
          </div>
        </div>

        <Dropzone onDrop={this.onDrop}>
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps({ className: "dropzone text-center mb-2" })}
              style={{
                padding: "14px",
                borderRadius: 10,
                border: "1px dashed #ced4da",
                backgroundColor: "#f8f9fa",
              }}
            >
              <input {...getInputProps()} />
              <DownloadCloud size={35} className="mb-1" />
              <p
                className="mb-0"
                style={{ fontSize: "13px", color: "#495057" }}
              >
                Glissez vos fichiers ici ou cliquez pour sélectionner
              </p>
            </div>
          )}
        </Dropzone>

        {filesInFolder.length > 0 && this.renderFileList(filesInFolder)}
      </>
    );
  };

  render() {
    return (
      <>
        {this.state.currentFolder === null
          ? this.renderFolderView()
          : this.renderFileView()}

        {/* 🔹 Modal de renommage */}
        <Modal
          isOpen={this.state.renameModal}
          toggle={this.toggleRenameModal}
          centered
        >
          <ModalHeader toggle={this.toggleRenameModal}>
            Renommer le fichier
          </ModalHeader>
          <ModalBody>
            <FormGroup>
              <Label for="newFileName">Nouveau nom</Label>
              <Input
                id="newFileName"
                type="text"
                value={this.state.newFileName}
                onChange={(e) => this.setState({ newFileName: e.target.value })}
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.handleRenameSubmit}>
              Enregistrer
            </Button>{" "}
            <Button color="danger" onClick={this.toggleRenameModal}>
              Annuler
            </Button>
          </ModalFooter>
        </Modal>

        {/* 🔹 Modal de suppression */}
        <Modal
          isOpen={this.state.deleteModal}
          toggle={this.toggleDeleteModal}
          centered
        >
          <ModalHeader toggle={this.toggleDeleteModal}>
            Supprimer le fichier
          </ModalHeader>
          <ModalBody>Êtes-vous sûr de vouloir supprimer ce fichier ?</ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.handleDeleteSubmit}>
              Supprimer
            </Button>{" "}
            <Button color="danger" onClick={this.toggleDeleteModal}>
              Annuler
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  }
}

export default DropzoneBasic;
