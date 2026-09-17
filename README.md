# HôtelPro — Plateforme de Gestion Hôtelière avec IA Prédictive

Projet de fin d'études — Plateforme web complète de gestion hôtelière intégrant un module d'intelligence artificielle pour la prédiction des réservations et l'optimisation tarifaire.

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture technique](#2-architecture-technique)
3. [Fonctionnalités](#3-fonctionnalités)
4. [Rôles utilisateurs](#4-rôles-utilisateurs)
5. [Module de prédiction IA](#5-module-de-prédiction-ia)
6. [Installation et lancement](#6-installation-et-lancement)
7. [Comptes de test](#7-comptes-de-test)
8. [Structure des dossiers](#8-structure-des-dossiers)
9. [Dépannage](#9-dépannage)

---

## 1. Présentation du projet

HôtelPro est une application web de gestion hôtelière qui permet :

- Aux **clients** de consulter les chambres disponibles et faire des réservations en ligne
- Aux **gestionnaires** de gérer les réservations (confirmer, annuler, suivre)
- Aux **administrateurs** d'avoir une vue complète avec tableau de bord, statistiques et prédictions IA

Le point central du projet est le **module de prédiction par intelligence artificielle** : il analyse l'historique des réservations pour anticiper la demande future et recommande automatiquement des ajustements tarifaires (hausses en période chargée, promotions en période creuse).

---

## 2. Architecture technique

Le projet est entièrement **conteneurisé avec Docker**. Il est composé de **4 services** qui communiquent entre eux :



### Rôle de chaque service

| Service | Technologie | Rôle |
|---|---|---|
| **Frontend** | React + Vite | Interface utilisateur (pages web) |
| **Backend** | Laravel 11 (PHP) | API REST, logique métier, authentification |
| **Base de données** | MySQL 8 | Stockage de toutes les données |
| **Service ML** | Flask (Python) + XGBoost | Entraînement et prédiction IA |

### Pourquoi Docker ?

Docker permet de lancer tout le projet avec **une seule commande** (`docker-compose up`) sans avoir à installer PHP, MySQL, Python, Node.js séparément sur la machine. Tout est pré-configuré dans des conteneurs isolés.

---

## 3. Fonctionnalités

### Côté client
- Consulter la liste des chambres avec prix et disponibilités
- Faire une réservation (dates d'arrivée/départ, nombre de personnes, remarques)
- Voir toutes ses réservations avec leur statut
- Modifier ou annuler une réservation en attente ou confirmée
- Les réservations "last-minute" (≤ 2 jours avant arrivée) sont automatiquement identifiées

### Côté gestionnaire
- Voir toutes les réservations de l'hôtel avec filtres par statut
- Confirmer ou annuler des réservations
- Rechercher par numéro de référence ou nom du client
- Accéder au tableau de bord complet

### Côté administrateur
- Tout ce que fait le gestionnaire
- Tableau de bord avec KPIs (taux d'occupation, revenus, arrivées du jour...)
- Graphiques d'évolution sur 6 mois
- Module de prédiction IA avec alertes automatiques
- Recommandations tarifaires dynamiques

### Automatisations
- Les réservations dont la date de départ est passée passent automatiquement au statut **"terminée"** chaque nuit à 01h00 (tâche cron Laravel)
- Les alertes IA sont générées et nettoyées automatiquement à chaque actualisation des prédictions

---

## 4. Rôles utilisateurs

Il existe 3 rôles dans le système :

### Client
- Accès : page Chambres + page "Mes réservations"
- Peut faire des réservations pour lui-même uniquement
- Ne voit que ses propres réservations

### Gestionnaire
- Accès : tout ce qu'a le client + Gestion des réservations + Dashboard
- Voit **toutes** les réservations de l'hôtel
- Peut confirmer/annuler n'importe quelle réservation

### Administrateur
- Accès complet à toutes les fonctionnalités
- Même droits que le gestionnaire
- Accès au module IA (prédictions, alertes, recommandations tarifaires)

---

## 5. Module de prédiction IA

C'est le composant le plus important du projet sur le plan académique.

### Principe de fonctionnement

Le module fonctionne en **deux phases** :

#### Phase 1 — Entraînement (apprentissage)

Quand l'administrateur clique sur **"Actualiser prédictions"** :

1. Laravel collecte tout l'historique des réservations en base de données
2. Ces données sont envoyées au service Flask via une requête HTTP
3. Flask prépare les données : agrège les réservations par jour, calcule les features (variables d'entrée)
4. **XGBoost** (algorithme de machine learning) entraîne **3 modèles** distincts :
   - Modèle 1 : prédit le **nombre de réservations** par jour
   - Modèle 2 : prédit le **nombre de réservations last-minute** par jour
   - Modèle 3 : prédit le **taux d'occupation** (%) par jour
5. Les modèles entraînés sont sauvegardés sur disque (fichiers `.pkl`)
6. Les métriques de performance (R², MAE) sont calculées et sauvegardées

#### Phase 2 — Prédiction (utilisation)

Après l'entraînement, Laravel envoie les caractéristiques des 7 prochains jours à Flask :

1. Pour chaque jour futur, Laravel calcule 15 variables : mois, jour, jour de la semaine, week-end ou non, saison, encodages cycliques...
2. Flask utilise les 3 modèles entraînés pour prédire les valeurs
3. Un **prix recommandé** est calculé selon le taux d'occupation prédit :
   - Taux ≥ 80% → +20% sur le prix (forte demande)
   - Taux 40-79% → prix normal
   - Taux < 40% → -15% sur le prix (promouvoir les réservations)
4. Les prédictions sont sauvegardées en base de données et affichées sur le dashboard

### Les 15 variables d'entrée (features)

| Variable | Type | Description |
|---|---|---|
| annee, mois, jour | Temporel | Date du jour prédit |
| jour_semaine | Temporel | 0=Lundi ... 6=Dimanche |
| trimestre | Temporel | 1 à 4 |
| mois_sin, mois_cos | Cyclique | Encodage sinusoïdal du mois |
| jour_sem_sin, jour_sem_cos | Cyclique | Encodage sinusoïdal du jour |
| est_weekend | Binaire | 1 si samedi ou dimanche |
| est_debut_mois | Binaire | 1 si jour ≤ 7 |
| est_fin_mois | Binaire | 1 si jour ≥ 24 |
| saison_pluies_courte | Saisonnier | Mars-Mai (Cameroun) |
| saison_pluies_longue | Saisonnier | Juin-Octobre (Cameroun) |
| saison_seche_courte | Saisonnier | Novembre-Décembre (Cameroun) |

> **Pourquoi l'encodage sinusoïdal ?**
> Sans cet encodage, le modèle traiterait décembre (12) et janvier (1) comme très éloignés alors qu'ils sont consécutifs dans le calendrier. L'encodage sin/cos représente la cyclicité du temps correctement.

### Algorithme XGBoost

XGBoost (eXtreme Gradient Boosting) est un algorithme basé sur des **arbres de décision en cascade**. Chaque arbre corrige les erreurs du précédent. C'est l'algorithme de référence pour les données tabulaires structurées (notre cas).

Hyperparamètres utilisés :
- `n_estimators = 300` : nombre d'arbres
- `max_depth = 4` : profondeur maximale de chaque arbre
- `learning_rate = 0.05` : vitesse d'apprentissage (faible = plus précis)
- `reg_alpha = 0.1` : régularisation L1 (évite le surapprentissage)

### Système d'alertes

Après chaque prédiction, des alertes sont automatiquement créées pour les jours exceptionnels :

- **Alerte rouge (forte demande)** : taux prédit ≥ 80% → recommande une hausse tarifaire
- **Alerte orange (faible demande)** : taux prédit < 40% → recommande des promotions
- Le gestionnaire peut marquer chaque alerte comme lue (bouton ✓)

### Mécanisme de secours (fallback)

Si le service Flask est inaccessible, le système génère automatiquement des prédictions statistiques basiques (aléatoires pondérées selon week-end/semaine) pour garantir la continuité du service.

---

## 6. Installation et lancement

### Prérequis

Installer ces deux logiciels avant de commencer :

1. **Docker Desktop** : https://www.docker.com/products/docker-desktop
   - Lancer Docker Desktop et attendre qu'il soit démarré (icône baleine dans la barre des tâches)
2. **Git** : https://git-scm.com/downloads

### Étape 1 — Cloner le projet

Ouvrir un terminal (PowerShell ou CMD) et exécuter :

```bash
git clone https://github.com/merveillenkuimi317-sketch/Hotel_Reservation.git
cd Hotel_Reservation
```

### Étape 2 — Créer le fichier de configuration

```bash
cp backend/.env.example backend/.env
```

Ouvrir le fichier `backend/.env` avec un éditeur de texte (Notepad, VS Code...) et s'assurer que ces lignes sont présentes :

```env
APP_NAME=HotelPro
APP_ENV=local
APP_KEY=
APP_DEBUG=true

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=hotel_reservation
DB_USERNAME=root
DB_PASSWORD=root

SESSION_DRIVER=file
SANCTUM_STATEFUL_DOMAINS=
ML_API_URL=http://flask:5000
```

### Étape 3 — Lancer les containers Docker

```bash
docker-compose up --build
```

> Cette commande télécharge et construit toutes les images Docker (5-10 minutes la première fois selon la connexion internet). Les fois suivantes ce sera beaucoup plus rapide.

Attendre que les 4 containers soient démarrés. On peut vérifier dans un autre terminal :

```bash
docker ps
```

Les 4 lignes suivantes doivent apparaître avec le statut **Up** :
- `hotel_mysql`
- `hotel_backend`
- `hotel_flask`
- `hotel_frontend`

### Étape 4 — Générer la clé de sécurité Laravel

```bash
docker exec hotel_backend php artisan key:generate
```

### Étape 5 — Créer les tables de la base de données

```bash
docker exec hotel_backend php artisan migrate
```

### Étape 6 — Insérer les données de test

```bash
docker exec hotel_backend php artisan db:seed
```

Cette commande crée :
- Les 3 comptes utilisateurs (admin, gestionnaire, client)
- Les chambres de l'hôtel
- 840 réservations historiques (données d'entraînement pour le modèle IA)

### Étape 7 — Accéder à l'application

Ouvrir le navigateur web et aller sur :

**http://localhost:3000**

### Étape 8 — Entraîner le modèle IA (une seule fois)

1. Se connecter avec le compte admin : `admin@hotel.cm` / `password`
2. Cliquer sur **Dashboard** dans la navbar
3. Cliquer sur le bouton **"Actualiser prédictions"**
4. Attendre 30 à 40 secondes (entraînement XGBoost sur 840 réservations)
5. Un message "Prédictions mises à jour !" confirme le succès

---

## 7. Comptes de test

| Rôle | Email | Mot de passe | Accès |
|---|---|---|---|
| Administrateur | admin@hotel.cm | password | Tout + Dashboard + IA |
| Gestionnaire | gestionnaire@hotel.cm | password | Gestion réservations + Dashboard |
| Client | client@hotel.cm | password | Chambres + Mes réservations |

---

## 8. Structure des dossiers

```
Hotel_Reservation/
│
├── docker-compose.yml          ← Configuration de tous les containers
│
├── backend/                    ← API Laravel (PHP)
│   ├── app/
│   │   ├── Http/Controllers/   ← Contrôleurs API (Auth, Chambres, Réservations, Dashboard, Prédictions)
│   │   ├── Models/             ← Modèles Eloquent (User, Chambre, Reservation, Prediction, Alerte)
│   │   ├── Services/           ← Services métier (PredictionService, ReservationService)
│   │   └── Http/Middleware/    ← Middleware de rôle (RoleMiddleware)
│   ├── database/
│   │   ├── migrations/         ← Structure des tables SQL
│   │   └── seeders/            ← Données initiales (chambres, utilisateurs, réservations)
│   ├── routes/
│   │   ├── api.php             ← Toutes les routes API REST
│   │   └── console.php         ← Commandes artisan + scheduler (cron)
│   ├── Dockerfile              ← Image Docker du backend
│   └── start.sh                ← Script de démarrage (cron + serveur Laravel)
│
├── frontend/                   ← Interface React
│   └── src/
│       ├── pages/              ← Pages de l'application
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Chambres.jsx
│       │   ├── Reservation.jsx
│       │   ├── MesReservations.jsx
│       │   ├── ModifierReservation.jsx
│       │   ├── GestionReservations.jsx
│       │   └── Dashboard.jsx
│       ├── components/
│       │   └── layout/Navbar.jsx
│       ├── context/
│       │   └── AuthContext.jsx ← Gestion de l'authentification globale
│       └── services/
│           └── api.js          ← Toutes les fonctions d'appel API
│
└── ml-service/                 ← Service d'intelligence artificielle (Python/Flask)
    ├── app.py                  ← Serveur Flask (endpoints /train, /predict, /status)
    ├── model/
    │   ├── train.py            ← Script d'entraînement XGBoost
    │   └── saved/              ← Modèles entraînés sauvegardés (.pkl)
    ├── data/
    │   └── preprocess.py       ← Préparation et nettoyage des données
    └── requirements.txt        ← Dépendances Python
```

---

## 9. Dépannage

### Le frontend ne charge pas (page blanche ou erreur)

```bash
docker restart hotel_frontend
```

Attendre 30 secondes puis rafraîchir le navigateur.

### Erreur de connexion / token invalide

```bash
docker exec hotel_backend php artisan config:clear
docker exec hotel_backend php artisan cache:clear
docker restart hotel_backend
```

### Les prédictions ne se génèrent pas

Vérifier que le service Flask est bien démarré :
```bash
docker ps
```
Si `hotel_flask` n'est pas dans la liste :
```bash
docker-compose up flask
```

### Tout réinitialiser proprement (base de données comprise)

```bash
docker-compose down -v
docker-compose up --build
docker exec hotel_backend php artisan key:generate
docker exec hotel_backend php artisan migrate
docker exec hotel_backend php artisan db:seed
```

> **Attention** : `docker-compose down -v` supprime toutes les données. À utiliser uniquement si tout est bloqué.

### Commandes utiles

```bash
# Voir les logs de tous les containers en temps réel
docker-compose logs -f

# Voir les logs d'un container spécifique
docker logs hotel_backend
docker logs hotel_flask

# Redémarrer un container spécifique
docker restart hotel_backend

# Arrêter tous les containers
docker-compose down

# Relancer tous les containers (sans reconstruire)
docker-compose up
```

---

## Technologies utilisées

| Technologie | Version | Usage |
|---|---|---|
| React | 18 | Interface utilisateur |
| Vite | 5 | Bundler frontend |
| Laravel | 11 | API REST backend |
| PHP | 8.2 | Langage backend |
| MySQL | 8.0 | Base de données |
| Flask | 3.x | Serveur API Python |
| XGBoost | 2.x | Algorithme de machine learning |
| scikit-learn | 1.x | Métriques ML (R², MAE) |
| Docker | - | Conteneurisation |
| Laravel Sanctum | - | Authentification par token |

---

*Projet de fin d'études — Plateforme de gestion hôtelière avec module IA prédictif*
