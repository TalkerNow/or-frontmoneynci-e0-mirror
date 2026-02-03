import React from "react";
import { Edit, User } from "react-feather";

const ContactSection = ({ userDetails, history }) => {
  return (
    <div className="mb-2">
      <div className="d-flex align-items-center justify-content-between mb-50">
        <h6
          className="mb-0 d-flex align-items-center"
          style={{ fontSize: "0.85rem", fontWeight: 700 }}
        >
          <User size={14} className="mr-50" />
          Contact
        </h6>
        <a
          href={`/app/user/edit/${userDetails.id}/2`}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.button === 1) {
              return;
            }
            e.preventDefault();
            history.push(`/app/user/edit/${userDetails.id}/2`);
          }}
          title="Voir fiche client"
          className="btn btn-sm btn-outline-primary d-flex align-items-center"
          style={{ textDecoration: "none" }}
        >
          <Edit size={14} className="mr-25" />
          Fiche client
        </a>
      </div>
      <div style={{ fontSize: "0.85rem" }}>
        <div className="mb-50">
          <strong>Email :</strong>{" "}
          <a href={`mailto:${userDetails.email}`}>{userDetails.email}</a>
        </div>
        {userDetails.mobile_number && (
          <div className="mb-50">
            <strong>Téléphone:</strong>{" "}
            <a href={`tel:${userDetails.mobile_number}`}>
              {userDetails.mobile_number}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactSection;
