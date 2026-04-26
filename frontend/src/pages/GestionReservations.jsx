import React, { useState, useEffect, useCallback } from 'react';
import { reservationsAPI } from '../services/api';

const STATUTS = [
  { key: '',           label: 'Toutes'      },
  { key: 'en_attente', label: 'En attente'  },
  { key: 'confirmee',  label: 'Confirmées'  },
  { key: 'terminee',   label: 'Terminées'   },
  { key: 'annulee',    label: 'Annulées'    },
];

const STATUT_STYLE = {
  en_attente: { background: '#FFF8E1', color: '#F9A825' },
  confirmee:  { background: '#E8F5E9', color: '#2E7D32' },
  terminee:   { background: '#F5F5F5', color: '#757575' },
  annulee:    { background: '#FFEBEE', color: '#E53935' },
};

export default function GestionReservations() {
  const [reservations, setReservations] = useState([]);
  const [meta, setMeta]                 = useState(null);
  const [filtreStatut, setFiltreStatut] = useState('en_attente');
  const [recherche, setRecherche]       = useState('');
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [actionId, setActionId]         = useState(null);
  const [msg, setMsg]                   = useState(null);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 12 };
      if (filtreStatut) params.statut = filtreStatut;
      const data = await reservationsAPI.lister(params);
      setReservations(data.data ?? []);
      setMeta(data.meta ?? null);
    } catch (e) {
      afficherMsg('Erreur lors du chargement', 'erreur');
    } finally {
      setLoading(false);
    }
  }, [filtreStatut, page]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { setPage(1); }, [filtreStatut]);

  const afficherMsg = (texte, type = 'succes') => {
    setMsg({ texte, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const confirmer = async (id) => {
    setActionId(id);
    try {
      await reservationsAPI.modifier(id, { statut: 'confirmee' });
      afficherMsg('Réservation confirmée');
      charger();
    } catch (e) {
      afficherMsg(e.message, 'erreur');
    } finally {
      setActionId(null);
    }
  };

  const annuler = async (id) => {
    if (!window.confirm('Annuler cette réservation ?')) return;
    setActionId(id);
    try {
      await reservationsAPI.annuler(id);
      afficherMsg('Réservation annulée');
      charger();
    } catch (e) {
      afficherMsg(e.message, 'erreur');
    } finally {
      setActionId(null);
    }
  };

  const reservationsFiltrees = reservations.filter(r => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      r.reference?.toLowerCase().includes(q) ||
      r.user?.nom?.toLowerCase().includes(q) ||
      r.user?.prenom?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titre}>Gestion des réservations</h1>
          <p style={styles.sous}>
            {meta?.total ?? '—'} réservation(s) au total
          </p>
        </div>
      </div>

      {/* Message flash */}
      {msg && (
        <div style={{
          ...styles.flash,
          background: msg.type === 'erreur' ? '#FFEBEE' : '#E8F5E9',
          color:      msg.type === 'erreur' ? '#E53935' : '#2E7D32',
          borderLeftColor: msg.type === 'erreur' ? '#E53935' : '#2E7D32',
        }}>
          {msg.texte}
        </div>
      )}

      {/* Filtres */}
      <div style={styles.filtres}>
        <div style={styles.tabs}>
          {STATUTS.map(s => (
            <button
              key={s.key}
              style={{
                ...styles.tab,
                ...(filtreStatut === s.key ? styles.tabActif : {}),
              }}
              onClick={() => setFiltreStatut(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          style={styles.recherche}
          placeholder="Rechercher par référence ou client..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
        />
      </div>

      {/* Tableau */}
      {loading ? (
        <div style={styles.centrer}>
          <div style={styles.spinner} />
          <p style={{ color: '#90A4AE' }}>Chargement...</p>
        </div>
      ) : reservationsFiltrees.length === 0 ? (
        <div style={styles.vide}>Aucune réservation trouvée.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Référence', 'Client', 'Chambre', 'Arrivée', 'Départ', 'Réservé le', 'Total', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservationsFiltrees.map(r => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.refWrap}>
                      <span style={styles.ref}>{r.reference}</span>
                      {r.is_last_minute && (
                        <span style={styles.lmBadge}>Last-minute</span>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.client}>
                      {r.user?.prenom} {r.user?.nom}
                    </div>
                    <div style={styles.clientEmail}>{r.user?.email}</div>
                  </td>
                  <td style={styles.td}>
                    <div>{r.chambre?.numero} — {r.chambre?.type}</div>
                    <div style={styles.clientEmail}>{r.nombre_personnes} pers.</div>
                  </td>
                  <td style={styles.td}>{fmt(r.date_arrivee)}</td>
                  <td style={styles.td}>{fmt(r.date_depart)}</td>
                  <td style={styles.td}>{fmt(r.date_reservation)}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#1565C0' }}>
                    {Number(r.prix_total).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statutBadge, ...STATUT_STYLE[r.statut] }}>
                      {r.statut.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {r.statut === 'en_attente' && (
                        <button
                          style={styles.btnConfirmer}
                          onClick={() => confirmer(r.id)}
                          disabled={actionId === r.id}
                        >
                          {actionId === r.id ? '...' : 'Confirmer'}
                        </button>
                      )}
                      {!['annulee', 'terminee'].includes(r.statut) && (
                        <button
                          style={styles.btnAnnuler}
                          onClick={() => annuler(r.id)}
                          disabled={actionId === r.id}
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={styles.pagination}>
          <button
            style={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Précédent
          </button>
          <span style={styles.pageInfo}>
            Page {meta.current_page} / {meta.last_page}
          </span>
          <button
            style={styles.pageBtn}
            disabled={page === meta.last_page}
            onClick={() => setPage(p => p + 1)}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const styles = {
  page        : { padding: '2rem', background: '#F4F7FA', minHeight: '100vh' },
  header      : { marginBottom: '1.5rem' },
  titre       : { fontSize: '1.8rem', color: '#0D2137', margin: 0 },
  sous        : { color: '#90A4AE', fontSize: '0.9rem', marginTop: '0.25rem' },
  flash       : { padding: '0.85rem 1.2rem', borderRadius: '8px', borderLeft: '4px solid', marginBottom: '1.25rem', fontWeight: 500 },
  filtres     : { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  tabs        : { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  tab         : { padding: '0.45rem 1rem', borderRadius: '20px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#546E7A', fontWeight: 500 },
  tabActif    : { background: '#0D2137', color: '#fff', borderColor: '#0D2137' },
  recherche   : { padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', minWidth: 280, outline: 'none' },
  tableWrapper: { overflowX: 'auto', borderRadius: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  table       : { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  th          : { background: '#0D2137', color: '#fff', padding: '0.85rem 1rem', fontSize: '0.82rem', textAlign: 'left', whiteSpace: 'nowrap' },
  tr          : { borderBottom: '1px solid #F0F4F8' },
  td          : { padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#37474F', verticalAlign: 'middle' },
  refWrap     : { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  ref         : { fontWeight: 600, color: '#0D2137', fontSize: '0.85rem' },
  lmBadge     : { background: '#FFF3E0', color: '#E65100', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '10px', width: 'fit-content' },
  client      : { fontWeight: 500 },
  clientEmail : { fontSize: '0.78rem', color: '#90A4AE', marginTop: '0.15rem' },
  statutBadge : { padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  actions     : { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  btnConfirmer: { background: '#2E7D32', color: '#fff', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
  btnAnnuler  : { background: 'transparent', color: '#E53935', border: '1px solid #E53935', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
  centrer     : { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' },
  spinner     : { width: 36, height: 36, border: '4px solid #eee', borderTopColor: '#1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  vide        : { textAlign: 'center', padding: '3rem', color: '#90A4AE', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  pagination  : { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' },
  pageBtn     : { padding: '0.5rem 1.2rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: '#0D2137', fontWeight: 500 },
  pageInfo    : { fontSize: '0.9rem', color: '#546E7A' },
};
