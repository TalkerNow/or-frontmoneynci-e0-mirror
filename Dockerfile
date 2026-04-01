FROM node:18-alpine

WORKDIR /app

# Copie des fichiers de package pour installer les dépendances
COPY package.json package-lock.json* ./

# Installation des dépendances (directement dans Linux/Docker)
RUN npm install --legacy-peer-deps

# Copier le reste du code source
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
