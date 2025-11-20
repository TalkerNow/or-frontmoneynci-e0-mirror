import React from 'react'
import { AlertTriangle, Trash2 } from 'react-feather'
import wordIcon2025 from '../../../../../assets/img/icons/word-icon-2025.png'

const ActionButtons = ({ onOpen, onDelete, onReport, disableOpen }) => {
  if (!onOpen && !onDelete && !onReport) {
    return null
  }
  return (
    <div className='doc-card-actions'>
      {onOpen && (
        <button
          type='button'
          className='doc-word-btn'
          onClick={onOpen}
          disabled={disableOpen}
        >
          <span className='doc-word-icon'>
            <img src={wordIcon2025} alt='Word' width={20} height={20} />
          </span>
          <span>Ouvrir dans Word</span>
        </button>
      )}
      {onReport && (
        <button
        type='button'
        className='doc-warning-btn'
        onClick={onReport}
        aria-label='Signaler une erreur'
        title='Signaler une erreur'
        >
          <AlertTriangle size={16} />
        </button>
      )}
      {onDelete && (
        <button
          type='button'
          className='doc-delete-btn'
          onClick={onDelete}
          aria-label='Supprimer le document'
          title='Supprimer le document'
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

export default ActionButtons
