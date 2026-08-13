import { useState } from 'react'
import { supabase } from '../supabase'

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onLogin(data.session)
    }
  }

  return (
    <div className="mobile-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>LuxyOn Admin</h1>
        <p style={{ color: 'var(--secondary)', marginTop: '8px' }}>Panel de gestión exclusivo</p>
      </div>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--surface)', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Correo electrónico</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem', outline: 'none' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Contraseña</label>
          <input 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem', outline: 'none' }}
            required
          />
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '4px' }}>{error}</p>}
        <button type="submit" className="btn btn-full" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Comprobando...' : 'Entrar al panel'}
        </button>
      </form>
    </div>
  )
}
