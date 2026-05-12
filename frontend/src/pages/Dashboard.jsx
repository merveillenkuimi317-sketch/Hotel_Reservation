import React, { useState, useEffect } from 'react';
import { dashboardAPI, predictionsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const { user, isGestionnaire } = useAuth();
  const [data, setData]         = useState(null);
  const [alertes, setAlertes]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const dashData = await dashboardAPI.stats();
      setData(dashData);
    } catch (err) {
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
    try {
      const alertesData = await predictionsAPI.alertes();
      setAlertes(alertesData);
    } catch {
      // alertes non disponibles pour ce rôle
    }
  };

  const lancerPrediction = async () => {
    try {
      await predictionsAPI.lancer(7);
      chargerDonnees();
      alert(' Prédictions mises à jour !');
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const marquerLue = async (id) => {
    await predictionsAPI.marquerAlerteLue(id);
    setAlertes(prev => prev.filter(a => a.id !== id));
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  const kpi = data?.kpi || {};

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titre}> Tableau de bord</h1>
          <p style={styles.sous}>
            Bonjour {user?.nom_complet} —{' '}
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        {isGestionnaire() && (
          <button style={styles.btnIA} onClick={lancerPrediction}>
             Actualiser prédictions
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <KpiCard icone="" titre="Taux d'occupation"     valeur={`${kpi.taux_occupation ?? 0}%`}          couleur="#1565C0" />
        <KpiCard icone="" titre="Réservations ce mois"  valeur={kpi.total_reservations_mois ?? 0}         couleur="#0097A7" />
        <KpiCard icone="" titre="Last-minute ce mois"   valeur={kpi.last_minute_mois ?? 0}                couleur="#F9A825" />
        <KpiCard icone="" titre="Revenus ce mois"       valeur={`${(kpi.revenus_mois ?? 0).toLocaleString('fr-FR')} FCFA`} couleur="#2E7D32" />
        <KpiCard icone="" titre="Arrivées aujourd'hui"  valeur={kpi.arrivees_aujourdhui ?? 0}             couleur="#7B1FA2" />
        <KpiCard icone="" titre="Chambres disponibles"  valeur={`${kpi.chambres_disponibles ?? 0}/${kpi.total_chambres ?? 0}`} couleur="#E53935" />
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitre}> Alertes ({alertes.length})</h2>
          <div style={styles.alertesList}>
            {alertes.map(alerte => (
              <div
                key={alerte.id}
                style={{
                  ...styles.alerte,
                  borderLeftColor: alerte.type === 'forte_demande' ? '#E53935' : '#F9A825',
                }}
              >
                <span>{alerte.type === 'forte_demande' ? '' : ''}</span>
                <span style={styles.alerteMsg}>{alerte.message}</span>
                <button style={styles.alerteBtn} onClick={() => marquerLue(alerte.id)}>✓</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graphiques */}
      <div style={styles.chartsGrid}>

        {/* Évolution 6 mois */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitre}> Réservations — 6 derniers mois</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.evolution_6_mois ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#1565C0" radius={[4,4,0,0]} name="Réservations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Prédictions 7 jours */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitre}> Prédictions IA — 7 prochains jours</h3>
          {data?.predictions?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.predictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="date_prediction"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric' })}
                />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="taux_occupation_predit"
                  stroke="#1565C0"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Taux occupation %"
                />
                <Line
                  type="monotone"
                  dataKey="nb_last_minute_predit"
                  stroke="#F9A825"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  name="Last-minute"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.videChart}>
              Cliquez sur "Actualiser prédictions" pour générer les prédictions IA
            </div>
          )}
        </div>
      </div>

      {/* Tableau prédictions */}
      {data?.predictions?.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitre}> Détail des prédictions</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Date','Réservations','Last-minute','Taux occupation','Prix recommandé','Niveau demande'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.predictions.map(pred => (
                  <tr key={pred.id} style={styles.tr}>
                    <td style={styles.td}>{new Date(pred.date_prediction).toLocaleDateString('fr-FR')}</td>
                    <td style={styles.td}>{pred.nb_reservations_predit}</td>
                    <td style={styles.td}>{pred.nb_last_minute_predit}</td>
                    <td style={styles.td}>
                      <div style={styles.progress}>
                        <div style={{
                          ...styles.progressBar,
                          width: `${pred.taux_occupation_predit}%`,
                          background: pred.taux_occupation_predit >= 80 ? '#E53935'
                            : pred.taux_occupation_predit >= 50 ? '#F9A825' : '#2E7D32',
                        }} />
                        <span style={styles.progressTxt}>{pred.taux_occupation_predit}%</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {pred.prix_recommande
                        ? `${Number(pred.prix_recommande).toLocaleString('fr-FR')} FCFA`
                        : '—'}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.niveauBadge,
                        background: pred.niveau_demande === 'forte' ? '#FFEBEE'
                          : pred.niveau_demande === 'faible' ? '#FFF8E1' : '#E8F5E9',
                        color: pred.niveau_demande === 'forte' ? '#E53935'
                          : pred.niveau_demande === 'faible' ? '#E65100' : '#2E7D32',
                      }}>
                        {pred.niveau_demande}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icone, titre, valeur, couleur }) {
  return (
    <div style={{ ...styles.kpiCard, borderTopColor: couleur }}>
      <div style={{ ...styles.kpiIcone, background: couleur }}>{icone}</div>
      <div>
        <div style={{ ...styles.kpiValeur, color: couleur }}>{valeur}</div>
        <div style={styles.kpiTitre}>{titre}</div>
      </div>
    </div>
  );
}

