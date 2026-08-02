import { useEffect } from 'react';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    background: 'rgba(13, 18, 16, 0.68)',
    backdropFilter: 'blur(5px)',
  },
  dialog: {
    width: 'min(460px, 100%)',
    overflow: 'hidden',
    border: '1px solid rgba(215, 156, 48, 0.35)',
    borderRadius: 22,
    background: '#fff',
    boxShadow: '0 30px 90px rgba(0, 0, 0, 0.35)',
  },
  accent: {
    height: 5,
    background: 'linear-gradient(90deg, #d79c30, #f2c66a, #d79c30)',
  },
  body: {
    padding: '30px 30px 26px',
    textAlign: 'center',
  },
  icon: {
    width: 62,
    height: 62,
    margin: '0 auto 18px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    background: '#fbe9e6',
    color: '#a23f37',
    fontSize: 27,
    fontWeight: 800,
  },
  eyebrow: {
    margin: '0 0 8px',
    color: '#d1942e',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    color: '#18201d',
    fontFamily: 'Georgia, serif',
    fontSize: 29,
  },
  text: {
    margin: '14px auto 0',
    color: '#67716c',
    fontSize: 14,
    lineHeight: 1.6,
  },
  name: {
    display: 'block',
    marginTop: 8,
    color: '#202725',
    fontSize: 16,
    fontWeight: 800,
  },
  warning: {
    margin: '18px 0 0',
    padding: '11px 13px',
    borderRadius: 10,
    background: '#fff4e0',
    color: '#8a6118',
    fontSize: 12,
    fontWeight: 700,
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 24,
  },
  button: {
    minHeight: 48,
    padding: '0 18px',
    border: 0,
    borderRadius: 11,
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
};

export default function ConfirmDeleteModal({ prize, loading, onCancel, onConfirm }) {
  useEffect(() => {
    if (!prize) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !loading) onCancel();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [prize, loading, onCancel]);

  if (!prize) return null;

  return (
    <div
      style={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-prize-title"
        aria-describedby="delete-prize-description"
        style={styles.dialog}
      >
        <div style={styles.accent} />
        <div style={styles.body}>
          <div style={styles.icon}>!</div>
          <p style={styles.eyebrow}>Confirmation requise</p>
          <h3 id="delete-prize-title" style={styles.title}>Supprimer ce lot ?</h3>
          <p id="delete-prize-description" style={styles.text}>
            Vous êtes sur le point de supprimer définitivement :
            <span style={styles.name}>« {prize.name} »</span>
          </p>
          <p style={styles.warning}>Cette action est définitive et ne peut pas être annulée.</p>
          <div style={styles.actions}>
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              style={{ ...styles.button, background: '#edf0ee', color: '#303936' }}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              autoFocus
              style={{
                ...styles.button,
                background: '#a23f37',
                color: '#fff',
                opacity: loading ? 0.65 : 1,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Suppression…' : 'Oui, supprimer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
