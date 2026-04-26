import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chambresAPI } from '../services/api';

export default function Chambres() {
  const navigate = useNavigate();

  const [chambres, setChambres]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtres, setFiltres]     = useState({
    date_arrivee : '',
    date_depart  : '',
    type         : '',
    capacite     : '',
  });

  useEffect(() => {
  // Charger toutes les chambres au démarrage sans filtre
  chargerChambres();
}, []);

  const chargerChambres = async (params = {}) => {
    setLoading(true);
    try {
      const data = await chambresAPI.lister(params);
      setChambres(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltres = (e) => {
    setFiltres(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const appliquerFiltres = (e) => {
    e.preventDefault();
    const params = {};
    if (filtres.date_arrivee) params.date_arrivee = filtres.date_arrivee;
    if (filtres.date_depart)  params.date_depart  = filtres.date_depart;
    if (filtres.type)         params.type         = filtres.type;
    if (filtres.capacite)     params.capacite     = filtres.capacite;
    chargerChambres(params);
  };

  const reserver = (chambre) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    navigate(`/reserver?chambre_id=${chambre.id}&arrivee=${filtres.date_arrivee}&depart=${filtres.date_depart}`);
  };

  const dateMin = new Date().toISOString().split('T')[0];

  const couleurType = {
    simple   : '#1565C0',
    double   : '#0097A7',
    familiale: '#F9A825',
    suite    : '#7B1FA2',
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.titre}> Nos Chambres</h1>
        <p style={styles.sous}>Trouvez la chambre idéale pour votre séjour</p>
      </div>

      {/* Filtres */}
      <div style={styles.filtresCard}>
        <form onSubmit={appliquerFiltres} style={styles.filtresForm}>
          <div style={styles.filtreGroup}>
            <label style={styles.filtreLabel}>Arrivée</label>
            <input
              type="date"
              name="date_arrivee"
              value={filtres.date_arrivee}
              min={dateMin}
              onChange={handleFiltres}
              style={styles.filtreInput}
            />
          </div>
          <div style={styles.filtreGroup}>
            <label style={styles.filtreLabel}>Départ</label>
            <input
              type="date"
              name="date_depart"
              value={filtres.date_depart}
              min={filtres.date_arrivee || dateMin}
              onChange={handleFiltres}
              style={styles.filtreInput}
            />
          </div>
          <div style={styles.filtreGroup}>
            <label style={styles.filtreLabel}>Type</label>
            <select
              name="type"
              value={filtres.type}
              onChange={handleFiltres}
              style={styles.filtreInput}
            >
              <option value="">Tous les</option>
              <option value="simple">Simple</option>
              <option value="double">Double</option>
              <option value="familiale">Familiale</option>
              <option value="suite">Suite</option>
            </select>
          </div>
          <div style={styles.filtreGroup}>
            <label style={styles.filtreLabel}>Personnes</label>
            <select
              name="capacite"
              value={filtres.capacite}
              onChange={handleFiltres}
              style={styles.filtreInput}
            >
              <option value="">Tous</option>
              {[1,2,3,4,5].map(n => (
                <option key={n} value={n}>{n}+</option>
              ))}
            </select>
          </div>
          <button type="submit" style={styles.btnRecherche}>
             Rechercher
          </button>
        </form>
      </div>

      {/* Résultats */}
      {loading ? (
        <div style={styles.loading}> Chargement des chambres...</div>
      ) : chambres.length === 0 ? (
        <div style={styles.vide}>
             Aucune chambre disponible pour ces critères.
        </div>
      ) : (
        <>
          <p style={styles.resultat}>{chambres.length} chambre(s) trouvée(s)</p>
          <div style={styles.grid}>
            {chambres.map(chambre => (
              <div key={chambre.id} style={styles.card}>
                {/* Badge type */}
                <div style={{
                  ...styles.badge,
                  background: couleurType[chambre.type] || '#1565C0',
                }}>
                  {chambre.type.toUpperCase()} — Étage {chambre.etage}
                </div>

                {/* Infos */}
                <div style={styles.cardBody}>
                  <h2 style={styles.numero}>Chambre {chambre.numero}</h2>

                  <div style={styles.infoRow}>
                    <span>👤 Capacité</span>
                    <strong>{chambre.capacite} personne(s)</strong>
                  </div>

                  <div style={styles.infoRow}>
                    <span> Statut</span>
                    <span style={{
                      color: chambre.statut === 'disponible' ? '#2E7D32' : '#E53935',
                      fontWeight: '600',
                    }}>
                      {chambre.statut}
                    </span>
                  </div>

                  {/* Équipements */}
                  {chambre.equipements && (
                    <div style={styles.equip}>
                      {chambre.equipements.map((eq, i) => (
                        <span key={i} style={styles.equipBadge}>{eq}</span>
                      ))}
                    </div>
                  )}

                  {/* Prix + bouton */}
                  <div style={styles.cardFooter}>
                    <div>
                      <span style={styles.prix}>
                        {Number(chambre.prix_nuit).toLocaleString('fr-FR')} FCFA
                      </span>
                      <span style={styles.prixSous}>/nuit</span>
                    </div>
                    <button
                      style={chambre.statut === 'disponible' ? styles.btnReserver : styles.btnIndispo}
                      onClick={() => chambre.statut === 'disponible' && reserver(chambre)}
                      disabled={chambre.statut !== 'disponible'}
                    >
                      {chambre.statut === 'disponible' ? 'Réserver' : 'Indisponible'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page    : { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  header  : { textAlign: 'center', marginBottom: '2rem' },
  titre   : { fontSize: '2rem', color: '#0D2137', marginBottom: '0.5rem' },
  sous    : { color: '#90A4AE' },
  filtresCard: {
    background: '#fff', borderRadius: '12px', padding: '1.5rem',
    marginBottom: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  filtresForm: {
    display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end',
  },
  filtreGroup : { display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '150px' },
  filtreLabel : { fontSize: '0.85rem', fontWeight: '600', color: '#37474F' },
  filtreInput : { padding: '0.65rem', border: '2px solid #E0E0E0', borderRadius: '8px', fontSize: '0.9rem' },
  btnRecherche: {
    background: '#1565C0', color: '#fff', border: 'none',
    padding: '0.65rem 1.5rem', borderRadius: '8px',
    fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  loading : { textAlign: 'center', padding: '3rem', color: '#90A4AE', fontSize: '1.1rem' },
  vide    : { textAlign: 'center', padding: '3rem', color: '#90A4AE', fontSize: '1.1rem' },
  resultat: { color: '#90A4AE', marginBottom: '1rem', fontSize: '0.9rem' },
  grid    : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
  card    : { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  badge   : { padding: '0.5rem 1rem', color: '#fff', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px' },
  cardBody: { padding: '1.25rem' },
  numero  : { fontSize: '1.3rem', color: '#0D2137', marginBottom: '0.75rem' },
  infoRow : { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#607D8B' },
  equip   : { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.75rem 0' },
  equipBadge: { background: '#F4F7FA', color: '#37474F', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' },
  prix    : { fontSize: '1.3rem', fontWeight: '700', color: '#1565C0' },
  prixSous: { fontSize: '0.8rem', color: '#90A4AE', marginLeft: '4px' },
  btnReserver: { background: '#1565C0', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  btnIndispo : { background: '#E0E0E0', color: '#90A4AE', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600', cursor: 'not-allowed' },
};