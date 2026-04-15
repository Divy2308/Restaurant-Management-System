# Products & Categories API Guide

Complete API documentation for product and category management endpoints.

---

## Overview

| Endpoint | Method | Purpose | Auth | Role |
|----------|--------|---------|------|------|
| `/api/categories` | GET | List all categories | ❌ No | - |
| `/api/categories/:id` | GET | Get category with products | ❌ No | - |
| `/api/categories` | POST | Create category | ✅ Yes | Admin |
| `/api/categories/:id` | PUT | Update category | ✅ Yes | Admin |
| `/api/categories/:id` | DELETE | Delete category | ✅ Yes | Admin |
| `/api/products` | GET | List all products (paginated) | ❌ No | - |
| `/api/products/:id` | GET | Get single product | ❌ No | - |
| `/api/products/category/:id` | GET | Get products by category | ❌ No | - |
| `/api/products` | POST | Create product | ✅ Yes | Staff+ |
| `/api/products/:id` | PUT | Update product | ✅ Yes | Staff+ |
| `/api/products/:id` | DELETE | Delete product | ✅ Yes | Admin |
| `/api/products/:id/toggle-availability` | PATCH | Toggle availability | ✅ Yes | Staff+ |

---

## Categories Endpoints

### 1. List All Categories

Returns all categories with product count.

#### Request
```http
GET /api/categories
```

#### Response (200 OK)
```json
{
  "ok": true,
  "categories": [
    {
      "id": 1,
      "name": "Biryani",
      "description": "Rice dishes",
      "icon": "🍚",
      "productCount": 5,
      "createdAt": "2026-04-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Beverages",
      "description": "Drinks and juices",
      "icon": "🥤",
      "productCount": 3,
      "createdAt": "2026-04-15T10:05:00Z"
    }
  ],
  "total": 2
}
```

#### Test (cURL)
```bash
curl http://localhost:3001/api/categories
```

---

### 2. Get Category with Products

Returns single category with all its products.

#### Request
```http
GET /api/categories/:id
```

#### Response (200 OK)
```json
{
  "ok": true,
  "category": {
    "id": 1,
    "name": "Biryani",
    "description": "Rice dishes",
    "icon": "🍚",
    "productCount": 2,
    "products": [
      {
        "id": 10,
        "name": "Chicken Biryani",
        "description": "Fragrant rice with chicken",
        "price": 25000,
        "tax": 5,
        "unit": "pcs",
        "preparationTime": 20,
        "available": true
      },
      {
        "id": 11,
        "name": "Mutton Biryani",
        "description": "Premium mutton biryani",
        "price": 35000,
        "tax": 5,
        "unit": "pcs",
        "preparationTime": 25,
        "available": true
      }
    ]
  }
}
```

#### Test (cURL)
```bash
curl http://localhost:3001/api/categories/1
```

---

### 3. Create Category

Create a new product category. **Protected: Admin only**

#### Request
```http
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "North Indian",
  "description": "Authentic North Indian cuisine",
  "icon": "🥘"
}
```

#### Response (201 Created)
```json
{
  "ok": true,
  "message": "Category created successfully",
  "category": {
    "id": 5,
    "name": "North Indian",
    "description": "Authentic North Indian cuisine",
    "icon": "🥘"
  }
}
```

#### Error Responses
```json
// Duplicate category
{
  "error": "Category \"North Indian\" already exists"
}

// Missing name
{
  "error": "Category name is required and must be a string"
}

// Unauthorized
{
  "error": "Access denied. Admin role required."
}
```

#### Test (cURL)
```bash
curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Appetizers",
    "description": "Starters and appetizers",
    "icon": "🥒"
  }'
```

---

### 4. Update Category

Update category details. **Protected: Admin only**

#### Request
```http
PUT /api/categories/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Category Name",
  "description": "Updated description",
  "icon": "📝"
}
```

#### Response (200 OK)
```json
{
  "ok": true,
  "message": "Category updated successfully",
  "category": {
    "id": 5,
    "name": "Updated Category Name",
    "description": "Updated description",
    "icon": "📝"
  }
}
```

#### Test (cURL)
```bash
curl -X PUT http://localhost:3001/api/categories/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Biryani",
    "description": "Premium rice dishes"
  }'
```

---

### 5. Delete Category

Delete a category. **Protected: Admin only**

**Note:** Category must be empty (no products). Delete all products first.

#### Request
```http
DELETE /api/categories/:id
Authorization: Bearer <token>
```

#### Response (200 OK)
```json
{
  "ok": true,
  "message": "Category \"Biryani\" deleted successfully"
}
```

#### Error Responses
```json
// Category has products
{
  "error": "Cannot delete category with 5 product(s). Delete products first."
}

// Category not found
{
  "error": "Category not found"
}
```

