import { useState } from 'react';
import { useNavigate } from 'react-router';
import api from '../services/api';

export default function ParticipationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', gameConsent: false, marketingConsent: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/public/check-participation', form);
      if (!response.data.canParticipate) {
        setError('Vous avez déjà participé aujourd’hui.');
        return;
      }
      navigate('/jeu', { state: { participant: form } });
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      const isOffline = !err.response;
      setError(apiMessage || (isOffline
        ? 'Le serveur est inaccessible. Vérifiez que le backend est lancé sur le port 4000.'
        : 'Impossible de vérifier votre participation.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-screen public-screen">
      <div className="panel-card form-card">
        <button type="button" className="back-button icon-button" aria-label="Retour" onClick={() => navigate(-1)}>←</button>
        <div className="page-heading">
          <p className="eyebrow">Votre chance vous attend</p>
          <h1>Participez au tirage</h1>
          <p>Renseignez vos informations pour lancer la roue.</p>
        </div>
        <form onSubmit={handleSubmit} className="form-stack">
          <label className="form-group">
            <span>Votre nom</span>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex. Jean Dupont" autoComplete="name" required />
          </label>
          <label className="form-group">
            <span>Votre numéro de téléphone</span>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="06 12 34 56 78" autoComplete="tel" inputMode="tel" required />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.gameConsent}
              onChange={(e) => setForm({ ...form, gameConsent: e.target.checked })} />
            <span>J’accepte le règlement du jeu et la collecte de mes données. <a href="/reglement.html" target="_blank" rel="noreferrer">Voir le règlement</a></span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.marketingConsent}
              onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })} />
            <span>J’accepte de recevoir les offres du restaurant par SMS <em>(facultatif)</em>.</span>
          </label>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <button className="primary-btn large" disabled={loading || !form.gameConsent}>
            {loading ? 'Vérification…' : 'Lancer la roue'}
          </button>
        </form>
      </div>
    </section>
  );
}
