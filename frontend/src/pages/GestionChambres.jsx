import React, { useState, useEffect } from 'react';
import { chambresAPI } from '../services/api';

const FORM_VIDE = {
  numero: '', type: 'simple', prix_nuit: '', capacite: 2,
  description: '', equipements: '', etage: 0, statut: 'disponible',
};

const TYPES   = ['simple', 'double', 'familiale', 'suite'];
const STATUTS = ['disponible', 'occupee', 'maintenance'];

const couleurType = {
  simple: '#1565C0', double: '#0097A7', familiale: '#F9A825', suite: '#7B1FA2',
};
const couleurStatut = {
  disponible:  { bg: '#E8F5E9', color: '#2E7D32' },
  occupee:     { bg: '#FFEBEE', color: '#E53935' },
  maintenance: { bg: '#FFF8E1', color: '#F9A825' },
};

export default function GestionChambres() {
  const [chambres, setChambres]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | 'creer' | 'modifier'
  const [chambreEdit, setChambreEdit] = useState(null);
  const [form, setForm]             = useState(FORM_VIDE);
  const [erreurs, setErreurs]       = useState({});
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState(null);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const [liste, statistiques] = await Promise.all([
        chambresAPI.lister(),
        apiFetchStats(),
      ]);
      setChambres(liste);
      setStats(statistiques);
    } catch (err) {
      afficherMessage('Erreur de chargement : ' + err.message, 'erreur');
    } finally {
      setLoading(false);
    }
  };

  const apiFetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chambres-stats', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      return res.ok ? res.json() : null;
    } catch { return null; }
  };

  const afficherMessage = (texte, type = 'succes') => {
    setMessage({ texte, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const ouvrirCreer = () => {
    setForm(FORM_VIDE);
    setErreurs({});
    setChambreEdit(null);
    setModal('creer');
  };

  const ouvrirModifier = (c) => {
    setForm({
      numero:      c.numero,
      type:        c.type,
      prix_nuit:   c.prix_nuit,
      capacite:    c.capacite,
      description: c.description || '',
      equipements: Array.isArray(c.equipements) ? c.equipements.join(', ') : '',
      etage:       c.etage ?? 0,
      statut:      c.statut,
    });
    setErreurs({});
    setChambreEdit(c);
    setModal('modifier');
  };

  const fermer = () => { setModal(null); setChambreEdit(null); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (erreurs[name]) setErreurs(prev => ({ ...prev, [name]: '' }));
  };

  const valider = () => {
    const errs = {};
    if (!form.numero.trim())        errs.numero    = 'Numéro requis';
    if (!form.prix_nuit || form.prix_nuit <= 0) errs.prix_nuit = 'Prix invalide';
    if (!form.capacite || form.capacite < 1)    errs.capacite  = 'Capacité invalide';
    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  const preparerPayload = () => ({
    ...form,
    prix_nuit:   Number(form.prix_nuit),
    capacite:    Number(form.capacite),
    etage:       Number(form.etage) || 0,
    equipements: form.equipements
      ? form.equipements.split(',').map(e => e.trim()).filter(Boolean)
      : [],
  });

  const soumettre = async (e) => {
    e.preventDefault();
    if (!valider()) return;
    setSaving(true);
    try {
      if (modal === 'creer') {
        await chambresAPI.creer(preparerPayload());
        afficherMessage('Chambre créée avec succès.');
      } else {
        const payload = preparerPayload();
        await chambresAPI.modifier(chambreEdit.id, payload);
        afficherMessage('Chambre mise à jour.');
      }
      fermer();
      charger();
    } catch (err) {
      afficherMessage(err.message, 'erreur');
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async (c) => {
    if (!window.confirm(`Supprimer la chambre ${c.numero} ? Cette action est irréversible.`)) return;
    try {
      await chambresAPI.supprimer(c.id);
      afficherMessage('Chambre supprimée.');
      charger();
    } catch (err) {
      afficherMessage(err.message, 'erreur');
    }
  };

  return (
    <div style={styles.page}>

      {/* Message flash */}
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

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titre}>Gestion des Chambres</h1>
          <p style={styles.sous}>Créer, modifier et supprimer les chambres de l'hôtel</p>
        </div>
        <button style={styles.btnCreer} onClick={ouvrirCreer}>
          + Nouvelle chambre
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={styles.statsGrid}>
          <StatCard label="Total chambres"   valeur={stats.total}        couleur="#1565C0" />
          <StatCard label="Disponibles"      valeur={stats.disponibles}  couleur="#2E7D32" />
          <StatCard label="Occupées"         valeur={stats.occupees}     couleur="#E53935" />
          <StatCard label="Maintenance"      valeur={stats.maintenance}  couleur="#F9A825" />
        </div>
      )}

      {/* Tableau */}
      {loading ? (
        <div style={styles.loading}>Chargement des chambres...</div>
      ) : chambres.length === 0 ? (
        <div style={styles.vide}>Aucune chambre enregistrée. Cliquez sur "+ Nouvelle chambre".</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['N°', 'Type', 'Étage', 'Capacité', 'Prix/nuit', 'Statut', 'Équipements', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chambres.map(c => (
                <tr key={c.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: '700', color: '#0D2137' }}>{c.numero}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.typeBadge,
                      background: couleurType[c.type] || '#1565C0',
                    }}>
                      {c.type}
                    </span>
                  </td>
                  <td style={styles.td}>{c.etage ?? '—'}</td>
                  <td style={styles.td}>{c.capacite} pers.</td>
                  <td style={{ ...styles.td, fontWeight: '600', color: '#1565C0' }}>
                    {Number(c.prix_nuit).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statutBadge,
                      background: couleurStatut[c.statut]?.bg || '#eee',
                      color:      couleurStatut[c.statut]?.color || '#333',
                    }}>
                      {c.statut}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.equipList}>
                      {Array.isArray(c.equipements) && c.equipements.length > 0
                        ? c.equipements.map((eq, i) => (
                            <span key={i} style={styles.equipTag}>{eq}</span>
                          ))
                        : <span style={{ color: '#90A4AE', fontSize: '0.8rem' }}>—</span>
                      }
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button style={styles.btnModifier} onClick={() => ouvrirModifier(c)}>
                        Modifier
                      </button>
                      <button style={styles.btnSupprimer} onClick={() => supprimer(c)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Formulaire */}
      {modal && (
        <div style={styles.overlay} onClick={fermer}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitre}>
                {modal === 'creer' ? '+ Nouvelle chambre' : `Modifier — Chambre ${chambreEdit?.numero}`}
              </h2>
              <button style={styles.btnFermer} onClick={fermer}>✕</button>
            </div>

            <form onSubmit={soumettre} style={styles.form}>
              <div style={styles.formRow}>
                <Field label="Numéro de chambre *" error={erreurs.numero}>
                  <input
                    name="numero" value={form.numero} onChange={handleChange}
                    placeholder="ex : 101" style={inputStyle(erreurs.numero)}
                  />
                </Field>
                <Field label="Étage">
                  <input
                    name="etage" type="number" min="0" value={form.etage}
                    onChange={handleChange} style={inputStyle()}
                  />
                </Field>
              </div>

              <div style={styles.formRow}>
                <Field label="Type *">
                  <select name="type" value={form.type} onChange={handleChange} style={inputStyle()}>
                    {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </Field>
                <Field label="Capacité (personnes) *" error={erreurs.capacite}>
                  <input
                    name="capacite" type="number" min="1" max="10"
                    value={form.capacite} onChange={handleChange}
                    style={inputStyle(erreurs.capacite)}
                  />
                </Field>
              </div>

              <div style={styles.formRow}>
                <Field label="Prix par nuit (FCFA) *" error={erreurs.prix_nuit}>
                  <input
                    name="prix_nuit" type="number" min="0"
                    value={form.prix_nuit} onChange={handleChange}
                    placeholder="ex : 25000" style={inputStyle(erreurs.prix_nuit)}
                  />
                </Field>
                {modal === 'modifier' && (
                  <Field label="Statut">
                    <select name="statut" value={form.statut} onChange={handleChange} style={inputStyle()}>
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                )}
              </div>

              <Field label="Équipements (séparés par des virgules)">
                <input
                  name="equipements" value={form.equipements} onChange={handleChange}
                  placeholder="ex : WiFi, Climatisation, TV, Balcon"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Description">
                <textarea
                  name="description" value={form.description} onChange={handleChange}
                  rows={3} placeholder="Description de la chambre..."
                  style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'inherit' }}
                />
              </Field>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnAnnuler} onClick={fermer}>
                  Annuler
                </button>
                <button type="submit" style={styles.btnSauver} disabled={saving}>
                  {saving ? 'Enregistrement...' : modal === 'creer' ? 'Créer la chambre' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
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

function Field({ label, children, error }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
      {error && <span style={styles.erreur}>{error}</span>}
    </div>
  );
}

const inputStyle = (error) => ({
  width: '100%', padding: '0.65rem 0.75rem',
  border: `2px solid ${error ? '#E53935' : '#E0E0E0'}`,
  borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box',
  outline: 'none',
});

const styles = {
  page        : { padding: '2rem', background: '#F4F7FA', minHeight: '100vh' },
  flash       : { padding: '0.9rem 1.2rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '600' },
  header      : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  titre       : { fontSize: '1.8rem', color: '#0D2137' },
  sous        : { color: '#90A4AE', fontSize: '0.9rem', marginTop: '0.25rem' },
  btnCreer    : { background: '#1565C0', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' },
  statsGrid   : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard    : { background: '#fff', borderRadius: '10px', padding: '1.2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', textAlign: 'center' },
  statValeur  : { fontSize: '2rem', fontWeight: '700' },
  statLabel   : { fontSize: '0.82rem', color: '#90A4AE', marginTop: '0.25rem' },
  loading     : { textAlign: 'center', padding: '3rem', color: '#90A4AE' },
  vide        : { textAlign: 'center', padding: '3rem', color: '#90A4AE', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
  tableWrapper: { overflowX: 'auto', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  table       : { width: '100%', borderCollapse: 'collapse' },
  th          : { background: '#0D2137', color: '#fff', padding: '0.85rem 1rem', fontSize: '0.85rem', textAlign: 'left', whiteSpace: 'nowrap' },
  tr          : { borderBottom: '1px solid #F4F7FA' },
  td          : { padding: '0.85rem 1rem', fontSize: '0.9rem', color: '#37474F', verticalAlign: 'middle' },
  typeBadge   : { color: '#fff', padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'capitalize' },
  statutBadge : { padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600' },
  equipList   : { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' },
  equipTag    : { background: '#F4F7FA', color: '#37474F', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.72rem' },
  actions     : { display: 'flex', gap: '0.5rem' },
  btnModifier : { background: '#1565C0', color: '#fff', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' },
  btnSupprimer: { background: '#FFEBEE', color: '#E53935', border: '1px solid #FFCDD2', padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' },
  overlay     : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modalBox    : { background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' },
  modalHeader : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #eee' },
  modalTitre  : { fontSize: '1.2rem', color: '#0D2137' },
  btnFermer   : { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#90A4AE' },
  form        : { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  formRow     : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  field       : { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label       : { fontSize: '0.85rem', fontWeight: '600', color: '#37474F' },
  erreur      : { fontSize: '0.78rem', color: '#E53935' },
  modalFooter : { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' },
  btnAnnuler  : { background: 'none', border: '1px solid #E0E0E0', color: '#607D8B', padding: '0.65rem 1.4rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  btnSauver   : { background: '#1565C0', color: '#fff', border: 'none', padding: '0.65rem 1.6rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
};