#### Test (cURL)
```bash
curl -X DELETE http://localhost:3001/api/categories/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Products Endpoints

### 1. List All Products

Get all products with optional filtering and pagination.

#### Request
```http
GET /api/products?category=1&available=true&search=chicken&limit=20&offset=0
```

#### Query Parameters
- `category` (optional) - Filter by category ID
- `available` (optional) - Filter by availability (`true` or `false`)
- `search` (optional) - Search in product name or description
- `limit` (optional) - Results per page (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

#### Response (200 OK)
```json
{
  "ok": true,
  "products": [
    {
      "id": 10,
      "name": "Chicken Biryani",
      "description": "Fragrant rice with chicken",
      "categoryId": 1,
      "price": 25000,
      "tax": 5,
      "unit": "pcs",
      "preparationTime": 20,
      "available": true,
      "category": {
        "id": 1,
        "name": "Biryani"
      },
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Test Examples (cURL)
```bash
# Get all products
curl http://localhost:3001/api/products

# Get only available products
curl "http://localhost:3001/api/products?available=true"

# Search for chicken
curl "http://localhost:3001/api/products?search=chicken"

# Get biryani category products with pagination
curl "http://localhost:3001/api/products?category=1&limit=10&offset=0"
```

---

### 2. Get Products by Category

Get all products in a specific category.

#### Request
```http
GET /api/products/category/:categoryId
```

#### Response (200 OK)
```json
{
  "ok": true,
  "category": {
    "id": 1,
    "name": "Biryani"
  },
  "products": [
    {
      "id": 10,
      "name": "Chicken Biryani",
      "description": "Fragrant rice with chicken",
      "categoryId": 1,
      "price": 25000,
      "tax": 5,
      "unit": "pcs",
      "preparationTime": 20,
      "available": true,
      "createdAt": "2026-04-15T10:00:00Z",
      "updatedAt": "2026-04-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

#### Test (cURL)
```bash
curl http://localhost:3001/api/products/category/1
```

---

### 3. Get Single Product

Get detailed information about a specific product.

#### Request
```http
GET /api/products/:id
```

#### Response (200 OK)
```json
{
  "ok": true,
  "product": {
    "id": 10,
    "name": "Chicken Biryani",
    "description": "Fragrant rice with chicken",
    "categoryId": 1,
    "price": 25000,
    "tax": 5,
    "unit": "pcs",
    "preparationTime": 20,
    "available": true,
    "category": {
      "id": 1,
      "name": "Biryani"
    },
    "createdAt": "2026-04-15T10:00:00Z",
    "updatedAt": "2026-04-15T10:00:00Z"
  }
}
```

#### Test (cURL)
```bash
curl http://localhost:3001/api/products/10
```

---

### 4. Create Product

Create a new product. **Protected: Staff+ (requires valid JWT)**

#### Request
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Paneer Biryani",
  "description": "Biryani with paneer cheese",
  "categoryId": 1,
  "price": 22000,
  "tax": 5,
  "unit": "pcs",
  "preparationTime": 18,
  "available": true
}
```

#### Request Fields
- `name` (required) - Product name (string)
- `categoryId` (required) - Category ID (must exist)
- `price` (required) - Price in paise (integer, ≥ 0). E.g., 250 rupees = 25000 paise
- `description` (optional) - Product description
- `tax` (optional) - Tax percentage (default: 0)
- `unit` (optional) - Measurement unit (e.g., "pcs", "ml", "gm")
- `preparationTime` (optional) - Time in minutes (default: 0)
- `available` (optional) - Availability status (default: true)

#### Response (201 Created)
```json
{
  "ok": true,
  "message": "Product created successfully",
  "product": {
    "id": 12,
    "name": "Paneer Biryani",
    "description": "Biryani with paneer cheese",
    "categoryId": 1,
    "price": 22000,
    "tax": 5,
    "unit": "pcs",
    "preparationTime": 18,
    "available": true,
    "category": {
      "id": 1,
      "name": "Biryani"
    },
    "createdAt": "2026-04-15T11:00:00Z",
    "updatedAt": "2026-04-15T11:00:00Z"
  }
}
```

#### Error Responses
```json
// Missing required field
{
  "error": "Product name is required and must be a string"
}

// Invalid category
{
  "error": "Category not found"
}

// Invalid price format
{
  "error": "Price is required and must be a non-negative integer (in paise)"
}

// Unauthorized
{
  "error": "Access denied. Staff role required."
}
```

#### Test (cURL)
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Veg Biryani",
    "description": "Vegetable biryani",
    "categoryId": 1,
    "price": 18000,
    "tax": 5,
    "unit": "pcs",
    "preparationTime": 15
  }'
```

---

### 5. Update Product

Update product details. **Protected: Staff+**

#### Request
```http
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Premium Chicken Biryani",
  "price": 30000,
  "available": true
}
```

#### Response (200 OK)
```json
{
  "ok": true,
  "message": "Product updated successfully",
  "product": {
    "id": 10,
    "name": "Premium Chicken Biryani",
    "description": "Fragrant rice with chicken",
    "categoryId": 1,
    "price": 30000,
    "tax": 5,
    "unit": "pcs",
    "preparationTime": 20,
    "available": true,
    "category": {
      "id": 1,
      "name": "Biryani"
    },
    "updatedAt": "2026-04-15T11:30:00Z"
  }
}
```

#### Test (cURL)
```bash
curl -X PUT http://localhost:3001/api/products/10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 28000,
    "preparationTime": 22
  }'