const styles = {
  page       : { padding: '2rem', background: '#F4F7FA', minHeight: '100vh' },
  loading    : { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#90A4AE' },
  spinner    : { width: 40, height: 40, border: '4px solid #eee', borderTopColor: '#1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' },
  header     : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  titre      : { fontSize: '1.8rem', color: '#0D2137' },
  sous       : { color: '#90A4AE', fontSize: '0.9rem', marginTop: '0.25rem' },
  btnIA      : { background: '#1565C0', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  kpiGrid    : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' },
  kpiCard    : { background: '#fff', borderRadius: '10px', padding: '1.25rem', borderTop: '4px solid', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '1rem' },
  kpiIcone   : { fontSize: '1.5rem', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiValeur  : { fontSize: '1.6rem', fontWeight: '700' },
  kpiTitre   : { fontSize: '0.82rem', color: '#90A4AE', marginTop: '0.2rem' },
  section    : { marginBottom: '2rem' },
  sectionTitre: { fontSize: '1.2rem', color: '#0D2137', marginBottom: '1rem' },
  alertesList: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  alerte     : { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.2rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid' },
  alerteMsg  : { flex: 1, fontSize: '0.9rem', color: '#37474F' },
  alerteBtn  : { background: 'none', border: 'none', color: '#2E7D32', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer' },
  chartsGrid : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
  chartCard  : { background: '#fff', borderRadius: '10px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  chartTitre : { fontSize: '1rem', color: '#0D2137', marginBottom: '1rem' },
  videChart  : { height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#90A4AE', fontSize: '0.9rem', textAlign: 'center' },
  tableWrapper: { overflowX: 'auto' },
  table      : { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  th         : { background: '#0D2137', color: '#fff', padding: '0.75rem 1rem', fontSize: '0.85rem', textAlign: 'left' },
  tr         : { borderBottom: '1px solid #eee' },
  td         : { padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#37474F' },
  progress   : { position: 'relative', height: 20, background: '#eee', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 10 },
  progressTxt: { position: 'relative', zIndex: 1, fontSize: '0.75rem', fontWeight: '600', paddingLeft: 8 },
  niveauBadge: { padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: '600' },
};