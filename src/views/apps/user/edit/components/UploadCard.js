import React from 'react'
import Dropzone from 'react-dropzone'
import classnames from 'classnames'
import { DownloadCloud } from 'react-feather'
import '../../../../../assets/scss/plugins/extensions/dropzone.scss'

const UploadCard = ({
  title,
  description,
  onDrop,
  isUploading = false
}) => {
  return (
    <div className='notes-upload-card'>
      {title ? <h6 className='notes-card-title mb-1'>{title}</h6> : null}
      <Dropzone disabled={isUploading} onDrop={onDrop}>
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps({
              className: classnames('dropzone notes-dropzone', {
                'is-dragging': isDragActive,
                'is-disabled': isUploading
              })
            })}
          >
            <input {...getInputProps()} />
            <DownloadCloud size={42} className='notes-dropzone-icon text-primary mb-1' />
            {isDragActive ? (
              <>
                <p className='mb-1 notes-dropzone-drop-title'>Déposez pour importer</p>
                <small className='text-primary'>Relâchez le fichier ici</small>
              </>
            ) : (
              <>
                <p className='mb-1'>{description}</p>
                <small className='text-muted'>
                  {isUploading ? 'Import en cours…' : 'Glissez et déposez un fichier ou cliquez pour parcourir'}
                </small>
              </>
            )}
          </div>
        )}
      </Dropzone>
    </div>
  )
}

export default UploadCard
