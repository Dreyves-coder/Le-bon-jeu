import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import api from '../services/api';
import mahanaLogo from '../assets/Image mahana.png';

export default function HomePage() {
  const [gameState, setGameState] = useState({ loading: true, active: false, connected: true });

  useEffect(() => {
    let mounted = true;
    async function refreshState() {
      try {
        const response = await api.get('/public/settings');
        if (mounted) setGameState({ loading: false, active: Boolean(response.data.data?.isGameActive), connected: true });
      } catch {
        if (mounted) setGameState({ loading: false, active: false, connected: false });
      }
    }
    refreshState();
    const interval = setInterval(refreshState, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="home-screen public-screen">
      <div className="home-card">
        <div className="home-overlay" />
        <div className="home-copy">
          <img className="brand-logo-image" src={mahanaLogo} alt="Mahana Win — Jouez, tentez, gagnez" />
          <div className="welcome-copy">
            <p className="eyebrow">{gameState.active ? 'Un instant rien que pour vous' : 'La roue des cadeaux'}</p>
            <h1>{gameState.active ? 'Merci pour votre visite !' : 'Le jeu arrive bientôt'}</h1>
            <p>
              {gameState.loading && 'Connexion à la tablette de contrôle…'}
              {!gameState.loading && gameState.active && 'Tentez votre chance et repartez peut-être avec une belle surprise.'}
              {!gameState.loading && !gameState.active && gameState.connected && 'Patientez, notre équipe va bientôt activer le jeu.'}
              {!gameState.loading && !gameState.connected && 'Connexion au serveur interrompue. Prévenez notre équipe.'}
            </p>
          </div>
          {gameState.active ? (
            <Link className="primary-btn home-cta" to="/participation">
              <span>Je participe</span><span aria-hidden="true">→</span>
            </Link>
          ) : (
            <div className="waiting-status"><span className={gameState.connected ? 'pulse' : 'offline'} />{gameState.connected ? 'En attente d’activation' : 'Serveur déconnecté'}</div>
          )}
          <p className="hint"><span>✦</span> Bonne chance&nbsp;!</p>
        </div>
      </div>
    </section>
  );
}
