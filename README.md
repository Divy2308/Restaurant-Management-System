# Restaurant Management System

A full-featured restaurant POS system with real-time kitchen display, customer display, and payment integration.

## Project Structure

```
restaurant management system/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
│
└── backend/                  # Express + TypeScript + Prisma
    ├── src/
    ├── prisma/
    │   └── schema.prisma
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── .env
```

## Frontend Setup

**Installed Dependencies:**
- ✅ React 18 + TypeScript
- ✅ Vite (dev server)
- ✅ React Router v6
- ✅ TanStack React Query (server state)
- ✅ Zustand (UI state)
- ✅ Socket.io client
- ✅ Axios (HTTP client)
- ✅ Tailwind CSS

**To Start Development:**
```bash
cd frontend
npm run dev
# Server will run on http://localhost:5173
```

**Available Scripts:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run linter (if configured)

---

## Backend Setup

**Installed Dependencies:**
- ✅ Express.js
- ✅ TypeScript + ts-node
- ✅ Prisma ORM (with @prisma/client)
- ✅ Socket.io (real-time)
- ✅ dotenv (environment variables)
- ✅ cors (cross-origin)
- ✅ bcryptjs (password hashing)
- ✅ jsonwebtoken (JWT)
- ✅ Nodemon (auto-restart on changes)

**To Start Development:**
```bash
cd backend

# 1. Setup database
# First configure DATABASE_URL in .env or .env.example

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migrations
npm run prisma:migrate

# 4. Start server
npm run dev
# Server will run on http://localhost:3001
```

**Configuration:**
1. Copy `.env.example` to `.env`
2. Update values in `.env`:
   - `DATABASE_URL` - Supabase PostgreSQL or local DB
   - `JWT_SECRET` - Your secret key
   - Razorpay keys (optional for now)
   - Email service keys (optional for now)

**Available Scripts:** (to be added)
- `npm run dev` - Start with nodemon
- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled app
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio

---

## Next Steps

1. **Configure Database**
   - Set up Supabase project or local PostgreSQL
   - Update `DATABASE_URL` in backend `.env`

2. **Setup Backend Routes**
   - Create folder structure: `src/routes/`, `src/models/`, `src/middleware/`
   - Start with auth endpoints

3. **Setup Frontend Pages**
   - Create folder structure: `src/pages/`, `src/components/`, `src/hooks/`
   - Start with Auth page

4. **Real-time Integration**
   - Setup Socket.io on backend
   - Connect Socket.io client on frontend

5. **Deploy**
   - Frontend: Vercel
   - Backend: Render, Railway, or Heroku

---

## Development Workflow

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Both servers will run simultaneously with hot-reload enabled.

---

## Notes

- All dependencies are installed and ready to use
- TypeScript is configured in both frontend and backend
- Tailwind CSS is configured for frontend
- Prisma is initialized for backend (schema ready to be populated)
- Environment variable templates are provided

**Ready to build?** Start with Phase 1 migration steps! 🚀
