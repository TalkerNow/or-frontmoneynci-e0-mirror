import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import {
  Nav,
  NavItem,
  NavLink,
  Card,
  CardBody,
  TabContent,
  TabPane,
  Button,
} from "reactstrap";
import classnames from "classnames";
import Contracts from "./Contracts";
import Documents from "./Documents";
import { ArrowLeft } from "react-feather";

const DocumentsHub = forwardRef(
  ({ id, name, parent_id, userFullName, initialSubTab }, ref) => {
    const [subTab, setSubTab] = useState(initialSubTab || "perso");
    const [folderId, setFolderId] = useState(null);
    const contractsRef = useRef(null);

    // Apply optional initialSubTab once (legacy Contrats deep-link / redirect)
    useEffect(() => {
      if (initialSubTab) {
        setSubTab(initialSubTab);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      resetView: () => {
        setFolderId(null);
      },
      fetchContracts: () => {
        if (contractsRef.current && contractsRef.current.fetchData) {
          contractsRef.current.fetchData();
        }
      },
    }));

    return (
      <div>
        <div className="mb-1 d-flex align-items-center">
          {folderId !== null && (subTab === "perso" || subTab === "cerfa") && (
            <Button
              color="primary"
              size="sm"
              className="mr-1 d-flex align-items-center justify-content-center"
              style={{ width: 34, height: 34, padding: 0, borderRadius: 12 }}
              onClick={() => setFolderId(null)}
            >
              <ArrowLeft size={16} />
            </Button>
          )}
          <Nav tabs className="border-0">
            <NavItem>
              <NavLink
                className={classnames({ active: subTab === "perso" })}
                onClick={() => setSubTab("perso")}
              >
                <span>Documents perso</span>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: subTab === "contrats" })}
                onClick={() => setSubTab("contrats")}
              >
                <span id="docs-label-contrats">Contrats</span>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: subTab === "cerfa" })}
                onClick={() => setSubTab("cerfa")}
              >
                <span>Cerfa</span>
              </NavLink>
            </NavItem>
            {/* <NavItem>
          <NavLink className={classnames({ active: subTab === 'courriers' })} onClick={() => setSubTab('courriers')}>
            <span>Courriers caisse</span>
          </NavLink>
        </NavItem> */}
          </Nav>
        </div>

        <TabContent activeTab={subTab}>
          <TabPane tabId="contrats">
            <div>
              <Card className="mb-1" style={{ borderRadius: 12 }}>
                <CardBody>
                  <Contracts
                    name={name || userFullName}
                    id={id}
                    parent_id={parent_id}
                    ref={contractsRef}
                  />
                </CardBody>
              </Card>
            </div>
          </TabPane>
          <TabPane tabId="perso">
            <div>
              <Card className="mb-1" style={{ borderRadius: 12 }}>
                <CardBody>
                  <Documents
                    name={name || userFullName}
                    id={id}
                    folderId={folderId}
                    setFolderId={setFolderId}
                  />
                </CardBody>
              </Card>
            </div>
          </TabPane>
          <TabPane tabId="cerfa">
            <div>
              <Card className="mb-1" style={{ borderRadius: 12 }}>
                <CardBody>
                  <p className="text-muted mb-0">
                    Liste des documents Cerfa à intégrer ici.
                  </p>
                </CardBody>
              </Card>
            </div>
          </TabPane>
          <TabPane tabId="courriers">
            <div>
              <Card className="mb-1" style={{ borderRadius: 12 }}>
                <CardBody>
                  <p className="text-muted mb-0">
                    Courriers caisse à intégrer ici.
                  </p>
                </CardBody>
              </Card>
            </div>
          </TabPane>
        </TabContent>
      </div>
    );
  },
);

export default DocumentsHub;