```

---

### 6. Delete Product

Delete a product. **Protected: Admin only** (restaurant role)

#### Request
```http
DELETE /api/products/:id
Authorization: Bearer <token>
```

#### Response (200 OK)
```json
{
  "ok": true,
  "message": "Product \"Chicken Biryani\" deleted successfully"
}
```

#### Error Responses
```json
// Product not found
{
  "error": "Product not found"
}

// Unauthorized (non-admin)
{
  "error": "Access denied. Admin role required."
}
```

#### Test (cURL)
```bash
curl -X DELETE http://localhost:3001/api/products/10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Toggle Product Availability

Toggle a product between available and unavailable. **Protected: Staff+**

This is useful for temporarily hiding products without deleting them.

#### Request
```http
PATCH /api/products/:id/toggle-availability
Authorization: Bearer <token>
```

#### Response (200 OK)
```json
{
  "ok": true,
  "message": "Product is now available",
  "product": {
    "id": 10,
    "name": "Chicken Biryani",
    "available": true,
    ...
  }
}
```

#### Test (cURL)
```bash
# Make product unavailable
curl -X PATCH http://localhost:3001/api/products/10/toggle-availability \
  -H "Authorization: Bearer YOUR_TOKEN"

# Call again to make available
curl -X PATCH http://localhost:3001/api/products/10/toggle-availability \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Complete Example: Setup Menu

```bash
# 1. Create categories
curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Biryani", "icon": "🍚"}'

curl -X POST http://localhost:3001/api/categories \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Beverages", "icon": "🥤"}'

# 2. Create products in Biryani category (categoryId: 1)
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chicken Biryani",
    "categoryId": 1,
    "price": 25000,
    "tax": 5,
    "preparationTime": 20
  }'

curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mutton Biryani",
    "categoryId": 1,
    "price": 35000,
    "tax": 5,
    "preparationTime": 25
  }'

# 3. Create products in Beverages category (categoryId: 2)
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mango Lassi",
    "categoryId": 2,
    "price": 10000,
    "tax": 5
  }'

# 4. View all products
curl http://localhost:3001/api/products

# 5. View Biryani category
curl http://localhost:3001/api/categories/1
```

---

## Price Format

All prices are in **paise** (Indian currency subunit):
- 100 paise = 1 rupee
- 250 rupees = 25000 paise
- 50 rupees = 5000 paise

### Price Examples
```
Chicken Biryani: 250 rupees → 25000 paise
Tea: 5 rupees → 500 paise
Samosa: 10 rupees → 1000 paise
```

---

## Authentication Header

For protected endpoints, include JWT token in Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get token:**
1. Call `/api/auth/signup` or `/api/auth/login`
2. Extract `token` from response
3. Add to all protected requests

---

## Role-Based Access

| Role | Create Product | Update Product | Delete Product | Create Category |
|------|---|---|---|---|
| **Customer** | ❌ | ❌ | ❌ | ❌ |
| **Cashier** | ✅ | ✅ | ❌ | ❌ |
| **Kitchen** | ✅ | ✅ | ❌ | ❌ |
| **Manager** | ✅ | ✅ | ❌ | ❌ |
| **Restaurant** (Admin) | ✅ | ✅ | ✅ | ✅ |

---

## Pagination Best Practices

For large product lists:

```bash
# First page: 20 products
curl "http://localhost:3001/api/products?limit=20&offset=0"

# Check hasMore flag in response to know if more products exist

# Next page: 20 more products
curl "http://localhost:3001/api/products?limit=20&offset=20"

# Keep incrementing offset by limit
```

---

## Development Notes

- All timestamps in ISO 8601 format (UTC)
- Prices always in paise (integers, no decimals)
- Tax stored as percentage (e.g., 5 = 5%)
- Preparation time in minutes
- Use category IDs for filtering, not names
- Products inherit category availability (can override per-product)

---

## Next Steps

Ready for next phase?

- ✅ Auth endpoints
- ✅ Product & Category endpoints
- ⏭️ Order management endpoints
- ⏭️ Kitchen display system (KDS)
- ⏭️ Payment integration
- ⏭️ Socket.io real-time sync

What's next? 🚀
