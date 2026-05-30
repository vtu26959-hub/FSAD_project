import { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8080/api/auth';

function Login({ onLogin, onSwitchToRegister }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, formData);
      onLogin(res.data); // User object returned from API
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div className="card__header" style={{ justifyContent: 'center' }}>
          <div className="card__icon">🔐</div>
          <span className="card__title">Welcome Back</span>
        </div>
        <p className="auth-subtitle">Login to book events or manage the portal.</p>
        
        {error && <div className="message message--error">{error}</div>}

        <form onSubmit={handleSubmit}>
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
              placeholder="••••••••" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account?{' '}
          <button className="auth-switch-btn" onClick={onSwitchToRegister}>
            Register here
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
