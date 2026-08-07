import React from 'react'
import { Link } from 'react-router-dom'
import { Link2, Droplets, ShieldCheck, Wallet, Eye, CheckCircle2, User, ShoppingCart, LineChart } from 'lucide-react'
import TetherLogo from '../components/TetherLogo'
import { motion } from 'framer-motion'

export default function Home() {
  const features = [
    {
      icon: <Link2 size={32} strokeWidth={1.5} color="#009393" />,
      title: 'Multiple Blockchains',
      text: 'USDt tokens are built on multiple blockchains offering easy integration and adoption across Ethereum, Tron, Solana, Avalanche, Polygon, and more.',
    },
    {
      icon: <Droplets size={32} strokeWidth={1.5} color="#009393" />,
      title: 'Unparalleled Liquidity',
      text: 'USDt tokens are among the most traded tokens by daily volume, offering unequalled liquidity across major exchanges worldwide.',
    },
    {
      icon: <ShieldCheck size={32} strokeWidth={1.5} color="#009393" />,
      title: '100% Backed by Reserves',
      text: 'All USDt tokens are pegged 1-to-1 with a matching fiat currency and are backed 100% by verified reserves.',
    },
    {
      icon: <Wallet size={32} strokeWidth={1.5} color="#009393" />,
      title: 'Widespread Adoption',
      text: 'From exchanges and digital wallets to DeFi protocols and payment services, USDt tokens offer a smart alternative to fiat gateways.',
    },
    {
      icon: <Eye size={32} strokeWidth={1.5} color="#009393" />,
      title: 'Fully Transparent',
      text: 'USDt issued and reserve assets are publicly available and updated daily for full transparency.',
    },
    {
      icon: <CheckCircle2 size={32} strokeWidth={1.5} color="#009393" />,
      title: 'Regulatory Compliant',
      text: 'GeneratingPro maintains world-class compliance measures for AML, CFT, sanctions, and KYC laws and regulations.',
    },
  ]

  const useCases = [
    {
      icon: <User size={48} strokeWidth={1.5} color="#009393" />,
      title: 'For Individuals',
      text: 'USDt tokens offer exceptional liquidity on tier-one exchanges, giving traders the ability to take advantage of arbitrage opportunities quickly.',
    },
    {
      icon: <ShoppingCart size={48} strokeWidth={1.5} color="#009393" />,
      title: 'For Merchants',
      text: 'Integrating USDt tokens opens up an array of opportunities for consumers to purchase products and services seamlessly.',
    },
    {
      icon: <LineChart size={48} strokeWidth={1.5} color="#009393" />,
      title: 'For Exchanges',
      text: 'USDt tokens play a pivotal role in the digital token ecosystem and are the most actively traded in terms of 24-hour volume.',
    },
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__bg-shapes">
          <div className="hero__shape-diamond" />
          <div className="hero__shape-triangle" />
          <div className="hero__shape-semicircle" />
        </div>
        <div className="container hero__content">
          <div className="hero__grid">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="hero__title hero__title--lg">
                Driving the Future of Money
              </h1>
              <p className="hero__description">
                USDt stablecoins are the most widely adopted digital dollars, having pioneered the concept in the digital token space. A disruptor to the conventional financial system and a trailblazer in the digital use of traditional currencies.
              </p>
              <div className="hero__actions">
                <Link to="/signup" className="btn btn--primary btn--lg">Create Account</Link>
                <Link to="/how-it-works" className="btn btn--secondary btn--lg">Learn How It Works</Link>
              </div>
            </motion.div>
            <motion.div
              className="coin-orbit"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="coin-orbit__ring" />
              <div className="coin-orbit__center">
                <TetherLogo color="#ffffff" size={44} />
              </div>

              <div className="coin-orbit__item coin-orbit__item--teal" style={{ top: '50%', right: 0, transform: 'translateY(-50%)' }}>USDt</div>

              <div className="coin-orbit__item coin-orbit__item--teal" style={{ top: '50%', left: 0, transform: 'translateY(-50%)' }}>MXNt</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-header__title">Trusted by Millions Worldwide</h2>
            <p className="section-header__subtitle">
              USDt stablecoins are the most widely used digital dollars across the globe, built for stability, transparency, and reliability.
            </p>
          </div>
          <div className="grid grid--3">
            <div className="stat-card">
              <p className="stat-card__label">USDt Market Cap</p>
              <p className="stat-card__value">$183.7B+</p>
              <p className="stat-card__sub">Net Circulation</p>
            </div>
            <div className="stat-card">
              <p className="stat-card__label">Supported Blockchains</p>
              <p className="stat-card__value">16+</p>
              <p className="stat-card__sub">And Growing</p>
            </div>
            <div className="stat-card">
              <p className="stat-card__label">Daily Trading Volume</p>
              <p className="stat-card__value">$50B+</p>
              <p className="stat-card__sub">Across All Pairs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-header__title">Why Choose GeneratingPro?</h2>
            <p className="section-header__subtitle">
              Whether for personal use or business, USDt tokens offer many benefits as the most stable, liquid, and trusted stablecoin.
            </p>
          </div>
          <div className="grid grid--2">
            {features.map((f) => (
              <div className="card" key={f.title}>
                <div className="card__icon">
                  <span style={{ fontSize: 24 }}>{f.icon}</span>
                </div>
                <h3 className="card__title">{f.title}</h3>
                <p className="card__text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-header__title">The Token Disrupting Global Finance</h2>
          </div>
          <div className="grid grid--3">
            {useCases.map((uc) => (
              <div className="card" key={uc.title}>
                <div className="card__icon">
                  <span style={{ fontSize: 24 }}>{uc.icon}</span>
                </div>
                <h3 className="card__title">{uc.title}</h3>
                <p className="card__text">{uc.text}</p>
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
