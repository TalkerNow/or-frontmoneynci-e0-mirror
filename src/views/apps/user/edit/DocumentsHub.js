import React, { useState, useEffect, useRef } from 'react'
import { Nav, NavItem, NavLink, Card, CardBody, TabContent, TabPane } from 'reactstrap'
import classnames from 'classnames'
import Contracts from './Contracts'
import Documents from './Documents'

export default function DocumentsHub({ id, name, parent_id, userFullName, alignOffset = 0, labelId }) {
  const [subTab, setSubTab] = useState('contrats')
  const [visible, setVisible] = useState(false)
  const [contentOffset, setContentOffset] = useState(0)
  const [navMargin, setNavMargin] = useState(alignOffset || 0)
  const subNavRef = useRef(null)
  const contentRef = useRef(null)

  // Animate on mount and whenever alignment/section changes
  useEffect(() => {
    setVisible(false)
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [alignOffset, subTab])

  // Compute left offset so that the content starts under the word "Contrats"
  const computeContentOffset = () => {
    try {
      const nav = subNavRef.current
      const label = document.getElementById('docs-label-contrats')
      if (nav && label) {
        const delta = label.getBoundingClientRect().left - nav.getBoundingClientRect().left
        setContentOffset(Math.max(0, Math.round(delta)))
      }
    } catch (e) {}
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const labelEl = labelId ? document.getElementById(labelId) : null
        const nav = subNavRef.current
        const firstLink = nav ? nav.querySelector('.nav-link') : null
        if (labelEl && nav && firstLink) {
          const style = window.getComputedStyle(firstLink)
          const padLeft = parseFloat(style.paddingLeft || '0')
          const firstLinkLeft = firstLink.getBoundingClientRect().left
          const textLeft = firstLinkLeft + padLeft
          const labelLeft = labelEl.getBoundingClientRect().left
          const deltaText = Math.round(labelLeft - textLeft)
          // align first link text under Documents text using alignOffset + delta
          setNavMargin(Math.max(0, (Number(alignOffset) || 0) + deltaText))
          // align content wrapper so it starts under Contrats text as well
          const navLeft = nav.getBoundingClientRect().left
          setContentOffset(Math.max(0, Math.round((labelLeft - navLeft) + deltaText)))
        } else {
          setNavMargin(Number(alignOffset) || 0)
          computeContentOffset()
        }
      } catch (e) {
        setNavMargin(Number(alignOffset) || 0)
        computeContentOffset()
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [alignOffset, subTab, labelId])

  return (
    <div>
      <Nav
        tabs
        className="mb-1"
        style={{
          marginLeft: Math.max(0, Number(navMargin) || 0),
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 140ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'margin-left, transform, opacity'
        }}
        ref={subNavRef}
      >
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'contrats' })} onClick={() => setSubTab('contrats')}>
            <span id='docs-label-contrats'>Contrats</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'perso' })} onClick={() => setSubTab('perso')}>
            <span>Documents perso</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'cerfa' })} onClick={() => setSubTab('cerfa')}>
            <span>Cerfa</span>
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={classnames({ active: subTab === 'courriers' })} onClick={() => setSubTab('courriers')}>
            <span>Courriers caisse</span>
          </NavLink>
        </NavItem>
      </Nav>

      <TabContent activeTab={subTab}>
        <TabPane tabId='contrats'>
          <div ref={contentRef} style={{ marginLeft: contentOffset, transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <Card className='mb-1'>
              <CardBody>
                <Contracts name={name || userFullName} id={id} parent_id={parent_id} />
              </CardBody>
            </Card>
          </div>
        </TabPane>
        <TabPane tabId='perso'>
          <div style={{ marginLeft: contentOffset, transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <Card className='mb-1'>
              <CardBody>
                <Documents name={name || userFullName} id={id} />
              </CardBody>
            </Card>
          </div>
        </TabPane>
        <TabPane tabId='cerfa'>
          <div style={{ marginLeft: contentOffset, transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <Card className='mb-1'>
              <CardBody>
                <p className='text-muted mb-0'>Liste des documents Cerfa à intégrer ici.</p>
              </CardBody>
            </Card>
          </div>
        </TabPane>
        <TabPane tabId='courriers'>
          <div style={{ marginLeft: contentOffset, transition: 'margin-left 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <Card className='mb-1'>
              <CardBody>
                <p className='text-muted mb-0'>Courriers caisse à intégrer ici.</p>
              </CardBody>
            </Card>
          </div>
        </TabPane>
      </TabContent>
    </div>
  )
}
