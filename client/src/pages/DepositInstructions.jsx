import React, { useState } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Copy, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function DepositInstructions() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!state || !state.amount || !state.network || !state.address) {
    return <Navigate to="/deposit" />;
  }

  const { amount, network, address } = state;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard!');
  };

  const handleSaveDeposit = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/transactions/deposit', 
        { amount: Number(amount), network },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsSaved(true);
      toast.success('Deposit saved successfully! Admin has been notified.');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to save deposit.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '24px' }}>Complete Your Deposit</h1>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ background: isSaved ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isSaved ? '#86efac' : '#f87171'}`, borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px', textAlign: 'left' }}>
          {isSaved ? <CheckCircle2 color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertCircle color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />}
          <div>
            <h4 style={{ color: isSaved ? '#166534' : '#991b1b', margin: '0 0 4px 0', fontSize: '16px' }}>
              {isSaved ? 'Deposit Saved' : 'Action Required'}
            </h4>
            <p style={{ margin: 0, color: isSaved ? '#15803d' : '#b91c1c', fontSize: '14px', lineHeight: 1.5 }}>
              {isSaved 
                ? 'Your deposit has been saved and admin notified. We will credit your account once confirmed on-chain.' 
                : `To complete the deposit, please send exactly $${amount} USDt to the address below via the ${network} network, then click "I Have Paid".`}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Amount to Send
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#009393' }}>
            ${amount} <span style={{ fontSize: '20px', color: '#1a1a2e' }}>USDt</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '2px solid #e2e8f0', marginBottom: '32px' }}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            Deposit Address ({network})
          </div>
          <div style={{ 
            background: 'white', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #cbd5e1', 
            wordBreak: 'break-all',
            fontSize: '15px',
            color: '#1a1a2e',
            fontWeight: 500,
            marginBottom: '16px'
          }}>
            {address}
          </div>
          <button 
            onClick={handleCopy}
            className="btn btn--primary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Copy size={18} /> Copy Address
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px', color: '#475569' }}>
            <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0 }} /> 
            Send only USDt on the {network} network to this address.
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px', color: '#475569' }}>
            <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0 }} /> 
            Our admin team has been notified and will verify your transfer on-chain.
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px', color: '#475569' }}>
            <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0 }} /> 
            Your balance will be updated automatically upon admin approval.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
          {!isSaved && (
            <button 
              onClick={handleSaveDeposit}
              className="btn btn--primary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={isSaving}
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'I Have Paid'}
            </button>
          )}

          <button 
            onClick={() => navigate('/dashboard')}
            className={isSaved ? "btn btn--primary" : "btn btn--secondary"}
            style={{ width: '100%' }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
