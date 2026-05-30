import { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8080/api/auth';

function Register({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/register`, formData);
      onRegister(res.data); // Automatically log them in after registration
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div className="card__header" style={{ justifyContent: 'center' }}>
          <div className="card__icon">✨</div>
          <span className="card__title">Create Account</span>
        </div>
        <p className="auth-subtitle">Join us to book tickets for upcoming events.</p>
        
        {error && <div className="message message--error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-group__label">Full Name</label>
            <input 
              type="text" 
              className="form-group__input" 
              placeholder="John Doe" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label className="form-group__label">Email Address</label>
            <input 
              type="email" 
              className="form-group__input" 
              placeholder="you@company.com" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label className="form-group__label">Password</label>
            <input 
              type="password" 
              className="form-group__input" 
              placeholder="Create a password" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label className="form-group__label">Role</label>
            <select 
              className="form-group__select"
              value={formData.role} 
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="USER">Normal User</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account?{' '}
          <button className="auth-switch-btn" onClick={onSwitchToLogin}>
            Login here
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;
