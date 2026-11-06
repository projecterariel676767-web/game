# Pin World

Cross-platform flight, Earth exploration and personal computing environment.

## Stack
- React + TypeScript + Vite browser client (/, /preview)
- Expo Android shell (mobile/)
- Express + MongoDB + Socket.IO API (server/)
- CesiumJS for 3D Earth; Three.js for 3D hangar/aircraft previews
- Render Web Service deployment via render.yaml

## Local development
1. Copy `server/.env.example` to `server/.env` and fill in MongoDB/JWT and optional provider keys.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open http://localhost:5173 or http://localhost:5173/preview.

The browser client remains usable in demo mode without provider credentials. Cesium terrain imagery, OpenWeather overlays, AI providers, voice rooms and multiplayer require their respective credentials/services.

## Render
Create a Web Service from this repository. Render detects render.yaml. Set MONGODB_URI and optional API credentials in the service environment. Do not commit secrets.

## Android
Run `cd mobile && npx expo install`, set `EXPO_PUBLIC_API_URL`, then `npx eas build -p android --profile preview`.

## Security
Passwords are bcrypt-hashed. JWT and provider secrets remain server-side. Never expose provider API keys in the client.
