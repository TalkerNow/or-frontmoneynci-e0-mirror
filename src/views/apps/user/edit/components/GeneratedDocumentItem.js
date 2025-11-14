import React from 'react'
import { FileText } from 'react-feather'
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

const GeneratedDocumentItem = ({ doc, onOpen, onDelete, onReport }) => {
  if (!doc) return null

  return (
    <div className='career-doc-card notes-doc-card'>
      <div className='doc-card-left'>
        <div className='doc-card-icon' aria-hidden='true'>
          <FileText size={18} />
        </div>
        <div className='doc-card-text'>
          <div className='doc-title-text'>{doc.name}</div>
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
