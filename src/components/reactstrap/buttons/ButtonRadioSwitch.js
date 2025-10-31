import React from 'react'

export default function ButtonRadioSwitch({ label, checked, value, onChange, activeColor, noLabel, className, style }) {
  const isChecked = typeof checked === 'boolean' ? checked : Boolean(value)
  const onColor = activeColor || 'var(--bs-primary, var(--primary, #7367F0))'

  const trackStyle = {
    width: 42,
    height: 26,
    borderRadius: 13,
    backgroundColor: isChecked ? onColor : '#E9E9EA',
    position: 'relative',
    transition: 'background-color 300ms',
    display: 'inline-block',
    verticalAlign: 'middle',
    cursor: 'pointer'
  }

  const thumbStyle = {
    position: 'absolute',
    top: 2,
    left: isChecked ? 18 : 2,
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'left 300ms',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  }

  const visuallyHidden = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0
  }

  const textBase = {
    userSelect: 'none',
    cursor: 'pointer',
    transition: 'color 200ms, opacity 200ms',
    fontWeight: 500
  }

  const textNonStyle = {
    ...textBase,
    color: !isChecked ? onColor : 'inherit',
    opacity: !isChecked ? 1 : 0.6
  }

  const textOuiStyle = {
    ...textBase,
    color: isChecked ? onColor : 'inherit',
    opacity: isChecked ? 1 : 0.6
  }

  const setChecked = (next, e) => {
    if (e) e.preventDefault()
    if (onChange) onChange({ target: { checked: next } })
  }

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, margin: 0, ...(style || {}) }}>
      {!noLabel && label ? <span className='mb-0 mr-1' style={{ userSelect: 'none' }}>{label}</span> : null}

      <span onClick={(e) => setChecked(false, e)} style={textNonStyle}>Non</span>

      <label style={{ display: 'inline-flex', alignItems: 'center', margin: 0 }}>
        <span role="switch" aria-checked={isChecked} style={trackStyle}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onChange}
            style={visuallyHidden}
            aria-hidden="true"
          />
          <span style={thumbStyle} />
        </span>
      </label>

      <span onClick={(e) => setChecked(true, e)} style={textOuiStyle}>Oui</span>
    </div>
  )
}
