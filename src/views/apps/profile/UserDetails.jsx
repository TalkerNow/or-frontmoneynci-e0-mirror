import React from "react";
import { Card, CardBody, Button, Badge } from "reactstrap";
import { User as UserIcon } from "react-feather";

export default function UserDetails({ user = {}, onEdit, onSuspend }) {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Utilisateur";

  return (
    <Card className="h-55">
      <CardBody className="d-flex flex-column">
        {/* En-tête avec icône utilisateur dans un cercle */}
        <div className="d-flex justify-content-center mb-1">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "1px solid #c4b5fd",
              backgroundColor: "#f5f5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserIcon size={28} color="#7367f0" />
          </div>
        </div>
        <h4 className="mb-1 text-center">{fullName}</h4>
        {user.role ? (
          <div className="d-flex justify-content-center mb-1">
            <Badge color="light-primary" pill>
              {String(user.role).toUpperCase()}
            </Badge>
          </div>
        ) : null}

        <div className="mt-2">
          <h5 className="mb-50">Détails</h5>
          <div style={{ borderTop: "1px solid #ebe9f1", margin: "0.5rem 0 1rem" }} />
          <div className="users-page-view-table">
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Nom:</div>
              <div className="text-truncate">{user.last_name || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Prénom:</div>
              <div className="text-truncate">{user.first_name || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Email:</div>
              <div className="text-truncate">{user.email || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Rôle:</div>
              <div className="text-truncate">{user.role || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Numéro de téléphone:</div>
              <div className="text-truncate">{user.mobile_number || user.office_number || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Pays:</div>
              <div className="text-truncate">{user.personal_country || "—"}</div>
            </div>
          </div>
        </div>

        <hr className="my-2" style={{ borderTop: "1px solid #e9ecef" }} />

        <div className="d-flex justify-content-center mt-auto">
          <Button color="primary" className="mr-1" onClick={onEdit}>Modifier</Button>
        </div>
      </CardBody>
    </Card>
  );
}
