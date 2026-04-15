# Supabase & Prisma Setup Guide

## Step 1: Create Supabase Project ✅

1. Visit https://supabase.com
2. Sign up or login
3. Click **New Project**
4. Fill in details:
   - **Project name**: `restaurant-pos`
   - **Database password**: Choose a strong password (save it!)
   - **Region**: Select closest to you
   - **Pricing plan**: Free tier is fine for development

5. Wait for project initialization (~2-3 minutes)
6. You'll see your project dashboard

---

## Step 2: Get Database Connection String 🔗

1. In Supabase dashboard, click **Settings** (gear icon, bottom left)
2. Click **Database** in the left sidebar
3. Look for **Connection String** section
4. Select **URI** format (if there's a dropdown)
5. Copy the entire connection string
   ```
   postgresql://postgres.[project-id]:[YOUR_PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   **Replace `[YOUR_PASSWORD]` with your database password you set earlier**

---

## Step 3: Update Backend .env 📝

1. Open `/backend/.env`
2. Find this line:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres"
   ```
3. Replace with your Supabase connection string:
   ```
   DATABASE_URL="postgresql://postgres.xxxxx:your_password@aws-0-region.pooler.supabase.com:6543/postgres"
   ```
4. Save the file

**⚠️ IMPORTANT**: Never commit `.env` file to git (it's in .gitignore by default)

---

## Step 4: Generate Prisma Client & Create Tables 🗄️

Open terminal in `/backend` folder and run:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration (creates tables in Supabase)
npm run prisma:migrate

# When prompted, give migration a name like: "init"
# This will generate the SQL and apply it to your database
```

**What happens:**
- Prisma generates TypeScript client for type-safe database access
- Creates a migration file in `prisma/migrations/`
- Applies the migration to your Supabase database
- Creates all 11 tables (User, Product, Order, etc.)

---

## Step 5: Verify Database Tables ✓

### Option A: Prisma Studio (easiest)
```bash
npm run prisma:studio
```
This opens a web UI showing all your tables and data.

### Option B: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Run this query to see tables:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
4. You should see: User, Category, Product, Floor, Table, Order, OrderItem, KitchenTicket, Review, Session, PaymentMethod

---

## Step 6: Seed Test Data (Optional)

To populate initial data (users, products, floors, tables):

1. Create `prisma/seed.ts`:
   ```typescript
   import { PrismaClient } from "@prisma/client";
   
   const prisma = new PrismaClient();
   
   async function main() {
     // Create admin user
     const admin = await prisma.user.create({
       data: {
         name: "Admin",
         email: "admin@restaurant.com",
         password: "hashed_password_here",
         role: "restaurant"
       }
     });
   
     console.log("✓ Admin user created:", admin.email);
   }
   
   main()
     .catch(e => console.error(e))
     .finally(async () => await prisma.$disconnect());
   ```

2. Run:
   ```bash
   npx ts-node prisma/seed.ts
   ```

---

## Prisma Useful Commands

```bash
# View all tables and data in web UI
npm run prisma:studio

# Create new migration (after schema changes)
npm run prisma:migrate

# Deploy migrations to production database
npm run prisma:deploy

# Generate Prisma Client code
npm run prisma:generate

# Format schema.prisma
npx prisma format

# Check schema validity
npx prisma validate
```

---

## Database Schema Overview

### 11 Tables Created:
1. **User** - Cashiers, kitche staff, admins, customers
2. **Category** - Product categories (Food, Beverages, etc.)
3. **Product** - Menu items with price, tax, unit
4. **Floor** - Restaurant floors/areas
5. **Table** - Seating arrangements (Table 1, Table 2, etc.)
6. **PaymentMethod** - Cash, Card, UPI, Razorpay
7. **Session** - Cash drawer open/close sessions
8. **Order** - Customer orders with status tracking
9. **OrderItem** - Items within an order
10. **KitchenTicket** - Kitchen display tickets
11. **Review** - Customer ratings & feedback

### Key Relationships:
- User → Sessions (one user can have many sessions)
- User → Orders (one user can create many orders)
- Product → Category (many products per category)
- Table → Floor (many tables per floor)
- Order → OrderItem (one order has many items)
- Order → KitchenTicket (one order generates one ticket)
- OrderItem → Product (links items to products)

---

## Troubleshooting

### "Connection refused" error
- Check `DATABASE_URL` is correct
- Verify Supabase project is running
- Check your network connection

### "relation does not exist" error
- Run migrations: `npm run prisma:migrate`
- Check migration ran successfully

### "Password authentication failed"
- Verify password in DATABASE_URL matches your Supabase password
- Check for special characters (URL encode if needed)

### "Too many connections"
- Supabase free tier has connection limit
- Use connection pooling: add `?sslmode=require` to DATABASE_URL

---

## Next Steps

Once database is set up:
1. ✅ Database configured
2. ⏭️ **Build Authentication API** (signup, login, password reset)
3. ⏭️ Build Product Management API
4. ⏭️ Build Order Management API
5. ⏭️ Setup Socket.io for real-time
6. ⏭️ Build React frontend components

**Ready?** Say: "Setup auth endpoints" and I'll help build the authentication routes! 🚀
