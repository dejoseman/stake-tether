import React, { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from './Sidebar'
import TetherLogo from './TetherLogo'
import { CheckCircle, Clock, XCircle, LogOut, Menu } from 'lucide-react'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [kycStatus, setKycStatus] = useState('unverified')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setKycStatus(res.data.kycStatus)
      } catch (err) {
        console.error('Failed to fetch profile', err)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = () => {
    // Clear token and redirect
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile Overlay */}
      <div 
        className={`dashboard-mobile-overlay ${mobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className={`dashboard-sidebar-wrapper ${mobileSidebarOpen ? 'open' : ''}`}>
        <Sidebar onLinkClick={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header className="dashboard-header" style={{ 
          height: '80px', 
          background: '#009393', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 32px'
        }}>
          {/* Mobile Menu Toggle & Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="dashboard-header-menu-btn" 
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={24} strokeWidth={2.5} />
            </button>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', fontWeight: 800, fontSize: '24px' }}>
              <TetherLogo color="white" size={32} />
            </Link>
          </div>
          
          <div style={{ flex: 1 }}></div>

          {/* Header Actions */}
          <div className="dashboard-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {kycStatus === 'verified' ? (
              <div className="dashboard-kyc-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 700, fontSize: '13px', background: '#dcfce7', padding: '6px 12px', borderRadius: '20px' }}>
                <CheckCircle size={16} strokeWidth={2.5} />
                <span className="dashboard-kyc-text">VERIFIED</span>
              </div>
            ) : kycStatus === 'pending' ? (
              <div className="dashboard-kyc-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '13px', background: '#fef3c7', padding: '6px 12px', borderRadius: '20px' }}>
                <Clock size={16} strokeWidth={2.5} />
                <span className="dashboard-kyc-text">PENDING</span>
              </div>
            ) : (
              <div className="dashboard-kyc-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 700, fontSize: '13px', background: '#fee2e2', padding: '6px 12px', borderRadius: '20px' }}>
                <XCircle size={16} strokeWidth={2.5} />
                <span className="dashboard-kyc-text">UNVERIFIED</span>
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className="dashboard-logout-btn"
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            >
              <span className="dashboard-logout-text">Logout</span>
              <LogOut size={20} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="dashboard-main" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
