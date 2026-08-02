import React from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import DashboardLayout from './components/DashboardLayout'

// Public Pages
import Home from './pages/Home'
import WhyTether from './pages/WhyTether'
import HowItWorks from './pages/HowItWorks'
import Transparency from './pages/Transparency'
import StakingPlans from './pages/StakingPlans'
import Login from './pages/Login'
import Signup from './pages/Signup'

// Dashboard Pages
import DashboardHome from './pages/DashboardHome'
import Deposit from './pages/Deposit'
import Withdraw from './pages/Withdraw'
import Transactions from './pages/Transactions'
import Transfer from './pages/Transfer'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import Stake from './pages/Stake'
import MyStakes from './pages/MyStakes'

// Dashboard layout wrapper for public pages
const PublicLayout = () => {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Pages with Navbar & Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/why-tether" element={<WhyTether />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/transparency" element={<Transparency />} />
          <Route path="/staking-plans" element={<StakingPlans />} />
        </Route>

        {/* Auth Pages without standard Navbar/Footer */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Dashboard Routes with Sidebar Layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="deposit" element={<Deposit />} />
          <Route path="withdraw" element={<Withdraw />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transfer" element={<Transfer />} />
          <Route path="profile" element={<Profile />} />
          <Route path="stake" element={<Stake />} />
          <Route path="my-stakes" element={<MyStakes />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<div style={{ padding: '100px', textAlign: 'center' }}><h2>404 - Page Not Found</h2></div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
