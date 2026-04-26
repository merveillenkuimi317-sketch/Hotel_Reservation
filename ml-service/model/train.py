import os
import json
import pickle
import numpy as np
import sys

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from xgboost import XGBRegressor

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, 'model', 'saved')
os.makedirs(MODEL_DIR, exist_ok=True)

sys.path.insert(0, BASE_DIR)
from data.preprocess import preparer_dataset, charger_donnees


def entrainer_modeles(X_train, y_res, y_lm, y_taux):
    params = {
        'n_estimators'    : 300,
        'max_depth'       : 4,
        'learning_rate'   : 0.05,
        'subsample'       : 0.8,
        'colsample_bytree': 0.8,
        'min_child_weight': 3,
        'reg_alpha'       : 0.1,
        'reg_lambda'      : 1.0,
        'random_state'    : 42,
        'n_jobs'          : -1,
    }

    modeles = {
        'nb_reservations': XGBRegressor(**params),
        'nb_last_minute' : XGBRegressor(**params),
        'taux_occupation': XGBRegressor(**params),
    }

    modeles['nb_reservations'].fit(X_train, y_res)
    modeles['nb_last_minute'].fit(X_train, y_lm)
    modeles['taux_occupation'].fit(X_train, y_taux)

    return modeles


def evaluer_modeles(modeles, X_test, y_res, y_lm, y_taux):
    cibles = {
        'nb_reservations': y_res,
        'nb_last_minute' : y_lm,
        'taux_occupation': y_taux,
    }
    metriques = {}
    for nom, modele in modeles.items():
        y_pred = np.maximum(modele.predict(X_test), 0)
        mae    = mean_absolute_error(cibles[nom], y_pred)
        r2     = r2_score(cibles[nom], y_pred)
        metriques[nom] = {'MAE': round(mae, 3), 'R2': round(r2, 3)}
        print(f"  {nom:20s} MAE={mae:.3f}  R2={r2:.3f}")
    return metriques


def sauvegarder(modeles, feature_cols, metriques):
    for nom, modele in modeles.items():
        chemin = os.path.join(MODEL_DIR, f'{nom}.pkl')
        with open(chemin, 'wb') as f:
            pickle.dump(modele, f)
        print(f"  Modèle sauvegardé : {chemin}")

    meta = {'feature_cols': feature_cols, 'metriques': metriques}
    with open(os.path.join(MODEL_DIR, 'metadata.json'), 'w') as f:
        json.dump(meta, f, indent=2)
    print("  Métadonnées sauvegardées.")


def lancer_entrainement(chemin_csv=None, donnees_json=None, total_chambres=10):
    print("=" * 50)
    print("Démarrage de l'entraînement XGBoost")
    print("=" * 50)

    print("1. Chargement des données...")
    df = charger_donnees(chemin_csv=chemin_csv, donnees_json=donnees_json)
    print(f"   {len(df)} réservations chargées.")

    print("2. Prétraitement...")
    X, y_res, y_lm, y_taux, feature_cols = preparer_dataset(df, total_chambres)
    print(f"   {X.shape[0]} jours, {X.shape[1]} features.")

    if X.shape[0] < 5:
        print("   Pas assez de données. Minimum 5 jours requis.")
        return None, {}

    X_train, X_test, yr_tr, yr_te, ylm_tr, ylm_te, yt_tr, yt_te = \
        train_test_split(X, y_res, y_lm, y_taux, test_size=0.2, random_state=42)

    print("3. Entraînement...")
    modeles = entrainer_modeles(X_train, yr_tr, ylm_tr, yt_tr)

    print("4. Évaluation...")
    metriques = evaluer_modeles(modeles, X_test, yr_te, ylm_te, yt_te)

    print("5. Sauvegarde...")
    sauvegarder(modeles, feature_cols, metriques)

    print("=" * 50)
    print("Entraînement terminé !")
    return modeles, metriques


if __name__ == '__main__':
    print("Lancer via app.py")