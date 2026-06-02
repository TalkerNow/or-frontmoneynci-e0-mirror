import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Spinner } from 'reactstrap'
import { toast } from 'react-toastify'
import api from '../../../services/api'

async function fetchBareme() {
  const res = await api.get('/v1/departure-rules')
  return res.data
}
async function saveBareme(rules) {
  const res = await api.put('/v1/departure-rules', { rules })
  return res.data
}
async function fetchHistory() {
  const res = await api.get('/v1/departure-rules/history')
  return res.data
}
async function restoreSnapshot(id) {
  const res = await api.post(`/v1/departure-rules/restore/${id}`)
  return res.data
}
async function importPdfBareme(file) {
  const fd = new FormData()
  fd.append('pdf', file)
  // Content-Type à undefined : neutralise le défaut application/json de l'instance
  // pour que le navigateur pose multipart/form-data avec le bon boundary.
  // L'extraction IA est lente (~2-3 min) — pas de timeout (timeout: 0).
  const res = await api.post('/v1/departure-rules/import-pdf', fd, {
    headers: { 'Content-Type': undefined },
    timeout: 0,
  })
  return res.data
}

function ageLabelFull(months) {
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y} ans et ${m} mois` : `${y} ans`
}

function keyMaxLabel(keyMax) {
  if (keyMax == null) return '1969 et après'
  const year  = Math.floor(keyMax / 100)
  const month = keyMax % 100
  const M = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc']
  return `≤ ${M[month - 1]} ${year}`
}

const SECTION_COLOR = '#2D3436'
const FONT = "'Montserrat', Helvetica, Arial, sans-serif"

export default function BaremeRetraitePage() {
  const [rows, setRows]               = useState([])
  const [edits, setEdits]             = useState({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory]         = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [importing, setImporting]     = useState(false)
  const [proposal, setProposal]       = useState(null)
  const fileInputRef                  = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchBareme()
      setRows(data)
      setEdits({})
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const getVal     = (row, field) => edits[row.id]?.[field] !== undefined ? edits[row.id][field] : row[field]
  const isDirty    = id => !!edits[id]
  const hasChanges = Object.keys(edits).length > 0
  const dirtyCount = Object.keys(edits).length

  const handleAgeChange = (id, field, val) => {
    const parsed = parseInt(val, 10)
    if (isNaN(parsed) || parsed < 0) return
    setEdits(prev => {
      const current = prev[id] || {}
      const row     = rows.find(r => r.id === id)
      const years   = field === 'years'  ? parsed : Math.floor(getVal(row, 'age_months') / 12)
      const months  = field === 'months' ? parsed : getVal(row, 'age_months') % 12
      return { ...prev, [id]: { ...current, age_months: years * 12 + months } }
    })
  }

  const handleTrimChange = (id, val) => {
    const parsed = parseInt(val, 10)
    if (isNaN(parsed)) return
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), trim: parsed } }))
  }

  const handleSave = async () => {
    setConfirmOpen(false)
    setSaving(true)
    try {
      const rules = rows.map(r => ({
        id:         r.id,
        age_months: edits[r.id]?.age_months !== undefined ? edits[r.id].age_months : r.age_months,
        trim:       edits[r.id]?.trim       !== undefined ? edits[r.id].trim       : r.trim,
      }))
      await saveBareme(rules)
      toast.success('Barème sauvegardé')
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const openHistory = async () => {
    setShowHistory(true)
    setHistLoading(true)
    try   { setHistory(await fetchHistory()) }
    catch (e) { toast.error(e.message) }
    finally   { setHistLoading(false) }
  }

  const handleRestore = async (id) => {
    try {
      await restoreSnapshot(id)
      toast.success('Barème restauré')
      setShowHistory(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handlePickFile = () => fileInputRef.current && fileInputRef.current.click()

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = '' // reset pour pouvoir ré-uploader le même fichier
    if (!file) return
    setImporting(true)
    try {
      const data = await importPdfBareme(file)
      setProposal(data)
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Échec de l'import")
    } finally {
      setImporting(false)
    }
  }

  const applyProposal = () => {
    if (!proposal) return
    const next = {}
    proposal.proposed.forEach(p => {
      if (p.changed) next[p.id] = { age_months: p.proposed_age_months, trim: p.proposed_trim }
    })
    setEdits(next)
    setProposal(null)
    const n = Object.keys(next).length
    if (n === 0) {
      toast.info('Aucun changement détecté — le barème est déjà à jour.')
    } else {
      toast.info(`${n} ligne${n > 1 ? 's' : ''} chargée${n > 1 ? 's' : ''} — vérifiez le tableau puis cliquez sur Sauvegarder.`)
    }
  }

  const allTrims  = rows.map(r => r.trim)
  const trimFloor = allTrims.length ? Math.min(...allTrims) : 160
  const trimRange = (allTrims.length ? Math.max(...allTrims) : 172) - trimFloor || 1

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Spinner color="primary" size="sm" />
    </div>
  )

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .br-no-spin::-webkit-inner-spin-button,
        .br-no-spin::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .br-no-spin[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: SECTION_COLOR }}>Barème retraite</span>
          {hasChanges && (
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: '#E1705515', color: '#E17055', fontWeight: 700 }}>
              {dirtyCount} modification{dirtyCount > 1 ? 's' : ''} non sauvegardée{dirtyCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={handlePickFile}
            disabled={importing}
            title="Extraire le barème depuis une circulaire CNAV (PDF)"
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, border: '1px solid #0984E3', background: '#0984E315', color: '#0984E3', fontWeight: 600, cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.7 : 1 }}
          >
            {importing ? 'Extraction…' : '📄 Importer un PDF'}
          </button>
          <button
            onClick={openHistory}
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, border: '1px solid #ccc', background: '#fafafa', color: '#555', fontWeight: 600, cursor: 'pointer' }}
          >
            Historique
          </button>
          <button
            disabled={!hasChanges || saving}
            onClick={() => setConfirmOpen(true)}
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, border: 'none', background: hasChanges ? SECTION_COLOR : '#ccc', color: '#fff', fontWeight: 600, cursor: hasChanges ? 'pointer' : 'default', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div style={{ border: '1px solid #eee', borderRadius: 9, overflow: 'auto' }}>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '150px 1fr 180px',
          padding: '7px 14px', background: '#fafafa',
          borderBottom: '1px solid #eee', minWidth: 480,
        }}>
          {['Génération', 'Âge légal', 'Trimestres requis'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, idx) => {
          const dirty     = isDirty(row.id)
          const ageMonths = getVal(row, 'age_months')
          const trimVal   = getVal(row, 'trim')
          const trimPct   = Math.max(0, Math.min(100, ((trimVal - trimFloor) / trimRange) * 100))

          return (
            <div
              key={row.id}
              style={{
                display: 'grid', gridTemplateColumns: '150px 1fr 180px',
                padding: '5px 14px',
                borderBottom: idx < rows.length - 1 ? '1px solid #f5f5f5' : 'none',
                borderLeft: `3px solid ${dirty ? '#f59e0b' : 'transparent'}`,
                background: dirty ? '#fffbcc' : 'white',
                alignItems: 'center', minHeight: 36, minWidth: 480,
              }}
            >
              {/* Generation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, color: '#555', fontWeight: row.is_default ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {keyMaxLabel(row.key_max)}
                </span>
                {row.is_default && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#0984E3', background: '#0984E315', padding: '1px 5px', borderRadius: 3, alignSelf: 'flex-start' }}>
                    défaut
                  </span>
                )}
              </div>

              {/* Age inputs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <input
                  type="number"
                  className="br-no-spin"
                  value={Math.floor(ageMonths / 12)}
                  min={60} max={68}
                  onChange={e => handleAgeChange(row.id, 'years', e.target.value)}
                  style={{ width: 52, textAlign: 'center', fontSize: 13, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4 }}
                />
                <span style={{ fontSize: 11, color: '#888' }}>ans</span>
                <input
                  type="number"
                  className="br-no-spin"
                  value={ageMonths % 12}
                  min={0} max={11}
                  onChange={e => handleAgeChange(row.id, 'months', e.target.value)}
                  style={{ width: 40, textAlign: 'center', fontSize: 13, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4 }}
                />
                <span style={{ fontSize: 11, color: '#888' }}>mois</span>
                <span style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>
                  → {ageLabelFull(ageMonths)}
                </span>
              </div>

              {/* Trim input + bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="br-no-spin"
                  value={trimVal}
                  min={150} max={180}
                  onChange={e => handleTrimChange(row.id, e.target.value)}
                  style={{ width: 58, textAlign: 'center', fontSize: 13, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4 }}
                />
                <div style={{ flex: 1, height: 3, background: '#eee', borderRadius: 2 }}>
                  <div style={{
                    width: `${trimPct}%`, height: '100%', borderRadius: 2,
                    background: dirty ? '#f59e0b' : `${SECTION_COLOR}60`,
                    transition: 'width 0.2s',
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Confirm modal ──────────────────────────────────────── */}
      <Modal isOpen={confirmOpen} toggle={() => setConfirmOpen(false)} centered size="sm">
        <ModalHeader toggle={() => setConfirmOpen(false)}>
          Confirmer la sauvegarde
        </ModalHeader>
        <ModalBody>
          <strong>{dirtyCount} ligne{dirtyCount > 1 ? 's' : ''}</strong> modifiée{dirtyCount > 1 ? 's' : ''}.
          Les nouvelles valeurs s'appliquent immédiatement à tous les calculs.
        </ModalBody>
        <ModalFooter>
          <Button color="danger" onClick={() => setConfirmOpen(false)}>Annuler</Button>
          <Button color="primary" onClick={handleSave}>Confirmer</Button>
        </ModalFooter>
      </Modal>

      {/* ── Import proposal modal ──────────────────────────────── */}
      <Modal isOpen={!!proposal} toggle={() => setProposal(null)} size="lg">
        <ModalHeader toggle={() => setProposal(null)}>
          Proposition d'import {proposal?.source ? `— ${proposal.source}` : ''}
        </ModalHeader>
        <ModalBody>
          {proposal && (() => {
            const changedRows = proposal.proposed.filter(p => p.changed)
            return (
              <div>
                <div style={{ fontSize: 13, marginBottom: 10 }}>
                  Extraction <strong>métropole / régime général</strong> uniquement
                  (Saint-Pierre-et-Miquelon et Mayotte exclus).{' '}
                  <strong>{proposal.changed_count}</strong> ligne{proposal.changed_count > 1 ? 's' : ''} à modifier.
                </div>

                {proposal.warnings && proposal.warnings.length > 0 && (
                  <div style={{ fontSize: 12, color: '#9a6700', background: '#fff8e1', border: '1px solid #ffe08a', borderRadius: 6, padding: '8px 10px', marginBottom: 12 }}>
                    ⚠️ {proposal.warnings.length} génération{proposal.warnings.length > 1 ? 's' : ''} non trouvée{proposal.warnings.length > 1 ? 's' : ''} dans le PDF — valeur actuelle conservée :
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {proposal.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {changedRows.length === 0 ? (
                  <p className="text-muted text-center" style={{ margin: '12px 0' }}>
                    Aucun changement détecté — le barème correspond déjà au PDF.
                  </p>
                ) : (
                  <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px', padding: '6px 12px', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>
                      <div>Génération</div>
                      <div>Âge légal</div>
                      <div>Trimestres</div>
                    </div>
                    {changedRows.map(p => {
                      const ageChanged  = p.current_age_months !== p.proposed_age_months
                      const trimChanged = p.current_trim !== p.proposed_trim
                      return (
                        <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px', padding: '6px 12px', borderBottom: '1px solid #f5f5f5', fontSize: 12, alignItems: 'center' }}>
                          <div style={{ color: '#555' }}>{p.generation}</div>
                          <div>
                            {ageChanged ? (
                              <span>
                                <span style={{ color: '#bbb', textDecoration: 'line-through' }}>{ageLabelFull(p.current_age_months)}</span>
                                {' → '}
                                <span style={{ color: '#0984E3', fontWeight: 700 }}>{ageLabelFull(p.proposed_age_months)}</span>
                              </span>
                            ) : (
                              <span style={{ color: '#999' }}>{ageLabelFull(p.proposed_age_months)}</span>
                            )}
                          </div>
                          <div>
                            {trimChanged ? (
                              <span>
                                <span style={{ color: '#bbb', textDecoration: 'line-through' }}>{p.current_trim}</span>
                                {' → '}
                                <span style={{ color: '#0984E3', fontWeight: 700 }}>{p.proposed_trim}</span>
                              </span>
                            ) : (
                              <span style={{ color: '#999' }}>{p.proposed_trim}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {proposal.changed_count > 0 && (
                  <p style={{ fontSize: 11, color: '#888', marginTop: 12, marginBottom: 0 }}>
                    Les valeurs sont chargées dans le tableau pour relecture. Rien n'est enregistré
                    tant que vous n'avez pas cliqué sur <strong>Sauvegarder</strong>.
                  </p>
                )}
              </div>
            )
          })()}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setProposal(null)}>Annuler</Button>
          <Button
            color="primary"
            disabled={!proposal || proposal.changed_count === 0}
            onClick={applyProposal}
          >
            Charger dans le tableau
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── History modal ──────────────────────────────────────── */}
      <Modal isOpen={showHistory} toggle={() => setShowHistory(false)} size="lg">
        <ModalHeader toggle={() => setShowHistory(false)}>
          Historique des barèmes
        </ModalHeader>
        <ModalBody>
          {histLoading ? (
            <div className="text-center p-3"><Spinner color="primary" size="sm" /></div>
          ) : history.length === 0 ? (
            <p className="text-muted text-center">Aucun historique disponible.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                      {new Date(h.created_at).toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {h.saved_by || 'Système'} · {(h.preview || []).map((p, i) => (
                        <span key={i} style={{ fontFamily: 'monospace', marginRight: 8 }}>
                          {ageLabelFull(p.age_months)} / {p.trim} trim.
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button color="primary" size="sm" onClick={() => handleRestore(h.id)}>
                    Restaurer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  )
}
