# Authentication Endpoints Guide

Complete API documentation for user authentication with JWT tokens.

---

## Endpoints Overview

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/auth/signup` | POST | Register new user | ❌ No |
| `/api/auth/login` | POST | Authenticate user | ❌ No |
| `/api/auth/logout` | POST | Logout (client-side) | ❌ No |
| `/api/auth/password-reset/request` | POST | Request password reset | ❌ No |
| `/api/auth/password-reset/complete` | POST | Complete password reset | ❌ No |

---

## 1. Signup: Create New User Account

### Request
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@restaurant.com",
  "password": "SecurePass123!@#",
  "confirmPassword": "SecurePass123!@#",
  "role": "cashier"  // optional: cashier|restaurant|kitchen|manager|customer
}
```

### Success Response (201 Created)
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@restaurant.com",
    "role": "cashier"
  }
}
```

### Error Responses
```json
// Email already exists
{
  "error": "Email already exists"
}

// Password too short
{
  "error": "Password must be at least 12 characters long."
}

// Passwords don't match
{
  "error": "Passwords do not match"
}

// Weak password
{
  "error": "Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a symbol..."
}
```

### Password Strength Requirements
- ✅ **Length**: 12-128 characters
- ✅ **Uppercase**: At least one (A-Z)
- ✅ **Lowercase**: At least one (a-z)
- ✅ **Numbers**: At least one (0-9)
- ✅ **Symbols**: At least one (!@#$%^&*)
- ✅ **No spaces**
- ✅ **Cannot contain email local part**
- ✅ **Not a common password** (password, admin123, welcome123, etc.)

### Test Example (cURL)
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Cashier",
    "email": "john@test.com",
    "password": "TestPass123!@#",
    "confirmPassword": "TestPass123!@#",
    "role": "cashier"
  }'
```

---

## 2. Login: Authenticate User

### Request
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@restaurant.com",
  "password": "SecurePass123!@#"
}
```

### Success Response (200 OK)
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@restaurant.com",
    "role": "cashier"
  }
}
```

### Error Responses
```json
// Wrong password or email not found
{
  "error": "Invalid credentials"
}

// Missing fields
{
  "error": "Email and password are required"
}
```

### JWT Token Structure
The returned token contains:
```json
{
  "userId": 1,
  "email": "john@restaurant.com",
  "role": "cashier",
  "iat": 1715784000,
  "exp": 1716388800  // expires in 7 days
}
```

### Using the Token
Store the token in localStorage or session, then send it in the `Authorization` header for protected endpoints:

```javascript
// Frontend
const token = response.data.token;
localStorage.setItem('authToken', token);

// When making requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### Test Example (cURL)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@test.com",
    "password": "TestPass123!@#"
  }'
```

---

## 3. Logout: Clear Session

### Request
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "ok": true
}
```

### Notes
- JWT is **stateless**, so logout is handled on the **client-side**
- Delete the token from localStorage/sessionStorage
- No backend token revocation needed (for MVP)

### Test Example (cURL)
```bash
curl -X POST http://localhost:3001/api/auth/logout
```

---

## 4. Password Reset: Request Code

### Request
```http
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "john@restaurant.com"
}
```

### Success Response (200 OK)
```json
{
  "ok": true,
  "message": "Reset code sent to your email"
}
```

### Error Responses
```json
// Email not found
{
  "error": "No account found for that email"
}

// Email service failed
{
  "error": "Failed to send reset email"
}
```

### What Happens
1. System generates a 6-digit OTP
2. Email is sent with the OTP (valid for 10 minutes)
3. Frontend prompts user to enter OTP
4. User provides OTP + new password → `/password-reset/complete`

### Email Setup Required
Configure **one** of these in `.env`:

**Option A: Resend (Recommended)**
```bash
RESEND_API_KEY="re_xxxxx"
RESEND_FROM="Restaurant <noreply@restaurant.com>"
```

**Option B: SMTP (Gmail, etc.)**
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"  # App password, not regular password
SMTP_FROM="noreply@restaurant.com"
SMTP_USE_TLS="1"
```

### Test Example (cURL)
```bash
curl -X POST http://localhost:3001/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@test.com"
  }'
```

---

## 5. Password Reset: Complete

### Request
```http
POST /api/auth/password-reset/complete
Content-Type: application/json

{
  "email": "john@restaurant.com",
  "otp": "123456",                      // from email
  "password": "NewSecurePass123!@#",
  "confirmPassword": "NewSecurePass123!@#"
}
```

