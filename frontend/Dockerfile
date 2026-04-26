FROM node:20-alpine AS build

# Répertoire de travail
WORKDIR /app

# Copier les fichiers package
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm install

# Copier tout le code
COPY . .

# Construire l'application React
RUN npm run build

# ── Étape 2 : Servir avec Nginx ───────────────────
FROM nginx:alpine

# Copier le build React vers Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port
EXPOSE 80

# Lancer Nginx
CMD ["nginx", "-g", "daemon off;"]