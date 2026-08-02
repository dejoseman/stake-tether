import React from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TetherLogo from './TetherLogo'
import { CheckCircle, LogOut } from 'lucide-react'

export default function DashboardLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Clear token and redirect
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Sidebar - fixed width */}
      <div style={{ width: '280px', background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ 
          height: '80px', 
          background: '#009393', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 32px'
        }}>
          {/* Mobile Logo (hidden on desktop) */}
          <Link to="/" style={{ display: 'none', alignItems: 'center', gap: '12px', color: 'white', fontWeight: 800, fontSize: '24px' }}>
            <TetherLogo color="white" size={32} />
          </Link>
          
          <div style={{ flex: 1 }}></div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600, fontSize: '14px', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px' }}>
              <CheckCircle size={16} strokeWidth={2.5} />
              KYC VERIFIED
            </div>
            
            <button 
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            >
              Logout
              <LogOut size={20} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
