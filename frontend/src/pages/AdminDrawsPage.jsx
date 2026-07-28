import { useEffect, useState } from 'react';
import api from '../services/api';

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

export default function AdminDrawsPage() {
  const [draws, setDraws] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await api.get('/admin/draws');
        if (mounted) { setDraws(response.data.data); setError(''); }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Impossible de charger l’historique.');
      }
    }
    load();
    const timer = setInterval(load, 4000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  return (
    <div>
      <div className="admin-page-header">
        <div><p className="eyebrow">Résultats réels</p><h2>Historique des parties</h2><p>Chaque ligne correspond à une partie terminée sur la tablette client.</p></div>
        <span className="count-badge">{draws.length} partie(s)</span>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="data-table">
        <div className="data-row data-head"><span>Participant</span><span>Résultat</span><span>Date</span></div>
        {draws.map((draw) => (
          <div className="data-row" key={draw.id}>
            <div><strong>{draw.participant?.name || 'Participant'}</strong><small className="subline">{draw.participant?.phone}</small></div>
            <span className={draw.resultType === 'WIN' ? 'result-win' : 'result-loss'}>{draw.prize?.name || 'Non gagnant'}</span>
            <small>{formatDate(draw.createdAt)}</small>
          </div>
        ))}
        {!draws.length ? <div className="empty-state">Aucune partie terminée.</div> : null}
      </div>
    </div>
  );
}
