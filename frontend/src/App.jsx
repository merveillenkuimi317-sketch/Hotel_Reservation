import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';


// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Chambres from './pages/Chambres';
import Reservation from './pages/Reservation';
import MesReservations from './pages/MesReservations';
import Dashboard from './pages/Dashboard';


// Layout
import Navbar from './components/layout/Navbar';
import ModifierReservation from './pages/ModifierReservation';
import GestionReservations from './pages/GestionReservations';
import GestionChambres from './pages/GestionChambres';
import GestionUtilisateurs from './pages/GestionUtilisateurs';

// ── Garde de route : utilisateur connecté requis ──────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={styles.loading}><div style={styles.spinner} /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

// ── Garde : clients et gestionnaires uniquement (pas admin) ───────────────
function NonAdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div style={styles.loading}><div style={styles.spinner} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Garde : admin ou gestionnaire ────────────────────────────────────────
function ManagerRoute({ children }) {
  const { user, loading, canManage } = useAuth();
  if (loading) return <div style={styles.loading}><div style={styles.spinner} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!canManage()) return <Navigate to="/chambres" replace />;
  return children;
}

// ── Garde : admin uniquement ─────────────────────────────────────────────
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div style={styles.loading}><div style={styles.spinner} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Garde : gestionnaire uniquement ──────────────────────────────────────
function GestionnaireRoute({ children }) {
  const { user, loading, isGestionnaire } = useAuth();
  if (loading) return <div style={styles.loading}><div style={styles.spinner} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isGestionnaire()) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Layout principal avec Navbar ──────────────────────────────────────────
function Layout({ children }) {
  return (
    <div style={styles.app}>
      <Navbar />
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Routes publiques */}
      <Route
        path="/login"
        element={user ? <Navigate to="/chambres" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/chambres" replace /> : <Register />}
      />

      {/* Routes avec Navbar */}
      <Route path="/chambres" element={
        <Layout><Chambres /></Layout>
      } />

      {/* Routes privées — non accessibles à l'admin */}
      <Route path="/reserver" element={
        <NonAdminRoute>
          <Layout><Reservation /></Layout>
        </NonAdminRoute>
      } />

      <Route path="/mes-reservations" element={
        <NonAdminRoute>
          <Layout><MesReservations /></Layout>
        </NonAdminRoute>
      } />

      <Route path="/modifier-reservation/:id" element={
        <NonAdminRoute>
          <Layout><ModifierReservation /></Layout>
        </NonAdminRoute>
      } />

      {/* Routes gestionnaire/admin */}
      <Route path="/dashboard" element={
        <ManagerRoute>
          <Layout><Dashboard /></Layout>
        </ManagerRoute>
      } />

      <Route path="/gestion-reservations" element={
        <GestionnaireRoute>
          <Layout><GestionReservations /></Layout>
        </GestionnaireRoute>
      } />

      <Route path="/gestion-chambres" element={
        <AdminRoute>
          <Layout><GestionChambres /></Layout>
        </AdminRoute>
      } />

      <Route path="/gestion-utilisateurs" element={
        <AdminRoute>
          <Layout><GestionUtilisateurs /></Layout>
        </AdminRoute>
      } />

      {/* Redirection par défaut */}
      <Route path="/" element={<Navigate to="/chambres" replace />} />
      <Route path="*" element={<Navigate to="/chambres" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#F4F7FA',
  },
  main: {
    minHeight: 'calc(100vh - 64px)',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#90A4AE',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #eee',
    borderTopColor: '#1565C0',
    borderRadius: '50%',
    marginBottom: '1rem',
  },
};