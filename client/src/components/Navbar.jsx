import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Moon, Sun } from 'lucide-react'
import TetherLogo from './TetherLogo'
import { useTheme } from './ThemeContext'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const links = [
    { to: '/why-tether', label: 'Why Tether?' },
    { to: '/how-it-works', label: 'How it works' },
    { to: '/staking-plans', label: 'Staking Plans' },
    { href: 'https://tether.io/news', label: 'News', external: true },

    { to: '/transparency', label: 'Transparency' },
  ]

  return (
    <>
      <nav className="navbar">
        <div className="navbar__inner">
          <Link to="/" className="navbar__logo">
            <TetherLogo color="#009393" size={36} />
            tether
          </Link>

          <div className="navbar__links">
            {links.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="navbar__link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`navbar__link ${location.pathname === link.to ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          <div className="navbar__actions">
            <button onClick={toggleTheme} className="btn btn--icon" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text-primary)' }}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link to="/login" className="btn btn--text btn--sm">Log In</Link>
            <Link to="/signup" className="btn btn--primary btn--sm">Sign Up</Link>
            <button className="navbar__hamburger" onClick={() => setMobileOpen(true)}>
              <Menu size={24} strokeWidth={2} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)}>
        <div className="mobile-menu__panel" onClick={(e) => e.stopPropagation()}>
          <button className="mobile-menu__close" onClick={() => setMobileOpen(false)}>
            <X size={24} strokeWidth={2} />
          </button>
          {links.map((link) =>
            link.external ? (
              <a key={link.label} href={link.href} className="mobile-menu__link" target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ) : (
              <Link key={link.label} to={link.to} className="mobile-menu__link" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            )
          )}
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/login" className="btn btn--secondary" onClick={() => setMobileOpen(false)}>Log In</Link>
            <Link to="/signup" className="btn btn--primary" onClick={() => setMobileOpen(false)}>Sign Up</Link>
          </div>
        </div>
      </div>
    </>
  )
}
