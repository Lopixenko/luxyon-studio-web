import { useState, useEffect } from 'react'
import { Star, MapPin, X } from 'lucide-react'
import { supabase } from '../supabase'
import '../index.css'

export default function ClientHome() {
  const [selectedService, setSelectedService] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data: servicesData } = await supabase.from('services').select('*').order('id');
      if (servicesData) setServices(servicesData);
      
      const { data: reviewsData } = await supabase.from('reviews').select('*').order('id', { ascending: false });
      if (reviewsData) setReviews(reviewsData);
    }
    fetchData();
  }, []);

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

      {/* Mock Booking Modal */}
      {selectedService && (
        <div className="booking-modal-overlay" onClick={() => setSelectedService(null)}>
          <div className="booking-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedService(null)}>
              <X size={24} />
            </button>
            <h2 style={{fontSize: '1.25rem', marginBottom: '8px'}}>Reservar cita</h2>
            <h3 style={{fontWeight: 500, marginBottom: '24px', color: 'var(--secondary)'}}>
              {selectedService.name} • {selectedService.price}
            </h3>
            
            <p style={{marginBottom: '16px', fontSize: '0.875rem', color: 'var(--primary)'}}>Elige una fecha:</p>
            
            <div style={{display:'flex', gap:'8px', overflowX:'auto', marginBottom: '24px', paddingBottom:'8px'}}>
              {['Lun 14', 'Mar 15', 'Mié 16', 'Jue 17', 'Vie 18'].map(day => (
                <div key={day} style={{padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', minWidth: '80px', textAlign: 'center', cursor: 'pointer', fontSize: '0.875rem'}}>
                  {day}
                </div>
              ))}
            </div>

            <button className="btn btn-full" onClick={() => {
              alert('En la versión real, esto guardará la cita en la base de datos y notificará a la app del iPhone.')
              setSelectedService(null)
            }}>
              Confirmar Reserva
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
