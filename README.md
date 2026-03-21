# Heyama Exam

## Stack technique
- **API** : NestJS + MongoDB Atlas + Cloudflare R2 + Socket.IO
- **Web** : Next.js 16 + Tailwind v4 + shadcn/ui
- **Mobile** : React Native + Expo SDK 52 + NativeWind v4

## Lancer le projet

### 1. API
cd api && npm run start:dev

### 2. Web App (port 3001)
cd web && npm run dev

### 3. Mobile
cd mobile && npx expo start

## Variables d'environnement
- `api/.env` — MongoDB URI + Cloudflare R2 credentials
- `web/.env.local` — URL de l'API
- `mobile/src/config.ts` — IP locale du PC

## Fonctionnalités
- Créer un objet (titre + description + image)
- Lister tous les objets
- Voir le détail d'un objet
- Supprimer un objet (MongoDB + S3)
- Temps réel Socket.IO (mobile ↔ web)
