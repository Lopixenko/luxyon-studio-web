import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, List, Settings, LogOut, Clock, MessageCircle, ChevronLeft, ChevronRight, Edit3, X, Save, Users, User } from 'lucide-react'
import { supabase } from '../supabase'

export default function AdminDashboard({ session, onLogout }) {
  const [activeTab, setActiveTab] = useState('agenda')
  
  // --- AGENDA STATE ---
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const [allServices, setAllServices] = useState([])
  const [editingApp, setEditingApp] = useState(null)

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase.from('services').select('*').order('id')
      if (data) setAllServices(data)
    }
    fetchServices()
  }, [])
  
  // --- CLIENTAS STATE ---
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  
  // --- SETTINGS STATE ---
  const [specialDays, setSpecialDays] = useState([])

  const [isSaving, setIsSaving] = useState(false)

  const getDateString = (d) => {
    const offset = d.getTimezoneOffset()
    const safeDate = new Date(d.getTime() - (offset*60*1000))
    return safeDate.toISOString().split('T')[0]
  }

  const fetchAgenda = async () => {
    setLoading(true)
    const dateStr = getDateString(selectedDate)
    const { data } = await supabase.from('appointments').select('*, services(name, duration)').eq('appointment_date', dateStr).order('appointment_time')
    if (data) setAppointments(data)
    setLoading(false)
  }

  const fetchClients = async () => {
    setLoadingClients(true)
    const { data } = await supabase.from('clients').select('*').order('name')
    if (data) setClients(data)
    setLoadingClients(false)
  }

  const fetchSpecialDays = async () => {
    const { data } = await supabase.from('special_days').select('*').order('date')
    if (data) setSpecialDays(data)
  }

  useEffect(() => {
    if (activeTab === 'agenda') {
      fetchAgenda()
    } else if (activeTab === 'clientas') {
      fetchClients()
    } else if (activeTab === 'servicios') {
      fetchSpecialDays()
    }
  }, [selectedDate, activeTab])

  const notifyClient = (app) => {
    const text = `¡Hola ${app.client_name}! Soy de LuxyOn Studio. Te escribo para confirmar tu cita para ${getAppNames(app)} el día ${app.appointment_date} a las ${app.appointment_time?.substring(0, 5)}. ¡Nos vemos pronto!`;
    const waLink = `https://wa.me/${app.client_phone.replace(/\+/g, '').replace(/ /g, '')}?text=${encodeURIComponent(text)}`;
    window.open(waLink, '_blank');
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }
  
  const handleSaveEditApp = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    let query = supabase
      .from('appointments')
      .select('id, appointment_time, services(duration), services_json')
      .eq('appointment_date', editingApp.appointment_date);
      
    if (!editingApp.isNew) {
      query = query.neq('id', editingApp.id);
    }
    
    const { data: dateApps } = await query;

    let reqDur = 0;
    if (editingApp.services_json && editingApp.services_json.length > 0) {
      reqDur = getAppDuration(editingApp);
    } else {
      const reqSrv = allServices.find(s => s.id === editingApp.service_id);
      reqDur = parseDuration(reqSrv?.duration);
    }
    
    const [h, m] = editingApp.appointment_time.split(':');
    const startMins = parseInt(h) * 60 + parseInt(m);
    const endMins = startMins + reqDur;

    // Permitimos a los admins reservar a cualquier hora, eliminando el límite estricto de 09:00-19:00 si así lo desean.

    let isOverlapping = false;
    for (const app of dateApps || []) {
      if (!app.appointment_time) continue;
      const [appH, appM] = app.appointment_time.split(':');
      const appStartMins = parseInt(appH) * 60 + parseInt(appM);
      const appDur = getAppDuration(app);
      const appEndMins = appStartMins + appDur;
      
      if (startMins < appEndMins && endMins > appStartMins) {
        isOverlapping = true;
        break;
      }
    }

    if (isOverlapping) {
      alert("¡Ojo! El horario seleccionado se solapa con otra cita existente en ese día.");
      setIsSaving(false);
      return;
    }
    
    let error = null;
    
    if (editingApp.isNew) {
      const res = await supabase
        .from('appointments')
        .insert([{
          client_name: editingApp.client_name,
          client_phone: editingApp.client_phone,
          appointment_date: editingApp.appointment_date,
          appointment_time: editingApp.appointment_time,
          service_id: editingApp.service_id,
          services_json: editingApp.services_json,
          status: 'confirmed'
        }]);
      error = res.error;
    } else {
      const res = await supabase
        .from('appointments')
        .update({
          client_name: editingApp.client_name,
          client_phone: editingApp.client_phone,
          appointment_date: editingApp.appointment_date,
          appointment_time: editingApp.appointment_time,
          service_id: editingApp.service_id,
          services_json: editingApp.services_json
        })
        .eq('id', editingApp.id);
      error = res.error;
    }
      
    setIsSaving(false)
    if (error) {
      alert("Error al guardar la cita.");
    } else {
      setEditingApp(null);
      fetchAgenda() 
    }
  }

  const handleSaveEditClient = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    const { error } = await supabase
      .from('clients')
      .update({
        name: editingClient.name,
        phone: editingClient.phone,
        notes: editingClient.notes
      })
      .eq('id', editingClient.id)
      
    setIsSaving(false)
    if (error) {
      alert("Error al guardar la clienta.")
    } else {
      setEditingClient(null)
      fetchClients() 
    }
  }

  const parseDuration = (str) => {
    if (!str) return 60;
    let minutes = 0;
    const lowerStr = str.toLowerCase();
    
    if (lowerStr.includes('0m') || lowerStr.includes('0 m') || lowerStr.includes('sin tiempo')) {
      return 0;
    }
    
    // Extraer horas (ej: "1h", "1 h", "2horas")
    const hMatch = lowerStr.match(/(\d+)\s*h/);
    if (hMatch) minutes += parseInt(hMatch[1]) * 60;
    
    // Extraer minutos (ej: "30m", "15 mins", "45 minutos")
    const mMatch = lowerStr.match(/(\d+)\s*m/);
    if (mMatch) minutes += parseInt(mMatch[1]);
    
    return isNaN(minutes) || minutes === 0 ? 60 : minutes;
  }

  const getAppDuration = (app) => {
    let dur = 0;
    if (app.services_json && app.services_json.length > 0) {
      dur = app.services_json.reduce((sum, s) => sum + parseDuration(s.duration), 0);
    } else {
      dur = parseDuration(app.services?.duration);
    }
    return Math.max(15, dur); // Mínimo 15 mins para que se renderice la tarjeta en la agenda
  }

  const getAppNames = (app) => {
    if (app.services_json && app.services_json.length > 0) {
      return app.services_json.map(s => s.name).join(' + ');
    }
    return app.services?.name;
  }

  // --- CONFIGURACIÓN DEL CALENDARIO ---
  const startHour = 9; 
  const endHour = 19;  
  const pixelsPerHour = 100; // Más altura para poder ver bien los huecos de 15 minutos

  // Colores extraídos del diseño de referencia (pastel con borde lateral fuerte)
  const appColors = [
    { bg: '#E0F2F1', border: '#00BFA5' }, // Cyan
    { bg: '#EDE7F6', border: '#651FFF' }, // Purple
    { bg: '#E8F5E9', border: '#00C853' }, // Green
    { bg: '#FFEBEE', border: '#FF1744' }, // Red
    { bg: '#FFF3E0', border: '#FF9100' }, // Orange
    { bg: '#E3F2FD', border: '#2979FF' }, // Blue
  ];

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
        <h1 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>Luxy On Administración</h1>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '1.1rem' }}>{monthName}</span>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '12px', backgroundColor: 'var(--primary)', color: 'white', border: 'none' }}
                  onClick={() => setEditingApp({ isNew: true, client_name: '', client_phone: '', appointment_date: getDateString(selectedDate), appointment_time: '09:00', services_json: [] })}
                >
                  + Cita
                </button>
              </div>
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
              <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                {Array.from({ length: endHour - startHour + 1 }).map((_, i) => {
                  const hour = startHour + i;
                  const isLastHour = hour === endHour;
                  
                  return (
                    <div key={hour} style={{ display: 'flex', height: isLastHour ? `${pixelsPerHour / 4}px` : `${pixelsPerHour}px`, position: 'relative' }}>
                      <div style={{ width: '60px', color: 'var(--secondary)', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: isLastHour ? '100%' : '25%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        {!isLastHour && (
                          <>
                            <div style={{ height: '25%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12px', fontSize: '0.65rem', fontWeight: 500, color: '#94a3b8' }}>
                              15
                            </div>
                            <div style={{ height: '25%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12px', fontSize: '0.65rem', fontWeight: 500, color: '#94a3b8' }}>
                              30
                            </div>
                            <div style={{ height: '25%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12px', fontSize: '0.65rem', fontWeight: 500, color: '#94a3b8' }}>
                              45
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ flex: 1, backgroundColor: '#fafafa', position: 'relative', borderBottom: isLastHour ? 'none' : '1px solid #e2e8f0' }}>
                        {!isLastHour && (
                          <>
                            <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, borderTop: '1px dashed #e2e8f0' }}></div>
                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid #cbd5e1' }}></div>
                            <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, borderTop: '1px dashed #e2e8f0' }}></div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Línea roja de hora actual */}
                {getDateString(new Date()) === getDateString(selectedDate) && new Date().getHours() >= startHour && new Date().getHours() <= endHour && (
                  <div style={{
                    position: 'absolute',
                    top: `${((new Date().getHours() - startHour) * pixelsPerHour) + ((new Date().getMinutes() / 60) * pixelsPerHour)}px`,
                    left: 0, right: 0, height: '1px', backgroundColor: '#ef4444', zIndex: 15
                  }}>
                    <div style={{ position: 'absolute', left: '56px', top: '-4px', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                  </div>
                )}

                {appointments.map((app) => {
                  if (!app.appointment_time) return null;
                  const [hStr, mStr] = app.appointment_time.split(':');
                  const h = parseInt(hStr); const m = parseInt(mStr);
                  if (h < startHour || h > endHour) return null; 
                  
                  const top = (h - startHour) * pixelsPerHour + (m / 60) * pixelsPerHour;
                  const durationMins = getAppDuration(app);
                  const height = (durationMins / 60) * pixelsPerHour;
                  const colorTheme = appColors[app.id % appColors.length];
                  
                  // Calculate end time
                  const endMins = h * 60 + m + durationMins;
                  const endH = Math.floor(endMins / 60);
                  const endM = endMins % 60;
                  const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                  return (
                    <div 
                      key={app.id} 
                      onClick={() => setEditingApp(app)}
                      style={{ position: 'absolute', top: `${top}px`, left: '60px', right: '0px', height: `${height}px`, padding: '1px 8px', zIndex: 10, cursor: 'pointer' }}
                    >
                      <div style={{
                        backgroundColor: colorTheme.bg, height: '100%', borderRadius: '8px', 
                        padding: durationMins <= 20 ? '0 8px' : '6px 10px',
                        display: 'flex', 
                        flexDirection: durationMins <= 20 ? 'row' : 'column', 
                        position: 'relative', overflow: 'hidden',
                        alignItems: durationMins <= 20 ? 'center' : 'stretch',
                        borderLeft: `4px solid ${colorTheme.border}`,
                        color: '#1e293b',
                        gap: durationMins <= 20 ? '8px' : '0'
                      }}>
                        {durationMins <= 20 ? (
                          // Diseño compacto para 15 minutos
                          <>
                            <span style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{app.appointment_time.substring(0,5)}</span>
                            <span title={getAppNames(app)} style={{ fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                              {app.client_name} • {getAppNames(app)}
                            </span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); notifyClient(app); }}
                              title="Notificar por WhatsApp"
                              style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                            >
                              <MessageCircle size={10} />
                            </button>
                          </>
                        ) : (
                          // Diseño normal para 30+ minutos
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>{app.appointment_time.substring(0,5)} - {endTimeStr}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); notifyClient(app); }}
                                title="Notificar por WhatsApp"
                                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}
                              >
                                <MessageCircle size={12} />
                              </button>
                            </div>
                            <span title={getAppNames(app)} style={{ fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: Math.max(1, Math.floor(durationMins / 15)), WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {app.client_name} • {getAppNames(app)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}



      {/* -------------------- TAB CLIENTAS -------------------- */}
      {activeTab === 'clientas' && (
        <div style={{ padding: '24px 16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Mis Clientas</h2>
          
          {loadingClients ? (
            <p style={{ textAlign: 'center', color: 'var(--secondary)' }}>Cargando clientas...</p>
          ) : clients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--secondary)' }}>
              <Users size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <p>Aún no hay clientas registradas en la nueva base de datos.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>(Las nuevas clientas aparecerán aquí automáticamente al reservar)</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {clients.map(client => (
                <div key={client.id} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={16} color="var(--primary)" /> {client.name}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '8px' }}>📞 {client.phone}</p>
                    </div>
                    <button 
                      onClick={() => setEditingClient(client)}
                      style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                  
                  {client.notes ? (
                    <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #fb923c', marginTop: '4px' }}>
                      <p style={{ fontSize: '0.875rem', color: '#9a3412', fontStyle: 'italic', margin: 0 }}>"{client.notes}"</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic', margin: '4px 0 0 0' }}>Sin descripción...</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* -------------------- TAB AJUSTES / SERVICIOS -------------------- */}
      {activeTab === 'servicios' && (
        <div className="section">
          <h2 className="section-title">Ajustes</h2>
          
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Días Especiales Abiertos</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '16px' }}>
              Si quieres trabajar un sábado o domingo, ábrelo aquí para que las clientas puedan pedir cita ese día.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <input type="date" className="input" id="specialDateInput" style={{ flex: 1 }} />
              <button className="btn" onClick={async () => {
                const val = document.getElementById('specialDateInput').value;
                if (!val) return;
                const { error } = await supabase.from('special_days').insert([{ date: val }]);
                if (error) {
                  alert("Error al abrir el día. ¿Has creado la tabla 'special_days' en Supabase?");
                } else {
                  alert("¡Día abierto correctamente! Las clientas ya pueden reservar en esa fecha.");
                  fetchSpecialDays();
                }
              }}>Abrir Día</button>
            </div>
            
            {specialDays.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, borderTop: '1px solid var(--border)' }}>
                {specialDays.map(day => (
                  <li key={day.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>{day.date}</span>
                    <button style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }} onClick={async () => {
                      if (window.confirm('¿Seguro que quieres cerrar este día?')) {
                        await supabase.from('special_days').delete().eq('id', day.id);
                        fetchSpecialDays();
                      }
                    }}>Eliminar</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No tienes días especiales abiertos.</p>
            )}
          </div>
        </div>
      )}

      {/* -------------------- MODAL DE EDICIÓN CITAS -------------------- */}
      {editingApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: '#fafafa' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{editingApp.isNew ? 'Nueva Cita' : 'Editar Cita'}</h3>
              <button onClick={() => setEditingApp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEditApp} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Nombre y Apellidos</label>
                  <input 
                    type="text" 
                    value={editingApp.client_name} 
                    onChange={e => setEditingApp({...editingApp, client_name: e.target.value})}
                    placeholder="Nombre del cliente"
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Teléfono</label>
                  <input 
                    type="text" 
                    value={editingApp.client_phone} 
                    onChange={e => setEditingApp({...editingApp, client_phone: e.target.value})}
                    placeholder="Teléfono"
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Servicios</label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px', backgroundColor: 'white' }}>
                  {Object.entries(
                    allServices.reduce((acc, srv) => {
                      const cat = srv.category || 'Otros';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(srv);
                      return acc;
                    }, {})
                  ).map(([category, catServices]) => (
                    <div key={category} style={{ paddingBottom: '4px' }}>
                      <div style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary)', backgroundColor: '#f8fafc', borderRadius: '4px', marginTop: '4px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {category}
                      </div>
                      {catServices.map(srv => {
                        const isSelected = editingApp.services_json 
                          ? editingApp.services_json.some(s => s.id === srv.id) 
                          : editingApp.service_id === srv.id;
                          
                        return (
                          <label key={srv.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                let newServices = editingApp.services_json || (editingApp.service_id ? [allServices.find(s => s.id === editingApp.service_id)] : []);
                                if (e.target.checked) {
                                  newServices = [...newServices, srv];
                                } else {
                                  newServices = newServices.filter(s => s.id !== srv.id);
                                }
                                setEditingApp({...editingApp, services_json: newServices, service_id: newServices[0]?.id || null});
                              }}
                              style={{ width: '16px', height: '16px', flexShrink: 0 }}
                            />
                            <span style={{ fontSize: '0.875rem' }}>{srv.name} <span style={{color: 'var(--secondary)'}}>({srv.price})</span></span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ width: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Fecha</label>
                  <input 
                    type="date" 
                    value={editingApp.appointment_date} 
                    onChange={e => {
                      setEditingApp({...editingApp, appointment_date: e.target.value});
                    }} 
                    style={{ width: '100%', minWidth: 0, WebkitAppearance: 'none', appearance: 'none', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontFamily: 'inherit', fontSize: '1rem', backgroundColor: '#f8fafc', color: 'var(--text)', boxSizing: 'border-box' }} 
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Hora</label>
                  <input 
                    type="time" 
                    value={editingApp.appointment_time} 
                    min="09:00" max="19:00"
                    onChange={e => setEditingApp({...editingApp, appointment_time: e.target.value})} 
                    style={{ width: '100%', minWidth: 0, WebkitAppearance: 'none', appearance: 'none', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontFamily: 'inherit', fontSize: '1rem', backgroundColor: '#f8fafc', color: 'var(--text)', boxSizing: 'border-box' }} 
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

      {/* -------------------- MODAL DE EDICIÓN CLIENTAS -------------------- */}
      {editingClient && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: '#fafafa' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Editar Clienta</h3>
              <button onClick={() => setEditingClient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEditClient} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Nombre</label>
                <input 
                  type="text" 
                  value={editingClient.name} 
                  onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '1rem', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Teléfono</label>
                <input 
                  type="text" 
                  value={editingClient.phone} 
                  onChange={e => setEditingClient({...editingClient, phone: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '1rem', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>Notas Personalizadas (Ej. Fórmula de tinte, alergias...)</label>
                <textarea 
                  value={editingClient.notes || ''} 
                  onChange={e => setEditingClient({...editingClient, notes: e.target.value})}
                  placeholder="Añade aquí cualquier detalle importante sobre esta clienta..."
                  rows={4}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontFamily: 'inherit', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }} 
                />
              </div>
              <button type="submit" disabled={isSaving} className="btn btn-full" style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Ficha'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- BOTTOM TAB BAR -------------------- */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '12px', backgroundColor: 'white', borderTop: '1px solid var(--border)', zIndex: 100, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <button onClick={() => setActiveTab('agenda')} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === 'agenda' ? 'var(--primary)' : 'var(--secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <CalendarIcon size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: activeTab === 'agenda' ? 600 : 500 }}>Agenda</span>
        </button>

        <button onClick={() => setActiveTab('clientas')} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === 'clientas' ? 'var(--primary)' : 'var(--secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <Users size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: activeTab === 'clientas' ? 600 : 500 }}>Clientas</span>
        </button>
        <button onClick={() => setActiveTab('servicios')} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === 'servicios' ? 'var(--primary)' : 'var(--secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
          <Settings size={24} />
          <span style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: activeTab === 'servicios' ? 600 : 500 }}>Ajustes</span>
        </button>
      </div>
    </div>
  )
}
