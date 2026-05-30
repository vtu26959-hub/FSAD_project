function EventDetails({ event }) {
  if (!event) return null;

  const getAvailabilityStatus = (available, total) => {
    const pct = (available / total) * 100;
    if (available === 0) return { label: 'Sold Out', key: 'soldout' };
    if (pct < 20) return { label: 'Almost Sold Out', key: 'almost' };
    if (pct < 50) return { label: 'Filling Fast', key: 'filling' };
    return { label: 'Available', key: 'available' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const availability = getAvailabilityStatus(event.availableTickets, event.totalTickets);
  const popScore = event.popularityScore || 0;
  const popLevel = popScore >= 60 ? 'high' : popScore >= 30 ? 'medium' : 'low';

  const infoRows = [
    { icon: '🎪', label: 'Event', value: event.name },
    { icon: '🏢', label: 'Department', value: event.department },
    { icon: '🏷️', label: 'Category', value: event.category },
    { icon: '📅', label: 'Date & Time', value: formatDate(event.dateTime) },
    { icon: '📍', label: 'Venue', value: event.venue },
    { icon: '💰', label: 'Price', value: `₹${parseFloat(event.ticketPrice).toFixed(2)}` },
  ];

  return (
    <div className="card" style={{ animation: 'fadeInUp 0.5s ease both' }}>
      {event.imageUrl && (
        <img src={event.imageUrl} alt={event.name} className="detail-image" style={{ marginBottom: '1.25rem' }} />
      )}
      <div className="card__header">
        <div className="card__icon">📅</div>
        <span className="card__title">Event Details</span>
      </div>
      <div className="event-info-grid">
        {infoRows.map((row, i) => (
          <div className="event-info-row" key={i}>
            <span className="event-info-row__icon">{row.icon}</span>
            <span className="event-info-row__label">{row.label}</span>
            <span className="event-info-row__value">{row.value}</span>
          </div>
        ))}
        <div className="event-info-row">
          <span className="event-info-row__icon">🎟️</span>
          <span className="event-info-row__label">Tickets</span>
          <span className="event-info-row__value">
            {event.availableTickets} / {event.totalTickets}
            <span className="ticket-availability">
              <span className={`availability-dot availability-dot--${availability.key}`}></span>
              <span className={`availability-label availability-label--${availability.key}`}>{availability.label}</span>
            </span>
          </span>
        </div>
        {event.description && (
          <div className="event-info-row" style={{ alignItems: 'flex-start' }}>
            <span className="event-info-row__icon">📝</span>
            <span className="event-info-row__label">About</span>
            <span className="event-info-row__value" style={{ color: 'var(--text-secondary)' }}>{event.description}</span>
          </div>
        )}
      </div>
      {/* Popularity Bar */}
      <div className="popularity-bar" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <span className="popularity-bar__label">🔥 Popularity Score</span>
          <span className="popularity-bar__label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{popScore}%</span>
        </div>
        <div className="popularity-bar__track">
          <div className={`popularity-bar__fill popularity-bar__fill--${popLevel}`} style={{ width: `${popScore}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default EventDetails;
