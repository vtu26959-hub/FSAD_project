import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TicketVerification({ bookingId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/api/bookings/${bookingId}`);
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or missing ticket.');
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  if (loading) {
    return (
      <div className="verification-container" style={{ animation: 'fadeInUp 0.6s ease both' }}>
        <button className="detail-back-btn" onClick={onBack}>← Back</button>
        <div className="verification-loading">Verifying Ticket...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="verification-container" style={{ animation: 'fadeInUp 0.6s ease both' }}>
        <button className="detail-back-btn" onClick={onBack}>← Back</button>
        <div className="invalid-ticket-card">
          <div className="invalid-ticket__icon">❌</div>
          <h2 className="invalid-ticket__title">Invalid Ticket</h2>
          <p className="invalid-ticket__message">{error}</p>
        </div>
      </div>
    );
  }

  const { booking, event } = data;

  return (
    <div className="verification-container" style={{ animation: 'fadeInUp 0.6s ease both' }}>
      <button className="detail-back-btn" onClick={onBack}>← Back</button>
      
      <div className="digital-ticket">
        <div className="digital-ticket__header">
          <div className="verified-badge">
            <span className="verified-badge__icon">✅</span>
            VERIFIED
          </div>
          <h2 className="digital-ticket__event">{event.name}</h2>
          <p className="digital-ticket__department">{event.department}</p>
        </div>
        
        <div className="digital-ticket__body">
          <div className="digital-ticket__row">
            <span className="digital-ticket__label">Attendee Name</span>
            <span className="digital-ticket__value">{booking.name}</span>
          </div>
          <div className="digital-ticket__row">
            <span className="digital-ticket__label">Email</span>
            <span className="digital-ticket__value">{booking.email}</span>
          </div>
          <div className="digital-ticket__row">
            <span className="digital-ticket__label">Booking ID</span>
            <span className="digital-ticket__value" style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{booking.bookingId}</span>
          </div>
          <div className="digital-ticket__row">
            <span className="digital-ticket__label">Tickets Admitted</span>
            <span className="digital-ticket__value">{booking.ticketsBooked}</span>
          </div>
          <div className="digital-ticket__divider"></div>
          <div className="digital-ticket__row">
            <span className="digital-ticket__label">Date & Time</span>
            <span className="digital-ticket__value">{new Date(event.dateTime).toLocaleString()}</span>
          </div>
          <div className="digital-ticket__row">
            <span className="digital-ticket__label">Venue</span>
            <span className="digital-ticket__value">{event.venue}</span>
          </div>
        </div>
        
        <div className="digital-ticket__footer">
          EventSphere Digital Pass
        </div>
      </div>
    </div>
  );
}

export default TicketVerification;
