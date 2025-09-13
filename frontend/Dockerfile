# Frontend Dockerfile
FROM node:20-alpine

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Exposer le port Vite
EXPOSE 5173

# Commande de démarrage pour le développement
CMD ["vite", "dev", "--host", "0.0.0.0"]
