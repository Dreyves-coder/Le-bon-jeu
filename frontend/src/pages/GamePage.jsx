import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';

const fallbackPrizes = [
  { icon: '🍷', label: 'Bouteille de vin' },
  { icon: '🍰', label: 'Dessert offert' },
  { icon: '%', label: '-20% prochaine visite' },
  { icon: '☕', label: 'Café offert' },
  { icon: '↻', label: 'Retentez demain' },
];

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const participant = location.state?.participant;
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState('');
  const [wheelPrizes, setWheelPrizes] = useState(fallbackPrizes);

  useEffect(() => {
    if (!participant) navigate('/participation');
    api.get('/public/prizes').then((response) => {
      const available = response.data.data.filter((prize) => prize.isActive && prize.remainingStock > 0);
      if (!available.length) return;
      const items = available.slice(0, 7).map((prize) => ({
        icon: prize.name.includes('%') ? '%' : prize.name.toLowerCase().includes('café') ? '☕' : prize.name.toLowerCase().includes('vin') ? '🍷' : prize.name.toLowerCase().includes('dessert') ? '🍰' : '🎁',
        label: prize.name,
      }));
      const totalProbability = available.reduce((sum, prize) => sum + (prize.probability > 1 ? prize.probability / 100 : prize.probability), 0);
      if (totalProbability < 0.999 && items.length < 8) items.push({ icon: '✦', label: 'À bientôt' });
      setWheelPrizes(items);
    }).catch(() => {});
  }, [navigate, participant]);

  const segmentAngle = 360 / wheelPrizes.length;
  const wheelBackground = `conic-gradient(from ${-segmentAngle / 2}deg, ${wheelPrizes.map((_, index) => {
    const colors = ['#74372b', '#242b2b', '#4b2723', '#303737', '#8b472d', '#29302f', '#63352a', '#373d3c'];
    const start = (index / wheelPrizes.length) * 100;
    const end = ((index + 1) / wheelPrizes.length) * 100;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  }).join(',')})`;

  async function handleSpin() {
    if (!participant || spinning) return;
    setSpinning(true);
    setError('');
    try {
      const response = await api.post('/public/draw', participant);
      setTimeout(() => navigate('/resultat', { state: { result: response.data.data } }), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Le tirage a échoué.');
      setSpinning(false);
    }
  }

  return (
    <section className="page-screen public-screen game-screen">
      <div className="panel-card game-card">
        <button type="button" className="back-button icon-button" aria-label="Retour" onClick={() => navigate(-1)}>←</button>
        <div className="page-heading compact">
          <p className="eyebrow">Bonne chance</p>
          <h1>À vous de jouer&nbsp;!</h1>
          <p>Lancez la roue pour découvrir votre cadeau.</p>
        </div>
        <div className="wheel-stage">
          <div className="wheel-pointer" aria-hidden="true" />
          <div className={`wheel ${spinning ? 'spinning' : ''}`} aria-label="Roue des cadeaux"
            style={{
              '--count': wheelPrizes.length,
              '--segment-angle': `${segmentAngle}deg`,
              '--separator-offset': `${-segmentAngle / 2}deg`,
              background: wheelBackground,
            }}>
            <div className="wheel-lights" />
            {wheelPrizes.map((prize, index) => (
              <div className="wheel-prize" style={{ '--angle': `${segmentAngle * index}deg` }} key={`${prize.label}-${index}`}>
                <div className="wheel-prize-content" style={{ transform: `rotate(${-segmentAngle * index}deg)` }}>
                  <b>{prize.icon}</b><span>{prize.label}</span>
                </div>
              </div>
            ))}
            <button className="wheel-center" onClick={handleSpin} disabled={spinning} aria-label="Tourner la roue">
              {spinning ? '…' : 'GO'}
            </button>
          </div>
        </div>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <button className="primary-btn large spin-button" onClick={handleSpin} disabled={spinning}>
          {spinning ? 'La roue tourne…' : 'Tourner la roue'}
        </button>
      </div>
    </section>
  );
}
