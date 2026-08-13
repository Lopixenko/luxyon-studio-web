import { useState, useEffect } from 'react'
import { Calendar, List, Settings, LogOut, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../supabase'

export default function AdminDashboard({ session, onLogout }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAppointments() {
      // In a real app we would filter by date, for now we fetch all
      const { data } = await supabase
        .from('appointments')
        .select('*, services(name)')
        .order('appointment_date')
        
      if (data) setAppointments(data)
      setLoading(false)
    }
    fetchAppointments()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  return (
    <div className="mobile-container" style={{ paddingBottom: '80px', backgroundColor: '#f9f9f9' }}>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: 'var(--surface)' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>Mi Agenda</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <LogOut size={18} />
          <span style={{ fontSize: '0.875rem' }}>Salir</span>
        </button>
      </header>

      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Citas Pendientes</h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>Cargando citas...</p>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--secondary)' }}>
            <Calendar size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <p>No tienes citas hoy.</p>
          </div>
        ) : (
          appointments.map(app => (
            <div key={app.id} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{app.client_name}</span>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {app.appointment_time?.substring(0, 5)}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '8px', fontWeight: 500 }}>
                {app.services?.name}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>📞 {app.client_phone}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#f59e0b' }}>
                  <Clock size={14} /> {app.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', display: 'flex', justifyContent: 'space-around', padding: '16px', backgroundColor: 'white', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--primary)' }}>
          <Calendar size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>Citas</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--secondary)' }}>
          <List size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Servicios</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--secondary)' }}>
          <Settings size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Ajustes</span>
        </div>
      </div>
    </div>
  )
}
