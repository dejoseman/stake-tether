import React from 'react'
import { Link } from 'react-router-dom'

export default function WhyTether() {
  const benefits = [
    {
      title: 'Pioneering Technology',
      text: 'USDt stablecoins are the most widely adopted digital dollars, having pioneered the concept in the digital token space.',
    },
    {
      title: 'Built on Multiple Blockchains',
      text: 'USDt tokens are built on multiple blockchains, offering easy integration and adoption. Supported blockchains include Algorand, Avalanche, Ethereum, Polygon, Tron, Solana, and more.',
    },
    {
      title: 'Unparalleled Liquidity',
      text: 'USDt tokens are among the most traded tokens by daily volume, offering unequalled liquidity across major exchanges worldwide.',
    },
    {
      title: 'Widespread Adoption',
      text: 'From exchanges and digital wallets to DeFi protocols and payment services, USDt tokens offer a smart alternative to fiat gateways.',
    },
    {
      title: '100% Backed by Reserves',
      text: 'All USDt tokens are pegged at 1-to-1 with a matching fiat currency and are backed 100% by verified reserves.',
    },
    {
      title: 'Fully Transparent',
      text: 'USDt issued and reserve assets are publicly available and updated daily for full transparency.',
    },
    {
      title: 'Multiple Currencies',
      text: 'Stablecoins represent multiple fiat currencies, including USD (USDt), EUR (EURt), MXN (MXNt), and CNH (CNHt).',
    },
    {
      title: 'World-Class Support',
      text: 'GeneratingPro offers world-class customer support and onboarding for businesses and individuals alike.',
    },
  ]

  const disruptors = [
    {
      title: 'For Individuals',
      text: 'USDt tokens offer exceptional liquidity on tier-one exchanges, giving traders the ability to take advantage of arbitrage opportunities in the fastest time possible.',
    },
    {
      title: 'For Merchants',
      text: 'Integrating USDt tokens opens up an array of opportunities for consumers to purchase products and services seamlessly across a variety of merchants and platforms.',
    },
    {
      title: 'For Exchanges',
      text: 'USDt tokens play a pivotal role in the digital token ecosystem and are the most actively traded in terms of 24-hour volume.',
    },
  ]

  return (
    <>
      <section className="hero" style={{ minHeight: '400px' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h1 className="hero__title">Why use USDt?</h1>
            <p className="hero__description" style={{ margin: '0 auto' }}>
              USDt stablecoins are the most widely adopted digital dollars, having pioneered the concept in the digital token space. A disruptor to the conventional financial system and a trailblazer in the digital use of traditional currencies, USDt tokens support and empower growing ventures and innovation throughout the blockchain space.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="grid grid--2">
            {benefits.map((b, i) => (
              <div className="card" key={i}>
                <h3 className="card__title">{b.title}</h3>
                <p className="card__text">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-header__title">Disrupting the financial industry</h2>
          </div>
          <div className="grid grid--3">
            {disruptors.map((d, i) => (
              <div className="card" key={i}>
                <h3 className="card__title">{d.title}</h3>
                <p className="card__text">{d.text}</p>
                <Link to="/how-it-works" className="card__link">
                  Learn more
                  <svg viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.4 6L10.1 1.7M14.4 6L10.1 10.3M14.4 6H1.1" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
