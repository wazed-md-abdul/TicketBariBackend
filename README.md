<p align="center">
  <img src="./banner.png" alt="TicketBari Banner" width="100%" />
</p>

<h1 align="center">⚙️ TicketBari — Server</h1>

<p align="center">
  <b>Backend REST API for TicketBari</b><br/>
  Express + MongoDB + Stripe + JWT authentication
</p>

<p align="center">
  <a href="https://ticketbari-client-pi.vercel.app">🌐 Live Frontend</a>
</p>

---

## 📸 Purpose

TicketBari Server is the backend REST API powering the TicketBari ticket booking platform. It handles user management, ticket CRUD, booking workflows, Stripe payment processing, advertisement management, and role-based access control — all deployed as Vercel serverless functions.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **RESTful API** | Clean endpoint design for tickets, bookings, users, ads, and transactions |
| **JWT Auth Middleware** | Verifies Better Auth JWKs tokens on protected routes |
| **Role-Based Access** | Admin, Vendor, and User permission gates |
| **Stripe Checkout** | Server-side session creation for secure payments |
| **Stripe Webhooks** | Automatic booking confirmation on successful payment |
| **Fraud Detection** | Admin can flag/unflag users as fraudulent |
| **CORS Configured** | Dynamic origin from env for cross-domain requests |
| **Vercel Serverless** | Deployed as serverless functions with `vercel.json` routing |
| **Seed Script** | Pre-populate database with demo tickets and data |

---

## 🛠 NPM Packages Used

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.19.2 | Web server framework |
| `mongodb` | ^6.8.0 | MongoDB native driver |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| `dotenv` | ^16.4.5 | Environment variable loader |
| `stripe` | ^16.2.0 | Stripe payment API integration |
| `jose` | ^6.2.3 | JWT/JWK verification for Better Auth tokens |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `nodemon` | ^3.1.14 | Auto-restart dev server on file changes |

---

## 📡 API Endpoints

### Tickets
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets` | Get all tickets (supports `?search`, `?type`, `?page`) |
| `GET` | `/api/tickets/:id` | Get single ticket by ID |
| `POST` | `/api/tickets` | Create ticket (vendor) |
| `PUT` | `/api/tickets/:id` | Update ticket (vendor) |
| `DELETE` | `/api/tickets/:id` | Delete ticket (vendor/admin) |
| `PATCH` | `/api/tickets/:id/status` | Approve/reject ticket (admin) |

### Bookings
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bookings` | Get bookings (filtered by role) |
| `POST` | `/api/bookings` | Create booking (user) |
| `PATCH` | `/api/bookings/:id/status` | Accept/reject booking (vendor) |

### Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | Get all users (admin) |
| `PATCH` | `/api/users/:id/role` | Change user role (admin) |
| `PATCH` | `/api/users/:id/fraud` | Flag/unflag fraud (admin) |

### Ads
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ads` | Get active advertisements |
| `POST` | `/api/ads` | Create ad (admin) |
| `DELETE` | `/api/ads/:id` | Delete ad (admin) |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/create-checkout-session` | Create Stripe checkout session |
| `POST` | `/api/webhook` | Stripe webhook handler |

---

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-username/ticketbari-server.git
cd ticketbari-server
npm install
```

### 2. Configure environment

Create `.env` in root:

```env
MONGO_DB_URI=your_mongodb_connection_uri
PORT=5000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret
```

### 3. Run dev server

```bash
npm run dev
```

### 4. Seed demo data (optional)

```bash
node seed-demo-data.js
```

---

## ☁️ Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Add all `.env` variables to Vercel Environment Variables
4. Set `BASE_URL` and `FRONTEND_URL` to your production frontend URL
5. Deploy 🚀

> The `vercel.json` is already configured to route all requests through the Express serverless function.

---

<p align="center">
  Built with ❤️ using Express, MongoDB, Stripe & Jose
</p>
