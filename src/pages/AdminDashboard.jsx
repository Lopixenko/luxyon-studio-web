import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, List, Settings, LogOut, Clock, MessageCircle, ChevronLeft, ChevronRight, Edit3, X, Save } from 'lucide-react'
import { supabase } from '../supabase'

export default function AdminDashboard({ session, onLogout }) {
  const [activeTab, setActiveTab] = useState('agenda')
  
  // --- AGENDA STATE ---
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(new Date())

  // --- CITAS LIST STATE ---
  const [allAppointments, setAllAppointments] = useState([])
  const [allServices, setAllServices] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [editingApp, setEditingApp] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fix timezone issue when selecting dates
  const getDateString = (d) => {
    const offset = d.getTimezoneOffset()
    const safeDate = new Date(d.getTime() - (offset*60*1000))
    return safeDate.toISOString().split('T')[0]
  }

  // Fetch for Agenda (Day View)
  const fetchAgenda = async () => {
    setLoading(true)
    const dateStr = getDateString(selectedDate)
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name, duration)')
      .eq('appointment_date', dateStr)
      .order('appointment_time')
    if (data) setAppointments(data)
    setLoading(false)
  }

  // Fetch for List View (All upcoming)
  const fetchAllList = async () => {
    setLoadingList(true)
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name, duration)')
      .order('appointment_date', { ascending: false })
      .limit(50) // Muestra las últimas 50 para no saturar
    if (data) setAllAppointments(data)
    
    // Traemos servicios para poder editar
    const { data: srvData } = await supabase.from('services').select('*').order('id')
    if (srvData) setAllServices(srvData)
    
    setLoadingList(false)
  }

  useEffect(() => {
    if (activeTab === 'agenda') {
      fetchAgenda()
    } else if (activeTab === 'citas') {
      fetchAllList()
    }
  }, [selectedDate, activeTab])

  const notifyClient = (app) => {
    const text = `¡Hola ${app.client_name}! Soy de LuxyOn Studio. Te escribo para confirmar tu cita para ${app.services?.name} el día ${app.appointment_date} a las ${app.appointment_time?.substring(0, 5)}. ¡Nos vemos pronto!`;
    const waLink = `https://wa.me/${app.client_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${encodeURIComponent(text)}`;
    window.open(waLink, '_blank');
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }
  
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    const { error } = await supabase
      .from('appointments')
      .update({
        appointment_date: editingApp.appointment_date,
        appointment_time: editingApp.appointment_time,
        service_id: editingApp.service_id
      })
      .eq('id', editingApp.id)
      
    setIsSaving(false)
    if (error) {
      alert("Error al guardar: Asegúrate de haber ejecutado las políticas SQL para hacer UPDATE.")
    } else {
      setEditingApp(null)
      fetchAllList() // recargar lista
    }
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
  const startHour = 9; 
  const endHour = 21;  
  const pixelsPerHour = 70; 
  const appColors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6'];

  // Navegación de semanas
  const getDaysOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  }
  
  const weekDays = getDaysOfWeek(selectedDate);
  const monthName = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const changeWeek = (direction) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (direction * 7));
    setSelectedDate(d);
  }

  return (
    <div className="mobile-container" style={{ paddingBottom: '80px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: 'var(--surface)' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>Panel Admin</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <LogOut size={18} />
          <span style={{ fontSize: '0.875rem' }}>Salir</span>
        </button>
      </header>

      {/* -------------------- TAB AGENDA -------------------- */}
      {activeTab === 'agenda' && (
        <>
          <div style={{ backgroundColor: 'white', padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <button onClick={() => changeWeek(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                <ChevronLeft size={24} />
              </button>
              <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '1.1rem' }}>{monthName}</span>
              <button onClick={() => changeWeek(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                <ChevronRight size={24} />
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {weekDays.map((date, i) => {
                const isSelected = getDateString(date) === getDateString(selectedDate);
                const isToday = getDateString(date) === getDateString(new Date());
                const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase();
                return (
                  <div 
                    key={i} 
                    onClick={() => setSelectedDate(date)}
                    style={{ 
                      display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                      padding: '8px 4px', borderRadius: '12px', minWidth: '40px',
                      backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--text)'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', marginBottom: '4px', fontWeight: isSelected ? 600 : 400, opacity: isSelected ? 1 : 0.6 }}>{dayName}</span>
                    <span style={{ 
                      fontSize: '1.1rem', fontWeight: 600, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                      border: isToday && !isSelected ? '1px solid var(--primary)' : 'none',
                      color: isToday && !isSelected ? 'var(--primary)' : 'inherit'
                    }}>
                      {date.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ padding: '24px 16px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>Cargando agenda...</p>
            ) : (
              <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
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

                {appointments.map((app) => {
                  if (!app.appointment_time) return null;
                  const [hStr, mStr] = app.appointment_time.split(':');
                  const h = parseInt(hStr); const m = parseInt(mStr);
                  if (h < startHour || h > endHour) return null; 
                  
                  const top = (h - startHour) * pixelsPerHour + (m / 60) * pixelsPerHour;
                  const durationMins = parseDuration(app.services?.duration);
                  const height = (durationMins / 60) * pixelsPerHour;
                  const bgColor = appColors[app.id % appColors.length];

                  return (
                    <div key={app.id} style={{ position: 'absolute', top: `${top}px`, left: '60px', right: '0px', height: `${height}px`, padding: '2px 8px', zIndex: 10 }}>
                      <div style={{
                        backgroundColor: bgColor, color: 'white', height: '100%', borderRadius: '8px', padding: '8px 12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{app.client_name}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{app.appointment_time.substring(0,5)}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.95, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{app.services?.name}</span>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); notifyClient(app); }}
                          title="Notificar por WhatsApp"
                          style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
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
        </>
      )}

      {/* -------------------- TAB CITAS (LISTA) -------------------- */}
      {activeTab === 'citas' && (
        <div style={{ padding: '24px 16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Gestión de Citas</h2>
          
          {loadingList ? (
            <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>Cargando lista...</p>
          ) : allAppointments.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>No hay citas registradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {allAppointments.map(app => (
                <div key={app.id} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{app.client_name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '2px' }}>{app.appointment_date} a las {app.appointment_time?.substring(0,5)}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>{app.services?.name}</p>
                  </div>
                  <button 
                    onClick={() => setEditingApp(app)}
                    style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}
                  >
                    <Edit3 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- MODAL DE EDICIÓN -------------------- */}
      {editingApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: '#fafafa' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Editar Cita</h3>
              <button onClick={() => setEditingApp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px', color: 'var(--secondary)' }}>Cliente</p>
                <p style={{ fontSize: '1rem', fontWeight: 600 }}>{editingApp.client_name} ({editingApp.client_phone})</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Servicio</label>
                <select 
                  value={editingApp.service_id} 
                  onChange={e => setEditingApp({...editingApp, service_id: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '1rem', backgroundColor: 'white' }}
                >
                  {allServices.map(srv => (
                    <option key={srv.id} value={srv.id}>{srv.name} ({srv.price})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Fecha</label>
                  <input 
                    type="date" 
                    value={editingApp.appointment_date} 
                    onChange={e => setEditingApp({...editingApp, appointment_date: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontFamily: 'inherit' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Hora</label>
                  <input 
                    type="time" 
                    value={editingApp.appointment_time} 
                    onChange={e => setEditingApp({...editingApp, appointment_time: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontFamily: 'inherit' }} 
                  />
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="btn btn-full" style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- BOTTOM TAB BAR -------------------- */}
      <div style={{ position: 'fixed', bottom: 0, width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'space-around', padding: '12px', backgroundColor: 'white', borderTop: '1px solid var(--border)', zIndex: 100 }}>
        <button onClick={() => setActiveTab('agenda')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === 'agenda' ? 'var(--primary)' : 'var(--secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <CalendarIcon size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: activeTab === 'agenda' ? 600 : 500 }}>Agenda</span>
        </button>
        <button onClick={() => setActiveTab('citas')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === 'citas' ? 'var(--primary)' : 'var(--secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <List size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: activeTab === 'citas' ? 600 : 500 }}>Citas</span>
        </button>
        <button onClick={() => setActiveTab('servicios')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === 'servicios' ? 'var(--primary)' : 'var(--secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <Settings size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: activeTab === 'servicios' ? 600 : 500 }}>Ajustes</span>
        </button>
      </div>
    </div>
  )
}
