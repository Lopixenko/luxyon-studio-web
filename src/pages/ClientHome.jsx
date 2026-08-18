import { useState, useEffect } from 'react'
import { Star, MapPin, X, CheckCircle } from 'lucide-react'
import { supabase } from '../supabase'
import '../index.css'

export default function ClientHome() {
  const [selectedService, setSelectedService] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  // Booking Form State
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [existingAppointments, setExistingAppointments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const parseDuration = (str) => {
    if (!str) return 60;
    let minutes = 0;
    const lowerStr = str.toLowerCase();
    
    // Extraer horas (ej: "1h", "1 h", "2horas")
    const hMatch = lowerStr.match(/(\d+)\s*h/);
    if (hMatch) minutes += parseInt(hMatch[1]) * 60;
    
    // Extraer minutos (ej: "30m", "15 mins", "45 minutos")
    const mMatch = lowerStr.match(/(\d+)\s*m/);
    if (mMatch) minutes += parseInt(mMatch[1]);
    
    return isNaN(minutes) || minutes === 0 ? 60 : minutes;
  }

  const [dateError, setDateError] = useState('');

  const handleDateChange = async (e) => {
    const val = e.target.value;
    setDateError('');
    setAppointmentDate(val);
    setAppointmentTime('');
    
    if (!val) {
      setExistingAppointments([]);
      return;
    }

    const dateObj = new Date(val);
    if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
      setDateError("Solo abrimos de Lunes a Viernes.");
      setAppointmentDate('');
      setExistingAppointments([]);
      return;
    }

    // Fetch existing appointments for this date to calculate availability
    const { data } = await supabase
      .from('appointments')
      .select('*, services(duration)')
      .eq('appointment_date', val);
    
    if (data) setExistingAppointments(data);
  };

  const generateAvailableSlots = () => {
    if (!appointmentDate || !selectedService) return [];
    
    const reqDuration = parseDuration(selectedService.duration);
    const slots = [];
    
    // De 9:00 a 19:00, con saltos de 15 mins
    for (let h = 9; h < 19; h++) {
      for (let m = 0; m < 60; m += 15) {
        const startMins = h * 60 + m;
        const endMins = startMins + reqDuration;
        
        // No puede terminar más tarde de las 19:00 (19 * 60 = 1140)
        if (endMins > 1140) continue;
        
        let isOverlapping = false;
        
        for (const app of existingAppointments) {
          if (!app.appointment_time) continue;
          const [appH, appM] = app.appointment_time.split(':');
          const appStartMins = parseInt(appH) * 60 + parseInt(appM);
          const appDur = parseDuration(app.services?.duration);
          const appEndMins = appStartMins + appDur;
          
          if (startMins < appEndMins && endMins > appStartMins) {
            isOverlapping = true;
            break;
          }
        }
        
        if (!isOverlapping) {
          const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
          slots.push(timeStr);
        }
      }
    }
    return slots;
  };

  useEffect(() => {
    async function fetchData() {
      const { data: servicesData } = await supabase.from('services').select('*').order('id');
      if (servicesData) setServices(servicesData);
      
      const { data: reviewsData } = await supabase.from('reviews').select('*').order('id', { ascending: false });
      if (reviewsData) setReviews(reviewsData);
    }
    fetchData();
  }, []);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!clientName || !clientLastName || !clientPhone || !appointmentDate || !appointmentTime) {
      alert("Por favor, rellena todos los campos.");
      return;
    }
    
    setIsSubmitting(true);
    
    const fullName = `${clientName} ${clientLastName}`;
    
    // 1. Guardar o actualizar la Clienta en el nuevo CRM (usando el teléfono como ID único)
    await supabase.from('clients').upsert({
      name: fullName,
      phone: clientPhone
    }, { onConflict: 'phone' });

    // 2. Guardar la cita normal
    const { error } = await supabase.from('appointments').insert([
      {
        service_id: selectedService.id,
        client_name: fullName,
        client_phone: clientPhone,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime
      }
    ]);

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert("Hubo un error al guardar la cita.");
    } else {
      setBookingSuccess(true);
      setTimeout(() => {
        closeBookingModal();
      }, 3000);
    }
  };

  const closeBookingModal = () => {
    setSelectedService(null);
    setBookingSuccess(false);
    setClientName('');
    setClientLastName('');
    setClientPhone('');
    setAppointmentDate('');
    setAppointmentTime('');
    setExistingAppointments([]);
  };

  // Obtenemos la fecha de hoy para no dejar reservar días pasados
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="mobile-container">
      {/* Header Info */}
      <header className="header">
        <h1>LuxyOn Studio</h1>
        <p><MapPin size={14} style={{display:'inline', marginRight: '4px', verticalAlign:'middle'}}/> Calle Falsa 123, Madrid</p>
      </header>

      {/* Services Section */}
      <section className="section">
        <h2 className="section-title">Servicios</h2>
        <div className="services-list">
          {services.map(service => (
            <div key={service.id} className="service-card">
              <div className="service-info">
                <h3>{service.name}</h3>
                <p>{service.duration} • {service.description}</p>
              </div>
              <div className="price-booking">
                <span className="service-price">{service.price}</span>
                <button className="btn" onClick={() => setSelectedService(service)}>
                  Reservar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="section">
        <div className="section-title">
          <h2>Reseñas</h2>
          <span style={{fontSize: '0.875rem', fontWeight: 500}}>4.9 <Star size={14} fill="var(--primary)" color="var(--primary)" style={{verticalAlign: 'text-bottom'}} /> (120)</span>
        </div>
        <div className="reviews-list">
          {reviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <span className="review-name">{review.name}</span>
                <div className="review-stars">
                  {[...Array(review.stars)].map((_, i) => (
                    <Star key={i} size={14} fill="var(--primary)" color="var(--primary)" strokeWidth={0} />
                  ))}
                </div>
              </div>
              <p className="review-text">"{review.text}"</p>
              <p className="review-service">Servicio: {review.service}</p>
            </div>
          ))}
        </div>
        <button className="btn btn-outline btn-full">
          Dejar una reseña
        </button>
      </section>

      {/* Booking Modal */}
      {selectedService && (
        <div className="booking-modal-overlay" onClick={closeBookingModal}>
          <div className="booking-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeBookingModal}>
              <X size={24} />
            </button>
            
            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircle size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>¡Cita Confirmada!</h2>
                <p style={{ color: 'var(--secondary)' }}>Te esperamos el día {appointmentDate}.</p>
              </div>
            ) : (
              <>
                <h2 style={{fontSize: '1.25rem', marginBottom: '8px'}}>Reservar cita</h2>
                <h3 style={{fontWeight: 500, marginBottom: '24px', color: 'var(--secondary)'}}>
                  {selectedService.name} • {selectedService.price}
                </h3>
                
                <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Nombre</label>
                    <input 
                      type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Apellidos</label>
                    <input 
                      type="text" required value={clientLastName} onChange={e => setClientLastName(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Teléfono</label>
                    <input 
                      type="tel" required value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Fecha</label>
                    <input 
                      type="date" required value={appointmentDate} onChange={handleDateChange}
                      min={todayStr}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: dateError ? '1px solid #ef4444' : '1px solid var(--border)', fontFamily: 'inherit' }} 
                    />
                    {dateError && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{dateError}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Hora</label>
                    <select 
                      required 
                      value={appointmentTime} 
                      onChange={e => setAppointmentTime(e.target.value)}
                      disabled={!appointmentDate}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', backgroundColor: 'white', color: appointmentDate ? 'inherit' : '#94a3b8' }} 
                    >
                      <option value="">{appointmentDate ? 'Elige una hora' : 'Elige fecha'}</option>
                      {generateAvailableSlots().map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-full" disabled={isSubmitting} style={{ marginTop: '8px' }}>
                    {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
