import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import api from '../services/api';

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await api.get('/admin/settings');
        if (mounted) setSettings(response.data.data);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('adminToken');
          navigate('/admin/login', { replace: true });
        } else if (mounted) {
          setMessage('Impossible de joindre le serveur.');
        }
      }
    }
    load();
    const timer = setInterval(load, 2000);
    return () => { mounted = false; clearInterval(timer); };
  }, [navigate]);

  async function setAuthorization(isGameActive) {
    if (!settings || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await api.put('/admin/settings', { id: settings.id || 'default', isGameActive });
      setSettings(response.data.data);
      setMessage(isGameActive
        ? 'Une partie est autorisée. La tablette client peut commencer.'
        : 'L’autorisation a été annulée.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'La modification a échoué.');
    } finally {
      setSaving(false);
    }
  }

  const authorized = Boolean(settings?.isGameActive);
  return (
    <div className="authorization-page">
      <p className="eyebrow">Pilotage de la tablette client</p>
      <h2>Autoriser une partie</h2>
      <p>L’autorisation est valable pour un seul client. Elle disparaît automatiquement dès que la roue a rendu son résultat.</p>

      <div className={`authorization-card ${authorized ? 'is-ready' : ''}`}>
        <div className="authorization-icon">{authorized ? '✓' : '○'}</div>
        <div className="authorization-copy">
          <span>État de la tablette client</span>
          <strong>{settings ? (authorized ? 'Une partie est autorisée' : 'En attente de l’administrateur') : 'Connexion…'}</strong>
          <p>{authorized ? 'Le client peut maintenant toucher « Je participe ».' : 'Le bouton de participation est masqué sur la tablette client.'}</p>
        </div>
        {authorized ? (
          <button className="control-button stop" onClick={() => setAuthorization(false)} disabled={saving}>{saving ? 'Annulation…' : 'Annuler l’autorisation'}</button>
        ) : (
          <button className="control-button start authorize-button" onClick={() => setAuthorization(true)} disabled={!settings || saving}>{saving ? 'Activation…' : 'Autoriser le prochain client'}</button>
        )}
      </div>
      {message ? <p className="admin-message" role="status">{message}</p> : null}
      <div className="workflow-card">
        <div><b>1</b><span><strong>L’admin autorise</strong><small>Depuis cette page</small></span></div>
        <i>→</i>
        <div><b>2</b><span><strong>Le client joue</strong><small>Sur la seconde tablette</small></span></div>
        <i>→</i>
        <div><b>3</b><span><strong>Arrêt automatique</strong><small>Après le résultat</small></span></div>
      </div>
    </div>
  );
}
