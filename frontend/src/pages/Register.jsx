import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    password_confirmation: '',
  });
  const [erreur, setErreur]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    if (form.password !== form.password_confirmation) {
      setErreur('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate('/chambres');
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
        <h1 style={styles.titre}>Créer un compte</h1>
        <p style={styles.sous}>Rejoignez notre plateforme</p>

        {erreur && <div style={styles.erreur}>{erreur}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Nom</label>
              <input
                type="text"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                placeholder="Dupont"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Prénom</label>
              <input
                type="text"
                name="prenom"
                value={form.prenom}
                onChange={handleChange}
                placeholder="Jean"
                style={styles.input}
                required
              />
            </div>
          </div>

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
            <label style={styles.label}>Téléphone</label>
            <input
              type="text"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              placeholder="+237 6XX XXX XXX"
              style={styles.input}
            />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 caractères"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Confirmer le mot de passe</label>
            <input
              type="password"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={handleChange}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            style={loading ? { ...styles.btn, opacity: 0.7 } : styles.btn}
            disabled={loading}
          >
            {loading ? 'Inscription...' : "S'inscrire"}
          </button>
        </form>

        <p style={styles.lien}>
          Déjà un compte ?{' '}
          <Link to="/login" style={styles.link}>Se connecter</Link>
        </p>
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
    maxWidth: '480px',
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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
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
};