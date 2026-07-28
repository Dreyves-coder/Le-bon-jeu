import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const passwordRules = [
  ['length', '12 caractères minimum', (value) => value.length >= 12],
  ['uppercase', 'Une majuscule', (value) => /[A-Z]/.test(value)],
  ['lowercase', 'Une minuscule', (value) => /[a-z]/.test(value)],
  ['number', 'Un chiffre', (value) => /\d/.test(value)],
  ['symbol', 'Un symbole', (value) => /[^A-Za-z0-9]/.test(value)],
];

export default function AdminSecurityPage() {
  const navigate = useNavigate();
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    api.get('/admin/session').then((response) => {
      setCurrentEmail(response.data.data.admin.email);
    });
  }, []);

  const validPassword = useMemo(
    () => passwordRules.every(([, , validate]) => validate(passwordForm.newPassword)),
    [passwordForm.newPassword],
  );
  const samePasswords = passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmation;
  const validEmail = /^[^\s@]+@[^\s@]+\.(fr|com)$/i.test(emailForm.newEmail);

  async function submitEmail(event) {
    event.preventDefault();
    if (!validEmail) return;
    setChangingEmail(true);
    setEmailError('');
    try {
      const response = await api.put('/admin/email', emailForm);
      navigate('/admin/login', {
        replace: true,
        state: { message: `Adresse modifiée. Reconnectez-vous avec ${response.data.data.email}.` },
      });
    } catch (error) {
      setEmailError(error.response?.data?.message || 'Le changement d’adresse a échoué.');
    } finally {
      setChangingEmail(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (!validPassword || !samePasswords) return;
    setChangingPassword(true);
    setPasswordError('');
    try {
      await api.put('/admin/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      navigate('/admin/login', {
        replace: true,
        state: { message: 'Mot de passe modifié. Reconnectez-vous.' },
      });
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Le changement de mot de passe a échoué.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="security-page">
      <p className="eyebrow">Compte administrateur</p>
      <h2>Sécurité</h2>
      <p>Toute modification ferme immédiatement les sessions administrateur existantes.</p>

      <form className="security-card" onSubmit={submitEmail}>
        <div className="security-card-heading">
          <div><span>Identifiant actuel</span><strong>{currentEmail || 'Chargement…'}</strong></div>
          <h3>Modifier l’adresse de connexion</h3>
        </div>
        <label>Nouvelle adresse en .fr ou .com
          <input type="email" value={emailForm.newEmail}
            onChange={(event) => setEmailForm({ ...emailForm, newEmail: event.target.value })}
            placeholder="admin@mahana.fr" autoComplete="email" required />
        </label>
        <label>Mot de passe actuel
          <input type="password" value={emailForm.currentPassword}
            onChange={(event) => setEmailForm({ ...emailForm, currentPassword: event.target.value })}
            autoComplete="current-password" required />
        </label>
        {emailForm.newEmail && !validEmail ? <p className="error-text">L’adresse doit se terminer par .fr ou .com.</p> : null}
        {emailError ? <p className="error-text" role="alert">{emailError}</p> : null}
        <button className="admin-primary" disabled={changingEmail || !validEmail || !emailForm.currentPassword}>
          {changingEmail ? 'Modification…' : 'Modifier l’adresse'}
        </button>
      </form>

      <form className="security-card" onSubmit={submitPassword}>
        <div className="security-card-heading"><h3>Modifier le mot de passe</h3></div>
        <label>Mot de passe actuel
          <input type="password" value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
            autoComplete="current-password" required />
        </label>
        <label>Nouveau mot de passe
          <input type="password" value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
            autoComplete="new-password" required />
        </label>
        <div className="password-rules">
          {passwordRules.map(([id, label, validate]) => (
            <span className={validate(passwordForm.newPassword) ? 'valid' : ''} key={id}>
              {validate(passwordForm.newPassword) ? '✓' : '○'} {label}
            </span>
          ))}
        </div>
        <label>Confirmer le nouveau mot de passe
          <input type="password" value={passwordForm.confirmation}
            onChange={(event) => setPasswordForm({ ...passwordForm, confirmation: event.target.value })}
            autoComplete="new-password" required />
        </label>
        {passwordForm.confirmation && !samePasswords ? <p className="error-text">Les mots de passe ne correspondent pas.</p> : null}
        {passwordError ? <p className="error-text" role="alert">{passwordError}</p> : null}
        <button className="admin-primary" disabled={changingPassword || !validPassword || !samePasswords}>
          {changingPassword ? 'Modification…' : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  );
}
