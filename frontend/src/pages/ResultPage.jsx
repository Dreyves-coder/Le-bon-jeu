import { useLocation, useNavigate } from 'react-router';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;

  if (!result) {
    return (
      <section className="page-screen public-screen">
        <div className="panel-card result-card">
          <h2>Aucun résultat disponible</h2>
          <p>Retournez à l’accueil pour recommencer.</p>
          <button className="primary-btn large" onClick={() => navigate('/')}>Retour à l’accueil</button>
        </div>
      </section>
    );
  }

  const isWin = result.resultType === 'WIN' && result.prize;
  return (
    <section className="page-screen public-screen result-screen">
      <div className={`panel-card result-card ${isWin ? 'win' : 'loss'}`}>
        <button type="button" className="back-button icon-button" aria-label="Retour" onClick={() => navigate(-1)}>←</button>
        <div className="page-heading compact">
          <p className="eyebrow">{isWin ? 'Félicitations' : 'Dommage'}</p>
          <h1>{isWin ? 'Vous avez gagné !' : 'Ce sera pour la prochaine fois'}</h1>
          <p>{isWin ? 'Une belle surprise vous attend.' : 'Merci d’avoir tenté votre chance.'}</p>
        </div>
        <div className="result-visual">
          {isWin ? (
            <div className="prize-card">
              <div className="prize-glow" />
              <div className="prize-icon">🎁</div>
              <div><strong>{result.prize.name}</strong><p>Présentez cet écran à notre équipe.</p></div>
            </div>
          ) : (
            <div className="loss-card"><span>☹</span></div>
          )}
        </div>
        <p className="result-copy">{isWin ? 'Merci pour votre visite, et à très bientôt !' : 'Revenez demain pour tenter de nouveau votre chance.'}</p>
        <button className="primary-btn large" onClick={() => navigate('/')}>Terminer</button>
      </div>
    </section>
  );
}
