import { useLocation, useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const lossSegment = { id: 'loss', type: 'LOSS', icon: '✦', label: 'À bientôt' };

function prizeIcon(name) {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('%')) return '%';
  if (normalized.includes('café')) return '☕';
  if (normalized.includes('vin')) return '🍷';
  if (normalized.includes('dessert') || normalized.includes('gâteau')) return '🍰';
  return '🎁';
}

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const participant = location.state?.participant;
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState(0);
  const [wheelPrizes, setWheelPrizes] = useState([lossSegment]);

  useEffect(() => {
    if (!participant) {
      navigate('/participation', { replace: true });
      return;
    }

    api.get('/public/prizes').then((response) => {
      const available = response.data.data.filter((prize) => prize.isActive && prize.remainingStock > 0);
      const items = available.map((prize) => ({
        id: prize.id,
        type: 'WIN',
        icon: prizeIcon(prize.name),
        label: prize.name,
      }));
      const totalProbability = available.reduce((sum, prize) => sum + Number(prize.probability), 0);
      if (totalProbability < 0.999999 || items.length === 0) items.push(lossSegment);
      setWheelPrizes(items);
    }).catch(() => setWheelPrizes([lossSegment]));
  }, [navigate, participant]);

  const segmentAngle = 360 / wheelPrizes.length;
  const wheelBackground = useMemo(() => `conic-gradient(from ${-segmentAngle / 2}deg, ${wheelPrizes.map((_, index) => {
    const colors = ['#74372b', '#242b2b', '#4b2723', '#303737', '#8b472d', '#29302f', '#63352a', '#373d3c'];
    const start = (index / wheelPrizes.length) * 100;
    const end = ((index + 1) / wheelPrizes.length) * 100;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  }).join(',')})`, [segmentAngle, wheelPrizes]);

  async function handleSpin() {
    if (!participant || spinning) return;
    setSpinning(true);
    setError('');
    try {
      const response = await api.post('/public/draw', participant);
      const result = response.data.data;
      const targetIndex = result.resultType === 'WIN' && result.prize
        ? wheelPrizes.findIndex((item) => item.id === result.prize.id)
        : wheelPrizes.findIndex((item) => item.type === 'LOSS');
      const safeTargetIndex = targetIndex >= 0 ? targetIndex : 0;
      setRotation((5 * 360) - (safeTargetIndex * segmentAngle));
      window.setTimeout(() => navigate('/resultat', { state: { result } }), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Le tirage a échoué.');
      setSpinning(false);
    }
  }

  return (
    <section className="page-screen public-screen game-screen">
      <div className="panel-card game-card">
        <button type="button" className="back-button icon-button" aria-label="Retour" disabled={spinning} onClick={() => navigate(-1)}>←</button>
        <div className="page-heading compact">
          <p className="eyebrow">Bonne chance</p>
          <h1>À vous de jouer&nbsp;!</h1>
          <p>Lancez la roue pour découvrir votre cadeau.</p>
        </div>
        <div className="wheel-stage">
          <div className="wheel-pointer" aria-hidden="true" />
          <div className="wheel" aria-label="Roue des cadeaux"
            style={{
              '--count': wheelPrizes.length,
              '--segment-angle': `${segmentAngle}deg`,
              '--separator-offset': `${-segmentAngle / 2}deg`,
              background: wheelBackground,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 1.8s cubic-bezier(.15,.65,.12,1)' : 'none',
            }}>
            <div className="wheel-lights" />
            {wheelPrizes.map((prize, index) => (
              <div className="wheel-prize" style={{ '--angle': `${segmentAngle * index}deg` }} key={`${prize.id}-${index}`}>
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
