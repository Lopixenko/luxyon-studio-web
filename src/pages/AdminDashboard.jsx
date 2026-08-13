import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, List, Settings, LogOut, Clock, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { supabase } from '../supabase'

export default function AdminDashboard({ session, onLogout }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  
  const todayStr = new Date().toISOString().split('T')[0]
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
    
    // Traemos también la duración para calcular el tamaño en el calendario
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name, duration)')
      .eq('appointment_date', dateStr)
      .order('appointment_time')
      
    if (data) setAppointments(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
  }, [selectedDate])

  const notifyClient = (app) => {
    const text = `¡Hola ${app.client_name}! Soy Dunia de LuxyOn Studio. Te escribo para confirmar tu cita para ${app.services?.name} el día ${app.appointment_date} a las ${app.appointment_time?.substring(0, 5)}. ¡Nos vemos pronto!`;
    const waLink = `https://wa.me/${app.client_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${encodeURIComponent(text)}`;
    window.open(waLink, '_blank');
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  // Parse "1h 15 min" into minutes for calendar block height
  const parseDuration = (str) => {
    if (!str) return 60;
    let minutes = 0;
    const lowerStr = str.toLowerCase();
    if (lowerStr.includes('h')) {
      const parts = lowerStr.split('h');
      minutes += parseInt(parts[0]) * 60;
      if (parts[1] && parts[1].includes('min')) {
        minutes += parseInt(parts[1].replace('min', '').trim());
      }
    } else if (lowerStr.includes('min')) {
      minutes += parseInt(lowerStr.replace('min', '').trim());
    }
    return isNaN(minutes) || minutes === 0 ? 60 : minutes;
  }

  // Configuración del timeline
  const startHour = 9; // Empieza a las 09:00
  const endHour = 21;  // Termina a las 21:00
  const pixelsPerHour = 70; // Altura de cada hora en píxeles

  return (
    <div className="mobile-container" style={{ paddingBottom: '80px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: 'var(--surface)' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>Agenda</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <LogOut size={18} />
          <span style={{ fontSize: '0.875rem' }}>Salir</span>
        </button>
      </header>

      {/* Mini Calendario superior colapsable (se podría hacer un acordeón, por ahora lo dejamos fijo) */}
      <div style={{ backgroundColor: 'white', padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <Calendar 
          onChange={setSelectedDate} 
          value={selectedDate} 
          locale="es-ES"
          className="custom-calendar"
        />
      </div>

      <div style={{ padding: '24px 16px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)', textTransform: 'capitalize' }}>
          {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>Cargando agenda...</p>
        ) : (
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            
            {/* Rejilla de Horas de fondo */}
            {Array.from({ length: endHour - startHour + 1 }).map((_, i) => {
              const hour = startHour + i;
              return (
                <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', height: `${pixelsPerHour}px` }}>
                  <div style={{ width: '60px', padding: '8px', color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 500, borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#fafafa' }}></div>
                </div>
              )
            })}

            {/* Citas posicionadas encima del calendario */}
            {appointments.map(app => {
              if (!app.appointment_time) return null;
              const [hStr, mStr] = app.appointment_time.split(':');
              const h = parseInt(hStr);
              const m = parseInt(mStr);
              
              if (h < startHour || h > endHour) return null; // Si está fuera de horario normal
              
              // Calcular posición Y basada en la hora
              const top = (h - startHour) * pixelsPerHour + (m / 60) * pixelsPerHour;
              const durationMins = parseDuration(app.services?.duration);
              const height = (durationMins / 60) * pixelsPerHour;

              return (
                <div key={app.id} style={{ 
                  position: 'absolute', 
                  top: `${top}px`, 
                  left: '60px', 
                  right: '0px', 
                  height: `${height}px`,
                  padding: '2px 8px', // Espacio para que no toque los bordes
                  zIndex: 10
                }}>
                  <div style={{
                    backgroundColor: 'var(--primary)', // Color marrón pastel
                    color: 'white',
                    height: '100%',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.client_name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9 }}>{app.appointment_time.substring(0,5)}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.services?.name}</span>
                    
                    {/* Botón flotante para notificar dentro del bloque */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); notifyClient(app); }}
                      title="Notificar por WhatsApp"
                      style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{ position: 'fixed', bottom: 0, width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'space-around', padding: '16px', backgroundColor: 'white', borderTop: '1px solid var(--border)', zIndex: 100 }}>
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
