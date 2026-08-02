import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { UserCircle, Mail, Shield, CheckCircle, XCircle, Clock, UploadCloud, ShieldCheck, Copy, Users } from 'lucide-react'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
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

    const formData = new FormData()
    formData.append('document', file)

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
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="dashboard-content">Loading profile...</div>
  return (
    <div className="dashboard-content">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '32px' }}>Profile Settings</h1>
        
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Main Info Card */}
          <div style={{ flex: '1 1 400px', background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#009393', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCircle size={40} strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize: '24px', color: '#1a1a2e', marginBottom: '4px' }}>{profile.username}</h2>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <Mail size={20} color="#64748b" />
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</div>
                  <div style={{ color: '#0f172a', fontWeight: 500 }}>{profile.email}</div>
                </div>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'white', padding: '12px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <Shield size={24} color="#009393" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>KYC Status</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {profile.kycStatus === 'verified' && <><CheckCircle size={18} color="#15803d" /> Verified</>}
                    {profile.kycStatus === 'pending' && <><Clock size={18} color="#d97706" /> Pending Review</>}
                    {profile.kycStatus === 'unverified' && <><XCircle size={18} color="#ef4444" /> Unverified</>}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* KYC Upload Section */}
        {profile.kycStatus === 'unverified' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginTop: '24px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#1a1a2e' }}>Identity Verification (KYC)</h2>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>Please upload a clear picture of your Passport, National ID, or Driver's License to verify your account.</p>
            
            <form onSubmit={handleFileUpload}>
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
                disabled={!file || uploading}
                style={{ width: '100%', padding: '14px' }}
              >
                {uploading ? 'Uploading...' : 'Submit Document'}
              </button>
            </form>
          </div>
        )}

        {/* REFERRAL PROGRAM */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Users size={24} color="#009393" />
            <h2 style={{ fontSize: '20px', color: '#1a1a2e' }}>Referral Program</h2>
          </div>
          <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
            Invite your friends to Tether Staking and earn rewards!
          </p>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ flex: '1', background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Friends Referred</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>{referralStats.totalReferred}</div>
            </div>
            <div style={{ flex: '1', background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
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
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#1a1a2e' }}
              />
              <button 
                className="btn btn--primary" 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${referralStats.referralCode}`);
                  toast.success('Link copied to clipboard!');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
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
