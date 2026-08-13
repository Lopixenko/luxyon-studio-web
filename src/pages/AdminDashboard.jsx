import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, List, Settings, LogOut, Clock, MessageCircle } from 'lucide-react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { supabase } from '../supabase'

export default function AdminDashboard({ session, onLogout }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Fix timezone issue when selecting dates
  const getDateString = (d) => {
    const offset = d.getTimezoneOffset()
    const safeDate = new Date(d.getTime() - (offset*60*1000))
    return safeDate.toISOString().split('T')[0]
  }

  const fetchAppointments = async () => {
    setLoading(true)
    const dateStr = getDateString(selectedDate)
    
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name)')
      .eq('appointment_date', dateStr)
      .order('appointment_time')
      
    if (data) setAppointments(data)
    setLoading(false)
  }

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

  return (
    <div className="mobile-container" style={{ paddingBottom: '80px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: 'var(--surface)' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>Agenda</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <LogOut size={18} />
          <span style={{ fontSize: '0.875rem' }}>Salir</span>
        </button>
      </header>

      {/* Full Month Calendar */}
      <div style={{ backgroundColor: 'white', padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <Calendar 
          onChange={setSelectedDate} 
          value={selectedDate} 
          locale="es-ES"
          className="custom-calendar"
        />
      </div>

      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)', textTransform: 'capitalize' }}>
          Citas del {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
        </h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>Cargando agenda...</p>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--secondary)' }}>
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
