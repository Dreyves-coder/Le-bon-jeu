import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const emptyForm = { name: '', description: '', probability: 10, initialStock: 10, isActive: true };

export default function AdminPrizesPage() {
  const [prizes, setPrizes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingPrizeId, setUpdatingPrizeId] = useState('');
  const [message, setMessage] = useState('');

  async function loadPrizes() {
    try {
      const response = await api.get('/admin/prizes');
      setPrizes(response.data.data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Impossible de charger les lots.');
    }
  }

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try {
        const response = await api.get('/admin/prizes');
        if (mounted) setPrizes(response.data.data);
      } catch {
        // Le message détaillé reste géré par les actions explicites.
      }
    }
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const totalProbability = useMemo(
    () => prizes.filter((prize) => prize.isActive && prize.remainingStock > 0)
      .reduce((sum, prize) => sum + (prize.probability <= 1 ? prize.probability * 100 : prize.probability), 0),
    [prizes],
  );

  async function createPrize(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/admin/prizes', {
        ...form,
        probability: Number(form.probability) / 100,
        initialStock: Number(form.initialStock),
      });
      setForm(emptyForm);
      setShowForm(false);
      setMessage('Le nouveau lot a été enregistré.');
      await loadPrizes();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Impossible d’enregistrer le lot.');
    } finally {
      setSaving(false);
    }
  }

  async function updatePrize(id, changes) {
    setMessage('');
    setUpdatingPrizeId(id);
    try {
      await api.put(`/admin/prizes/${id}`, changes);
      await loadPrizes();
      setMessage('Modification enregistrée.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'La modification a échoué.');
      await loadPrizes();
    } finally {
      setUpdatingPrizeId('');
    }
  }

  async function adjustProbability(id, amount) {
    const input = document.getElementById(`prob-${id}`);
    if (!input || updatingPrizeId === id) return;
    const nextValue = Math.min(100, Math.max(0, (Number(input.value) || 0) + amount));
    input.value = Number(nextValue.toFixed(1));
    await updatePrize(id, { probability: nextValue / 100 });
  }

  async function saveProbability(id, value) {
    if (updatingPrizeId === id) return;
    const percentage = Math.min(100, Math.max(0, Number(value) || 0));
    await updatePrize(id, { probability: percentage / 100 });
  }

  return (
    <div>
      <div className="admin-page-header">
        <div><p className="eyebrow">Catalogue réel</p><h2>Lots & stocks</h2><p>Ajoutez vos cadeaux et surveillez les quantités restantes.</p></div>
        <button className="admin-primary" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Annuler' : '+ Nouveau lot'}</button>
      </div>

      {showForm ? (
        <form className="prize-form" onSubmit={createPrize}>
          <label>Nom du lot<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Menu offert" required /></label>
          <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Conditions ou détails" /></label>
          <label>Probabilité de gain (%)<input type="number" min="0.1" max="100" step="0.1" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} required /></label>
          <label>Stock initial<input type="number" min="0" step="1" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} required /></label>
          <button className="admin-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le lot'}</button>
        </form>
      ) : null}

      {message ? <p className="admin-message">{message}</p> : null}
      <div className={`probability-summary ${totalProbability > 100 ? 'has-error' : ''}`}>
        <span>Probabilité totale des lots disponibles</span>
        <strong>{totalProbability.toFixed(1)} %</strong>
        <small>{totalProbability <= 100 ? `${(100 - totalProbability).toFixed(1)} % de chance de ne rien gagner` : 'Le total doit rester inférieur ou égal à 100 %.'}</small>
      </div>

      <div className="prize-grid">
        {prizes.map((prize) => {
          const percent = prize.probability <= 1 ? prize.probability * 100 : prize.probability;
          const stockPercent = prize.initialStock ? Math.min(100, (prize.remainingStock / prize.initialStock) * 100) : 0;
          const stockThreshold = Math.max(2, Math.ceil(prize.initialStock * 0.2));
          const outOfStock = prize.remainingStock === 0;
          const lowStock = !outOfStock && prize.remainingStock <= stockThreshold;
          return (
            <article className={`prize-admin-card ${!prize.isActive ? 'disabled' : ''} ${outOfStock ? 'out-of-stock' : ''} ${lowStock ? 'low-stock' : ''}`} key={prize.id}>
              <div className="prize-card-top"><div><h3>{prize.name}</h3><p>{prize.description || 'Aucune description'}</p></div>
                <button className={`status-chip ${prize.isActive ? 'active' : ''} ${outOfStock ? 'empty' : ''}`}
                  disabled={outOfStock} onClick={() => updatePrize(prize.id, { isActive: !prize.isActive })}>
                  {outOfStock ? 'Épuisé' : prize.isActive ? 'Actif' : 'Inactif'}
                </button>
              </div>
              {lowStock ? <div className="card-stock-warning">Stock faible : pensez à réapprovisionner ce lot.</div> : null}
              {outOfStock ? <div className="card-stock-warning critical">Ce lot a été automatiquement désactivé.</div> : null}
              <div className="stock-line"><span>Stock restant</span><strong>{prize.remainingStock} / {prize.initialStock}</strong></div>
              <div className={`stock-bar ${lowStock ? 'low' : ''} ${outOfStock ? 'empty' : ''}`}><i style={{ width: `${stockPercent}%` }} /></div>
              <div className="prize-actions">
                <label>Probabilité
                  <div className="probability-stepper">
                    <button type="button" disabled={updatingPrizeId === prize.id} aria-label={`Diminuer la probabilité de ${prize.name}`}
                      onPointerDown={(event) => event.preventDefault()} onClick={() => adjustProbability(prize.id, -1)}>−</button>
                    <input type="number" min="0" max="100" step="0.1" defaultValue={percent} id={`prob-${prize.id}`} inputMode="decimal"
                      onBlur={(event) => saveProbability(prize.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }} />
                    <span>%</span>
                    <button type="button" disabled={updatingPrizeId === prize.id} aria-label={`Augmenter la probabilité de ${prize.name}`}
                      onPointerDown={(event) => event.preventDefault()} onClick={() => adjustProbability(prize.id, 1)}>+</button>
                  </div>
                </label>
                <label>Stock
                  <input type="number" min="0" step="1" defaultValue={prize.remainingStock} id={`stock-${prize.id}`} />
                </label>
                <button onClick={() => updatePrize(prize.id, {
                  probability: Number(document.getElementById(`prob-${prize.id}`).value) / 100,
                  remainingStock: Number(document.getElementById(`stock-${prize.id}`).value),
                })}>Enregistrer</button>
              </div>
            </article>
          );
        })}
      </div>
      {!prizes.length ? <div className="empty-state">Aucun lot enregistré. Ajoutez votre premier cadeau.</div> : null}
    </div>
  );
}
