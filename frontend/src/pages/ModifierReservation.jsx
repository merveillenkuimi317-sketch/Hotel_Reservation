import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reservationsAPI } from '../services/api';

export default function ModifierReservation() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [reservation, setReservation] = useState(null);
  const [form, setForm]               = useState({
    date_arrivee     : '',
    date_depart      : '',
    nombre_personnes : 1,
    remarques        : '',
  });
  const [erreur, setErreur]   = useState('');
  const [succes, setSucces]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    chargerReservation();
  }, [id]);

  const chargerReservation = async () => {
    try {
      const data = await reservationsAPI.detail(id);
      setReservation(data);
      setForm({
        date_arrivee     : data.date_arrivee,
        date_depart      : data.date_depart,
        nombre_personnes : data.nombre_personnes,
        remarques        : data.remarques || '',
      });
    } catch (err) {
      setErreur('Réservation introuvable.');
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);

    try {
      await reservationsAPI.modifier(id, form);
      setSucces('✅ Réservation modifiée avec succès !');
      setTimeout(() => navigate('/mes-reservations'), 2000);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!reservation) {
    return (
      <div style={styles.loading}>
        <p>⏳ Chargement...</p>
      </div>
    );
  }

  const dateMin = new Date().toISOString().split('T')[0];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <button
            style={styles.btnRetour}
            onClick={() => navigate('/mes-reservations')}
          >
            ← Retour
          </button>
          <h1 style={styles.titre}>✏️ Modifier la réservation</h1>
        </div>

        {/* Infos actuelles */}
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitre}>Réservation actuelle</h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Référence</span>
              <span style={styles.infoVal}>{reservation.reference}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Chambre</span>
              <span style={styles.infoVal}>
                {reservation.chambre?.numero} — {reservation.chambre?.type}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Prix/nuit</span>
              <span style={styles.infoVal}>
                {Number(reservation.chambre?.prix_nuit).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Statut</span>
              <span style={{
                ...styles.infoVal,
                color: reservation.statut === 'confirmee' ? '#2E7D32' : '#E65100',
                fontWeight: '700',
              }}>
                {reservation.statut}
              </span>
            </div>
          </div>
        </div>

        {erreur && <div style={styles.erreur}>{erreur}</div>}
        {succes && <div style={styles.succes}>{succes}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>

          <div style={styles.row}>
            <div style={styles.group}>
              <label style={styles.label}>Nouvelle date d'arrivée *</label>
              <input
                type="date"
                name="date_arrivee"
                value={form.date_arrivee}
                min={dateMin}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.group}>
              <label style={styles.label}>Nouvelle date de départ *</label>
              <input
                type="date"
                name="date_depart"
                value={form.date_depart}
                min={form.date_arrivee || dateMin}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Nombre de personnes *</label>
            <select
              name="nombre_personnes"
              value={form.nombre_personnes}
              onChange={handleChange}
              style={styles.input}
            >
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>
                  {n} personne{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Remarques</label>
            <textarea
              name="remarques"
              value={form.remarques}
              onChange={handleChange}
              rows={3}
              placeholder="Arrivée tardive, besoins spéciaux..."
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </div>

          {/* Nouveau prix estimé */}
          {form.date_arrivee && form.date_depart && (
            <div style={styles.recap}>
              <div style={styles.recapRow}>
                <span>Nouveau prix estimé</span>
                <span style={{ color: '#1565C0', fontWeight: '700' }}>
                  {(
                    Number(reservation.chambre?.prix_nuit) *
                    Math.max(1, Math.round(
                      (new Date(form.date_depart) - new Date(form.date_arrivee))
                      / (1000 * 3600 * 24)
                    ))
                  ).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          )}

          <div style={styles.btnRow}>
            <button
              type="button"
              style={styles.btnAnnuler}
              onClick={() => navigate('/mes-reservations')}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={loading ? { ...styles.btnSauvegarder, opacity: 0.7 } : styles.btnSauvegarder}
              disabled={loading}
            >
              {loading ? 'Sauvegarde...' : '💾 Sauvegarder les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page      : { padding: '2rem', background: '#F4F7FA', minHeight: '100vh' },
  loading   : { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' },
  container : { maxWidth: '700px', margin: '0 auto' },
  headerRow : { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  btnRetour : { background: 'none', border: 'none', color: '#1565C0', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' },
  titre     : { fontSize: '1.6rem', color: '#0D2137' },
  infoCard  : { background: '#fff', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  infoTitre : { color: '#0D2137', marginBottom: '1rem', fontSize: '1rem' },
  infoGrid  : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' },
  infoItem  : { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  infoLabel : { fontSize: '0.78rem', color: '#90A4AE' },
  infoVal   : { fontSize: '0.95rem', color: '#37474F', fontWeight: '500' },
  erreur    : { background: '#FFEBEE', borderLeft: '4px solid #E53935', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', color: '#B71C1C' },
  succes    : { background: '#E8F5E9', borderLeft: '4px solid #2E7D32', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', color: '#1B5E20' },
  form      : { background: '#fff', borderRadius: '10px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  row       : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  group     : { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label     : { fontWeight: '600', color: '#37474F', fontSize: '0.9rem' },
  input     : { padding: '0.75rem', border: '2px solid #E0E0E0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#fff' },
  recap     : { background: '#F4F7FA', borderRadius: '8px', padding: '1rem' },
  recapRow  : { display: 'flex', justifyContent: 'space-between', fontSize: '1rem' },
  btnRow    : { display: 'flex', gap: '1rem', justifyContent: 'flex-end' },
  btnAnnuler    : { background: '#F4F7FA', color: '#37474F', border: '2px solid #E0E0E0', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  btnSauvegarder: { background: '#1565C0', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
};