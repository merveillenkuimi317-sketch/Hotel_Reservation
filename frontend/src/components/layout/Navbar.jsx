import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout, canManage } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menu, setMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    ...styles.link,
    color: isActive(path) ? '#F9A825' : '#fff',
    borderBottom: isActive(path) ? '2px solid #F9A825' : '2px solid transparent',
  });

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>

        {/* Logo */}
        <Link to="/" style={styles.logo}>
           <span style={styles.logoTxt}>HôtelPro</span>
        </Link>

        {/* Liens desktop */}
        <div style={styles.links}>
          <Link to="/chambres" style={linkStyle('/chambres')}>Chambres</Link>

          {user && (
            <Link to="/mes-reservations" style={linkStyle('/mes-reservations')}>
              Mes réservations
            </Link>
          )}

          {canManage && canManage() && (
            <>
              <Link to="/dashboard"             style={linkStyle('/dashboard')}>Dashboard</Link>
              <Link to="/gestion-reservations"  style={linkStyle('/gestion-reservations')}>Réservations</Link>
            </>
          )}
        </div>

        {/* Boutons auth */}
        <div style={styles.auth}>
          {user ? (
            <div style={styles.userMenu}>
              <span style={styles.userName}>
                👤 {user.nom_complet || user.email}
              </span>
              <span style={styles.roleBadge}>{user.role}</span>
              <button style={styles.btnLogout} onClick={handleLogout}>
                Déconnexion
              </button>
            </div>
          ) : (
            <div style={styles.authBtns}>
              <Link to="/login" style={styles.btnLogin}>Connexion</Link>
              <Link to="/register" style={styles.btnRegister}>S'inscrire</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: '#0D2137',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    fontSize: '1.4rem',
  },
  logoTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: '1.2rem',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flex: 1,
    marginLeft: '2rem',
  },
  link: {
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.95rem',
    paddingBottom: '2px',
    transition: 'color 0.2s',
  },
  auth: {
    display: 'flex',
    alignItems: 'center',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  userName: {
    color: '#fff',
    fontSize: '0.9rem',
  },
  roleBadge: {
    background: '#1565C0',
    color: '#fff',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  btnLogout: {
    background: 'transparent',
    color: '#90A4AE',
    border: '1px solid #90A4AE',
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  authBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  btnLogin: {
    color: '#fff',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.9rem',
  },
  btnRegister: {
    background: '#1565C0',
    color: '#fff',
    textDecoration: 'none',
    padding: '0.5rem 1.2rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
};