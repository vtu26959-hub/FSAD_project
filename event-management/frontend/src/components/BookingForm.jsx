import { useState, useEffect } from 'react';

const DEPARTMENTS = [
  'Information Technology', 'Human Resources', 'Finance', 'Marketing',
  'Operations', 'Research & Development', 'Sales', 'Administration',
];

function BookingForm({ event, onBook, onReset, disabled, currentUser }) {
  const [formData, setFormData] = useState({ 
    name: currentUser?.name || '', 
    email: currentUser?.email || '', 
    department: '', 
    ticketsBooked: '' 
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({ ...prev, name: currentUser.name, email: currentUser.email }));
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!formData.department) newErrors.department = 'Please select a department';
    const tickets = parseInt(formData.ticketsBooked);
    if (!formData.ticketsBooked) newErrors.ticketsBooked = 'Number of tickets is required';
    else if (isNaN(tickets) || tickets <= 0) newErrors.ticketsBooked = 'Tickets must be a positive number';
    else if (event && tickets > event.availableTickets) newErrors.ticketsBooked = `Only ${event.availableTickets} tickets available`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onBook({ ...formData, ticketsBooked: parseInt(formData.ticketsBooked) });
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', department: '', ticketsBooked: '' });
    setErrors({});
    if (onReset) onReset();
  };

  const isSoldOut = event && event.availableTickets === 0;

  return (
    <div className="card booking-form">
      <div className="card__header">
        <div className="card__icon">🎫</div>
        <span className="card__title">Book Tickets</span>
      </div>
      {isSoldOut && <div className="message message--error">😔 Sorry, this event is sold out.</div>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-group__label" htmlFor="booking-name">Full Name</label>
          <input id="booking-name" type="text" name="name" className={`form-group__input ${errors.name ? 'form-group__input--error' : ''}`} placeholder="Enter your full name" value={formData.name} onChange={handleChange} disabled={disabled || isSoldOut || currentUser} />
          {errors.name && <span className="form-group__error">{errors.name}</span>}
        </div>
        <div className="form-group">
          <label className="form-group__label" htmlFor="booking-email">Email Address</label>
          <input id="booking-email" type="email" name="email" className={`form-group__input ${errors.email ? 'form-group__input--error' : ''}`} placeholder="you@company.com" value={formData.email} onChange={handleChange} disabled={disabled || isSoldOut || currentUser} />
          {errors.email && <span className="form-group__error">{errors.email}</span>}
        </div>
        <div className="form-group">
          <label className="form-group__label" htmlFor="booking-department">Department</label>
          <select id="booking-department" name="department" className={`form-group__select ${errors.department ? 'form-group__select--error' : ''}`} value={formData.department} onChange={handleChange} disabled={disabled || isSoldOut}>
            <option value="">Select your department</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.department && <span className="form-group__error">{errors.department}</span>}
        </div>
        <div className="form-group">
          <label className="form-group__label" htmlFor="booking-tickets">Number of Tickets</label>
          <input id="booking-tickets" type="number" name="ticketsBooked" className={`form-group__input ${errors.ticketsBooked ? 'form-group__input--error' : ''}`} placeholder="How many tickets?" min="1" max={event ? event.availableTickets : 100} value={formData.ticketsBooked} onChange={handleChange} disabled={disabled || isSoldOut} />
          {errors.ticketsBooked && <span className="form-group__error">{errors.ticketsBooked}</span>}
        </div>
        <div className="btn-group">
          <button type="submit" className="btn btn--primary btn--full" disabled={disabled || isSoldOut}>
            {disabled ? '⏳ Processing...' : '🎟️ Book Now'}
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleReset} disabled={disabled}>Reset</button>
        </div>
      </form>
    </div>
  );
}

export default BookingForm;
