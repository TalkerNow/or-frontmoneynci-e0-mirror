import React, { useState } from 'react'
import { Nav, NavItem, NavLink, Card, CardBody, TabContent, TabPane } from 'reactstrap'
import classnames from 'classnames'
import Contracts from './Contracts'
import Documents from './Documents'

export default function DocumentsHub({ id, name, parent_id, userFullName, alignOffset = 0 }) {
  const [subTab, setSubTab] = useState('perso')

  return (
    <div>
      <Nav tabs className="mb-1" style={{ marginLeft: Math.max(0, Number(alignOffset) || 0) }}>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'contrats' })} onClick={() => setSubTab('contrats')}>
            Contrats
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'perso' })} onClick={() => setSubTab('perso')}>
            Documents perso
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'cerfa' })} onClick={() => setSubTab('cerfa')}>
            Cerfa
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'courriers' })} onClick={() => setSubTab('courriers')}>
            Courriers caisse
          </NavLink>
        </NavItem>
      </Nav>

      <TabContent activeTab={subTab}>
        <TabPane tabId='contrats'>
          <Card className='mb-1'>
            <CardBody>
              <Contracts name={name || userFullName} id={id} parent_id={parent_id} />
            </CardBody>
          </Card>
        </TabPane>
        <TabPane tabId='perso'>
          <Card className='mb-1'>
            <CardBody>
              <Documents name={name || userFullName} id={id} />
            </CardBody>
          </Card>
        </TabPane>
        <TabPane tabId='cerfa'>
          <Card className='mb-1'>
            <CardBody>
              <p className='text-muted mb-0'>Liste des documents Cerfa à intégrer ici.</p>
            </CardBody>
          </Card>
        </TabPane>
        <TabPane tabId='courriers'>
          <Card className='mb-1'>
            <CardBody>
              <p className='text-muted mb-0'>Courriers caisse à intégrer ici.</p>
            </CardBody>
          </Card>
        </TabPane>
      </TabContent>
    </div>
  )
}
