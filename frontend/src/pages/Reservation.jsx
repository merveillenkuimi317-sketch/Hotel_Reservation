import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { chambresAPI, reservationsAPI, clientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Reservation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isGestionnaire } = useAuth();

  const [form, setForm] = useState({
    chambre_id       : searchParams.get('chambre_id') || '',
    date_arrivee     : searchParams.get('arrivee') || '',
    date_depart      : searchParams.get('depart') || '',
    nombre_personnes : 1,
    remarques        : '',
    user_id          : '',
  });

  const [chambres, setChambres]               = useState([]);
  const [clients, setClients]                 = useState([]);
  const [chambreSelectionnee, setChambre]     = useState(null);
  const [prixTotal, setPrixTotal]             = useState(0);
  const [isLastMinute, setIsLastMinute]       = useState(false);
  const [erreur, setErreur]                   = useState('');
  const [succes, setSucces]                   = useState('');
  const [loading, setLoading]                 = useState(false);

  useEffect(() => {
    if (isGestionnaire()) clientsAPI.lister().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.date_arrivee && form.date_depart) {
      chargerChambres();
      detecterLastMinute();
    }
  }, [form.date_arrivee, form.date_depart, form.nombre_personnes]);

  useEffect(() => {
    calculerPrix();
  }, [form.chambre_id, form.date_arrivee, form.date_depart, chambres]);

  const chargerChambres = async () => {
    try {
      const data = await chambresAPI.lister({
        date_arrivee : form.date_arrivee,
        date_depart  : form.date_depart,
        capacite     : form.nombre_personnes,
      });
      setChambres(data);
    } catch (err) {
      console.error(err);
    }
  };

  const detecterLastMinute = () => {
    const arrivee    = new Date(form.date_arrivee);
    const maintenant = new Date();
    const diffHeures = (arrivee - maintenant) / (1000 * 3600);
    setIsLastMinute(diffHeures <= 48);
  };

  const calculerPrix = () => {
    if (!form.chambre_id || !form.date_arrivee || !form.date_depart) return;
    const ch = chambres.find(c => String(c.id) === String(form.chambre_id));
    if (!ch) return;
    setChambre(ch);
    const nuits = Math.max(1,
      (new Date(form.date_depart) - new Date(form.date_arrivee)) / (1000 * 3600 * 24)
    );
    setPrixTotal(ch.prix_nuit * nuits);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);

    try {
      const payload = { ...form };
      if (!isGestionnaire() || !payload.user_id) delete payload.user_id;
      const data = await reservationsAPI.creer(payload);
      setSucces(` Réservation ${data.reservation.reference} créée !`);
      setTimeout(() => navigate(isGestionnaire() ? '/gestion-reservations' : '/mes-reservations'), 2000);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dateMin = new Date().toISOString().split('T')[0];

  const couleurType = {
    simple: '#1565C0', double: '#0097A7',
    familiale: '#F9A825', suite: '#7B1FA2',
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.titre}> Nouvelle Réservation</h1>

        {isLastMinute && (
          <div style={styles.lastMinute}>
            ⚡ <strong>Réservation last-minute</strong> — Arrivée dans moins de 48h
          </div>
        )}

        {erreur  && <div style={styles.erreur}>{erreur}</div>}
        {succes  && <div style={styles.succes}>{succes}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Dates */}
          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Date d'arrivée *</label>
              <input
                type="date" name="date_arrivee"
                value={form.date_arrivee} min={dateMin}
                onChange={handleChange} style={styles.input} required
              />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Date de départ *</label>
              <input
                type="date" name="date_depart"
                value={form.date_depart}
                min={form.date_arrivee || dateMin}
                onChange={handleChange} style={styles.input} required
              />
            </div>
          </div>

          {/* Sélecteur client — gestionnaire uniquement */}
          {isGestionnaire() && (
            <div style={styles.group}>
              <label style={styles.label}>Client (optionnel)</label>
              <select
                name="user_id"
                value={form.user_id}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">— Sélectionner un client existant —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom_complet} — {c.email}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.78rem', color: '#90A4AE' }}>
                Laisser vide si le client n'est pas encore enregistré
              </span>
            </div>
          )}

          {/* Personnes */}
          <div style={styles.group}>
            <label style={styles.label}>Nombre de personnes *</label>
            <select
              name="nombre_personnes"
              value={form.nombre_personnes}
              onChange={handleChange}
              style={styles.input}
            >
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n} personne{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Chambres disponibles */}
          {form.date_arrivee && form.date_depart && (
            <div style={styles.group}>
              <label style={styles.label}>Choisir une chambre *</label>
              {chambres.length === 0 ? (
                <p style={styles.vide}> Aucune chambre disponible sur cette période.</p>
              ) : (
                <div style={styles.chambresGrid}>
                  {chambres.map(ch => (
                    <div
                      key={ch.id}
                      style={{
                        ...styles.chambreCard,
                        borderColor: String(form.chambre_id) === String(ch.id)
                          ? (couleurType[ch.type] || '#1565C0')
                          : '#E0E0E0',
                        background: String(form.chambre_id) === String(ch.id)
                          ? '#E3F2FD' : '#fff',
                      }}
                      onClick={() => setForm(prev => ({ ...prev, chambre_id: ch.id }))}
                    >
                      <div style={{
                        ...styles.chambreBadge,
                        background: couleurType[ch.type] || '#1565C0',
                      }}>
                        {ch.type.toUpperCase()}
                      </div>
                      <div style={styles.chambreNumero}>Chambre {ch.numero}</div>
                      <div style={styles.chambreInfo}>👤 Max {ch.capacite} pers.</div>
                      <div style={styles.chambrePrix}>
                        {Number(ch.prix_nuit).toLocaleString('fr-FR')} FCFA/nuit
                      </div>
                      {ch.equipements && (
                        <div style={styles.equip}>
                          {ch.equipements.slice(0, 3).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Remarques */}
          <div style={styles.group}>
            <label style={styles.label}>Remarques (optionnel)</label>
            <textarea
              name="remarques"
              value={form.remarques}
              onChange={handleChange}
              rows={3}
              placeholder="Arrivée tardive, besoins spéciaux..."
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </div>

          {/* Récapitulatif */}
          {prixTotal > 0 && chambreSelectionnee && (
            <div style={styles.recap}>
              <h3 style={styles.recapTitre}> Récapitulatif</h3>
              <div style={styles.recapRow}>
                <span>Chambre {chambreSelectionnee.numero} ({chambreSelectionnee.type})</span>
                <span>{Number(chambreSelectionnee.prix_nuit).toLocaleString('fr-FR')} FCFA/nuit</span>
              </div>
              <div style={styles.recapRow}>
                <span>Durée</span>
                <span>
                  {Math.round((new Date(form.date_depart) - new Date(form.date_arrivee)) / (1000*3600*24))} nuit(s)
                </span>
              </div>
              {isLastMinute && (
                <div style={styles.recapRow}>
                  <span>⚡ Last-minute</span>
                  <span style={{ color: '#F9A825' }}>Oui</span>
                </div>
              )}
              <div style={styles.recapTotal}>
                <span>Total</span>
                <span>{prixTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            style={loading || !form.chambre_id
              ? { ...styles.btn, opacity: 0.6 }
              : styles.btn
            }
            disabled={loading || !form.chambre_id}
          >
            {loading ? 'Confirmation...' : '✓ Confirmer la réservation'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page      : { padding: '2rem', background: '#F4F7FA', minHeight: '100vh' },
  container : { maxWidth: '800px', margin: '0 auto' },
  titre     : { fontSize: '1.8rem', color: '#0D2137', marginBottom: '1.5rem' },
  lastMinute: { background: '#FFF8E1', borderLeft: '4px solid #F9A825', padding: '0.85rem 1.2rem', borderRadius: '8px', marginBottom: '1rem', color: '#5D4037' },
  erreur    : { background: '#FFEBEE', borderLeft: '4px solid #E53935', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', color: '#B71C1C' },
  succes    : { background: '#E8F5E9', borderLeft: '4px solid #2E7D32', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', color: '#1B5E20' },
  form      : { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  row       : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  group     : { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label     : { fontWeight: '600', color: '#37474F', fontSize: '0.9rem' },
  input     : { padding: '0.75rem', border: '2px solid #E0E0E0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#fff' },
  vide      : { color: '#90A4AE', textAlign: 'center', padding: '1rem' },
  chambresGrid : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem' },
  chambreCard  : { border: '2px solid', borderRadius: '10px', padding: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' },
  chambreBadge : { color: '#fff', fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px', display: 'inline-block', marginBottom: '0.5rem' },
  chambreNumero: { fontWeight: '700', color: '#0D2137', fontSize: '1rem' },
  chambreInfo  : { fontSize: '0.82rem', color: '#90A4AE', margin: '0.25rem 0' },
  chambrePrix  : { fontWeight: '700', color: '#1565C0', fontSize: '0.95rem' },
  equip        : { fontSize: '0.75rem', color: '#90A4AE', marginTop: '0.4rem' },
  recap     : { background: '#F4F7FA', borderRadius: '10px', padding: '1.25rem', border: '1px solid #E0E0E0' },
  recapTitre: { color: '#0D2137', marginBottom: '0.75rem', fontSize: '1rem' },
  recapRow  : { display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.9rem', color: '#607D8B' },
  recapTotal: { display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0 0', marginTop: '0.5rem', borderTop: '2px solid #1565C0', fontWeight: '700', fontSize: '1.1rem', color: '#1565C0' },
  btn       : { background: '#1565C0', color: '#fff', border: 'none', padding: '1rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
};