import { useState, useEffect } from 'react'
import { Calendar, List, Settings, LogOut, Check, X, Clock, MessageCircle } from 'lucide-react'
import { supabase } from '../supabase'

export default function AdminDashboard({ session, onLogout }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAppointments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name)')
      .order('appointment_date')
      
    if (data) setAppointments(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const updateStatus = async (app, newStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', app.id)

    if (!error) {
      // Update UI locally
      setAppointments(appointments.map(a => a.id === app.id ? { ...a, status: newStatus } : a))
      
      // If confirming, generate WhatsApp link
      if (newStatus === 'confirmed') {
        const text = `¡Hola ${app.client_name}! Soy de LuxyOn Studio. Te confirmo tu cita para ${app.services?.name} el día ${app.appointment_date} a las ${app.appointment_time?.substring(0, 5)}. ¡Nos vemos pronto!`;
        const waLink = `https://wa.me/${app.client_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${encodeURIComponent(text)}`;
        window.open(waLink, '_blank');
      }
      
      // If rejecting, generate WhatsApp link
      if (newStatus === 'cancelled') {
        const text = `Hola ${app.client_name}, soy de LuxyOn Studio. Siento decirte que no tenemos disponibilidad para tu cita el día ${app.appointment_date}. ¿Te vendría bien otro horario?`;
        const waLink = `https://wa.me/${app.client_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${encodeURIComponent(text)}`;
        window.open(waLink, '_blank');
      }
    } else {
      alert("Error al actualizar la cita. Asegúrate de haber ejecutado el comando SQL de actualización.");
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  // Filtrar para no mostrar las canceladas en la lista principal (opcional)
  const activeAppointments = appointments.filter(a => a.status !== 'cancelled')

  return (
    <div className="mobile-container" style={{ paddingBottom: '80px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: 'var(--surface)' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>Mi Agenda</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <LogOut size={18} />
          <span style={{ fontSize: '0.875rem' }}>Salir</span>
        </button>
      </header>

      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Citas</h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>Cargando citas...</p>
        ) : activeAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--secondary)' }}>
            <Calendar size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <p>No tienes citas hoy.</p>
          </div>
        ) : (
          activeAppointments.map(app => (
            <div key={app.id} style={{ 
              backgroundColor: 'white', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '12px', 
              border: app.status === 'pending' ? '2px solid #fbbf24' : '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{app.client_name}</span>
                <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {app.appointment_date} | {app.appointment_time?.substring(0, 5)}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '8px', fontWeight: 500 }}>
                {app.services?.name}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageCircle size={14} /> {app.client_phone}
                </span>
                
                {app.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => updateStatus(app, 'cancelled')}
                      style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <X size={14} /> Rechazar
                    </button>
                    <button 
                      onClick={() => updateStatus(app, 'confirmed')}
                      style={{ background: '#dcfce7', color: '#22c55e', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Check size={14} /> Confirmar
                    </button>
                  </div>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>
                    <Check size={14} /> Confirmada
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{ position: 'fixed', bottom: 0, width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'space-around', padding: '16px', backgroundColor: 'white', borderTop: '1px solid var(--border)' }}>
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
