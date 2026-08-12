import React from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import DashboardLayout from './components/DashboardLayout'
import TelegramFloat from './components/TelegramFloat'
import RequireAuth from './components/RequireAuth'
import { AuthProvider } from './components/AuthContext'

// Public Pages
const Home = React.lazy(() => import('./pages/Home'))
const WhyTether = React.lazy(() => import('./pages/WhyTether'))
const HowItWorks = React.lazy(() => import('./pages/HowItWorks'))
const Transparency = React.lazy(() => import('./pages/Transparency'))
const StakingPlans = React.lazy(() => import('./pages/StakingPlans'))
const Login = React.lazy(() => import('./pages/Login'))
const Signup = React.lazy(() => import('./pages/Signup'))
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'))

// Dashboard Pages
const DashboardHome = React.lazy(() => import('./pages/DashboardHome'))
const Deposit = React.lazy(() => import('./pages/Deposit'))
const DepositInstructions = React.lazy(() => import('./pages/DepositInstructions'))
const Withdraw = React.lazy(() => import('./pages/Withdraw'))
const Transactions = React.lazy(() => import('./pages/Transactions'))
const Transfer = React.lazy(() => import('./pages/Transfer'))
const Profile = React.lazy(() => import('./pages/Profile'))
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'))
const Stake = React.lazy(() => import('./pages/Stake'))
const MyStakes = React.lazy(() => import('./pages/MyStakes'))

// Dashboard layout wrapper for public pages
const PublicLayout = () => (
  <>
    <Navbar />
    <main>
      <Outlet />
    </main>
    <Footer />
  </>
)

const SuspenseFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
    <div style={{ color: 'var(--color-primary, #009393)', fontWeight: 600, fontSize: '18px' }}>Loading...</div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <TelegramFloat />
        <React.Suspense fallback={<SuspenseFallback />}>
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* The login page has always linked to /forgot-password; until now
                that route did not exist and users landed on the 404 page. */}
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Dashboard Routes — every one of these is behind RequireAuth.
                Previously they were completely unguarded, so /admin rendered
                the full admin UI for anybody who typed the URL. */}
            <Route
              element={(
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              )}
            >
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="deposit" element={<Deposit />} />
              <Route path="deposit-instructions" element={<DepositInstructions />} />
              <Route path="withdraw" element={<Withdraw />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="transfer" element={<Transfer />} />
              <Route path="profile" element={<Profile />} />
              <Route path="stake" element={<Stake />} />
              <Route path="my-stakes" element={<MyStakes />} />
              <Route
                path="admin"
                element={(
                  <RequireAuth adminOnly>
                    <AdminDashboard />
                  </RequireAuth>
                )}
              />
            </Route>

            {/* Fallback route */}
            <Route
              path="*"
              element={(
                <div style={{ padding: '100px', textAlign: 'center' }}>
                  <h2>404 - Page Not Found</h2>
                </div>
              )}
            />
          </Routes>
        </React.Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
