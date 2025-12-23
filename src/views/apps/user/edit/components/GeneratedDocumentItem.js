import React, { useState, useEffect } from 'react'
import { FileText, Edit2 } from 'react-feather'
import { Input } from 'reactstrap'
import ActionButtons from './ActionButtons'

const formatDocDate = (iso) => {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

const GeneratedDocumentItem = ({ doc, onOpen, onDelete, onReport, onRename }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(doc?.name || "")

  useEffect(() => {
    setTempName(doc?.name || "")
  }, [doc?.name])

  if (!doc) return null

  const handleStartEdit = (e) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleSave = (e) => {
    e && e.stopPropagation()
    if (tempName.trim() && onRename) {
      onRename(doc.id, tempName.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = (e) => {
    e && e.stopPropagation()
    setIsEditing(false)
    setTempName(doc.name)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  return (
    <div className='career-doc-card notes-doc-card'>
      <div className='doc-card-left' style={{ flex: 1, overflow: 'hidden' }}>
        <div className='doc-card-icon' aria-hidden='true'>
          <FileText size={18} />
        </div>
        <div className='doc-card-text' style={{ width: '100%' }}>
          {isEditing ? (
            <div className='d-flex align-items-center mb-1'>
              <Input
                bsSize="sm"
                autoFocus
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave} // Optional: save on blur
                onClick={e => e.stopPropagation()}
                style={{ marginRight: '5px' }}
              />
              {/* Small controls if needed, but blur/enter is usually enough. keeping it simple */}
            </div>
          ) : (
            <div className='doc-title-text d-flex align-items-center' style={{ gap: '8px' }}>
              <span
                onClick={onOpen}
                style={{ cursor: doc.url ? 'pointer' : 'default', textDecoration: doc.url ? 'underline' : 'none' }}>
                {doc.name}
              </span>
              {onRename && (
                <Edit2
                  size={12}
                  className='text-muted cursor-pointer hover-primary'
                  onClick={handleStartEdit}
                  style={{ opacity: 0.7 }}
                />
              )}
            </div>
          )}

          <div className='doc-card-subtitle'>
            Document {doc.createdAt ? ` · ${formatDocDate(doc.createdAt)}` : ''}
          </div>
        </div>
      </div>
      <ActionButtons
        onOpen={onOpen}
        onDelete={onDelete}
        onReport={onReport}
        disableOpen={!doc.url}
      />
    </div>
  )
}

export default GeneratedDocumentItem
