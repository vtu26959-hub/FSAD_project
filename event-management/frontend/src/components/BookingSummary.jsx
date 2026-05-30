function BookingSummary({ booking, event, onNewBooking, onVerify, qrCode, emailStatus }) {
  if (!booking || !event) return null;

  const totalAmount = (parseFloat(event.ticketPrice) * booking.ticketsBooked).toFixed(2);

  const summaryRows = [
    { label: 'Booking ID', value: booking.bookingId || `#${booking.id}` },
    { label: 'Name', value: booking.name },
    { label: 'Email', value: booking.email },
    { label: 'Department', value: booking.department },
    { label: 'Event', value: event.name },
    { label: 'Venue', value: event.venue },
    { label: 'Tickets Booked', value: booking.ticketsBooked },
    { label: 'Price per Ticket', value: `₹${parseFloat(event.ticketPrice).toFixed(2)}` },
  ];

  return (
    <div className="booking-summary">
      <div className="ticket-card">
        {/* Header section with success icon */}
        <div className="ticket-card__header">
          <div className="summary-success-icon">🎫</div>
          <h2 className="summary-title">Booking Confirmed!</h2>
          <p className="summary-subtitle">Your tickets have been reserved successfully</p>
          <p className="summary-email-status">✉️ A confirmation email has been sent to your inbox.</p>
        </div>

        {/* Details Section */}
        <div className="ticket-card__body">
          <div className="ticket-card__details">
            <div className="summary-details">
              {summaryRows.map((row, index) => (
                <div className="summary-row" key={index}>
                  <span className="summary-row__label">{row.label}</span>
                  <span className="summary-row__value">{row.value}</span>
                </div>
              ))}
            </div>
            
            {/* Total */}
            <div className="summary-total">
              <span className="summary-total__label">Total Paid</span>
              <span className="summary-total__value">₹{totalAmount}</span>
            </div>
          </div>
          
          <div className="ticket-card__qr-section">
            <div className="ticket-card__qr">
              {qrCode ? (
                <img src={`data:image/png;base64,${qrCode}`} alt="Ticket QR Code" className="qr-code-img" />
              ) : (
                <div className="qr-placeholder">QR Code Unavailable</div>
              )}
            </div>
            <p className="qr-scan-label">Scan for Ticket Verification</p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="btn-group" style={{ marginTop: '2rem', justifyContent: 'center' }}>
        <button className="btn btn--secondary" onClick={onNewBooking}>
          Browse More Events
        </button>
        <button className="btn btn--primary" onClick={() => onVerify(booking.bookingId)}>
          Verify Ticket
        </button>
      </div>
    </div>
  );
}

export default BookingSummary;
