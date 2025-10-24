import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Nav, NavItem, NavLink, Card, CardBody, TabContent, TabPane, FormGroup, Label, Input } from 'reactstrap'
import classnames from 'classnames'

export default function SimulatorHub({ id, userFullName, alignOffset = 0 }) {
  const [subTab, setSubTab] = useState('carriere')
  const [regimeTab, setRegimeTab] = useState('base')
  const [hypo, setHypo] = useState('sans')
  const [innerOffset, setInnerOffset] = useState(0)
  const [visible, setVisible] = useState(false)
  const [innerVisible, setInnerVisible] = useState(false)
  const subNavRef = useRef(null)
  const innerNavRef = useRef(null)

  const computeInnerOffset = useCallback(() => {
    try {
      if (subTab !== 'regimes') { setInnerOffset(0); return }
      const baseSpan = document.getElementById('regimes-label')
      const firstText = document.getElementById('regime-base-text')
      if (baseSpan && firstText) {
        const baseLeft = baseSpan.getBoundingClientRect().left
        const firstLeft = firstText.getBoundingClientRect().left
        const delta = baseLeft - firstLeft
        setInnerOffset(Math.round(delta))
      }
    } catch (e) { setInnerOffset(0) }
  }, [subTab])

  useEffect(() => { computeInnerOffset() }, [computeInnerOffset])
  // Animate outer sub-nav on alignment or section change
  useEffect(() => {
    setVisible(false)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [alignOffset, subTab])
  // Animate inner regimes sub-nav each time offset or tab changes
  useEffect(() => {
    if (subTab === 'regimes') {
      setInnerVisible(false)
      const raf = requestAnimationFrame(() => setInnerVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setInnerVisible(false)
    }
  }, [subTab, innerOffset, regimeTab])

  return (
    <div>
      <Nav
        tabs
        className="mb-1"
        style={{
          marginLeft: Math.max(0, Number(alignOffset) || 0),
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 140ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'margin-left, transform, opacity'
        }}
        ref={subNavRef}
      >
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
          <Nav
            tabs
            className='mb-1'
            style={{
              marginLeft: innerOffset,
              opacity: innerVisible ? 1 : 0,
              transform: innerVisible ? 'translateY(0)' : 'translateY(-6px)',
              transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 140ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'margin-left, transform, opacity'
            }}
            ref={innerNavRef}
          >
            <NavItem>
              <NavLink className={classnames({ active: regimeTab === 'base' })} onClick={() => setRegimeTab('base')}>
                <span id='regime-base-text'>Régime de base</span>
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
              <Card className='mb-1'>
                <CardBody>
                  <div className='mb-50 text-muted'>Simulateur CNAV (Régime de base)</div>
                  <iframe
                    title='cnav-simulator'
                    src={`${process.env.PUBLIC_URL || ''}/cnav-simulator.html`}
                    style={{ width: '100%', height: '1800px', border: '0', borderRadius: '8px', background: 'transparent' }}
                  />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='arrco'>
              <Card className='mb-1'>
                <CardBody>
                  <div className='mb-50 text-muted'>Simulateur ARRCO-AGIRC</div>
                  <iframe
                    title='arrco-agirc-simulator'
                    src={`${process.env.PUBLIC_URL || ''}/arrco-simulator.html`}
                    style={{ width: '100%', height: '1150px', border: '0', borderRadius: '8px', background: 'transparent' }}
                  />
                </CardBody>
              </Card>
            </TabPane>
            <TabPane tabId='ircantec'>
              <Card className='mb-1'>
                <CardBody>
                  <div className='mb-50 text-muted'>Simulateur IRCANTEC</div>
                  <iframe
                    title='ircantec-simulator'
                    src={`${process.env.PUBLIC_URL || ''}/ircantec-simulator.html`}
                    style={{ width: '100%', height: '1150px', border: '0', borderRadius: '8px', background: 'transparent' }}
                  />
                </CardBody>
              </Card>
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
                  <Label check className={classnames({ 'font-weight-bold': hypo === 'carriere_longue' })}>
                    <Input type='radio' name='hypo' checked={hypo==='carriere_longue'} onChange={() => setHypo('carriere_longue')} />
                    Carrière longue
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check className={classnames({ 'font-weight-bold': hypo === 'chomage' })}>
                    <Input type='radio' name='hypo' checked={hypo==='chomage'} onChange={() => setHypo('chomage')} />
                    Chômage
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check className={classnames({ 'font-weight-bold': hypo === 'retraite_progressive' })}>
                    <Input type='radio' name='hypo' checked={hypo==='retraite_progressive'} onChange={() => setHypo('retraite_progressive')} />
                    Retraite progressive
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check className={classnames({ 'font-weight-bold': hypo === 'sans' })}>
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
