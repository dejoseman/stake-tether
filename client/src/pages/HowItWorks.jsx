import React from 'react'
import TetherLogo from '../components/TetherLogo'

export default function HowItWorks() {
  const chains = [
    'Algorand', 'Avalanche', 'Bitcoin Cash\'s Standard Ledger Protocol', 'Ethereum', 'EOS',
    'Liquid Network', 'Omni', 'Polygon', 'Tezos', 'Tron', 'Solana', 'Statemine'
  ]

  return (
    <>
      <section className="hero" style={{ minHeight: '350px' }}>
        <div className="hero__bg-shapes">
          <div className="hero__shape-semicircle" style={{ opacity: 0.05 }} />
        </div>
        <div className="container hero__content">
          <div className="section-header" style={{ textAlign: 'left', margin: 0, maxWidth: '800px' }}>
            <h1 className="hero__title">What are Tether tokens and how do they work?</h1>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#ffffff', paddingTop: 0, marginTop: '-50px' }}>
        <div className="container">
          <div className="card" style={{ padding: '3rem', position: 'relative', zIndex: 10 }}>
            <p style={{ fontSize: '18px', lineHeight: 1.8, color: '#1a1a2e', fontWeight: 500 }}>
              Tether tokens are assets that move across the blockchain just as easily as other digital currencies but that are pegged to real-world currencies on a <strong>1-to-1 basis</strong>.
            </p>
            <p style={{ marginTop: '1rem', color: '#4a4a68' }}>
              Tether tokens are referred to as stablecoins because they offer price stability as they are pegged to a fiat currency. This offers traders, merchants and funds a low volatility solution when exiting positions in the market. All Tether tokens are pegged at 1-to-1 with a matching fiat currency and are backed 100% by Tether's reserves. As a fully transparent company, we publish a daily record of our current reserve assets and liabilities.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid--2" style={{ alignItems: 'center' }}>
            <div>
              <div style={{ background: '#009393', borderRadius: '16px', padding: '3rem', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <TetherLogo color="#ffffff" size={64} />
                <h3 style={{ marginTop: '1rem', fontSize: '24px' }}>Driving the future of money</h3>
              </div>
            </div>
            <div>
              <h2 className="section-header__title" style={{ textAlign: 'left', marginBottom: '1rem' }}>More stability, more growth</h2>
              <p className="section-header__subtitle" style={{ textAlign: 'left', color: '#4a4a68' }}>
                Tether tokens have grown in popularity over the past few years, with a market cap of more than US$100 billion. Tether tokens allow customers the ability to transact across different blockchains, without the inherent volatility and complexity typically associated with a digital token.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-header__title">Tether tokens are built on multiple blockchains</h2>
            <p className="section-header__subtitle">
              Tether tokens exist as digital tokens built on multiple blockchains. These transport protocols consist of open source software that interface with blockchains to allow for the issuance and redemption of cryptocurrency tokens.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
            {chains.map(chain => (
              <span key={chain} style={{ 
                background: '#f5f7fa', 
                padding: '8px 16px', 
                borderRadius: '999px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#009393',
                border: '1px solid #e2e8f0'
              }}>
                {chain}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-header__title">How does it work?</h2>
            <p className="section-header__subtitle">
              We require our customers to undergo a rigorous verification process before we issue them with Tether tokens. This process is called Know Your Customer (KYC).
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
