import React, { useState } from 'react'

export default function Transparency() {
  const [activeTab, setActiveTab] = useState('balances')

  return (
    <>
      <section className="hero" style={{ minHeight: '400px' }}>
        <div className="container">
          <div className="grid grid--2" style={{ alignItems: 'center' }}>
            <div>
              <h1 className="hero__title">Transparency</h1>
              <p className="hero__description" style={{ color: '#4a4a68' }}>
                All Tether tokens are pegged at 1-to-1 with a matching fiat currency and are backed 100% by Tether's Reserves. Information about Tether Tokens in circulation is typically published daily. The Tether Issuer's assets exceed its liabilities.
              </p>
            </div>
            
            <div>
              <h3 style={{ fontSize: '20px', marginBottom: '1rem' }}>Tether Tokens in Circulation</h3>
              <p style={{ fontSize: '14px', color: '#4a4a68', marginBottom: '2rem' }}>
                The net circulation metrics below provide information on Tether Tokens in circulation and are for transparency only. These metrics are typically refreshed daily.
              </p>
              
              <div className="card" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
                <div className="grid grid--2">
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a68' }}>USD₮ in Tether</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#009393', margin: '4px 0' }}>$118,430,175,576.29</p>
                    <p style={{ fontSize: '12px', color: '#8888a0' }}>(Net Circulation)</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a68' }}>MXN₮ in Tether</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#009393', margin: '4px 0' }}>Mex$19,562,400.00</p>
                    <p style={{ fontSize: '12px', color: '#8888a0' }}>(Net Circulation)</p>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a68' }}>XAU₮ in Tether</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#009393', margin: '4px 0' }}>₮707,747.09</p>
                    <p style={{ fontSize: '12px', color: '#8888a0' }}>(Net Circulation)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#ffffff', paddingTop: 0 }}>
        <div className="container">
          <div className="tabs" style={{ justifyContent: 'center', marginBottom: '3rem' }}>
            <button 
              className={`tab ${activeTab === 'balances' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('balances')}
            >
              Current Balances
            </button>
            <button 
              className={`tab ${activeTab === 'reports' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Reports & Reserves
            </button>
            <button 
              className={`tab ${activeTab === 'bridges' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('bridges')}
            >
              Bridges
            </button>
          </div>

          <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activeTab === 'balances' && (
              <div style={{ textAlign: 'center', color: '#4a4a68' }}>
                <h3 style={{ fontSize: '24px', color: '#1a1a2e', marginBottom: '1rem' }}>Current Balances</h3>
                <p>Detailed breakdown of authorized but not issued tokens, and net circulation across all supported blockchains.</p>
                <div style={{ marginTop: '2rem', padding: '3rem', border: '1px dashed #e2e8f0', borderRadius: '16px' }}>
                  <p>Balances table will be displayed here.</p>
                </div>
              </div>
            )}
            
            {activeTab === 'reports' && (
              <div style={{ textAlign: 'center', color: '#4a4a68' }}>
                <h3 style={{ fontSize: '24px', color: '#1a1a2e', marginBottom: '1rem' }}>Reports & Reserves</h3>
                <p>Quarterly attestation reports by independent auditors.</p>
                <div style={{ marginTop: '2rem', padding: '3rem', border: '1px dashed #e2e8f0', borderRadius: '16px' }}>
                  <p>Latest assurance reports will be listed here.</p>
                </div>
              </div>
            )}

            {activeTab === 'bridges' && (
              <div style={{ textAlign: 'center', color: '#4a4a68' }}>
                <h3 style={{ fontSize: '24px', color: '#1a1a2e', marginBottom: '1rem' }}>Bridges</h3>
                <p>Information about tokens bridged across networks.</p>
                <div style={{ marginTop: '2rem', padding: '3rem', border: '1px dashed #e2e8f0', borderRadius: '16px' }}>
                  <p>Bridge data will be shown here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
