import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationsAPI } from '../services/api';

export default function MesReservations() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('tous');

  useEffect(() => {
    chargerReservations();
  }, []);

  const chargerReservations = async () => {
    setLoading(true);
    try {
      const data = await reservationsAPI.lister({ mine: true });
      setReservations(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const annuler = async (id) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette réservation ?')) return;
    try {
      await reservationsAPI.annuler(id);
      chargerReservations();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const couleurStatut = {
    en_attente: { bg: '#FFF8E1', color: '#E65100' },
    confirmee: { bg: '#E8F5E9', color: '#2E7D32' },
    annulee: { bg: '#FFEBEE', color: '#E53935' },
    terminee: { bg: '#F4F7FA', color: '#607D8B' },
  };

  const reservationsFiltrees = filtre === 'tous'
    ? reservations
    : reservations.filter(r => r.statut === filtre);

  if (loading) {
    return (
      <div style={styles.loading}>
        <p> Chargement de vos réservations...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.titre}> Mes Réservations</h1>
        <button
          style={styles.btnNouvelle}
          onClick={() => navigate('/chambres')}
        >
          + Nouvelle réservation
        </button>
      </div>

      {/* Filtres statut */}
      <div style={styles.filtres}>
        {['tous', 'en_attente', 'confirmee', 'annulee', 'terminee'].map(f => (
          <button
            key={f}
            style={{
              ...styles.filtrBtn,
              background: filtre === f ? '#1565C0' : '#fff',
              color: filtre === f ? '#fff' : '#37474F',
            }}
            onClick={() => setFiltre(f)}
          >
            {f === 'tous' ? 'Toutes' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {reservationsFiltrees.length === 0 ? (
        <div style={styles.vide}>
          <p style={{ fontSize: '3rem' }}>📭</p>
          <p>Aucune réservation trouvée.</p>
          <button
            style={styles.btnNouvelle}
            onClick={() => navigate('/chambres')}
          >
            Réserver une chambre
          </button>
        </div>
      ) : (
        <div style={styles.liste}>
          {reservationsFiltrees.map(res => {
            const statut = couleurStatut[res.statut] || couleurStatut.en_attente;
            return (
              <div key={res.id} style={styles.card}>

                {/* Header carte */}
                <div style={styles.cardHeader}>
                  <div>
                    <span style={styles.reference}>{res.reference}</span>
                    {res.is_last_minute && (
                      <span style={styles.lastMinute}> Last-minute</span>
                    )}
                  </div>
                  <span style={{
                    ...styles.statutBadge,
                    background: statut.bg,
                    color: statut.color,
                  }}>
                    {res.statut.replace('_', ' ')}
                  </span>
                </div>

                {/* Corps carte */}
                <div style={styles.cardBody}>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}> Chambre</span>
                      <span style={styles.infoVal}>
                        {res.chambre?.numero} — {res.chambre?.type}
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}> Arrivée</span>
                      <span style={styles.infoVal}>
                        {new Date(res.date_arrivee).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}> Départ</span>
                      <span style={styles.infoVal}>
                        {new Date(res.date_depart).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}> Personnes</span>
                      <span style={styles.infoVal}>{res.nombre_personnes}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}> Total</span>
                      <span style={{ ...styles.infoVal, color: '#1565C0', fontWeight: '700' }}>
                        {Number(res.prix_total).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}> Réservé le</span>
                      <span style={styles.infoVal}>
                        {new Date(res.date_reservation).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {res.remarques && (
                    <p style={styles.remarques}> {res.remarques}</p>
                  )}
                </div>

                {/* Actions */}
                {(res.statut === 'en_attente' || res.statut === 'confirmee') && (
                  <div style={styles.actions}>
                    <button
                      style={styles.btnModifier}
                      onClick={() => {
                        if (res.statut === 'confirmee') {
                          if (!window.confirm('Modifier une réservation confirmée la remettra en attente de validation. Continuer ?')) return;
                        }
                        navigate(`/modifier-reservation/${res.id}`);
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      style={styles.btnAnnuler}
                      onClick={() => annuler(res.id)}
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '2rem', background: '#F4F7FA', minHeight: '100vh' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#90A4AE' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  titre: { fontSize: '1.8rem', color: '#0D2137' },
  btnNouvelle: { background: '#1565C0', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  filtres: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  filtrBtn: { padding: '0.5rem 1rem', border: '2px solid #E0E0E0', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
  vide: { textAlign: 'center', padding: '4rem', color: '#90A4AE' },
  liste: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  card: { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #eee' },
  reference: { fontWeight: '700', color: '#0D2137', fontSize: '1rem' },
  lastMinute: { background: '#FFF8E1', color: '#E65100', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', marginLeft: '0.75rem' },
  statutBadge: { padding: '0.3rem 0.9rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', textTransform: 'capitalize' },
  cardBody: { padding: '1.25rem' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  infoLabel: { fontSize: '0.78rem', color: '#90A4AE' },
  infoVal: { fontSize: '0.95rem', color: '#37474F', fontWeight: '500' },
  remarques: { marginTop: '0.75rem', color: '#607D8B', fontSize: '0.88rem', fontStyle: 'italic' },
  actions: { padding: '0.75rem 1.25rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' },
  btnModifier: { background: '#E3F2FD', color: '#1565C0', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginRight: '0.5rem',},
  btnAnnuler: { background: '#FFEBEE', color: '#E53935', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
};