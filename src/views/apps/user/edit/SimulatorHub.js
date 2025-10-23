import React, { useState, useEffect, useRef } from 'react'
import { Nav, NavItem, NavLink, Card, CardBody, TabContent, TabPane, FormGroup, Label, Input } from 'reactstrap'
import classnames from 'classnames'

export default function SimulatorHub({ id, userFullName, alignOffset = 0 }) {
  const [subTab, setSubTab] = useState('carriere')
  const [regimeTab, setRegimeTab] = useState('base')
  const [hypo, setHypo] = useState('sans')
  const [innerOffset, setInnerOffset] = useState(0)
  const subNavRef = useRef(null)
  const innerNavRef = useRef(null)

  const computeInnerOffset = () => {
    try {
      if (subTab !== 'regimes') { setInnerOffset(0); return }
      const baseSpan = document.getElementById('regimes-label')
      const innerNav = innerNavRef.current
      if (baseSpan && innerNav) {
        const firstLink = innerNav.querySelector('.nav-link')
        if (!firstLink) { setInnerOffset(0); return }
        const style = window.getComputedStyle(firstLink)
        const padLeft = parseFloat(style.paddingLeft || '0')
        const firstTextLeft = firstLink.getBoundingClientRect().left + padLeft
        const baseLeft = baseSpan.getBoundingClientRect().left
        const delta = baseLeft - firstTextLeft
        setInnerOffset(Math.round(delta))
      }
    } catch (e) { setInnerOffset(0) }
  }

  useEffect(() => { computeInnerOffset() }, [subTab])

  return (
    <div>
      <Nav tabs className="mb-1" style={{ marginLeft: Math.max(0, Number(alignOffset) || 0) }} ref={subNavRef}>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'carriere' })} onClick={() => setSubTab('carriere')}>
            Carrière
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink id='regimes-link' className={classnames({ active: subTab === 'regimes' })} onClick={() => setSubTab('regimes')}>
            <span id='regimes-label'>Régimes de retraite</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'hypotheses' })} onClick={() => setSubTab('hypotheses')}>
            Hypothèses fin de carrière
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'bilan' })} onClick={() => setSubTab('bilan')}>
            Bilan retraite
          </NavLink>
        </NavItem>
      </Nav>

      <TabContent activeTab={subTab}>
        <TabPane tabId='carriere'>
          <Card className='mb-1'>
            <CardBody>
              <p className='mb-0 text-muted'>Section Carrière — à compléter (emplois, périodes, etc.).</p>
            </CardBody>
          </Card>
        </TabPane>

        <TabPane tabId='regimes'>
          <Nav tabs className='mb-1' style={{ marginLeft: innerOffset }} ref={innerNavRef}>
            <NavItem>
              <NavLink className={classnames({ active: regimeTab === 'base' })} onClick={() => setRegimeTab('base')}>
                Régime de base
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: regimeTab === 'arrco' })} onClick={() => setRegimeTab('arrco')}>
                ARRCO AGIRC
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: regimeTab === 'ircantec' })} onClick={() => setRegimeTab('ircantec')}>
                IRCANTEC
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: regimeTab === 'rci' })} onClick={() => setRegimeTab('rci')}>
                RCI
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: regimeTab === 'per' })} onClick={() => setRegimeTab('per')}>
                PER
              </NavLink>
            </NavItem>
          </Nav>
          <TabContent activeTab={regimeTab}>
            <TabPane tabId='base'>
              <Card className='mb-1'><CardBody><p className='mb-0 text-muted'>Paramètres du Régime de base.</p></CardBody></Card>
            </TabPane>
            <TabPane tabId='arrco'>
              <Card className='mb-1'><CardBody><p className='mb-0 text-muted'>Paramètres ARRCO-AGIRC.</p></CardBody></Card>
            </TabPane>
            <TabPane tabId='ircantec'>
              <Card className='mb-1'><CardBody><p className='mb-0 text-muted'>Paramètres IRCANTEC.</p></CardBody></Card>
            </TabPane>
            <TabPane tabId='rci'>
              <Card className='mb-1'><CardBody><p className='mb-0 text-muted'>Paramètres RCI.</p></CardBody></Card>
            </TabPane>
            <TabPane tabId='per'>
              <Card className='mb-1'><CardBody><p className='mb-0 text-muted'>Paramètres PER.</p></CardBody></Card>
            </TabPane>
          </TabContent>
        </TabPane>

        <TabPane tabId='hypotheses'>
          <Card className='mb-1'>
            <CardBody>
              <FormGroup tag='fieldset'>
                <legend className='h6'>Hypothèses de fin de carrière</legend>
                <FormGroup check>
                  <Label check>
                    <Input type='radio' name='hypo' checked={hypo==='carriere_longue'} onChange={() => setHypo('carriere_longue')} />
                    Carrière longue
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check>
                    <Input type='radio' name='hypo' checked={hypo==='chomage'} onChange={() => setHypo('chomage')} />
                    Chômage
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check>
                    <Input type='radio' name='hypo' checked={hypo==='retraite_progressive'} onChange={() => setHypo('retraite_progressive')} />
                    Retraite progressive
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check>
                    <Input type='radio' name='hypo' checked={hypo==='sans'} onChange={() => setHypo('sans')} />
                    Sans
                  </Label>
                </FormGroup>
              </FormGroup>
            </CardBody>
          </Card>
        </TabPane>

        <TabPane tabId='bilan'>
          <Card className='mb-1'>
            <CardBody>
              <p className='mb-0 text-muted'>Bilan retraite — synthèse à générer ici.</p>
            </CardBody>
          </Card>
        </TabPane>
      </TabContent>
    </div>
  )
}
