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

// ── Garde de route : utilisateur connecté requis ──────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Chargement...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

// ── Garde de route : admin ou gestionnaire requis ─────────────────────────
function ManagerRoute({ children }) {
  const { user, loading, canManage } = useAuth();

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!canManage()) return <Navigate to="/chambres" replace />;

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

      {/* Routes privées */}
      <Route path="/reserver" element={
        <PrivateRoute>
          <Layout><Reservation /></Layout>
        </PrivateRoute>
      } />

      <Route path="/mes-reservations" element={
        <PrivateRoute>
          <Layout><MesReservations /></Layout>
        </PrivateRoute>
      } />

      <Route path="/modifier-reservation/:id" element={
        <PrivateRoute>
          <Layout><ModifierReservation /></Layout>
        </PrivateRoute>
      } />

      {/* Routes gestionnaire/admin */}
      <Route path="/dashboard" element={
        <ManagerRoute>
          <Layout><Dashboard /></Layout>
        </ManagerRoute>
      } />

      <Route path="/gestion-reservations" element={
        <ManagerRoute>
          <Layout><GestionReservations /></Layout>
        </ManagerRoute>
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