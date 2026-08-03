import React from 'react'
import { Link } from 'react-router-dom'
import { FaTwitter, FaLinkedin, FaYoutube, FaTelegram, FaFacebook, FaInstagram } from 'react-icons/fa'
import TetherLogo from './TetherLogo'

export default function Footer() {
  const columns = [
    {
      heading: 'Resources',
      links: [
        { label: 'News', href: 'https://tether.io/news', external: true },
        { label: 'FAQs', href: '#' },
        { label: 'Integration Guidelines', href: '#' },
        { label: 'Media Assets', href: '#' },
        { label: 'Tether Facts', href: '#' },
      ],
    },
    {
      heading: 'Tether',
      links: [
        { label: 'Why Tether?', to: '/why-tether' },
        { label: 'How It Works', to: '/how-it-works' },
        { label: 'Transparency', to: '/transparency' },
        { label: 'Knowledge Base', href: '#' },
        { label: 'Fees', href: '#' },
      ],
    },
    {
      heading: 'Products',
      links: [
        { label: 'Tether token USDt', href: '#' },
        { label: 'Tether token MXNt', href: '#' },

        { label: 'Alloy by Tether', href: '#' },
      ],
    },
    {
      heading: 'Solutions',
      links: [
        { label: 'For Individuals', href: '#' },
        { label: 'For Merchants', href: '#' },
        { label: 'For Exchanges', href: '#' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About Us', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Contact Us', href: 'https://t.me/HELEN_MARISOL', external: true },
        { label: 'Legal Terms', href: '#' },
      ],
    },
  ]

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="footer__heading">{col.heading}</h4>
              {col.links.map((link) =>
                link.to ? (
                  <Link key={link.label} to={link.to} className="footer__link">{link.label}</Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="footer__link"
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          <Link to="/" className="footer__logo">
            <TetherLogo color="#ffffff" size={28} />
            tether
          </Link>

          <p className="footer__copyright">
            © 2013 - {new Date().getFullYear()} Tether Operations, S.A. de C.V. All rights reserved.
          </p>

          <div className="footer__socials">
            <a href="#" className="footer__social" aria-label="Twitter"><FaTwitter size={18} /></a>
            <a href="#" className="footer__social" aria-label="LinkedIn"><FaLinkedin size={18} /></a>
            <a href="#" className="footer__social" aria-label="YouTube"><FaYoutube size={18} /></a>
            <a href="https://t.me/HELEN_MARISOL" target="_blank" rel="noopener noreferrer" className="footer__social" aria-label="Telegram"><FaTelegram size={18} /></a>
            <a href="#" className="footer__social" aria-label="Facebook"><FaFacebook size={18} /></a>
            <a href="#" className="footer__social" aria-label="Instagram"><FaInstagram size={18} /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
