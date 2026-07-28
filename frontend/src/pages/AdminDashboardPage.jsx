import { useEffect, useState } from 'react';
import api from '../services/api';

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await api.get('/admin/dashboard');
        if (mounted) {
          setDashboard(response.data.data);
          setError('');
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Impossible de charger le tableau de bord.');
      }
    }
    load();
    const timer = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const data = dashboard || {};
  return (
    <div>
      <div className="admin-page-header">
        <div><p className="eyebrow">Données en direct</p><h2>Tableau de bord</h2></div>
        <span className="live-badge"><i /> Actualisation automatique</span>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {data.lowStockPrizes?.length || data.outOfStockPrizes?.length ? (
        <div className="stock-alert-panel" role="status">
          <div className="stock-alert-title"><span>!</span><div><strong>Attention aux stocks</strong><small>Certains lots nécessitent votre intervention.</small></div></div>
          <div className="stock-alert-list">
            {data.outOfStockPrizes?.map((prize) => (
              <span className="stock-alert-item out" key={prize.id}><b>{prize.name}</b> — épuisé et automatiquement désactivé</span>
            ))}
            {data.lowStockPrizes?.map((prize) => (
              <span className="stock-alert-item low" key={prize.id}><b>{prize.name}</b> — seulement {prize.remainingStock} unité(s)</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="stats-grid stats-grid-four">
        <div className="stat-card"><span>Participants</span><strong>{data.participantsCount ?? '—'}</strong><small>Inscriptions enregistrées</small></div>
        <div className="stat-card"><span>Parties jouées</span><strong>{data.drawsCount ?? '—'}</strong><small>Tirages terminés</small></div>
        <div className="stat-card"><span>Parties gagnantes</span><strong>{data.winRate ?? 0} %</strong><small>{data.winnersCount ?? 0} gain(s) sur {data.drawsCount ?? 0} partie(s)</small></div>
        <div className="stat-card"><span>Lots disponibles</span><strong>{data.activePrizesCount ?? '—'}</strong><small>{data.remainingStock ?? 0} unité(s) restante(s) au total</small></div>
      </div>
      <section className="admin-section">
        <div className="section-title"><h3>Derniers tirages</h3><span>{data.recentDraws?.length || 0} résultat(s)</span></div>
        <div className="data-table">
          <div className="data-row data-head"><span>Participant</span><span>Résultat</span><span>Date</span></div>
          {data.recentDraws?.map((draw) => (
            <div className="data-row" key={draw.id}>
              <strong>{draw.participant?.name || 'Participant'}</strong>
              <span className={draw.resultType === 'WIN' ? 'result-win' : 'result-loss'}>{draw.prize?.name || 'Non gagnant'}</span>
              <small>{formatDate(draw.createdAt)}</small>
            </div>
          ))}
          {dashboard && !data.recentDraws?.length ? <div className="empty-state">Aucune partie jouée pour le moment.</div> : null}
        </div>
      </section>
    </div>
  );
}
