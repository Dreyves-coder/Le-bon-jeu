import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import api from '../services/api';
import mahanaLogo from '../assets/Image mahana.png';

const navigation = [
  ['Tableau de bord', '/admin'],
  ['Lots & stocks', '/admin/lots'],
  ['Historique', '/admin/tirages'],
  ['Autoriser une partie', '/admin/parametres'],
  ['Sécurité', '/admin/securite'],
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    api.get('/admin/session')
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    if (authenticated === false) navigate('/admin/login', { replace: true });
  }, [authenticated, navigate]);

  async function logout() {
    try {
      await api.post('/admin/logout');
    } finally {
      navigate('/admin/login', { replace: true });
    }
  }

  if (authenticated !== true) {
    return <div className="admin-loading">Vérification de la session…</div>;
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="admin-brand">
          <img className="admin-logo-image" src={mahanaLogo} alt="Mahana Win" />
          <small>ADMINISTRATION</small>
        </div>
        <nav>
          {navigation.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === '/admin'}>{label}</NavLink>
          ))}
        </nav>
        <button onClick={logout} className="secondary-btn">Déconnexion</button>
      </aside>
      <section className="admin-content"><Outlet /></section>
    </div>
  );
}
