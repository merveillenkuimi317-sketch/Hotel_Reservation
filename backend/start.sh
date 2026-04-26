#!/bin/bash

# Démarrer le cron daemon
service cron start

# Lancer le serveur Laravel
php artisan serve --host=0.0.0.0 --port=8000
