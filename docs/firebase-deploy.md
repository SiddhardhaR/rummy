# Firebase Deployment

This repository is configured to deploy the Next.js app to Firebase Hosting when code is pushed to the `develop` branch.

Required GitHub repository secrets:

- `FIREBASE_SERVICE_ACCOUNT_RUMMY`: JSON service account key for the Firebase project `rummy-91870`.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL used by the frontend.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key used by the frontend.
- `NEXT_PUBLIC_SOCKET_URL`: Public URL for the Socket.IO game server.

The frontend is deployed by `.github/workflows/firebase-hosting-develop.yml`.

Important: the Socket.IO server in `server/socketServer.js` is a separate long-running Node server. Firebase Hosting deploys the Next.js web app, but it does not deploy that Socket.IO backend. Deploy the socket server to a long-running backend such as Cloud Run, then set `NEXT_PUBLIC_SOCKET_URL` to that backend URL.
