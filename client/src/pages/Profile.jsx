import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { UserCircle, Mail, Shield, CheckCircle, XCircle, Clock, UploadCloud, ShieldCheck, Copy, Users, Globe, Wallet, AlertTriangle } from 'lucide-react'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  
  // Wallet Update State
  const [isEditingWallet, setIsEditingWallet] = useState(false)
  const [newWalletAddress, setNewWalletAddress] = useState('')
  const [isUpdatingWallet, setIsUpdatingWallet] = useState(false)
  
  const [fullName, setFullName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [referralStats, setReferralStats] = useState({ referralCode: '', totalReferred: 0, totalEarned: 0 })

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const [profileRes, refRes] = await Promise.all([
        axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/auth/referrals', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { referralCode: '', totalReferred: 0, totalEarned: 0 } }))
      ])
      setProfile(profileRes.data)
      setReferralStats(refRes.data)
    } catch (err) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!file) return toast.error('Please select a file to upload')
    if (!fullName.trim()) return toast.error('Please enter your full legal name')

    const formData = new FormData()
    formData.append('document', file)
    formData.append('fullName', fullName.trim())

    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/kyc/upload', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      toast.success('Document uploaded successfully. It is now pending review.')
      setFile(null)
      setFullName('')
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateWallet = async () => {
    if (newWalletAddress.length < 20) {
      return toast.error('Please enter a valid USDT Wallet Address (at least 20 characters).')
    }
    
    setIsUpdatingWallet(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.put('/api/auth/update-wallet', 
        { tetherWalletId: newWalletAddress }, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setProfile(prev => ({ ...prev, tetherWalletId: res.data.tetherWalletId }))
      setIsEditingWallet(false)
      toast.success('Wallet address updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to update wallet address')
    } finally {
      setIsUpdatingWallet(false)
    }
  }

  if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading profile...</div>
  return (
    <div className="dashboard-content">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '32px' }}>Profile Settings</h1>
        
        <div className="profile-grid" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Main Info Card */}
          <div style={{ flex: '1 1 400px', background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#009393', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserCircle size={40} strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize: '24px', color: '#1a1a2e', marginBottom: '4px' }}>{profile.username}</h2>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <Mail size={20} color="#64748b" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</div>
                  <div style={{ color: '#0f172a', fontWeight: 500, wordBreak: 'break-all' }}>{profile.email}</div>
                </div>
              </div>

              {profile.country && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                  <Globe size={20} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Country</div>
                    <div style={{ color: '#0f172a', fontWeight: 500 }}>{profile.country}</div>
                  </div>
                </div>
              )}

              {profile.tetherWalletId && (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '12px', minWidth: 0 }}>
                      <Wallet size={20} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>USDT Wallet Address</div>
                        
                        {!isEditingWallet ? (
                          <div style={{ color: '#0f172a', fontWeight: 500, wordBreak: 'break-all', fontSize: '13px' }}>
                            {profile.tetherWalletId}
                          </div>
                        ) : (
                          <div style={{ marginTop: '8px' }}>
                            <input
                              type="text"
                              value={newWalletAddress}
                              onChange={(e) => setNewWalletAddress(e.target.value)}
                              placeholder="Enter new USDT Wallet Address"
                              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '8px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={handleUpdateWallet}
                                disabled={isUpdatingWallet}
                                style={{ background: '#009393', color: 'white', padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                              >
                                {isUpdatingWallet ? 'Saving...' : 'Save'}
                              </button>
                              <button 
                                onClick={() => setIsEditingWallet(false)}
                                disabled={isUpdatingWallet}
                                style={{ background: '#e2e8f0', color: '#475569', padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!isEditingWallet && (
                      <button 
                        onClick={() => {
                          setNewWalletAddress(profile.tetherWalletId)
                          setIsEditingWallet(true)
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontSize: '13px', fontWeight: 600 }}
                      >
                        Reset Wallet
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'white', padding: '12px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                  <Shield size={24} color="#009393" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>KYC Status</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {profile.kycStatus === 'verified' && <><CheckCircle size={18} color="#15803d" /> Verified</>}
                    {profile.kycStatus === 'pending' && <><Clock size={18} color="#d97706" /> Pending Review</>}
                    {profile.kycStatus === 'unverified' && <><XCircle size={18} color="#ef4444" /> Unverified</>}
                    {profile.kycStatus === 'rejected' && <><AlertTriangle size={18} color="#ef4444" /> Rejected</>}
                  </div>
                </div>
              </div>

              {/* Show rejection reason */}
              {profile.kycStatus === 'rejected' && profile.kycRejectionNote && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>Rejection Reason</span>
                  </div>
                  <p style={{ color: '#7f1d1d', fontSize: '14px', lineHeight: 1.6 }}>{profile.kycRejectionNote}</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* KYC Upload Section — show for unverified OR rejected */}
        {(profile.kycStatus === 'unverified' || profile.kycStatus === 'rejected') && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginTop: '24px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#1a1a2e' }}>Identity Verification (KYC)</h2>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
              {profile.kycStatus === 'rejected' 
                ? 'Your previous submission was rejected. Please re-upload a clear document to try again.' 
                : 'Please upload a clear picture of your Passport, National ID, or Driver\'s License to verify your account.'}
            </p>
            
            <form onSubmit={handleFileUpload}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="kycFullName">Full Legal Name*</label>
                <input
                  type="text"
                  id="kycFullName"
                  placeholder="Enter your full name as it appears on your ID"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '32px', textAlign: 'center', marginBottom: '24px', background: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                <input 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
                <UploadCloud size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                {file ? (
                  <div style={{ color: '#009393', fontWeight: 700 }}>{file.name}</div>
                ) : (
                  <div>
                    <div style={{ color: '#1a1a2e', fontWeight: 600, marginBottom: '4px' }}>Click to upload or drag and drop</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>JPG, PNG, WEBP, or PDF (Max 5MB)</div>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn--primary" 
                disabled={!file || !fullName.trim() || uploading}
                style={{ width: '100%', padding: '14px' }}
              >
                {uploading ? 'Uploading...' : 'Submit Document'}
              </button>
            </form>
          </div>
        )}

        {/* Pending KYC notice */}
        {profile.kycStatus === 'pending' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '24px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Clock size={24} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '16px', color: '#92400e', marginBottom: '4px' }}>KYC Under Review</h3>
              <p style={{ fontSize: '14px', color: '#a16207' }}>Your document has been submitted and is currently being reviewed by our team. This usually takes 1-2 business days.</p>
            </div>
          </div>
        )}

        {/* REFERRAL PROGRAM */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Users size={24} color="#009393" />
            <h2 style={{ fontSize: '20px', color: '#1a1a2e' }}>Referral Program</h2>
          </div>
          <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
            Invite your friends to GeneratingPro and earn rewards!
          </p>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ flex: '1', minWidth: '120px', background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Friends Referred</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>{referralStats.totalReferred}</div>
            </div>
            <div style={{ flex: '1', minWidth: '120px', background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Total Earned</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#009393' }}>${referralStats.totalEarned.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#64748b' }}>Your Unique Referral Link</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                readOnly
                value={`${window.location.origin}/signup?ref=${referralStats.referralCode}`}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#1a1a2e', fontSize: '13px', minWidth: 0 }}
              />
              <button 
                className="btn btn--primary" 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${referralStats.referralCode}`);
                  toast.success('Link copied to clipboard!');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
              >
                <Copy size={16} /> Copy
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
