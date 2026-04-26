import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]     = useState({ email: '', password: '' });
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);

    try {
      const user = await login(form);
      if (user.role === 'client') {
        navigate('/chambres');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}></div>
        <h1 style={styles.titre}>Connexion</h1>
        <p style={styles.sous}>Plateforme Hôtelière</p>

        {erreur && (
          <div style={styles.erreur}>{erreur}</div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.group}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            style={loading ? {...styles.btn, opacity: 0.7} : styles.btn}
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={styles.lien}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={styles.link}>S'inscrire</Link>
        </p>

        <div style={styles.comptes}>
          <p style={styles.comptesTitle}>Comptes de test :</p>
          <p style={styles.compte}> admin@hotel.cm / admin1234</p>
          <p style={styles.compte}> gestionnaire@hotel.cm / gestionnaire1234</p>
          <p style={styles.compte}> client@hotel.cm / client1234</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0D2137 0%, #1565C0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logo: {
    fontSize: '3rem',
    textAlign: 'center',
    marginBottom: '0.5rem',
  },
  titre: {
    textAlign: 'center',
    color: '#0D2137',
    fontSize: '1.8rem',
    marginBottom: '0.25rem',
  },
  sous: {
    textAlign: 'center',
    color: '#90A4AE',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
  },
  erreur: {
    background: '#FFEBEE',
    color: '#C62828',
    padding: '0.75rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    borderLeft: '4px solid #E53935',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontWeight: '600',
    color: '#37474F',
    fontSize: '0.9rem',
  },
  input: {
    padding: '0.75rem 1rem',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  btn: {
    background: '#1565C0',
    color: '#fff',
    border: 'none',
    padding: '0.85rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  lien: {
    textAlign: 'center',
    marginTop: '1.25rem',
    color: '#90A4AE',
    fontSize: '0.9rem',
  },
  link: {
    color: '#1565C0',
    fontWeight: '600',
    textDecoration: 'none',
  },
  comptes: {
    marginTop: '1.5rem',
    background: '#F4F7FA',
    borderRadius: '8px',
    padding: '1rem',
  },
  comptesTitle: {
    fontWeight: '600',
    color: '#37474F',
    marginBottom: '0.5rem',
    fontSize: '0.85rem',
  },
  compte: {
    fontSize: '0.8rem',
    color: '#607D8B',
    marginBottom: '0.25rem',
  },
};