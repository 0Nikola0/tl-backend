# Fitness Time API

Fitness Time is a small scheduling app for a personal trainer. This repo is the API. The trainer publishes gym sessions. A client picks one, leaves a name and email, and gets a short confirmation. There are no accounts. Everyone uses one timezone, `Europe/Belgrade` by default.

A booked session stays on the schedule and cannot be booked again. If a Google Calendar is connected, sessions that overlap an existing event show as busy and cannot be booked. After a booking is saved, the API asks Gemini for a two-sentence confirmation. If that call is missing or fails, the client still sees a plain fallback sentence.

The React client lives in a separate repo. It expects this API on port `3000`.

## Run it locally

You need Node.js and a PostgreSQL database. Point `DATABASE_URL` at that database before you migrate.

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

The API listens on port `3000`. The first seed adds a handful of sessions over the next week. The schedule shows today through the next 21 days. Durations are 30, 45, 60, or 90 minutes.

`npm test` checks the overlap rules, including all-day calendar events.

## Environment

Copy `.env.example` to `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `FRONTEND_URL` | Where the API sends the browser after Google sign-in, and the allowed browser origin |
| `PORT` | API port, default `3000` |
| `APP_TIMEZONE` | Single IANA timezone used to read and display times |
| `STUDIO_NAME` | Name on the booking page |
| `TRAINER_NAME` | Trainer shown to clients and in the confirmation |
| `TRAINER_TITLE` | Short line above the studio name |
| `GOOGLE_CLIENT_ID` | OAuth client id. Leave empty to run without Calendar |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Must match the Google client. Locally: `http://localhost:3000/api/calendar/callback` |
| `GEMINI_API_KEY` | Google AI Studio key. Leave empty to use the fallback sentence |
| `GEMINI_MODEL` | Default `gemini-2.5-flash` |

## Google Calendar

The app works with no calendar connected. Every future session that is not booked stays open.

1. In Google Cloud, create a project and enable the Google Calendar API.
2. Configure the OAuth consent screen. Add the Google account you will connect as a test user.
3. Create an OAuth client of type Web application.
4. Add the redirect URI `http://localhost:3000/api/calendar/callback`.
5. Put the client id and secret in `.env` and restart the API.
6. Open the trainer page and choose Connect calendar.

The connection is read-only. Cancelled events and events marked free are ignored. All-day events block that local day. If a calendar is connected and Google cannot be reached, the schedule and new bookings stop instead of showing those sessions as free.

## Gemini

1. Create a key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Set `GEMINI_API_KEY` in `.env` and restart the API.

The booking is saved before the model is called. The request waits up to about 8 seconds. A missing key, a timeout, or an error keeps the fallback: `You're booked, {first name}. See you {when} for {title}.`

## What I built

- A NestJS API with Prisma and PostgreSQL. Availability is computed from the booking row and the calendar, not stored as a status.
- One booking per session, enforced with a row lock and a unique `slotId`.
- A Gemini confirmation on `POST /api/bookings`.
- Optional Google Calendar clash detection.

## AI tools

I used Cursor to plan the app and to write the implementation.

## With more time

I would email the confirmation, write the booked session onto the trainer's calendar, add recurring weekly sessions, and give the trainer a real login. Hosting for this API would be Neon for Postgres and Render for the service. Set `DATABASE_URL`, `FRONTEND_URL`, and `GOOGLE_REDIRECT_URI` to the deployed values.
