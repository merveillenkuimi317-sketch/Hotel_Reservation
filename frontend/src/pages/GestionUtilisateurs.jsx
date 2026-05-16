import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLES = ['client', 'gestionnaire', 'admin'];

const couleurRole = {
  admin:        { bg: '#EDE7F6', color: '#7B1FA2' },
  gestionnaire: { bg: '#E3F2FD', color: '#1565C0' },
  client:       { bg: '#E8F5E9', color: '#2E7D32' },
};

export default function GestionUtilisateurs() {
  const { user: moi } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [message, setMessage]   = useState(null);
  const [filtreRole, setFiltreRole] = useState('');
  const [search, setSearch]     = useState('');

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const data = await usersAPI.lister();
      setUsers(data);
    } catch (err) {
      afficherMessage('Erreur : ' + err.message, 'erreur');
    } finally {
      setLoading(false);
    }
  };

  const afficherMessage = (texte, type = 'succes') => {
    setMessage({ texte, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const changerRole = async (u, nouveauRole) => {
    if (u.id === moi.id) {
      afficherMessage('Vous ne pouvez pas modifier votre propre rôle.', 'erreur');
      return;
    }
    try {
      await usersAPI.changerRole(u.id, nouveauRole);
      afficherMessage(`Rôle de ${u.nom_complet} changé en « ${nouveauRole} ».`);
      charger();
    } catch (err) {
      afficherMessage(err.message, 'erreur');
    }
  };

  const supprimer = async (u) => {
    if (u.id === moi.id) {
      afficherMessage('Vous ne pouvez pas vous supprimer vous-même.', 'erreur');
      return;
    }
    if (!window.confirm(`Supprimer l'utilisateur ${u.nom_complet} ? Cette action est irréversible.`)) return;
    try {
      await usersAPI.supprimer(u.id);
      afficherMessage(`Utilisateur ${u.nom_complet} supprimé.`);
      charger();
    } catch (err) {
      afficherMessage(err.message, 'erreur');
    }
  };

  const comptes = { total: users.length, clients: 0, gestionnaires: 0, admins: 0 };
  users.forEach(u => {
    if (u.role === 'client')       comptes.clients++;
    if (u.role === 'gestionnaire') comptes.gestionnaires++;
    if (u.role === 'admin')        comptes.admins++;
  });

  const affichage = users.filter(u => {
    const roleOk  = !filtreRole || u.role === filtreRole;
    const searchOk = !search || u.nom_complet.toLowerCase().includes(search.toLowerCase())
                             || u.email.toLowerCase().includes(search.toLowerCase());
    return roleOk && searchOk;
  });

  return (
    <div style={styles.page}>

      {message && (
        <div style={{
          ...styles.flash,
          background: message.type === 'erreur' ? '#FFEBEE' : '#E8F5E9',
          color:      message.type === 'erreur' ? '#E53935' : '#2E7D32',
          borderLeft: `4px solid ${message.type === 'erreur' ? '#E53935' : '#2E7D32'}`,
        }}>
          {message.texte}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.titre}>Gestion des Utilisateurs</h1>
          <p style={styles.sous}>Consulter et modifier les rôles des utilisateurs</p>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <StatCard label="Total utilisateurs"  valeur={comptes.total}         couleur="#0D2137" />
        <StatCard label="Clients"             valeur={comptes.clients}        couleur="#2E7D32" />
        <StatCard label="Gestionnaires"       valeur={comptes.gestionnaires}  couleur="#1565C0" />
        <StatCard label="Administrateurs"     valeur={comptes.admins}         couleur="#7B1FA2" />
      </div>

      {/* Filtres */}
      <div style={styles.filtresBar}>
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filtreRole}
          onChange={e => setFiltreRole(e.target.value)}
          style={styles.selectFiltre}
        >
          <option value="">Tous les rôles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <span style={styles.compteur}>{affichage.length} utilisateur(s)</span>
      </div>

      {loading ? (
        <div style={styles.loading}>Chargement des utilisateurs...</div>
      ) : affichage.length === 0 ? (
        <div style={styles.vide}>Aucun utilisateur trouvé.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Nom complet', 'Email', 'Téléphone', 'Rôle actuel', 'Changer le rôle', 'Action'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affichage.map(u => (
                <tr key={u.id} style={{
                  ...styles.tr,
                  background: u.id === moi.id ? '#FFFDE7' : 'transparent',
                }}>
                  <td style={styles.td}>
                    <strong style={{ color: '#0D2137' }}>{u.nom_complet}</strong>
                    {u.id === moi.id && (
                      <span style={styles.moiBadge}>vous</span>
                    )}
                  </td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>{u.telephone || '—'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.roleBadge,
                      background: couleurRole[u.role]?.bg || '#eee',
                      color:      couleurRole[u.role]?.color || '#333',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {u.id !== moi.id ? (
                      <select
                        value={u.role}
                        onChange={e => changerRole(u, e.target.value)}
                        style={styles.roleSelect}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: '#90A4AE', fontSize: '0.82rem' }}>Non modifiable</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {u.id !== moi.id ? (
                      <button style={styles.btnSupprimer} onClick={() => supprimer(u)}>
                        Supprimer
                      </button>
                    ) : (
                      <span style={{ color: '#90A4AE', fontSize: '0.82rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, valeur, couleur }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${couleur}` }}>
      <div style={{ ...styles.statValeur, color: couleur }}>{valeur}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page        : { padding: '2rem', background: '#F4F7FA', minHeight: '100vh' },
  flash       : { padding: '0.9rem 1.2rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '600' },
  header      : { marginBottom: '1.5rem' },
  titre       : { fontSize: '1.8rem', color: '#0D2137' },
  sous        : { color: '#90A4AE', fontSize: '0.9rem', marginTop: '0.25rem' },
  statsGrid   : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard    : { background: '#fff', borderRadius: '10px', padding: '1.2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', textAlign: 'center' },
  statValeur  : { fontSize: '2rem', fontWeight: '700' },
  statLabel   : { fontSize: '0.82rem', color: '#90A4AE', marginTop: '0.25rem' },
  filtresBar  : { display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' },
  searchInput : { flex: 1, minWidth: '220px', padding: '0.65rem 1rem', border: '2px solid #E0E0E0', borderRadius: '8px', fontSize: '0.9rem' },
  selectFiltre: { padding: '0.65rem 1rem', border: '2px solid #E0E0E0', borderRadius: '8px', fontSize: '0.9rem' },
  compteur    : { color: '#90A4AE', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  loading     : { textAlign: 'center', padding: '3rem', color: '#90A4AE' },
  vide        : { textAlign: 'center', padding: '3rem', color: '#90A4AE', background: '#fff', borderRadius: '10px' },
  tableWrapper: { overflowX: 'auto', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  table       : { width: '100%', borderCollapse: 'collapse' },
  th          : { background: '#0D2137', color: '#fff', padding: '0.85rem 1rem', fontSize: '0.85rem', textAlign: 'left', whiteSpace: 'nowrap' },
  tr          : { borderBottom: '1px solid #F4F7FA' },
  td          : { padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#37474F', verticalAlign: 'middle' },
  roleBadge   : { padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600' },
  moiBadge    : { background: '#FFF9C4', color: '#F57F17', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '600', marginLeft: '0.5rem' },
  roleSelect  : { padding: '0.4rem 0.6rem', border: '2px solid #E0E0E0', borderRadius: '6px', fontSize: '0.88rem' },
  btnSupprimer: { background: '#FFEBEE', color: '#E53935', border: '1px solid #FFCDD2', padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' },
};
