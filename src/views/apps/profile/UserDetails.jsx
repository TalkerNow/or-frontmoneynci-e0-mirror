import React from "react";
import { Card, CardBody, Button, Badge, UncontrolledTooltip } from "reactstrap";
import { User as UserIcon, Disc } from "react-feather";

export default function UserDetails({ user = {}, onEdit, onSuspend, showCollapse = false, onCollapse, cardClassName = "" }) {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Utilisateur";
  const formatPhoneFR = (val) => {
    if (!val) return "";
    try {
      let digits = String(val).replace(/\D/g, "");
      // Normalize French country code to leading 0
      if (/^(?:33)/.test(digits)) digits = "0" + digits.slice(2);
      if (/^(?:0033)/.test(String(val))) digits = "0" + digits.replace(/\D/g, "").slice(4);
      if (/^(?:\+33)/.test(String(val))) digits = "0" + digits.slice(2); // already removed +
      // Keep first 10 for standard FR mobile/landline formatting
      const core = digits.length >= 10 ? digits.slice(0, 10) : digits;
      return core.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    } catch (e) {
      return String(val);
    }
  };

  return (
    <Card className={`h-100 profile-card ${cardClassName}`}>
      <CardBody className="d-flex flex-column h-100 p-1 pb-0" style={{ position: 'relative' }}>
        {showCollapse && (
          <div className="nav-link modern-nav-toggle" style={{ position: 'absolute', top: 10, right: 10, zIndex: 5 }}>
            <Disc id="profileCardCollapseToggle" onClick={onCollapse} className="toggle-icon icon-x d-none d-xl-block text-primary" size={20} />
            <UncontrolledTooltip placement='left' target='profileCardCollapseToggle'>Masquer la fiche</UncontrolledTooltip>
          </div>
        )}
        {/* En-tête avec icône utilisateur dans un cercle */}
        <div className="d-flex justify-content-center mb-50">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "1px solid #c4b5fd",
              backgroundColor: "#f5f5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserIcon size={22} color="#7367f0" />
          </div>
        </div>
        <h5 className="mb-25 text-center">{fullName}</h5>
        {user.role ? (
          <div className="d-flex justify-content-center mb-75">
            <Badge color="light-primary" pill>
              {String(user.role).toUpperCase()}
            </Badge>
          </div>
        ) : null}

        <div className="mt-1">
          <h6 className="mb-50">Détails</h6>
          <div style={{ borderTop: "1px solid #ebe9f1", margin: "0.25rem 0 0.75rem" }} />
          <div className="users-page-view-table compact-rows">
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Nom :</div>
              <div className="text-truncate">{user.last_name || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Prénom :</div>
              <div className="text-truncate">{user.first_name || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Email :</div>
              <div className="text-break" style={{ overflowWrap: 'anywhere' }} title={user.email || ''}>{user.email || "—"}</div>
            </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Né(e) le :</div>
                <div className="text-truncate">
                  {user.birth_date
                    ? new Date(user.birth_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </div>            
              </div>
            <div className="d-flex user-info">
              <div className="user-info-title font-weight-bold">Tel :</div>
              <div className="text-truncate">{formatPhoneFR(user.mobile_number || user.office_number) || "—"}</div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-center mt-3 mb-0 pb-0">
          <Button color="primary" className="mr-1" onClick={onEdit}>Modifier</Button>
        </div>
      </CardBody>
    </Card>
  );
}
