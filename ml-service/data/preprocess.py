import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

def charger_donnees(chemin_csv=None, donnees_json=None):
    if donnees_json:
        df = pd.DataFrame(donnees_json)
    elif chemin_csv:
        df = pd.read_csv(chemin_csv)
    else:
        raise ValueError("Fournir chemin_csv ou donnees_json")
    return df

def nettoyer_donnees(df):
    df = df.drop_duplicates()
    for col in ['date_arrivee', 'date_depart', 'date_reservation']:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
    df = df.dropna(subset=['date_arrivee'])
    for col in df.select_dtypes(include=[np.number]).columns:
        df[col] = df[col].fillna(df[col].median())
    return df

def creer_features(df):
    df = df.copy()
    if 'date_arrivee' in df.columns:
        df['date_arrivee'] = pd.to_datetime(df['date_arrivee'])

    df['annee']         = df['date_arrivee'].dt.year
    df['mois']          = df['date_arrivee'].dt.month
    df['jour']          = df['date_arrivee'].dt.day
    df['jour_semaine']  = df['date_arrivee'].dt.dayofweek
    df['trimestre']     = df['date_arrivee'].dt.quarter
    df['mois_sin']      = np.sin(2 * np.pi * df['mois'] / 12)
    df['mois_cos']      = np.cos(2 * np.pi * df['mois'] / 12)
    df['jour_sem_sin']  = np.sin(2 * np.pi * df['jour_semaine'] / 7)
    df['jour_sem_cos']  = np.cos(2 * np.pi * df['jour_semaine'] / 7)
    df['est_weekend']   = (df['jour_semaine'] >= 5).astype(int)
    df['est_debut_mois']= (df['jour'] <= 7).astype(int)
    df['est_fin_mois']  = (df['jour'] >= 24).astype(int)

    df['saison'] = df['mois'].map({
        1:'seche', 2:'seche',
        3:'pluies_courte', 4:'pluies_courte', 5:'pluies_courte',
        6:'pluies_longue', 7:'pluies_longue', 8:'pluies_longue',
        9:'pluies_longue', 10:'pluies_longue',
        11:'seche_courte', 12:'seche_courte',
    })
    df = pd.get_dummies(df, columns=['saison'], drop_first=True)
    return df

def agreger_par_jour(df, total_chambres):
    agg = df.groupby('date_arrivee').agg(
        nb_reservations  =('is_last_minute', 'count'),
        nb_last_minute   =('is_last_minute', 'sum'),
        nb_personnes     =('nombre_personnes', 'sum'),
    ).reset_index()

    # Inclure tous les jours de la plage (y compris ceux sans réservation)
    date_min  = df['date_arrivee'].min()
    date_max  = df['date_arrivee'].max()
    all_dates = pd.date_range(date_min, date_max, freq='D').to_frame(index=False, name='date_arrivee')
    agg = all_dates.merge(agg, on='date_arrivee', how='left').fillna(0)

    agg['taux_occupation'] = (
        agg['nb_reservations'] / total_chambres * 100
    ).clip(0, 100).round(2)

    agg = agg.sort_values('date_arrivee').reset_index(drop=True)
    moyenne = agg['nb_reservations'].mean()

    agg['lag_7']   = agg['nb_reservations'].shift(7).fillna(moyenne)
    agg['lag_14']  = agg['nb_reservations'].shift(14).fillna(moyenne)
    agg['lag_28']  = agg['nb_reservations'].shift(28).fillna(moyenne)
    agg['roll_7']  = agg['nb_reservations'].rolling(7,  min_periods=1).mean().shift(1).fillna(moyenne)
    agg['roll_30'] = agg['nb_reservations'].rolling(30, min_periods=1).mean().shift(1).fillna(moyenne)

    agg = creer_features(agg)
    return agg

def preparer_dataset(df_brut, total_chambres):
    df     = nettoyer_donnees(df_brut)
    df_agg = agreger_par_jour(df, total_chambres)

    feature_cols = [
        'annee', 'mois', 'jour', 'jour_semaine', 'trimestre',
        'mois_sin', 'mois_cos', 'jour_sem_sin', 'jour_sem_cos',
        'est_weekend', 'est_debut_mois', 'est_fin_mois',
        'lag_7', 'lag_14', 'lag_28', 'roll_7', 'roll_30',
    ]
    saison_cols  = [c for c in df_agg.columns if c.startswith('saison_')]
    feature_cols += saison_cols
    feature_cols  = [c for c in feature_cols if c in df_agg.columns]

    X              = df_agg[feature_cols].values
    y_reservations = df_agg['nb_reservations'].values
    y_last_minute  = df_agg['nb_last_minute'].values
    y_taux         = df_agg['taux_occupation'].values

    return X, y_reservations, y_last_minute, y_taux, feature_cols