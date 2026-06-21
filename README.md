# TicketBari Backend Server

This is the backend REST API for **TicketBari** - the premium online ticket booking platform built with Express, Node.js, and MongoDB.

## Features

- **Role-Based Authentication**: Custom JWT verification middleware integrated with Better Auth.
- **RESTful Endpoints**: Dedicated routes for users, tickets, bookings, advertisements, and transaction logs.
- **Security & Integrity**: Middlewares to prevent fraud, validate inputs, and handle CORS configuration.
- **Stripe Integration**: Automated checkout session generation and Webhook handler for ticket bookings.

## Environment Variables

Create a `.env` file in the root folder with the following variables:

```env
MONGO_DB_URI=your_mongodb_connection_uri
PORT=5000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the server in development mode:
   ```bash
   npm run dev
   ```

3. Seed database with mock tickets and itineraries:
   ```bash
   node seed-demo-data.js
   ```

## Deploying to Vercel

The backend is fully configured for deployment on Vercel as serverless functions. Make sure to define the relevant environment variables in your Vercel project dashboard.
