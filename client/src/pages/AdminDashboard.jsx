import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ShieldAlert, Users, Activity, DollarSign, Lock, Unlock, CheckCircle, XCircle, TrendingUp, Settings as SettingsIcon, Search, Filter, Clock, AlertTriangle, Eye, Copy, Mail, Send, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

const TABS = ['Overview', 'Users', 'Deposits', 'Withdrawals', 'Stakes', 'Staking Plans', 'Settings', 'KYC']

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [stakes, setStakes] = useState([])
  const [settings, setSettings] = useState({ cryptoNetworks: [] })
  const [stakingPlans, setStakingPlans] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Edit Users
  const [editUserId, setEditUserId] = useState(null)
  const [editBalance, setEditBalance] = useState('')
  const [editLimit, setEditLimit] = useState('')

  // Settings Edit
  const [networkInput, setNetworkInput] = useState('')
  const [networkAddressInput, setNetworkAddressInput] = useState('')
  const [newPin, setNewPin] = useState('')

  // Admin PIN Modal
  const [pinModal, setPinModal] = useState({ isOpen: false, actionFn: null })
  const [adminPin, setAdminPin] = useState('')

  // KYC Management
  const [kycFilter, setKycFilter] = useState('all')
  const [kycSearch, setKycSearch] = useState('')
  const [rejectModal, setRejectModal] = useState({ isOpen: false, userId: null })
  const [rejectionNote, setRejectionNote] = useState('')

  // Email Compose Modal
  const [emailModal, setEmailModal] = useState({ isOpen: false, to: '', username: '' })
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }

  const fetchData = async () => {
    try {
      const [usersRes, txRes, stakesRes, settingsRes, plansRes] = await Promise.all([
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/admin/transactions', { headers }),
        axios.get('/api/admin/stakes', { headers }),
        axios.get('/api/settings', { headers }),
        axios.get('/api/admin/staking-plans', { headers }),
      ])
      setUsers(usersRes.data)
      setTransactions(txRes.data)
      setStakes(stakesRes.data)
      setSettings(settingsRes.data)
      setStakingPlans(plansRes.data)
    } catch (err) {
      toast.error('Failed to load admin data. Are you an admin?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Action wrapper requiring PIN
  const requirePin = (actionFn) => {
    setPinModal({ isOpen: true, actionFn })
    setAdminPin('')
  }

  const executeActionWithPin = async (e) => {
    e.preventDefault()
    if (!adminPin) return toast.error('PIN is required')
    
    // Inject PIN into headers for this specific request
    const authHeaders = { ...headers, 'x-admin-pin': adminPin }
    setPinModal({ isOpen: false, actionFn: null })

    try {
      await pinModal.actionFn(authHeaders)
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Action failed')
    }
  }

  // Admin Actions
  const toggleLock = (userId, currentLockState) => {
    requirePin(async (authHeaders) => {
      await axios.put(`/api/admin/users/${userId}/lock`, {}, { headers: authHeaders })
      toast.success(`User ${currentLockState ? 'unlocked' : 'locked'} successfully`)
      fetchData()
    })
  }

  const saveUserEdits = (userId) => {
    requirePin(async (authHeaders) => {
      await axios.put(`/api/admin/users/${userId}/balance`, { 
        balance: Number(editBalance),
        dailyWithdrawalLimit: Number(editLimit)
      }, { headers: authHeaders })
      toast.success('User updated successfully')
      setEditUserId(null)
      fetchData()
    })
  }

  const approveTx = (txId) => {
    requirePin(async (authHeaders) => {
      await axios.put(`/api/admin/transactions/${txId}/approve`, {}, { headers: authHeaders })
      toast.success('Transaction approved')
      fetchData()
    })
  }

  const rejectTx = (txId) => {
    requirePin(async (authHeaders) => {
      await axios.put(`/api/admin/transactions/${txId}/reject`, {}, { headers: authHeaders })
      toast.success('Transaction rejected')
      fetchData()
    })
  }

  // KYC Actions
  const approveKyc = (userId) => {
    requirePin(async (authHeaders) => {
      await axios.put(`/api/admin/kyc/${userId}/approve`, {}, { headers: authHeaders })
      toast.success('KYC Approved')
      fetchData()
    })
  }

  const rejectKyc = (userId, note) => {
    requirePin(async (authHeaders) => {
      await axios.put(`/api/admin/kyc/${userId}/reject`, { rejectionNote: note }, { headers: authHeaders })
      toast.success('KYC Rejected')
      setRejectModal({ isOpen: false, userId: null })
      setRejectionNote('')
      fetchData()
    })
  }

  // Settings Actions
  const setupPin = async (e) => {
    e.preventDefault()
    if (newPin.length < 4) return toast.error('PIN must be at least 4 characters')
    try {
      await axios.post('/api/admin/pin', { pin: newPin }, { headers })
      toast.success('Admin PIN set successfully!')
      setNewPin('')
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to set PIN')
    }
  }

  const addNetwork = () => {
    if (!networkInput.trim() || !networkAddressInput.trim()) return toast.error('Both Network Name and Address are required')
    if (settings.cryptoNetworks.some(n => n.name.toLowerCase() === networkInput.trim().toLowerCase())) {
      return toast.error('Network already exists')
    }
    const newNetworks = [...settings.cryptoNetworks, { name: networkInput.trim(), address: networkAddressInput.trim() }]
    requirePin(async (authHeaders) => {
      await axios.put('/api/settings', { cryptoNetworks: newNetworks }, { headers: authHeaders })
      toast.success('Network added')
      setNetworkInput('')
      setNetworkAddressInput('')
      fetchData()
    })
  }

  const removeNetwork = (netNameToRemove) => {
    const newNetworks = settings.cryptoNetworks.filter(n => n.name !== netNameToRemove)
    requirePin(async (authHeaders) => {
      await axios.put('/api/settings', { cryptoNetworks: newNetworks }, { headers: authHeaders })
      toast.success('Network removed')
      fetchData()
    })
  }

  if (loading) return <div className="dashboard-content" style={{ padding: '48px', textAlign: 'center' }}>Loading admin panel...</div>

  const pendingDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'pending')
  const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending')
  const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + t.amount, 0)
  const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + t.amount, 0)

  const cardStyle = { flex: '1 1 200px', background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
  const labelStyle = { display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }
  const valueStyle = { fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }
  const tableWrapStyle = { background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'auto' }
  const thStyle = { padding: '14px 16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '14px 16px', borderTop: '1px solid #f1f5f9', whiteSpace: 'nowrap' }
  const inputStyle = { padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100px' }

  // KYC filtering
  const filteredKycUsers = users.filter(u => {
    const matchesFilter = kycFilter === 'all' || u.kycStatus === kycFilter
    const searchLower = kycSearch.toLowerCase()
    const matchesSearch = !kycSearch || 
      u.username?.toLowerCase().includes(searchLower) || 
      u.email?.toLowerCase().includes(searchLower) || 
      u.country?.toLowerCase().includes(searchLower)
    return matchesFilter && matchesSearch && u.kycStatus !== 'unverified'
  })

  return (
    <div className="dashboard-content">
      {/* PIN Verification Modal */}
      {pinModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={executeActionWithPin} style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <ShieldAlert size={48} color="#009393" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: '8px', fontSize: '20px' }}>Admin Authorization Required</h3>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>Please enter your Admin Action PIN to execute this operation.</p>
            <input
              type="password"
              placeholder="Enter PIN"
              value={adminPin}
              onChange={e => setAdminPin(e.target.value)}
              autoFocus
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '18px', textAlign: 'center', letterSpacing: '4px', marginBottom: '24px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setPinModal({ isOpen: false, actionFn: null })} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ flex: 1, padding: '12px', background: '#009393', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Confirm Action</button>
            </div>
          </form>
        </div>
      )}

      {/* Rejection Note Modal */}
      {rejectModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '20px', color: '#1a1a2e' }}>Reject KYC</h3>
            <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>Provide a reason for rejecting this KYC application.</p>
            <textarea
              placeholder="e.g. Document is blurry, ID is expired, name does not match..."
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '24px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setRejectModal({ isOpen: false, userId: null }); setRejectionNote(''); }} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => rejectKyc(rejectModal.userId, rejectionNote)} style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Reject KYC</button>
            </div>
          </div>
        </div>
      )}

      {/* Email Compose Modal */}
      {emailModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '90%', maxWidth: '560px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease-out' }}>
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #007a7a, #009393)', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={22} color="white" />
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '16px' }}>Compose Email</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px' }}>From: tethered.supportdesk@gmail.com</div>
                </div>
              </div>
              <button onClick={() => { setEmailModal({ isOpen: false, to: '', username: '' }); setEmailSubject(''); setEmailBody(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}>
                <X size={18} color="white" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '28px' }}>
              {/* To Field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>To</label>
                <div style={{ padding: '10px 14px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#1a1a2e', fontWeight: 500 }}>
                  {emailModal.username} &lt;{emailModal.to}&gt;
                </div>
              </div>

              {/* Subject Field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#009393'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Message Body */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Message</label>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder={`Hi ${emailModal.username},\n\nType your message here...`}
                  rows={8}
                  style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6, transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#009393'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Email Preview Note */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={16} color="#15803d" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#166534' }}>This email will be sent with the official Tether Staking branding, logo, and signature.</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => { setEmailModal({ isOpen: false, to: '', username: '' }); setEmailSubject(''); setEmailBody(''); }}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', color: '#475569' }}
                >Cancel</button>
                <button
                  disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
                  onClick={async () => {
                    setIsSendingEmail(true);
                    try {
                      await axios.post('/api/admin/send-email', { to: emailModal.to, subject: emailSubject, message: emailBody }, { headers });
                      toast.success(`Email sent to ${emailModal.username}`);
                      setEmailModal({ isOpen: false, to: '', username: '' });
                      setEmailSubject('');
                      setEmailBody('');
                    } catch (err) {
                      toast.error(err.response?.data?.msg || 'Failed to send email');
                    } finally {
                      setIsSendingEmail(false);
                    }
                  }}
                  style={{ flex: 1, padding: '12px', background: (!emailSubject.trim() || !emailBody.trim()) ? '#94a3b8' : '#009393', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: (!emailSubject.trim() || !emailBody.trim()) ? 'not-allowed' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Send size={16} /> {isSendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <ShieldAlert size={28} color="#009393" />
          <h1 style={{ fontSize: '26px', color: '#1a1a2e' }}>Admin Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="admin-tabs" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '28px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: '0 0 auto', padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px', transition: 'all 0.2s', minWidth: '100px', whiteSpace: 'nowrap',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? '#009393' : '#64748b',
              boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}>{tab}</button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'Overview' && (
          <>
            <div className="admin-stats-grid" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div className="admin-stat-card" style={cardStyle}><div style={labelStyle}><Users size={18} /> Total Users</div><div className="admin-stat-value" style={valueStyle}>{users.length}</div></div>
              <div className="admin-stat-card" style={cardStyle}><div style={labelStyle}><Activity size={18} /> Total Transactions</div><div className="admin-stat-value" style={valueStyle}>{transactions.length}</div></div>
              <div className="admin-stat-card" style={cardStyle}><div style={labelStyle}><DollarSign size={18} /> Total Deposits</div><div className="admin-stat-value" style={valueStyle}>${totalDeposits.toFixed(2)}</div></div>
              <div className="admin-stat-card" style={cardStyle}><div style={labelStyle}><DollarSign size={18} /> Total Withdrawals</div><div className="admin-stat-value" style={valueStyle}>${totalWithdrawals.toFixed(2)}</div></div>
              <div className="admin-stat-card" style={cardStyle}><div style={labelStyle}><TrendingUp size={18} /> Active Stakes</div><div className="admin-stat-value" style={valueStyle}>{stakes.filter(s => s.status === 'active').length}</div></div>
              <div className="admin-stat-card" style={cardStyle}><div style={labelStyle}><Lock size={18} /> Pending Deposits</div><div style={{...valueStyle, color: pendingDeposits.length > 0 ? '#0ea5e9' : '#1a1a2e'}} className="admin-stat-value">{pendingDeposits.length}</div></div>
              <div className="admin-stat-card" style={cardStyle}><div style={labelStyle}><Lock size={18} /> Pending Withdrawals</div><div style={{...valueStyle, color: pendingWithdrawals.length > 0 ? '#ef4444' : '#1a1a2e'}} className="admin-stat-value">{pendingWithdrawals.length}</div></div>
            </div>
            
            <div style={{ marginTop: '32px', ...cardStyle }}>
              <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>Deposits vs Withdrawals</h2>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Financials', deposits: totalDeposits, withdrawals: totalWithdrawals }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="deposits" fill="#009393" radius={[4,4,0,0]} barSize={60} />
                    <Bar dataKey="withdrawals" fill="#ef4444" radius={[4,4,0,0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* USERS */}
        {activeTab === 'Users' && (
          <div className="responsive-table-wrap" style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}><tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Country</th>
                <th style={thStyle}>Wallet ID</th>
                <th style={thStyle}>Balance</th>
                <th style={thStyle}>Daily Limit</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr></thead>
              <tbody>
                {users.map(user => {
                  const isEditing = editUserId === user._id;
                  return (
                    <tr key={user._id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{user.username}</div>
                        <button 
                          onClick={() => {
                            setEmailModal({ isOpen: true, to: user.email, username: user.username });
                            setEmailSubject(`Tether Staking — Account Update for ${user.username}`);
                            setEmailBody(`Hi ${user.username},\n\nThank you for being a valued member of Tether Staking.\n\n`);
                          }}
                          title={`Email ${user.email}`}
                          style={{ 
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            color: '#0ea5e9', fontSize: '12px', textDecoration: 'none', 
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            transition: 'color 0.2s', fontFamily: 'inherit'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#009393'}
                          onMouseLeave={e => e.currentTarget.style.color = '#0ea5e9'}
                        >
                          <Mail size={13} /> {user.email}
                        </button>
                      </td>
                      <td style={{...tdStyle, color: '#475569', fontSize: '13px'}}>{user.country || '—'}</td>
                      <td style={{...tdStyle, fontSize: '11px', color: '#64748b'}}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ wordBreak: 'break-all' }}>{user.tetherWalletId || '—'}</span>
                          {user.tetherWalletId && (
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(user.tetherWalletId);
                                toast.success('Wallet ID copied');
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', padding: '4px' }}
                              title="Copy Wallet ID"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {isEditing ? (
                          <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} style={inputStyle} />
                        ) : (
                          <span style={{ fontWeight: 700 }}>${user.balance.toFixed(2)}</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {isEditing ? (
                          <input type="number" value={editLimit} onChange={e => setEditLimit(e.target.value)} style={inputStyle} />
                        ) : (
                          <span style={{ color: '#475569' }}>${user.dailyWithdrawalLimit || 1000}</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ background: user.isLocked ? '#fee2e2' : '#dcfce7', color: user.isLocked ? '#b91c1c' : '#15803d', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                          {user.isLocked ? 'Locked' : 'Active'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => saveUserEdits(user._id)} className="btn btn--primary btn--sm">Save</button>
                            <button onClick={() => setEditUserId(null)} className="btn btn--secondary btn--sm">Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setEditUserId(user._id); setEditBalance(user.balance); setEditLimit(user.dailyWithdrawalLimit || 1000); }} className="btn btn--secondary btn--sm">Edit</button>
                            <button onClick={() => toggleLock(user._id, user.isLocked)} style={{
                              background: user.isLocked ? '#dcfce7' : '#fee2e2', color: user.isLocked ? '#15803d' : '#b91c1c', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                              {user.isLocked ? <><Unlock size={14} /> Unlock</> : <><Lock size={14} /> Lock</>}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* KYC TAB */}
        {activeTab === 'KYC' && (
          <div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ flex: '1 1 250px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by username, email, or country..."
                  value={kycSearch}
                  onChange={e => setKycSearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '14px', fontFamily: 'inherit' }}
                />
              </div>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'verified', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }].map(f => (
                  <button key={f.value} onClick={() => setKycFilter(f.value)} style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                    background: kycFilter === f.value ? '#009393' : '#f1f5f9',
                    color: kycFilter === f.value ? 'white' : '#64748b',
                  }}>{f.label}</button>
                ))}
              </div>
            </div>

            {filteredKycUsers.length === 0 ? (
              <div style={{ background: 'white', padding: '48px', borderRadius: '16px', textAlign: 'center', color: '#64748b' }}>
                No KYC applications found{kycFilter !== 'all' ? ` with "${kycFilter}" status` : ''}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredKycUsers.map(u => (
                  <div key={u._id} className="kyc-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>{u.username}</span>
                        <span style={{
                          background: u.kycStatus === 'verified' ? '#dcfce7' : u.kycStatus === 'pending' ? '#fef3c7' : '#fee2e2',
                          color: u.kycStatus === 'verified' ? '#15803d' : u.kycStatus === 'pending' ? '#92400e' : '#b91c1c',
                          padding: '2px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase'
                        }}>{u.kycStatus}</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>{u.email}</div>
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: '#475569', marginTop: '8px' }}>
                        {u.kycFullName && <span><strong>Name:</strong> {u.kycFullName}</span>}
                        {u.country && <span><strong>Country:</strong> {u.country}</span>}
                        {u.tetherWalletId && <span style={{ wordBreak: 'break-all' }}><strong>Wallet:</strong> {u.tetherWalletId.substring(0, 16)}...</span>}
                        {u.kycSubmittedAt && <span><strong>Submitted:</strong> {new Date(u.kycSubmittedAt).toLocaleDateString()}</span>}
                      </div>
                      
                      {u.kycDocument && (
                        <a href={u.kycDocument} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                          <Eye size={14} /> View Document
                        </a>
                      )}

                      {u.kycStatus === 'rejected' && u.kycRejectionNote && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#b91c1c', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>
                          <strong>Rejection note:</strong> {u.kycRejectionNote}
                        </div>
                      )}
                    </div>

                    {u.kycStatus === 'pending' && (
                      <div className="kyc-card-actions" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button 
                          className="btn btn--primary btn--sm" 
                          style={{ background: '#15803d' }}
                          onClick={() => approveKyc(u._id)}
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button 
                          className="btn btn--primary btn--sm" 
                          style={{ background: '#ef4444' }}
                          onClick={() => setRejectModal({ isOpen: true, userId: u._id })}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEPOSITS */}
        {activeTab === 'Deposits' && (
          <div className="responsive-table-wrap" style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}><tr>
                <th style={thStyle}>User</th><th style={thStyle}>Amount</th><th style={thStyle}>Network</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th>
              </tr></thead>
              <tbody>
                {transactions.filter(t => t.type === 'deposit').map(tx => (
                  <tr key={tx._id}>
                    <td style={{...tdStyle, fontWeight: 500}}>{tx.user?.username || 'N/A'}</td>
                    <td style={{...tdStyle, fontWeight: 700}}>${tx.amount.toFixed(2)}</td>
                    <td style={{...tdStyle, color: '#64748b', fontSize: '13px'}}>{tx.network || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: tx.status === 'completed' ? '#dcfce7' : tx.status === 'pending' ? '#fef9c3' : '#fee2e2',
                        color: tx.status === 'completed' ? '#15803d' : tx.status === 'pending' ? '#854d0e' : '#b91c1c',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                      }}>{tx.status}</span>
                    </td>
                    <td style={tdStyle}>
                      {tx.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => approveTx(tx._id)} style={{ background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Verify & Credit
                          </button>
                          <button onClick={() => rejectTx(tx._id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* WITHDRAWALS */}
        {activeTab === 'Withdrawals' && (
          <div className="responsive-table-wrap" style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}><tr>
                <th style={thStyle}>User</th><th style={thStyle}>Amount</th><th style={thStyle}>Network</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th>
              </tr></thead>
              <tbody>
                {transactions.filter(t => t.type === 'withdrawal').map(tx => (
                  <tr key={tx._id}>
                    <td style={{...tdStyle, fontWeight: 500}}>{tx.user?.username || 'N/A'}</td>
                    <td style={{...tdStyle, fontWeight: 700}}>${tx.amount.toFixed(2)}</td>
                    <td style={{...tdStyle, color: '#64748b', fontSize: '13px'}}>{tx.network || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: tx.status === 'completed' ? '#dcfce7' : tx.status === 'pending' ? '#fef9c3' : '#fee2e2',
                        color: tx.status === 'completed' ? '#15803d' : tx.status === 'pending' ? '#854d0e' : '#b91c1c',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                      }}>{tx.status}</span>
                    </td>
                    <td style={tdStyle}>
                      {tx.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => approveTx(tx._id)} style={{ background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button onClick={() => rejectTx(tx._id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* STAKES */}
        {activeTab === 'Stakes' && (
          <div className="responsive-table-wrap" style={tableWrapStyle}>
            {stakes.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>No staking contracts yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}><tr>
                  <th style={thStyle}>User</th><th style={thStyle}>Plan</th><th style={thStyle}>Amount</th><th style={thStyle}>Return</th><th style={thStyle}>Status</th><th style={thStyle}>Completes At</th>
                </tr></thead>
                <tbody>
                  {stakes.map(s => (
                    <tr key={s._id}>
                      <td style={{...tdStyle, fontWeight: 500}}>{s.user?.username || 'N/A'}</td>
                      <td style={tdStyle}>{s.planName}</td>
                      <td style={{...tdStyle, fontWeight: 700}}>${s.amount.toFixed(2)}</td>
                      <td style={tdStyle}>{s.returnPercent}%</td>
                      <td style={tdStyle}>
                        <span style={{
                          background: s.status === 'active' ? '#dbeafe' : s.status === 'completed' ? '#dcfce7' : '#fee2e2',
                          color: s.status === 'active' ? '#1d4ed8' : s.status === 'completed' ? '#15803d' : '#b91c1c',
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                        }}>{s.status}</span>
                      </td>
                      <td style={{...tdStyle, color: '#64748b', fontSize: '13px'}}>{new Date(s.completesAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* STAKING PLANS */}
        {activeTab === 'Staking Plans' && (
          <div className="responsive-table-wrap" style={tableWrapStyle}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}><tr>
                <th style={thStyle}>Plan Name</th>
                <th style={thStyle}>Min Amount</th>
                <th style={thStyle}>Max Amount</th>
                <th style={thStyle}>Duration (hrs)</th>
                <th style={thStyle}>Return (%)</th>
              </tr></thead>
              <tbody>
                {stakingPlans.map(plan => (
                  <tr key={plan._id}>
                    <td style={{...tdStyle, fontWeight: 700}}>{plan.name}</td>
                    <td style={tdStyle}>${plan.min}</td>
                    <td style={tdStyle}>${plan.max}</td>
                    <td style={tdStyle}>{plan.durationHours}h</td>
                    <td style={tdStyle}>{plan.returnPercent}%</td>
                  </tr>
                ))}
                {stakingPlans.length === 0 && (
                  <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No custom staking plans found. Create one via API or DB seeding.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'Settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <ShieldAlert size={24} color="#009393" />
                <h2 style={{ fontSize: '20px' }}>Security Configuration</h2>
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                Set up an Admin PIN. This PIN is required to approve withdrawals, lock users, and edit balances.
              </p>
              <form onSubmit={setupPin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>New Admin PIN</label>
                  <input
                    type="password"
                    placeholder="Enter a secure PIN"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn--primary" style={{ width: '100%' }}>Set Admin PIN</button>
              </form>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <SettingsIcon size={24} color="#009393" />
                <h2 style={{ fontSize: '20px' }}>Supported Crypto Networks</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <input 
                  type="text" 
                  placeholder="Network Name (e.g. TRC20)" 
                  value={networkInput}
                  onChange={e => setNetworkInput(e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
                <input 
                  type="text" 
                  placeholder="Deposit Wallet Address" 
                  value={networkAddressInput}
                  onChange={e => setNetworkAddressInput(e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
                <button onClick={addNetwork} className="btn btn--primary">Add Network</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settings.cryptoNetworks?.map(net => (
                  <div key={net.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>{net.name}</span>
                      <span style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all' }}>{net.address}</span>
                    </div>
                    <button onClick={() => removeNetwork(net.name)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', paddingLeft: '12px', flexShrink: 0 }}><XCircle size={18} /></button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
