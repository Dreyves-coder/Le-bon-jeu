import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import './App.css';
import HomePage from './pages/HomePage';
import ParticipationPage from './pages/ParticipationPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminPrizesPage from './pages/AdminPrizesPage';
import AdminDrawsPage from './pages/AdminDrawsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminSecurityPage from './pages/AdminSecurityPage';
import Layout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/participation" element={<ParticipationPage />} />
          <Route path="/jeu" element={<GamePage />} />
          <Route path="/resultat" element={<ResultPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/lots" element={<AdminPrizesPage />} />
          <Route path="/admin/tirages" element={<AdminDrawsPage />} />
          <Route path="/admin/parametres" element={<AdminSettingsPage />} />
          <Route path="/admin/securite" element={<AdminSecurityPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
