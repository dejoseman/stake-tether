import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Withdraw() {
  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [network, setNetwork] = useState('')
  const [networks, setNetworks] = useState([])

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
        if (res.data?.cryptoNetworks?.length > 0) {
          setNetworks(res.data.cryptoNetworks)
          setNetwork(res.data.cryptoNetworks[0])
        }
      } catch (err) {}
    }
    fetchSettings()
  }, [])

  const handleWithdraw = async (e) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/transactions/withdraw', 
        { amount: Number(amount), address, network },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(`Withdrawal of ${amount} USDt initiated to ${address}.`)
      setAmount('')
      setAddress('')
    } catch (err) {
      toast.error(err.response?.data?.msg || 'An error occurred.')
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', color: '#1a1a2e', marginBottom: '24px' }}>Withdraw Funds</h1>
      
      <div className="card">
        <div style={{ background: '#f5f7fa', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#4a4a68', fontWeight: 600 }}>Asset</span>
          <span style={{ color: '#009393', fontWeight: 800, fontSize: '16px' }}>Tether USDt</span>
        </div>

        <form onSubmit={handleWithdraw}>
          <div className="form-group">
            <label>Destination Address</label>
            <input
              type="text"
              placeholder="Enter wallet address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Network</label>
            <select 
              style={{ width: '100%', padding: '12px 16px', fontSize: '15px', borderRadius: '8px', border: '2px solid #e2e8f0', background: 'white' }}
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              {networks.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label>Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8888a0', fontWeight: 600 }}>$</span>
              <input
                type="number"
                placeholder="0.00"
                min="10"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ paddingLeft: '32px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#8888a0' }}>
              <span>Minimum withdrawal: $10.00</span>
              <span>Network fee: $1.00</span>
            </div>
          </div>

          <button type="submit" className="btn btn--primary" style={{ width: '100%' }}>
            Confirm Withdrawal
          </button>
        </form>
      </div>
    </div>
  )
}
