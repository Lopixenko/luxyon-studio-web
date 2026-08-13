import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, List, Settings, LogOut, Clock, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../supabase'

export default function AdminDashboard({ session, onLogout }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Format YYYY-MM-DD for the current day
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)

  const fetchAppointments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name)')
      .eq('appointment_date', selectedDate)
      .order('appointment_time')
      
    if (data) setAppointments(data)
    setLoading(false)
  }

  // Fetch whenever the selected date changes
  useEffect(() => {
    fetchAppointments()
  }, [selectedDate])

  const notifyClient = (app) => {
    const text = `¡Hola ${app.client_name}! Soy de LuxyOn Studio. Te escribo para confirmar tu cita para ${app.services?.name} el día ${app.appointment_date} a las ${app.appointment_time?.substring(0, 5)}. ¡Nos vemos pronto!`;
    const waLink = `https://wa.me/${app.client_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${encodeURIComponent(text)}`;
    window.open(waLink, '_blank');
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  // Navigate dates left and right
  const changeDate = (days) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  // Human readable date string for display
  const dateObj = new Date(selectedDate)
  const displayDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mobile-container" style={{ paddingBottom: '80px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: 'var(--surface)' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>Agenda</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <LogOut size={18} />
          <span style={{ fontSize: '0.875rem' }}>Salir</span>
        </button>
      </header>

      {/* Date Navigator (Mini Calendar) */}
      <div style={{ backgroundColor: 'white', padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--primary)' }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', outline: 'none', textAlign: 'center', cursor: 'pointer' }} 
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', textTransform: 'capitalize', marginTop: '2px' }}>{displayDate}</p>
        </div>
        <button onClick={() => changeDate(1)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--primary)' }}>
          <ChevronRight size={24} />
        </button>
      </div>

      <div style={{ padding: '24px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>Cargando agenda...</p>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--secondary)' }}>
            <CalendarIcon size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <p>No tienes citas programadas este día.</p>
          </div>
        ) : (
          appointments.map(app => (
            <div key={app.id} style={{ 
              backgroundColor: 'white', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '12px', 
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{app.client_name}</span>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {app.appointment_time?.substring(0, 5)}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '8px', fontWeight: 500 }}>
                {app.services?.name}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageCircle size={14} /> {app.client_phone}
                </span>
                
                <button 
                  onClick={() => notifyClient(app)}
                  style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MessageCircle size={14} /> Notificar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{ position: 'fixed', bottom: 0, width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'space-around', padding: '16px', backgroundColor: 'white', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--primary)' }}>
          <CalendarIcon size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>Agenda</span>
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
