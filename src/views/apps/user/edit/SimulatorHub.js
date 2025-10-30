import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Nav, NavItem, NavLink, Card, CardBody, TabContent, TabPane, FormGroup, Collapse } from 'reactstrap'
import classnames from 'classnames'
import ButtonRadioSwitch from '../../../../components/reactstrap/buttons/ButtonRadioSwitch'

// Mock placeholders for "Bilan retraite du client" — replace later with real business values or API
const DEFAULT_POINTS = {
  acquis: 12400,
  requisTauxPlein: 18000,
  futursParAn: 1200
}

export default function SimulatorHub({ id, userFullName, alignOffset = 0 }) {
  const [subTab, setSubTab] = useState('carriere')
  const [regimeTab, setRegimeTab] = useState('base')
  const [carriereLongue, setCarriereLongue] = useState(false)
  const [chomage, setChomage] = useState(false)
  const [sans, setSans] = useState(true) // default to true
  const [salaireDefaut, setSalaireDefaut] = useState(false)
  // Ajout: ligne "Salaire par défaut" (même comportement que les lignes Non)
  const [salaireDefautRow, setSalaireDefautRow] = useState({ id: 'def', value: '', fixed: false })
  // Ajout: lignes dynamiques "Salaire jusqu’au départ"
  const [salaireJusquaDepartRows, setSalaireJusquaDepartRows] = useState([{ id: 1, value: '', fixed: false }])
  const [retraiteProgressive, setRetraiteProgressive] = useState(false)
  const [innerOffset, setInnerOffset] = useState(0)
  const [visible, setVisible] = useState(false)
  const [innerVisible, setInnerVisible] = useState(false)
  const subNavRef = useRef(null)
  const innerNavRef = useRef(null)
  // États d'ouverture des blocs "Régimes de retraite" (fermés par défaut)
  const [openBase, setOpenBase] = useState(false)
  const [openArrco, setOpenArrco] = useState(false)
  const [openIrcantec, setOpenIrcantec] = useState(false)

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

  // HYDRATE: load persisted amounts on mount
  useEffect(() => {
    try {
      const storedDef = localStorage.getItem('hypotheses_salaire_defaut_row')
      if (storedDef) {
        const parsed = JSON.parse(storedDef)
        if (parsed && typeof parsed === 'object' && typeof parsed.value === 'string') {
          setSalaireDefautRow(parsed)
        }
      }
      const storedRows = localStorage.getItem('hypotheses_salaire_rows')
      if (storedRows) {
        const parsed = JSON.parse(storedRows)
        if (Array.isArray(parsed) && parsed.length) {
          setSalaireJusquaDepartRows(parsed)
        }
      }
    } catch (e) { /* noop */ }
  }, [])

  // PERSIST: save on change
  useEffect(() => {
    try {
      localStorage.setItem('hypotheses_salaire_defaut_row', JSON.stringify(salaireDefautRow))
    } catch (e) { /* noop */ }
  }, [salaireDefautRow])

  useEffect(() => {
    try {
      localStorage.setItem('hypotheses_salaire_rows', JSON.stringify(salaireJusquaDepartRows))
    } catch (e) { /* noop */ }
  }, [salaireJusquaDepartRows])

  // Sanitize input to digits and a single decimal separator (comma or dot)
  const sanitizeSalaryInput = (val) => {
    if (!val) return ''
    // remove everything except digits, comma, dot (no-useless-escape removed)
    const s = String(val).replace(/[^0-9,.]/g, '')
    // keep only the first separator (comma or dot), drop the rest
    let seenSep = false
    let out = ''
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      if (ch === ',' || ch === '.') {
        if (seenSep) continue
        seenSep = true
      }
      out += ch
    }
    return out
  }

  const isAllowedKey = (e) => {
    const allowedControlKeys = [
      'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'
    ]
    if (allowedControlKeys.includes(e.key)) return true
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return true
    if (e.key === ',' || e.key === '.') return true
    // digits
    return /^[0-9]$/.test(e.key)
  }

  // Helpers for Bilan "Âge de départ à la retraite"
  const [selectedDob, setSelectedDob] = useState('')
  const [selectedAge, setSelectedAge] = useState('') // âge actuel affiché/éditable

  // If a DOB is available somewhere (e.g., localStorage or window.user), use it
  const tryGetBirthDate = useCallback(() => {
    try {
      const ls = localStorage.getItem('user_birth_date')
      const raw = ls || (window && window.user && window.user.birthDate) || null
      if (!raw) return null
      const d = new Date(raw)
      return isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  }, [])

  const diffYears = useCallback((dob, ref = new Date()) => {
    let age = ref.getFullYear() - dob.getFullYear()
    const m = ref.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--
    return age
  }, [])

  // Init from stored DOB and compute current age
  useEffect(() => {
    const dob = tryGetBirthDate()
    if (dob) {
      setSelectedDob(dob.toISOString().slice(0, 10))
      setSelectedAge(diffYears(dob))
    }
  }, [tryGetBirthDate, diffYears])

  // Handlers for inputs
  const handleDobInputChange = (e) => {
    const v = e.target.value
    setSelectedDob(v)
    try { if (v) localStorage.setItem('user_birth_date', v) } catch {}
    if (v) {
      const d = new Date(v)
      if (!isNaN(d.getTime())) setSelectedAge(diffYears(d))
    }
  }

  // Reform-aware computations
  const computeLegalAgeFromDob = useCallback((dob) => {
    // Returns { years, months } for legal age
    if (!dob || isNaN(dob.getTime())) return { years: 62, months: 0 }
    const y = dob.getFullYear()
    const cutoff = new Date(1961, 8, 1) // 1 Sep 1961
    if (dob < cutoff) return { years: 62, months: 0 }
    if (y === 1961) return { years: 62, months: 3 }
    if (y === 1962) return { years: 62, months: 6 }
    if (y === 1963) return { years: 62, months: 9 }
    if (y === 1964) return { years: 63, months: 0 }
    if (y === 1965) return { years: 63, months: 3 }
    if (y === 1966) return { years: 63, months: 6 }
    if (y === 1967) return { years: 63, months: 9 }
    // 1968 and later
    return { years: 64, months: 0 }
  }, [])

  const addYearsMonths = useCallback((dob, years = 0, months = 0) => {
    if (!dob || isNaN(dob.getTime())) return null
    const baseYear = dob.getFullYear() + years
    const baseMonth = dob.getMonth() + months
    // start at day 1 to avoid overflow then clamp day to month length
    const target = new Date(baseYear, baseMonth, 1)
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    target.setDate(Math.min(dob.getDate(), lastDay))
    return target
  }, [])

  const fmtAge = useCallback((y, m) => {
    if (y == null) return '-'
    return m && m > 0 ? `${y} ans ${m} mois` : `${y} ans`
  }, [])

  const fmtDateFR = useCallback((d) => {
    if (!d || isNaN(d.getTime())) return '-'
    try { return d.toLocaleDateString('fr-FR') } catch {
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    }
  }, [])

  return (
    <div>
      {/* Responsive layout helpers for the Hypothèses section + bilan table */}
      <style>{`
        .hypo-grid { display: flex; flex-direction: column; gap: 12px; }
        .hypo-row { display: flex; align-items: center; gap: 12px; }
        /* Unify label width so all switches are aligned */
        .hypo-label { flex: 0 0 280px; max-width: 280px; font-weight: 500; color: var(--bs-body-color, #4b4b4b); line-height: 1.3; }
        .hypo-label.nowrap { white-space: nowrap; }
        .hypo-ctrl { flex: 1 1 auto; min-width: 180px; }
        .hypo-panel { background: #f8f8f8; border: 1px solid #e9e9e9; border-radius: 8px; padding: 8px 10px; width: 100%; max-width: 640px; }
        .hypo-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: nowrap; }
        .hypo-panel-header > span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hypo-panel-header > button { flex: 0 0 auto; align-self: center !important; }
        .hypo-salary-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .hypo-salary-label { margin-right: 12px; min-width: 90px; color: var(--bs-body-color, #4b4b4b); font-weight: 600; font-size: 0.95rem; }
        .hypo-salary-inputwrap { position: relative; width: 160px; max-width: 100%; }

        /* Variables + table skin (same as your CNAV snippet) */
        :root { --border:#ddd; --bg:#fff; --alt:#f7f7fb; --accent:#7367f0; --head: var(--accent); }
        .regime-table { width:100%; border-collapse:collapse; font-size:13px; background: var(--bg); }
        .regime-table thead th { background-color: var(--head); color:#fff; border:1px solid var(--border); padding:10px; text-align:center; }
        .regime-table td { border:1px solid var(--border); padding:8px; vertical-align: middle; text-align:center; }
        .regime-table tbody tr:nth-child(even) { background-color: var(--alt); }

        /* Keep wrapper for border/shadow */
        .bilan-wrap { border: 1px solid #e9e9e9; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(16,24,40,.04); background: #fff; }

        /* Optional: tighten table padding inside the wrap */
        .bilan-wrap .table th, .bilan-wrap .table td { vertical-align: middle; }
        .bilan-wrap .table thead th { background: #fafafa; font-weight: 600; }

        /* New: bigger helper text and inputs */
        .bilan-controls { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
        .bilan-help { font-size: 1.05rem; font-weight: 600; color: var(--bs-body-color, #4b4b4b); }
        .bilan-field { min-width: 180px; }
        .bilan-field label.form-label { font-size: 0.95rem; font-weight: 600; margin-bottom: 6px; color: var(--bs-body-color, #4b4b4b); }
        .bilan-input { font-size: 1rem; line-height: 1.25; height: 44px; padding: 10px 12px; }
        /* New: read-only age display styled like an input */
        .bilan-age-display {
          font-size: 1rem;
          font-weight: 700;
          color: #2f2f39;
          padding: 10px 12px;
          min-height: 44px;
          border: 1px solid #e9e9e9;
          border-radius: 6px;
          background: #f7f7fb;
        }
        /* New: compact size for DOB and age */
        .bilan-input.sm { height: 36px; padding: 6px 10px; font-size: 0.9rem; width: 180px; }
        .bilan-age-display.sm { min-height: 36px; padding: 6px 10px; font-size: 0.9rem; width: 180px; }

        /* Summary (Bilan retraite du client) */
        .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .summary-card {
          border: 1px solid #e9e9e9; border-radius: 12px; background: #fff;
          box-shadow: 0 6px 20px rgba(16,24,40,.04); padding: 14px 16px;
        }
        .summary-title { margin: 0 0 6px; font-weight: 600; color: #4b4b57; font-size: 0.95rem; }
        .summary-value { font-size: 1.8rem; font-weight: 800; color: #3e3e45; line-height: 1.1; }
        .summary-desc { margin-top: 4px; color: #6e6b7b; font-size: 0.92rem; }
        .accent { color: var(--bs-primary, #7367F0); }
        .ok { color: #28a745; font-weight: 700; }
        .warn { color: #dc3545; font-weight: 700; }
        @media (max-width: 576px) { .summary-grid { grid-template-columns: 1fr; } }

        @media (max-width: 768px) {
          .hypo-label { flex: 0 0 240px; max-width: 240px; }
        }
        @media (max-width: 576px) {
          .hypo-row { flex-direction: column; align-items: flex-start; gap: 6px; }
          .hypo-label { flex: none; width: auto; max-width: none; }
          .hypo-label.nowrap { white-space: normal; }
          .hypo-ctrl { width: 100%; }
          .hypo-panel { max-width: 100%; }
          .hypo-panel-header { flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: nowrap; }
          .hypo-salary-row { flex-direction: column; align-items: stretch; }
          .hypo-salary-inputwrap { width: 100%; }
        }
      `}</style>

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
          <NavLink className={classnames({ active: subTab === 'rachat' })} onClick={() => setSubTab('rachat')}>
            Rachat de trimestres
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
                <span
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRegimeTab('base'); setOpenBase(v => !v) }}
                  aria-label='Basculer le tableau Régime de base'
                  style={{ marginLeft: 6, display: 'inline-block', transition: 'transform 200ms', transform: openBase ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </span>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: regimeTab === 'arrco' })} onClick={() => setRegimeTab('arrco')}>
                ARRCO AGIRC
                <span
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRegimeTab('arrco'); setOpenArrco(v => !v) }}
                  aria-label='Basculer le tableau ARRCO AGIRC'
                  style={{ marginLeft: 6, display: 'inline-block', transition: 'transform 200ms', transform: openArrco ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </span>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={classnames({ active: regimeTab === 'ircantec' })} onClick={() => setRegimeTab('ircantec')}>
                IRCANTEC
                <span
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRegimeTab('ircantec'); setOpenIrcantec(v => !v) }}
                  aria-label='Basculer le tableau IRCANTEC'
                  style={{ marginLeft: 6, display: 'inline-block', transition: 'transform 200ms', transform: openIrcantec ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </span>
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
              {/* Retrait du déclencheur: on garde uniquement le Collapse */}
              <Collapse isOpen={openBase}>
                <Card className='mb-1'>
                  <CardBody>
                    <iframe
                      title='cnav-simulator'
                      src={`${process.env.PUBLIC_URL || ''}/cnav-simulator.html`}
                      style={{ width: '100%', height: '1800px', border: '0', borderRadius: '8px', background: 'transparent' }}
                    />
                  </CardBody>
                </Card>
              </Collapse>
            </TabPane>

            <TabPane tabId='arrco'>
              {/* Retrait du déclencheur */}
              <Collapse isOpen={openArrco}>
                <Card className='mb-1'>
                  <CardBody>
                    <iframe
                      title='arrco-agirc-simulator'
                      src={`${process.env.PUBLIC_URL || ''}/arrco-simulator.html`}
                      style={{ width: '100%', height: '1150px', border: '0', borderRadius: '8px', background: 'transparent' }}
                    />
                  </CardBody>
                </Card>
              </Collapse>
            </TabPane>

            <TabPane tabId='ircantec'>
              {/* Retrait du déclencheur */}
              <Collapse isOpen={openIrcantec}>
                <Card className='mb-1'>
                  <CardBody>
                    <iframe
                      title='ircantec-simulator'
                      src={`${process.env.PUBLIC_URL || ''}/ircantec-simulator.html`}
                      style={{ width: '100%', height: '1150px', border: '0', borderRadius: '8px', background: 'transparent' }}
                    />
                  </CardBody>
                </Card>
              </Collapse>
            </TabPane>

            <TabPane tabId='rci'>
              <Card className='mb-1'><CardBody><p className='mb-0 text-muted'>Paramètres RCI.</p></CardBody></Card>
            </TabPane>
            <TabPane tabId='per'>
              <Card className='mb-1'><CardBody><p className='mb-0 text-muted'>Paramètres PER.</p></CardBody></Card>
            </TabPane>
          </TabContent>
        </TabPane>

        <TabPane tabId='rachat'>
          <Card className='mb-1'>
            <CardBody>
              <p className='mb-0 text-muted'>Rachat de trimestres — module à compléter.</p>
            </CardBody>
          </Card>
        </TabPane>

        <TabPane tabId='hypotheses'>
          <Card className='mb-1'>
            <CardBody>
              <FormGroup tag='fieldset' style={{ fontSize: '1rem' }}>
                <legend className='h6'>Hypothèses de fin de carrière</legend>

                <div className='hypo-grid'>
                  {/* Sans */}
                  <div className='hypo-row'>
                    <span className='hypo-label'>Sans</span>
                    <div className='hypo-ctrl'>
                      <ButtonRadioSwitch
                        noLabel
                        checked={sans}
                        onChange={(e) => setSans(e.target.checked)}
                      />
                    </div>
                  </div>

                  {/* Salaire par défaut jusqu'au départ (même comportement que les lignes Non) */}
                  <div className='hypo-row'>
                    <span className='hypo-label nowrap'>Salaire à projeter complet</span>
                    <div className='hypo-ctrl'>
                      <ButtonRadioSwitch
                        noLabel
                        checked={salaireDefaut}
                        onChange={(e) => setSalaireDefaut(e.target.checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Panel animé pour le cas Oui: saisir le salaire par défaut */}
                <Collapse isOpen={salaireDefaut}>
                  <div
                    className='hypo-panel mb-50'
                    style={{ marginTop: 12, maxWidth: 420 }} // align with the Non panel
                  >
                    <div className='hypo-salary-row' style={{ marginBottom: 0 }}>
                      <span className='hypo-salary-label'>Salaire par défaut</span>
                      <div className='hypo-salary-inputwrap'>
                        <span
                          aria-hidden='true'
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6e6b7b', pointerEvents: 'none', fontWeight: 600 }}
                        >€</span>

                        {salaireDefautRow.fixed ? (
                          <input
                            type='text'
                            readOnly
                            className='form-control'
                            value={salaireDefautRow.value}
                            onClick={() => {
                              setSalaireDefautRow(prev => ({ ...prev, fixed: false }))
                              setTimeout(() => {
                                const el = document.getElementById('salaire-defaut-input')
                                if (el) { el.focus(); const len = el.value.length; el.setSelectionRange(len, len) }
                              }, 0)
                            }}
                            title='Cliquez pour modifier'
                            style={{ paddingRight: 26, textAlign: 'right', borderRadius: 6, background: '#fff' }}
                          />
                        ) : (
                          <input
                            id='salaire-defaut-input'
                            type='text'
                            inputMode='decimal'
                            pattern='[0-9]*'
                            className='form-control'
                            value={salaireDefautRow.value}
                            onKeyDown={(e) => {
                              if (!isAllowedKey(e)) e.preventDefault()
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const raw = (salaireDefautRow.value || '').toString().replace(/\s/g, '').replace(',', '.')
                                const num = parseFloat(raw)
                                const formatted = isNaN(num)
                                  ? salaireDefautRow.value
                                  : new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
                                setSalaireDefautRow(prev => ({ ...prev, value: formatted, fixed: true }))
                                e.currentTarget.blur()
                              }
                            }}
                            onChange={(e) => {
                              const val = sanitizeSalaryInput(e.target.value)
                              setSalaireDefautRow(prev => ({ ...prev, value: val }))
                            }}
                            placeholder='0,00'
                            style={{ paddingRight: 26, textAlign: 'right', borderRadius: 6, background: '#fff' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </Collapse>

                {/* Zone dynamique "Salaire(s) jusqu’au départ" quand Non */}
                <Collapse isOpen={!salaireDefaut}>
                  <div
                    className='hypo-panel mb-50'
                    style={{ marginTop: 12, maxWidth: 420 }} // réduit la largeur max du panel
                  >
                    <div className='hypo-panel-header mb-1'>
                      <span className='text-body' style={{ fontWeight: 600 }}>Salaire(s) jusqu’au départ</span>
                      <button
                        type='button'
                        onClick={() => setSalaireJusquaDepartRows(prev => [...prev, { id: Date.now(), value: '', fixed: false }])}
                        aria-label='Ajouter une ligne Salaire jusqu’au départ'
                        style={{
                          border: '1px solid var(--bs-primary, #7367F0)',
                          color: 'var(--bs-primary, #7367F0)',
                          background: '#fff',
                          borderRadius: 20,
                          padding: '2px 8px',
                          lineHeight: 1.2,
                          cursor: 'pointer',
                          fontWeight: 600,
                          // keep small on mobile
                          alignSelf: 'flex-start',
                          width: 'auto',
                          display: 'inline-flex'
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div>
                      {salaireJusquaDepartRows.map((row, idx) => (
                        <div key={row.id} className='hypo-salary-row' style={{ marginBottom: idx === salaireJusquaDepartRows.length - 1 ? 0 : 6 }}>
                          <span className='hypo-salary-label'>{`Salaire ${idx + 1}`}</span>

                          <div className='hypo-salary-inputwrap'>
                            <span
                              aria-hidden='true'
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6e6b7b', pointerEvents: 'none', fontWeight: 600 }}
                            >€</span>

                            {row.fixed ? (
                              <input
                                type='text'
                                readOnly
                                className='form-control'
                                value={row.value}
                                onClick={() => {
                                  setSalaireJusquaDepartRows(prev => prev.map(r => r.id === row.id ? { ...r, fixed: false } : r))
                                  setTimeout(() => {
                                    const el = document.getElementById(`salaire-input-${row.id}`)
                                    if (el) { el.focus(); const len = el.value.length; el.setSelectionRange(len, len) }
                                  }, 0)
                                }}
                                title='Cliquez pour modifier'
                                style={{ paddingRight: 26, textAlign: 'right', borderRadius: 6, background: '#fff' }}
                              />
                            ) : (
                              <input
                                id={`salaire-input-${row.id}`}
                                type='text'
                                inputMode='decimal'
                                pattern='[0-9]*'
                                className='form-control'
                                value={row.value}
                                onKeyDown={(e) => {
                                  if (!isAllowedKey(e)) e.preventDefault()
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const raw = (row.value || '').toString().replace(/\s/g, '').replace(',', '.')
                                    const num = parseFloat(raw)
                                    const formatted = isNaN(num)
                                      ? row.value
                                      : new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
                                    setSalaireJusquaDepartRows(prev => prev.map(r => r.id === row.id ? { ...r, value: formatted, fixed: true } : r))
                                    e.currentTarget.blur()
                                  }
                                }}
                                onChange={(e) => {
                                  const val = sanitizeSalaryInput(e.target.value)
                                  setSalaireJusquaDepartRows(prev => prev.map(r => r.id === row.id ? { ...r, value: val } : r))
                                }}
                                placeholder='0,00'
                                style={{ paddingRight: 26, textAlign: 'right', borderRadius: 6, background: '#fff' }}
                              />
                            )}
                          </div>

                          {/* Bouton suppression (poubelle) — masqué pour Salaire 1 */}
                          {idx > 0 && (
                            <button
                              type='button'
                              onClick={() => setSalaireJusquaDepartRows(prev => prev.filter(r => r.id !== row.id))}
                              aria-label='Supprimer cette ligne'
                              title='Supprimer'
                              style={{ marginLeft: 8, background: '#fff', border: '1px solid #e9e9e9', borderRadius: 6, padding: 6, lineHeight: 0, cursor: 'pointer', color: '#dc3545' }}
                            >
                              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                <polyline points='3 6 5 6 21 6'></polyline>
                                <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'></path>
                                <path d='M10 11v6'></path>
                                <path d='M14 11v6'></path>
                                <path d='M9 6V4h6v2'></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Collapse>

                {/* Autres switches */}
                <div className='hypo-grid'>
                  <div className='hypo-row'>
                    <span className='hypo-label'>Chômage</span>
                    <div className='hypo-ctrl'>
                      <ButtonRadioSwitch noLabel checked={chomage} onChange={(e) => setChomage(e.target.checked)} />
                    </div>
                  </div>

                  <div className='hypo-row'>
                    <span className='hypo-label'>Carrière longue</span>
                    <div className='hypo-ctrl'>
                      <ButtonRadioSwitch noLabel checked={carriereLongue} onChange={(e) => setCarriereLongue(e.target.checked)} />
                    </div>
                  </div>

                  <div className='hypo-row' style={{ marginBottom: 0 }}>
                    <span className='hypo-label'>Retraite progressive</span>
                    <div className='hypo-ctrl'>
                      <ButtonRadioSwitch noLabel checked={retraiteProgressive} onChange={(e) => setRetraiteProgressive(e.target.checked)} />
                    </div>
                  </div>
                </div>
              </FormGroup>
            </CardBody>
          </Card>
        </TabPane>

        <TabPane tabId='bilan'>
          <Card className='mb-1'>
            <CardBody>
              <h6 className='mb-1'>Âge et date de départ à la retraite</h6>

              <div className='mb-50 bilan-controls'>
                <span className='bilan-help'>
                  Veuillez sélectionner votre date de naissance. L’âge est calculé automatiquement.
                </span>

                {/* Date de naissance (champ natif restauré) */}
                <div className='bilan-field'>
                  <label htmlFor='bilan-dob' className='form-label'>Date de naissance</label>
                  <input
                    id='bilan-dob'
                    type='date'
                    className='form-control bilan-input sm'
                    value={selectedDob}
                    onChange={handleDobInputChange}
                  />
                </div>

                {/* Âge actuel (affichage) */}
                <div className='bilan-field'>
                  <label className='form-label'>Âge actuel</label>
                  <div className='bilan-age-display sm' aria-live='polite'>
                    {selectedAge !== '' ? `${selectedAge} ans` : '—'}
                  </div>
                </div>
              </div>

              {(() => {
                const dob = selectedDob ? new Date(selectedDob) : tryGetBirthDate()
                const yearOfBirth = dob ? dob.getFullYear() : '-'
                const fullBirthDate = dob ? fmtDateFR(dob) : '-'

                // Legal age by generation (2023 reform)
                const { years: legalY, months: legalM } = computeLegalAgeFromDob(dob)
                const earliestD = addYearsMonths(dob, legalY, legalM)
                const earliestDate = dob ? fmtDateFR(earliestD) : '-'
                const ageLegalStr = dob ? fmtAge(legalY, legalM) : '-'

                // Automatic full-rate age unchanged: 67 years
                const ageTauxPleinAuto = 67
                const tauxPleinDate = dob ? fmtDateFR(addYearsMonths(dob, 67, 0)) : '-'

                return (
                  <div className='bilan-table-wrapper'>
                    <div className='bilan-wrap'>
                      <div className='table-responsive'>
                        <table className='regime-table'>
                          <thead>
                            <tr>
                              <th>Année de naissance</th>
                              <th>Date de naissance complète</th>
                              <th>Âge légal selon sa génération</th>
                              <th>Date de départ au plus tôt</th>
                              <th>Âge du taux plein automatique</th>
                              <th>Date de taux plein automatique</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{yearOfBirth}</td>
                              <td>{fullBirthDate}</td>
                              <td>{ageLegalStr}</td>
                              <td>{earliestDate}</td>
                              <td>{ageTauxPleinAuto} ans</td>
                              <td>{tauxPleinDate}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </CardBody>
          </Card>

          {/* Bilan retraite du client */}
          <Card className='mb-1'>
            <CardBody>
              <h6 className='mb-1'>Bilan retraite du client</h6>
              {(() => {
                // Source des valeurs:
                // - placeholders centralisés dans DEFAULT_POINTS (frontend uniquement, sans backend)
                // - à remplacer plus tard par les calculs métiers et/ou une API
                const pointsAcquis = DEFAULT_POINTS.acquis
                const pointsRequisTauxPlein = DEFAULT_POINTS.requisTauxPlein
                const pointsFutursParAn = DEFAULT_POINTS.futursParAn

                // Infer current age from input or DOB
                const dob = selectedDob ? new Date(selectedDob) : tryGetBirthDate()
                const inferredAge = selectedAge !== '' ? Number(selectedAge) : (dob ? diffYears(dob) : 0)
                const targetAge = 67
                const yearsRemaining = Math.max(0, targetAge - (Number.isFinite(inferredAge) ? inferredAge : 0))
                const pointsFutursEstimes = pointsFutursParAn * yearsRemaining
                const totalPoints = pointsAcquis + pointsFutursEstimes

                const deltaRestant = pointsRequisTauxPlein - pointsAcquis
                const restantClass = deltaRestant <= 0 ? 'ok' : 'warn'
                const currentYear = new Date().getFullYear()
                const prevYear = currentYear - 1
                const dateRef = `31/12/${prevYear}`
                const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n))

                return (
                  <>
                    <div className='summary-grid'>
                      <div className='summary-card'>
                        <p className='summary-title'>Total de points</p>
                        <div className='summary-value accent'>{fmt(totalPoints)}</div>
                        <div className='summary-desc'>Somme des points acquis + estimation des points futurs (jusqu’à {targetAge} ans).</div>
                      </div>

                      <div className='summary-card'>
                        <p className='summary-title'>Points acquis à date</p>
                        <div className='summary-value'>{fmt(pointsAcquis)}</div>
                        <div className='summary-desc'>Points enregistrés au {dateRef}.</div>
                      </div>

                      <div className='summary-card'>
                        <p className='summary-title'>Nombre de points à acquérir</p>
                        <div className={`summary-value ${restantClass}`}>{fmt(deltaRestant)}</div>
                        <div className='summary-desc'>Différence avec le total requis pour le taux plein ({fmt(pointsRequisTauxPlein)} pts).</div>
                      </div>

                      <div className='summary-card'>
                        <p className='summary-title'>Points futurs par an</p>
                        <div className='summary-value'>{fmt(pointsFutursParAn)}</div>
                        <div className='summary-desc'>Estimation annuelle selon l’hypothèse de fin de carrière et le scénario retenu.</div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </CardBody>
          </Card>
        </TabPane>
      </TabContent>
    </div>
  )
}
