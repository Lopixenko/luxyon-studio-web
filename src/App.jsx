import { useState } from 'react'
import { Star, MapPin, X } from 'lucide-react'
import './index.css'

export default function App() {
  const [selectedService, setSelectedService] = useState(null);

  const services = [
    { id: 1, name: 'Corte Clásico', duration: '45 min', price: '15€', description: 'Corte a tijera o máquina con asesoramiento.' },
    { id: 2, name: 'Corte + Barba', duration: '1h 15 min', price: '22€', description: 'Arreglo completo de cabello y barba con toalla caliente.' },
    { id: 3, name: 'Tinte o Mechas', duration: '2h', price: '35€', description: 'Coloración completa o mechas con productos premium.' },
  ];

  const reviews = [
    { id: 1, name: 'Carlos M.', stars: 5, text: 'El mejor trato de la ciudad. Siempre salgo encantado con el corte.', service: 'Corte + Barba' },
    { id: 2, name: 'Laura G.', stars: 5, text: 'Súper puntual y el local está impecable. Recomendado 100%.', service: 'Tinte o Mechas' },
  ];

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
          <span style={{fontSize: '0.875rem', fontWeight: 500}}>4.9 <Star size={14} fill="#171717" style={{verticalAlign: 'text-bottom'}} /> (120)</span>
        </div>
        <div className="reviews-list">
          {reviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <span className="review-name">{review.name}</span>
                <div className="review-stars">
                  {[...Array(review.stars)].map((_, i) => (
                    <Star key={i} size={14} fill="#171717" strokeWidth={0} />
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
