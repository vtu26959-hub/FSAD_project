import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import EventDetails from './components/EventDetails';
import BookingForm from './components/BookingForm';
import BookingSummary from './components/BookingSummary';
import TicketVerification from './components/TicketVerification';
import EventAssistant from './components/EventAssistant';
import Login from './components/Login';
import Register from './components/Register';

const API = 'http://localhost:8080/api';

const DEPARTMENTS = [
  { name: 'IT', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop' },
  { name: 'CSE', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop' },
  { name: 'ECE', image: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop' },
  { name: 'Mechanical', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop' },
  { name: 'Civil', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=300&fit=crop' },
  { name: 'Electrical', image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=300&fit=crop' },
  { name: 'AI & Data Science', image: 'https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=400&h=300&fit=crop' },
  { name: 'Cyber Security', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop' }
];


function App() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState('home'); // home | login | register | departments | browse | detail | admin | summary
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [booking, setBooking] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [verificationBookingId, setVerificationBookingId] = useState(null);
  const [allEvents, setAllEvents] = useState([]); // For assistant — always all events

  // Lock / countdown
  const [lockId, setLockId] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const countdownRef = useRef(null);

  // Admin form
  const [adminForm, setAdminForm] = useState({ name: '', category: 'Technical', department: '', venue: '', ticketPrice: '', totalTickets: '100', description: '', imageUrl: '' });

  useEffect(() => {
    // Intercept Verification URL
    if (window.location.pathname.startsWith('/verify/')) {
      const id = window.location.pathname.split('/')[2];
      if (id) {
        setVerificationBookingId(id);
        setView('verify');
        return;
      }
    }

    if (view === 'browse' || view === 'admin') {
      fetchEventsData(selectedDepartment); 
    }
  }, [view, selectedDepartment]);

  // Pre-load all events for the assistant when user logs in
  useEffect(() => {
    if (currentUser) {
      axios.get(`${API}/events`)
        .then(res => setAllEvents(res.data))
        .catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      countdownRef.current = setTimeout(() => setCountdown(p => p - 1), 1000);
    } else if (showCountdown && countdown === 0 && lockId) {
      handleTimerExpired();
    }
    return () => clearTimeout(countdownRef.current);
  }, [showCountdown, countdown]);

  const fetchEventsData = async (dept) => {
    setLoading(true);
    try {
      // Admin sees all events, Users see filtered events
      const url = (dept && view !== 'admin') ? `${API}/events/department/${dept}` : `${API}/events`;
      const [evRes, catRes] = await Promise.all([
        axios.get(url),
        axios.get(`${API}/events/categories`)
      ]);
      setEvents(evRes.data);
      setCategories(catRes.data);
    } catch (e) {
      setError('Failed to load events. Is the backend running?');
    } finally { setLoading(false); }
  };

  const fetchAll = () => {
    fetchEventsData(selectedDepartment);
    // Also refresh assistant's full event list
    axios.get(`${API}/events`)
      .then(res => setAllEvents(res.data))
      .catch(() => {});
  };

  const filteredEvents = activeCategory === 'All' ? events : events.filter(e => e.category === activeCategory);

  // Booking flow
  const handleBook = async (formData) => {
    setError(''); setProcessing(true);
    try {
      const res = await axios.post(`${API}/lock`, { eventId: selectedEvent.id, tickets: formData.ticketsBooked });
      setLockId(res.data.lockId);
      setCountdown(res.data.expiresInSeconds);
      setPendingBooking(formData);
      setShowCountdown(true);
      setSelectedEvent(res.data.event);
      updateEventInList(res.data.event);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reserve tickets.');
    } finally { setProcessing(false); }
  };

  const handleConfirm = async () => {
    if (!pendingBooking || !lockId) return;
    setProcessing(true); clearTimeout(countdownRef.current);
    try {
      const res = await axios.post(`${API}/book`, { ...pendingBooking, lockId });
      setBooking(res.data.booking);
      setQrCode(res.data.qrCode);
      setEmailStatus(res.data.emailStatus);
      setSelectedEvent(res.data.event);
      updateEventInList(res.data.event);
      setView('summary');
      resetLockState();
    } catch (e) {
      setError(e.response?.data?.error || 'Booking failed.');
      if (lockId) try { await axios.delete(`${API}/lock/${lockId}`); } catch (_) {}
      resetLockState(); fetchAll();
    } finally { setProcessing(false); }
  };

  const handleCancelLock = async () => {
    clearTimeout(countdownRef.current);
    if (lockId) try { await axios.delete(`${API}/lock/${lockId}`); } catch (_) {}
    resetLockState(); fetchAll();
  };

  const handleTimerExpired = async () => {
    clearTimeout(countdownRef.current);
    if (lockId) try { await axios.delete(`${API}/lock/${lockId}`); } catch (_) {}
    resetLockState();
    setError('⏰ Time expired! Tickets released. Please try again.');
    fetchAll();
  };

  const resetLockState = () => { setShowCountdown(false); setLockId(null); setPendingBooking(null); setCountdown(0); setProcessing(false); };

  const updateEventInList = (updated) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  // Admin
  const handleAdminAdd = async (e) => {
    e.preventDefault(); setError(''); setSuccessMsg('');
    if (!adminForm.name.trim()) { setError('Event name is required'); return; }
    try {
      await axios.post(`${API}/events`, adminForm);
      setSuccessMsg('✅ Event added successfully!');
      setAdminForm({ name: '', category: 'Technical', department: '', venue: '', ticketPrice: '', totalTickets: '100', description: '', imageUrl: '' });
      fetchAll();
    } catch (e) { setError(e.response?.data?.error || 'Failed to add event.'); }
  };

  const handleAdminDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await axios.delete(`${API}/events/${id}`);
      fetchAll();
    } catch (e) { setError(e.response?.data?.error || 'Failed to delete event.'); }
  };

  const getPopBadge = (score) => {
    if (score >= 60) return { cls: 'popularity--hot', label: '🔥 Hot' };
    if (score >= 30) return { cls: 'popularity--trending', label: '📈 Trending' };
    return { cls: 'popularity--new', label: '🆕 New' };
  };

  const getAvail = (avail, total) => {
    const pct = (avail / total) * 100;
    if (avail === 0) return { key: 'soldout', label: 'Sold Out' };
    if (pct < 20) return { key: 'almost', label: 'Almost Sold Out' };
    if (pct < 50) return { key: 'filling', label: 'Filling Fast' };
    return { key: 'available', label: 'Available' };
  };

  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case 'Technical': return '💻';
      case 'Non-Technical': return '🎯';
      case 'Workshops': return '🛠️';
      case 'Seminars': return '🎙️';
      default: return '🎪';
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('home');
    setSelectedEvent(null);
    setSelectedDepartment('');
    setBooking(null);
    resetLockState();
  };

  const radius = 54, circumference = 2 * Math.PI * radius, progress = (countdown / 30) * circumference;

  if (!currentUser) {
    return (
      <div className="app">
        {view === 'home' && (
          <div className="home-page" style={{ animation: 'fadeInUp 0.6s ease both' }}>
            <section className="hero" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
              <div className="hero__content">
                <h1 className="app-header__title" style={{ fontSize: '4.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #f97316, #facc15)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>EventSphere</h1>
                <p className="hero__subtitle" style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '2.5rem', lineHeight: '1.6', marginLeft: 'auto', marginRight: 'auto' }}>
                  Discover and Book Campus Events Easily
                </p>
                <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button className="btn btn--primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }} onClick={() => setView('register')}>
                    Get Started
                  </button>
                  <button className="btn btn--secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }} onClick={() => setView('login')}>
                    Sign In
                  </button>
                </div>
              </div>
            </section>
            
            <section className="about-section" style={{ padding: '4rem 2rem', background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>About EventSphere</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
                EventSphere is your premium portal for exploring and reserving spots at the most exciting events across all college departments. Whether you're looking for technical hackathons, workshops, or seminars, we bring them all to one beautifully designed platform.
              </p>
            </section>
            
            <section className="features-section" style={{ padding: '5rem 2rem' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem', textAlign: 'center', color: 'var(--text-primary)' }}>Why Choose Us</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                  <h3 style={{ marginBottom: '1rem' }}>Easy Booking</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Reserve your tickets in just a few clicks with our streamlined booking process.</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
                  <h3 style={{ marginBottom: '1rem' }}>Real-time Availability</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Our robust locking system ensures you never get double-booked.</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
                  <h3 style={{ marginBottom: '1rem' }}>Multiple Departments</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Explore events specifically curated by 8 different engineering departments.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {(view === 'login' || view === 'register') && (
          <>
            <header style={{ padding: '3rem 0 1rem', textAlign: 'center', position: 'relative' }}>
              <button onClick={() => setView('home')} style={{ position: 'absolute', left: '4rem', top: '3.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                ← Back to Home
              </button>
              <h1 className="app-header__title" style={{ fontSize: '3rem' }}>EventSphere</h1>
            </header>
            {view === 'login' ? (
              <Login 
                onLogin={(user) => { setCurrentUser(user); setView('departments'); }} 
                onSwitchToRegister={() => setView('register')} 
              />
            ) : (
              <Register 
                onRegister={(user) => { setCurrentUser(user); setView('departments'); }} 
                onSwitchToLogin={() => setView('login')} 
              />
            )}
          </>
        )}

        {/* ========== VERIFICATION VIEW (Unauthenticated) ========== */}
        {view === 'verify' && (
          <div style={{ paddingTop: '2rem' }}>
            <TicketVerification bookingId={verificationBookingId} onBack={() => { setView('home'); window.history.replaceState(null, '', '/'); }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {/* ---------- NAVBAR ---------- */}
      <nav className="navbar">
        <div className="navbar__brand" onClick={() => { setView('departments'); setSelectedEvent(null); }}>EventSphere</div>
        <div className="navbar__nav">
          <button className={`nav-tab ${view === 'departments' ? 'nav-tab--active' : ''}`} onClick={() => { setView('departments'); setSelectedEvent(null); setError(''); setSuccessMsg(''); }}>🏛️ Departments</button>
          <button className={`nav-tab ${(view === 'browse' || view === 'detail') ? 'nav-tab--active' : ''}`} onClick={() => { setView('browse'); setSelectedEvent(null); setError(''); setSuccessMsg(''); }}>🎪 Events</button>
          {currentUser.role === 'ADMIN' && (
            <button className={`nav-tab nav-tab--admin ${view === 'admin' ? 'nav-tab--active' : ''}`} onClick={() => { setView('admin'); setError(''); setSuccessMsg(''); }}>⚙️ Admin</button>
          )}
        </div>
        <div className="navbar__user">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>{currentUser.name}</strong> <span style={{fontSize: '0.7rem', padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', marginLeft: '0.4rem'}}>{currentUser.role}</span>
          </div>
          <button className="btn btn--secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <main className="main-content">
        {error && <div className="message message--error" style={{ maxWidth: 700, margin: '0 auto 1.5rem' }}>{error}</div>}
        {successMsg && <div className="message message--success" style={{ maxWidth: 700, margin: '0 auto 1.5rem' }}>{successMsg}</div>}

        {/* ========== DEPARTMENTS VIEW ========== */}
        {view === 'departments' && (
          <div className="departments-section" style={{ animation: 'fadeInUp 0.5s ease both' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2.8rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Select a Department</h2>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Explore events specific to your field of interest</p>
            </div>
            <div className="departments-grid">
              {DEPARTMENTS.map((dept) => (
                <div 
                  key={dept.name} 
                  className="department-card" 
                  onClick={() => {
                    setSelectedDepartment(dept.name);
                    setView('browse');
                  }}
                >
                  <div className="department-card__image-wrap">
                    <img src={dept.image} alt={dept.name} className="department-card__image" />
                    <div className="department-card__overlay">
                      <h3 className="department-card__title">{dept.name}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <button className="btn btn--secondary" onClick={() => { setSelectedDepartment(''); setView('browse'); }}>
                View All Events Across Campus
              </button>
            </div>
          </div>
        )}

        {/* ========== BROWSE VIEW ========== */}
        {view === 'browse' && (
          <div id="events-section">
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>
                {selectedDepartment ? `${selectedDepartment} Events` : 'All Campus Events'}
              </h2>
              {selectedDepartment && (
                <button className="btn btn--secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setView('departments')}>
                  ← Change Department
                </button>
              )}
            </div>

            <div id="filters" className="category-filter">
              <button className={`category-chip ${activeCategory === 'All' ? 'category-chip--active' : ''}`} onClick={() => setActiveCategory('All')}>🌍 All Events</button>
              {categories.map(cat => (
                <button key={cat} className={`category-chip ${activeCategory === cat ? 'category-chip--active' : ''}`} onClick={() => setActiveCategory(cat)}>
                  {getCategoryEmoji(cat)} {cat}
                </button>
              ))}
            </div>

          {loading ? (
            <div className="empty-state"><div className="empty-state__icon">⏳</div><p className="empty-state__text">Loading events...</p></div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon">📭</div><p className="empty-state__text">No events found</p></div>
          ) : (
            <div className="events-grid">
              {filteredEvents.map((ev, i) => {
                const pop = getPopBadge(ev.popularityScore || 0);
                const avail = getAvail(ev.availableTickets, ev.totalTickets);
                return (
                  <div key={ev.id} className="event-card" style={{ animationDelay: `${i * 0.06}s` }}
                    onClick={() => { setSelectedEvent(ev); setView('detail'); setError(''); }}>
                    <div className="event-card__image-wrap">
                      <img src={ev.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop'} alt={ev.name} className="event-card__image" />
                      <span className="event-card__category-badge">{ev.category}</span>
                      <span className={`event-card__popularity ${pop.cls}`}>{pop.label}</span>
                    </div>
                    <div className="event-card__body">
                      <h3 className="event-card__name">{ev.name}</h3>
                      <div className="event-card__meta">
                        <span className="event-card__meta-item">📅 {new Date(ev.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="event-card__meta-item">📍 {ev.venue}</span>
                      </div>
                      <div className="event-card__footer">
                        <span className="event-card__price">₹{parseFloat(ev.ticketPrice).toFixed(0)}</span>
                        <span className="event-card__tickets">
                          <span className={`availability-dot availability-dot--${avail.key}`}></span>
                          <span className={`availability-label availability-label--${avail.key}`}>{ev.availableTickets} left</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== DETAIL VIEW ========== */}
      {view === 'detail' && selectedEvent && (
        <div className="detail-view">
          <button className="detail-back-btn" onClick={() => { setView('browse'); setError(''); }}>← Back to Events</button>
          <div className="detail-content">
            <EventDetails event={selectedEvent} />
            <BookingForm event={selectedEvent} onBook={handleBook} onReset={() => setError('')} disabled={processing || loading} currentUser={currentUser} />
          </div>
        </div>
      )}

      {/* ========== SUMMARY VIEW ========== */}
      {view === 'summary' && (
        <BookingSummary booking={booking} event={selectedEvent} qrCode={qrCode} emailStatus={emailStatus}
          onNewBooking={() => { setView('browse'); setBooking(null); setQrCode(null); setEmailStatus(null); setSelectedEvent(null); fetchAll(); }}
          onVerify={(bkgId) => { setVerificationBookingId(bkgId); setView('verify'); }} />
      )}

      {/* ========== VERIFICATION VIEW (Authenticated) ========== */}
      {view === 'verify' && (
        <TicketVerification bookingId={verificationBookingId} onBack={() => { setView('departments'); window.history.replaceState(null, '', '/'); }} />
      )}

      {/* ========== ADMIN VIEW ========== */}
      {view === 'admin' && (
        <div className="admin-panel">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card__header">
              <div className="card__icon">➕</div>
              <span className="card__title">Add New Event</span>
            </div>
            <form onSubmit={handleAdminAdd}>
              <div className="form-group">
                <label className="form-group__label">Event Name *</label>
                <input className="form-group__input" placeholder="Event name" value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-group__label">Category</label>
                  <select className="form-group__select" value={adminForm.category} onChange={e => setAdminForm(p => ({ ...p, category: e.target.value }))}>
                    <option>Technical</option><option>Non-Technical</option><option>Workshops</option><option>Seminars</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-group__label">Department</label>
                  <input className="form-group__input" placeholder="Department" value={adminForm.department} onChange={e => setAdminForm(p => ({ ...p, department: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-group__label">Venue</label>
                <input className="form-group__input" placeholder="Venue location" value={adminForm.venue} onChange={e => setAdminForm(p => ({ ...p, venue: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-group__label">Ticket Price (₹)</label>
                  <input className="form-group__input" type="number" placeholder="200" value={adminForm.ticketPrice} onChange={e => setAdminForm(p => ({ ...p, ticketPrice: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-group__label">Total Tickets</label>
                  <input className="form-group__input" type="number" placeholder="100" value={adminForm.totalTickets} onChange={e => setAdminForm(p => ({ ...p, totalTickets: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-group__label">Image URL</label>
                <input className="form-group__input" placeholder="https://images.unsplash.com/..." value={adminForm.imageUrl} onChange={e => setAdminForm(p => ({ ...p, imageUrl: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-group__label">Description</label>
                <textarea className="form-group__textarea" placeholder="Brief event description..." value={adminForm.description} onChange={e => setAdminForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn--primary btn--full">➕ Add Event</button>
            </form>
          </div>

          {/* Event list for deletion */}
          <div className="card">
            <div className="card__header">
              <div className="card__icon">📋</div>
              <span className="card__title">Manage Events ({events.length})</span>
            </div>
            {events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ev.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ev.category} • {ev.availableTickets}/{ev.totalTickets} tickets</div>
                </div>
                <button className="btn btn--danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleAdminDelete(ev.id)}>🗑️ Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      </main>

      {/* ========== COUNTDOWN MODAL ========== */}
      {showCountdown && (
        <div className="countdown-overlay">
          <div className="countdown-modal">
            <h3 className="countdown-modal__title">🔒 Tickets Reserved!</h3>
            <p className="countdown-modal__subtitle">Complete your booking before the timer runs out</p>
            <div className="countdown-timer">
              <svg className="countdown-timer__svg" viewBox="0 0 120 120">
                <defs><linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#facc15" /></linearGradient></defs>
                <circle className="countdown-timer__track" cx="60" cy="60" r={radius} />
                <circle className="countdown-timer__progress" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference - progress} />
              </svg>
              <div className="countdown-timer__value">
                <span className="countdown-timer__number">{countdown}</span>
                <span className="countdown-timer__label">seconds</span>
              </div>
            </div>
            <div className="countdown-info">Reserving <strong>{pendingBooking?.ticketsBooked} ticket(s)</strong> for <strong>{pendingBooking?.name}</strong></div>
            <div className="countdown-actions">
              <button className="btn btn--primary" onClick={handleConfirm} disabled={processing}>{processing ? '⏳ Confirming...' : '✅ Confirm Booking'}</button>
              <button className="btn btn--danger" onClick={handleCancelLock} disabled={processing}>✕ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== SMART ASSISTANT ========== */}
      {currentUser && (
        <EventAssistant
          events={allEvents.length > 0 ? allEvents : events}
          onEventClick={(ev) => { setSelectedEvent(ev); setView('detail'); setError(''); }}
        />
      )}
    </div>
  );
}

export default App;
