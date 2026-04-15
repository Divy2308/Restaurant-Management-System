# Restaurant Management System

Restaurant POS and kitchen flow app with a React + Vite frontend and an Express + Prisma backend.

## Stack

- Frontend: React, TypeScript, Vite, Socket.IO client
- Backend: Express, TypeScript, Prisma, Socket.IO
- Default database for local clone: SQLite
- Future-ready database option: Supabase/PostgreSQL

## Project Structure

```text
Restaurant Management System/
├── frontend/
└── backend/
```

## Fresh Clone Setup

### 1. Install dependencies

```bash
cd frontend
npm install

cd ../backend
npm install
```

### 2. Configure environment files

```bash
cd backend
cp .env.example .env

cd ../frontend
cp .env.example .env
```

The backend `.env.example` uses local SQLite by default:

```env
DATABASE_URL="file:./dev.db"
```

That means a new clone can run locally without setting up Postgres or Supabase first.

### 3. Initialize the backend database

```bash
cd backend
npm run setup
```

This will:

- generate the Prisma client
- create/apply the existing migrations
- create the local SQLite database file automatically

### 4. Start the app

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## First Run in the UI

After the app opens:

1. Click `Setup Floor`
2. Click `Seed Demo Menu`

That gives you default tables and demo menu items immediately.

## Switching to Supabase Later

When you are ready to move off SQLite:

1. Create a Supabase Postgres database
2. Update `backend/.env`
3. Replace `DATABASE_URL` with your Supabase connection string
4. Run:

```bash
cd backend
npm run prisma:generate
npm run prisma:deploy
```

## Useful Scripts

Frontend:

- `npm run dev`
- `npm run build`
- `npm run preview`

Backend:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run setup`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:deploy`
- `npm run prisma:studio`

## Notes

- `backend/.env` is intentionally not committed
- local SQLite database files are ignored
- Prisma migrations are committed so clones can create the same schema