### Success Response (200 OK)
```json
{
  "ok": true,
  "message": "Password reset successfully"
}
```

### Error Responses
```json
// OTP invalid or expired
{
  "error": "Invalid or expired reset code"
}

// Passwords don't match
{
  "error": "Passwords do not match"
}

// New password too weak
{
  "error": "Password must be at least 12 characters..."
}

// User not found
{
  "error": "User not found"
}
```

### Security Details
- OTP valid for **10 minutes** only
- OTP is **single-use** (deleted after verification)
- New password must pass **strength validation**
- Old password NOT required (like most modern apps)

### Test Example (cURL)
```bash
curl -X POST http://localhost:3001/api/auth/password-reset/complete \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@test.com",
    "otp": "123456",
    "password": "NewPass123!@#",
    "confirmPassword": "NewPass123!@#"
  }'
```

---

## Using Protected Routes

For future endpoints that require authentication:

### Frontend JavaScript
```javascript
async function getProtectedData() {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('http://localhost:3001/api/products', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
}
```

### Backend Route Protection
```typescript
import { verifyToken, requireStaff, requireAdmin } from '../middleware/auth';

// Only authenticated users
router.get('/protected', verifyToken, (req, res) => {
  res.json({ userId: req.user?.userId });
});

// Only staff (cashier, kitchen, manager, restaurant)
router.get('/staff-only', verifyToken, requireStaff, (req, res) => {
  res.json({ role: req.user?.role });
});

// Only admin (restaurant role)
router.get('/admin-only', verifyToken, requireAdmin, (req, res) => {
  res.json({ admin: true });
});
```

---

## User Roles

| Role | Access Level | Can Do |
|------|-----------|--------|
| **cashier** | Staff | Create orders, receive payments, open register |
| **kitchen** | Staff | View kitchen tickets, mark items done |
| **manager** | Staff | Create orders, manage staff (limited) |
| **restaurant** | Admin | Everything + config products, manage users, view reports |
| **customer** | Customer | View their order status, submit reviews |

---

## Testing Auth Flow

### Step-by-Step Test

**1. Signup**
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!@#",
    "confirmPassword": "TestPass123!@#"
  }'
# Save the token from response
```

**2. Login with Same Credentials**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!@#"
  }'
```

**3. Use Token for Protected Route** (once implemented)
```bash
curl -X GET http://localhost:3001/api/protected \
  -H "Authorization: Bearer <copied_token_here>"
```

**4. Password Reset Flow**
```bash
# Step A: Request reset
curl -X POST http://localhost:3001/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check email for OTP (or check logs in development)

# Step B: Complete reset
curl -X POST http://localhost:3001/api/auth/password-reset/complete \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "password": "NewPass123!@#",
    "confirmPassword": "NewPass123!@#"
  }'

# Step C: Login with new password
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "NewPass123!@#"
  }'
```

---

## Development Notes

### In-Memory Token Storage
Currently, password reset OTPs are stored in-memory:
```typescript
(global as any).resetTokens = new Map();
```

**For production**, migrate to Redis or database:
```typescript
// Example with Redis
const resetTokens = await redis.set(
  `reset:${email}`,
  { otp, expiresAt },
  { EX: 600 } // 10 minute expiry
);
```

### Next Steps
- ✅ Auth endpoints built
- ⏭️ Product management endpoints
- ⏭️ Order management endpoints
- ⏭️ Kitchen display endpoints
- ⏭️ Payment endpoints
- ⏭️ Socket.io real-time sync

---

## Environment Variables Required

```bash
# Essential
JWT_SECRET="your-secret-key-here"
DATABASE_URL="postgresql://..."

# Email - choose one
RESEND_API_KEY="re_xxxxx"  # OR SMTP below
SMTP_HOST="smtp.gmail.com"
SMTP_USER="email@gmail.com"
SMTP_PASSWORD="app-password"
```

---

## Error Handling Strategy

All endpoints return consistent JSON:
- **Success**: `{ ok: true, ... }`
- **Client Error (400-403)**: `{ error: "Message" }`
- **Server Error (500)**: `{ error: "Internal server error" }`

Frontend should:
1. Check `error` field first
2. If error exists, display to user
3. If `ok: true`, process data
4. Handle network errors separately

---

Ready to test? Start the backend and try the endpoints! 🚀

```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```
