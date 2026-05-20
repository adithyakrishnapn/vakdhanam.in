# Vakdhanam.in

Promises fade. Internet remembers.

## Stack
- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion
- React Router
- Zustand
- Firebase Auth, Firestore, Hosting, Functions, Analytics

## Security model
- Public reads only for promise data
- Sensitive writes go through Firebase Functions
- Firebase Security Rules block direct client writes to reactions, votes, and admin moderation data
- App Check is enforced in callable functions
- Email verification is required for comments and promise submissions
- Admin actions require custom claims
- Localhost development can bypass App Check; production still requires a valid App Check setup

## Local development
1. Copy `.env.example` to `.env` and fill Firebase values.
2. Install dependencies with `npm install`.
3. Start the app with `npm run dev`.
4. For backend functions, install dependencies in `functions/` and run the Firebase emulators.
5. If App Check is enforced, add `VITE_FIREBASE_APPCHECK_SITE_KEY` and optionally `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` for local development.

## Deployment
- Build the frontend with `npm run build`
- Vercel deployment for the frontend:
	- Import the repo in Vercel as a Vite project
	- Set the root directory to the repo root
	- Leave the build command as `npm run build`
	- Set the output directory to `dist`
	- Add the same `VITE_FIREBASE_*` env vars in Vercel project settings
	- Add `VITE_FIREBASE_APPCHECK_SITE_KEY` in production if App Check is enabled
- Keep Firebase Functions and Firestore deployed separately with Firebase CLI

## Admin bootstrap
- Set `GOOGLE_APPLICATION_CREDENTIALS` to a Firebase service-account JSON file, or use Firebase application default credentials.
- Run `npm run admin:set -- <firebase-auth-uid>` from `functions/` to grant the first admin claim.
- After that, the hidden admin dashboard at `/admin` works for that account.

## Notes
- The frontend currently includes a secure local/demo mode so the UI renders even before Firebase credentials are connected.
- Replace the placeholder Firebase project values with your real project before deploying.
