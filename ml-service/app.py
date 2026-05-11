import os
import json
import pickle
import numpy as np
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'model', 'saved')

modeles    = {}
metadata   = {}
modeles_ok = False

def charger_modeles():
    global modeles, metadata, modeles_ok
    try:
        for nom in ['nb_reservations', 'nb_last_minute', 'taux_occupation']:
            chemin = os.path.join(MODEL_DIR, f'{nom}.pkl')
            with open(chemin, 'rb') as f:
                modeles[nom] = pickle.load(f)
        with open(os.path.join(MODEL_DIR, 'metadata.json'), 'r') as f:
            metadata = json.load(f)
        modeles_ok = True
        print("Modèles chargés avec succès")
    except FileNotFoundError:
        modeles_ok = False
        print("Modèles non trouvés — entraîner via POST /train")

charger_modeles()

def features_vers_vecteur(feat):
    mois = feat.get('mois', 1)
    js   = feat.get('jour_semaine', 0)
    jour = feat.get('jour', 1)

    row = {
        'annee'          : feat.get('annee', datetime.now().year),
        'mois'           : mois,
        'jour'           : jour,
        'jour_semaine'   : js,
        'trimestre'      : (mois - 1) // 3 + 1,
        'mois_sin'       : np.sin(2 * np.pi * mois / 12),
        'mois_cos'       : np.cos(2 * np.pi * mois / 12),
        'jour_sem_sin'   : np.sin(2 * np.pi * js / 7),
        'jour_sem_cos'   : np.cos(2 * np.pi * js / 7),
        'est_weekend'    : int(js >= 5),
        'est_debut_mois' : int(jour <= 7),
        'est_fin_mois'   : int(jour >= 24),
        'saison_pluies_courte' : int(mois in [3, 4, 5]),
        'saison_pluies_longue' : int(mois in [6, 7, 8, 9, 10]),
        'saison_seche_courte'  : int(mois in [11, 12]),
        'lag_7'   : feat.get('lag_7',   metadata.get('moyenne_reservations', 2.0)),
        'lag_14'  : feat.get('lag_14',  metadata.get('moyenne_reservations', 2.0)),
        'lag_28'  : feat.get('lag_28',  metadata.get('moyenne_reservations', 2.0)),
        'roll_7'  : feat.get('roll_7',  metadata.get('moyenne_reservations', 2.0)),
        'roll_30' : feat.get('roll_30', metadata.get('moyenne_reservations', 2.0)),
    }

    feature_cols = metadata.get('feature_cols', list(row.keys()))
    return [row.get(c, 0) for c in feature_cols]

def calculer_prix(taux, prix_base=35000):
    if taux >= 80:
        return round(prix_base * 1.20)
    elif taux >= 60:
        return round(prix_base * 1.10)
    elif taux < 30:
        return round(prix_base * 0.85)
    return prix_base


@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        'status'    : 'ok',
        'modeles_ok': modeles_ok,
        'metriques' : metadata.get('metriques', {}),
        'timestamp' : datetime.now().isoformat(),
    })


@app.route('/predict', methods=['POST'])
def predict():
    if not modeles_ok:
        return jsonify({'error': 'Modèles non entraînés. POST /train d\'abord.'}), 503

    data           = request.get_json(force=True)
    features_list  = data.get('features', [])
    total_chambres = data.get('total_chambres', 10)

    if not features_list:
        return jsonify({'error': 'Champ features manquant'}), 400

    try:
        X = np.array([features_vers_vecteur(f) for f in features_list], dtype=float)

        pred_res  = np.maximum(modeles['nb_reservations'].predict(X), 0)
        pred_lm   = np.maximum(modeles['nb_last_minute'].predict(X), 0)
        pred_taux = np.clip(modeles['taux_occupation'].predict(X), 0, 100)

        r2        = metadata.get('metriques', {}).get('taux_occupation', {}).get('R2', 0.7)
        confiance = round(r2 * 100, 1)

        predictions = []
        today = datetime.now().date()

        for i, feat in enumerate(features_list):
            try:
                date = datetime(feat['annee'], feat['mois'], feat['jour']).date()
            except:
                date = today + timedelta(days=i)

            taux  = float(round(pred_taux[i], 1))
            nb_r  = min(int(round(pred_res[i])), total_chambres)
            nb_lm = min(int(round(pred_lm[i])), nb_r)

            predictions.append({
                'date'            : str(date),
                'nb_reservations' : nb_r,
                'nb_last_minute'  : nb_lm,
                'taux_occupation' : taux,
                'prix_recommande' : calculer_prix(taux),
                'confiance'       : confiance,
                'niveau_demande'  : 'forte' if taux >= 80 else ('faible' if taux < 30 else 'normale'),
            })

        return jsonify({'predictions': predictions, 'nb_jours': len(predictions)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/train', methods=['POST'])
def train():
    import sys
    sys.path.insert(0, BASE_DIR)
    from model.train import lancer_entrainement

    data           = request.get_json(force=True)
    reservations   = data.get('reservations', [])
    total_chambres = data.get('total_chambres', 10)

    if not reservations:
        return jsonify({'error': 'Champ reservations manquant'}), 400

    try:
        _, metriques = lancer_entrainement(
            donnees_json   = reservations,
            total_chambres = total_chambres,
        )
        charger_modeles()
        return jsonify({
            'message'  : 'Entraînement terminé',
            'metriques': metriques,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/feature-importance', methods=['GET'])
def feature_importance():
    if not modeles_ok:
        return jsonify({'error': 'Modèles non chargés'}), 503

    modele       = modeles['taux_occupation']
    feature_cols = metadata.get('feature_cols', [])
    importances  = modele.feature_importances_

    result = sorted(
        [{'feature': f, 'importance': round(float(v), 4)}
         for f, v in zip(feature_cols, importances)],
        key=lambda x: x['importance'], reverse=True
    )
    return jsonify(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)