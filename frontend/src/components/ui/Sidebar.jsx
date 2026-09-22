import { useState } from 'react'

function Sidebar({ open = true, brand, links = [], onNavigate, actions, footer, className = '' }) {
  const [openMenus, setOpenMenus] = useState({})

  if (!open) return null

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleLinkClick = (e, link, parent) => {
    if (!onNavigate) return
    e.preventDefault()
    if (!parent) {
      setOpenMenus({})
    }
    onNavigate(link.key ?? link.label, parent ?? link)
  }

  return (
    <aside className={`ui-sidebar${className ? ` ${className}` : ''}`}>
      {brand && <div className="ui-sidebar__brand">{brand}</div>}
      <ul className="ui-sidebar__links">
        {links.map((link) => {
          const linkKey = link.key ?? link.label
          const hasSubLinks = link.subLinks && link.subLinks.length > 0

          if (hasSubLinks) {
            const isOpen =
                openMenus[linkKey] ??
                (link.defaultOpen === true || link.subLinks.some((sub) => sub.active))
            return (
              <li key={`${linkKey}-group`}>
                <button
                  type="button"
                  className={`ui-sidebar__link ui-sidebar__parent${link.active ? ' ui-sidebar__link--active' : ''}`}
                  onClick={() => toggleMenu(linkKey)}
                  aria-expanded={isOpen}
                >
                  {link.label}
                  <span
                    className={`ui-sidebar__chevron${isOpen ? ' ui-sidebar__chevron--open' : ''}`}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                </button>
                {isOpen && (
                  <ul className="ui-sidebar__submenu">
                    {link.subLinks.map((sub) => {
                      const subKey = sub.key ?? sub.label
                      return (
                        <li key={subKey}>
                          <a
                            href={sub.href ?? '#'}
                            className={`ui-sidebar__sublink${sub.active ? ' ui-sidebar__sublink--active' : ''}`}
                            onClick={(e) => handleLinkClick(e, sub, link)}
                          >
                            {sub.label}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          }

          return (
            <li key={linkKey}>
              <a
                href={link.href}
                className={`ui-sidebar__link${link.active ? ' ui-sidebar__link--active' : ''}`}
                onClick={(e) => handleLinkClick(e, link)}
              >
                {link.label}
              </a>
            </li>
          )
        })}
      </ul>
      {actions && <div className="ui-sidebar__actions">{actions}</div>}
      {footer && <div className="ui-sidebar__footer">{footer}</div>}
    </aside>
  )
}

export default Sidebar