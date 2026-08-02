import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import api from '../services/api';
import mahanaLogo from '../assets/Image mahana.png';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/admin/login', { email, password });
      const { admin } = response.data.data;
      navigate(admin.mustChangePassword ? '/admin/securite' : '/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Le serveur administrateur est inaccessible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img className="auth-logo-image" src={mahanaLogo} alt="Mahana Win" />
        <p className="eyebrow">Espace sécurisé</p>
        <h2>Administration</h2>
        <p className="auth-intro">Connectez-vous depuis la tablette de contrôle.</p>
        {location.state?.message ? <p className="auth-success" role="status">{location.state.message}</p> : null}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)}
              autoComplete="username" required autoFocus />
          </label>
          <label>Mot de passe
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password" required />
          </label>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <button className="primary-btn large" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
