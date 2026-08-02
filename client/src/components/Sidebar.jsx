import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, ArrowDownCircle, ArrowUpCircle, List, ArrowRightLeft, UserCircle, ShieldAlert, TrendingUp, Clock } from 'lucide-react'
import axios from 'axios'
import TetherLogo from './TetherLogo'

export default function Sidebar({ onLinkClick }) {
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data.role === 'admin') setIsAdmin(true)
      } catch {}
    }
    checkAdmin()
  }, [])
  
  const navItems = [
    { to: '/dashboard', label: 'Home', icon: <Home size={24} strokeWidth={2.5} /> },
    { to: '/stake', label: 'Purchase Stake', icon: <TrendingUp size={24} strokeWidth={2.5} /> },
    { to: '/my-stakes', label: 'My Stakes', icon: <Clock size={24} strokeWidth={2.5} /> },
    { to: '/deposit', label: 'Deposit', icon: <ArrowDownCircle size={24} strokeWidth={2.5} /> },
    { to: '/withdraw', label: 'Withdraw', icon: <ArrowUpCircle size={24} strokeWidth={2.5} /> },
    { to: '/transactions', label: 'Transactions', icon: <List size={24} strokeWidth={2.5} /> },
    { to: '/transfer', label: 'Transfer funds', icon: <ArrowRightLeft size={24} strokeWidth={2.5} /> },
    { to: '/profile', label: 'Profile', icon: <UserCircle size={24} strokeWidth={2.5} /> },
  ]

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin Panel', icon: <ShieldAlert size={24} strokeWidth={2.5} /> })
  }

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-logo" style={{ padding: '24px' }}>
        <Link to="/" onClick={onLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1a1a2e', fontWeight: 800, fontSize: '24px' }}>
          <TetherLogo color="#009393" size={36} />
          tether
        </Link>
      </div>
      
      <div className="sidebar-nav">
        {navItems.map(item => (
          <Link 
            key={item.label} 
            to={item.to}
            onClick={onLinkClick}
            className={`sidebar-link ${location.pathname === item.to ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 24px',
              color: location.pathname === item.to ? '#009393' : '#8888a0',
              background: location.pathname === item.to ? '#f5f7fa' : 'transparent',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              borderLeft: location.pathname === item.to ? '4px solid #009393' : '4px solid transparent'
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ padding: '24px', marginTop: 'auto' }}>
        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '20px', color: 'white', textAlign: 'center' }}>
          <h4 style={{ marginBottom: '8px' }}>Need Help!</h4>
          <p style={{ fontSize: '13px', color: '#8888a0', marginBottom: '16px' }}>Contact our 24/7 customer support center</p>
          <button className="btn btn--primary btn--sm" style={{ width: '100%' }}>Contact Us</button>
        </div>
      </div>
    </aside>
  )
}
