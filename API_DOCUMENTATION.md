# TechCommerce Platform - API Documentation

## Overview

TechCommerce is an enterprise-grade Ecommerce + CRM + ERP platform designed for IT companies that sell products, perform repairs, provide technical services, and manage customer warranties.

## Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "id": "clx123...",
  "email": "user@example.com",
  "username": "johndoe",
  "name": "John Doe",
  "role": "admin"
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "your-password",
  "name": "John Doe"
}
```

### Logout
```http
DELETE /api/auth/login
```

### Get Current User
```http
GET /api/auth/me
```

---

## Products

### List Products
```http
GET /api/products
```

**Query Parameters:**
- `category` - Filter by category slug
- `brand` - Filter by brand slug
- `search` - Search by name, SKU, or description
- `featured` - Filter featured products (true/false)

**Response:**
```json
[
  {
    "id": "clx123...",
    "sku": "PRD-001",
    "name": "Product Name",
    "slug": "product-name",
    "price": 99.99,
    "stock": 100,
    "isActive": true,
    "category": { "id": "...", "name": "Category" },
    "brand": { "id": "...", "name": "Brand" }
  }
]
```

### Create Product
```http
POST /api/products
Content-Type: application/json

{
  "name": "Product Name",
  "sku": "PRD-001",
  "price": 99.99,
  "stock": 100,
  "description": "Product description",
  "categoryId": "clx...",
  "brandId": "clx..."
}
```

---

## Orders

### List Orders
```http
GET /api/orders
```

**Query Parameters:**
- `status` - Filter by status (pending, processing, paid, shipped, delivered, cancelled)
- `userId` - Filter by customer ID

**Response:**
```json
[
  {
    "id": "clx123...",
    "orderNumber": "ORD-ABC123",
    "status": "pending",
    "paymentStatus": "pending",
    "total": 199.99,
    "items": [
      {
        "productName": "Product",
        "quantity": 2,
        "price": 99.99,
        "total": 199.99
      }
    ]
  }
]
```

### Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "userId": "clx...",
  "subtotal": 199.99,
  "tax": 46.00,
  "shipping": 10.00,
  "total": 255.99,
  "shippingName": "John Doe",
  "shippingAddress": "123 Main St",
  "shippingCity": "Lisbon",
  "shippingPostal": "1000-001",
  "shippingCountry": "PT",
  "items": [
    {
      "productId": "clx...",
      "productName": "Product",
      "quantity": 2,
      "price": 99.99,
      "total": 199.99
    }
  ]
}
```

---

## Repairs

### List Repairs
```http
GET /api/repairs
```

**Query Parameters:**
- `status` - Filter by status
- `search` - Search by repair number, customer name, phone, or device

**Response:**
```json
[
  {
    "id": "clx123...",
    "repairNumber": "REP-ABC123",
    "barcode": "123456789012",
    "customerName": "John Doe",
    "customerPhone": "+351912345678",
    "deviceBrand": "Apple",
    "deviceModel": "iPhone 14",
    "faultDescription": "Screen not working",
    "status": "pending",
    "priority": "normal"
  }
]
```

### Create Repair
```http
POST /api/repairs
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerPhone": "+351912345678",
  "customerEmail": "john@example.com",
  "deviceBrand": "Apple",
  "deviceModel": "iPhone 14",
  "deviceSerial": "123456789",
  "deviceImei": "123456789012345",
  "faultDescription": "Screen not working",
  "priority": "normal"
}
```

---

## Tickets

### List Tickets
```http
GET /api/tickets
```

**Query Parameters:**
- `status` - Filter by status
- `department` - Filter by department (technical, sales, billing, repairs)

### Create Ticket
```http
POST /api/tickets
Content-Type: application/json

{
  "subject": "Issue with order",
  "department": "technical",
  "message": "Detailed description of the issue",
  "priority": "normal"
}
```

---

## Customers

### List Customers
```http
GET /api/customers
```

**Response:**
```json
[
  {
    "id": "clx123...",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "customer",
    "orders": [...],
    "_count": {
      "orders": 5,
      "repairs": 2,
      "tickets": 1
    }
  }
]
```

---

## Invoices

### List Invoices
```http
GET /api/invoices
```

**Query Parameters:**
- `type` - Filter by type (invoice, proforma, credit_note)
- `status` - Filter by status (draft, sent, paid, overdue, cancelled)

### Create Invoice
```http
POST /api/invoices
Content-Type: application/json

{
  "type": "invoice",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerVat": "PT123456789",
  "customerAddress": "123 Main St",
  "customerCity": "Lisbon",
  "customerPostal": "1000-001",
  "customerCountry": "PT",
  "subtotal": 100.00,
  "tax": 23.00,
  "total": 123.00,
  "items": [
    {
      "description": "Service",
      "quantity": 1,
      "unitPrice": 100.00,
      "taxRate": 23,
      "total": 123.00
    }
  ]
}
```

---

## Dashboard

### Get Dashboard Statistics
```http
GET /api/dashboard
```

**Response:**
```json
{
  "counts": {
    "products": 150,
    "orders": 500,
    "repairs": 75,
    "tickets": 25,
    "customers": 200,
    "pendingOrders": 10,
    "openRepairs": 15,
    "openTickets": 5
  },
  "recentOrders": [...],
  "recentRepairs": [...],
  "revenue": 50000.00,
  "monthlyRevenue": {
    "2024-01": 8500,
    "2024-02": 9200,
    "2024-03": 10100
  }
}
```

---

## Installation

### Check Installation Status
```http
GET /api/installation
```

### Update Installation Progress
```http
POST /api/installation
Content-Type: application/json

{
  "companyName": "Company Ltd",
  "companyVat": "PT123456789",
  "companyEmail": "info@company.com",
  "step": 1
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API requests are rate-limited:
- General API: 100 requests per minute
- Authentication: 10 requests per minute

---

## Webhooks (Future Implementation)

The platform supports webhooks for:
- Order status changes
- Repair status changes
- Ticket creation/updates
- Payment events

---

## SDK Integration

### Stripe
Configure in Settings → Payments
Requires: Public Key, Secret Key, Webhook Secret

### PayPal
Configure in Settings → Payments
Requires: Client ID, Secret, Mode (sandbox/live)

### Portuguese Payment Methods
- MB Way
- Multibanco
- Ifthenpay
