import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await api.get('/admin/participants');
        if (mounted) { setParticipants(response.data.data); setError(''); }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Impossible de charger les participants.');
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return participants.filter((item) => !query || item.name.toLowerCase().includes(query) || item.phone.includes(query));
  }, [participants, search]);

  return (
    <div>
      <div className="admin-page-header">
        <div><p className="eyebrow">Inscriptions réelles</p><h2>Participants</h2><p>Les clients apparaissent ici dès que leur partie est terminée.</p></div>
        <span className="count-badge">{participants.length} participant(s)</span>
      </div>
      <input className="admin-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom ou téléphone…" />
      {error ? <p className="error-text">{error}</p> : null}
      <div className="data-table participants-table">
        <div className="data-row data-head"><span>Nom</span><span>Téléphone</span><span>Consentement SMS</span><span>Inscription</span></div>
        {filtered.map((participant) => (
          <div className="data-row" key={participant.id}>
            <strong>{participant.name}</strong>
            <span>{participant.phone}</span>
            <span>{participant.marketingConsent ? 'Oui' : 'Non'}</span>
            <small>{formatDate(participant.createdAt)}</small>
          </div>
        ))}
        {!filtered.length ? <div className="empty-state">Aucun participant trouvé.</div> : null}
      </div>
    </div>
  );
}
