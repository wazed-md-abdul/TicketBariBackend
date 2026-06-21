import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { jwtVerify, createRemoteJWKSet } from "jose";

dotenv.config();

const JWKS = createRemoteJWKSet(new URL(`${process.env.BASE_URL || "http://localhost:3000"}/api/auth/jwks`));

const app = express();
const PORT = process.env.PORT || 5000;

// Setup MongoDB connection cache
const MONGO_URI = process.env.MONGO_DB_URI;
if (!MONGO_URI) {
  console.error("Missing MONGO_DB_URI environment variable.");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI);
const db = client.db("ticketbari");

// Establish connection
client.connect()
  .then(() => console.log("Connected to MongoDB database: ticketbari"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Configure standard middlewares
app.use(cors({
  origin: process.env.BASE_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Root greeting endpoint
app.get("/", (req, res) => {
  res.send("Welcome to TicketBari API Server!");
});

const requireAuth = async (req, res, next) => {
  try {
    let token = "";

    // Extract Bearer token from Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing Bearer Token" });
    }

    const { payload } = await jwtVerify(token, JWKS);
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized: Invalid Token Payload" });
    }

    // Set req.user from JWT payload claims
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      isFraud: payload.isFraud,
    };

    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(403).json({ error: "Forbidden: Invalid Token" });
  }
};

const requireRole = (role) => async (req, res, next) => {
  await requireAuth(req, res, async () => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    next();
  });
};

const requireVendor = requireRole("vendor");
const requireAdmin = requireRole("admin");

// -------------------------------------------------------------------
// TICKETS ENDPOINTS
// -------------------------------------------------------------------

// Create a new Ticket
app.post("/api/tickets", requireVendor, async (req, res) => {
  try {
    const { title, from, to, transportType, departureDateTime, price, ticketQuantity, image, perks } = req.body;

    // Check if the vendor is marked as fraud
    const userDoc = await db.collection("user").findOne({ _id: new ObjectId(req.user.id) });
    if (userDoc?.isFraud) {
      return res.status(403).json({ error: "Blocked! Fraud vendor cannot add tickets." });
    }

    // Departure time expiration check
    if (new Date(departureDateTime) < new Date()) {
      return res.status(400).json({ error: "Departure date/time must be in the future." });
    }

    const newTicket = {
      title,
      from,
      to,
      transportType,
      departureDateTime: new Date(departureDateTime).toISOString(),
      price: Number(price),
      ticketQuantity: Number(ticketQuantity),
      image,
      perks: Array.isArray(perks) ? perks : [],
      vendorId: req.user.id,
      status: "pending", // Default to pending approval
      isAdvertised: false,
      createdAt: new Date(),
    };

    const result = await db.collection("tickets").insertOne(newTicket);
    res.status(201).json({ success: true, ticketId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all approved Tickets (Filters + Search + Pagination + Exclude Fraud/Expired)
app.get("/api/tickets", async (req, res) => {
  try {
    const { search, from, to, transportType, sort, page = 1, limit = 6 } = req.query;

    // Get all fraud vendor IDs to exclude them
    const fraudUsers = await db.collection("user").find({ isFraud: true }).toArray();
    const fraudVendorIds = fraudUsers.map(u => u.id);

    const query = {
      status: "approved",
      ticketQuantity: { $gt: 0 },
      departureDateTime: { $gt: new Date().toISOString() },
      vendorId: { $nin: fraudVendorIds },
    };

    if (from) {
      query.from = { $regex: new RegExp(from, "i") };
    }
    if (to) {
      query.to = { $regex: new RegExp(to, "i") };
    }
    if (transportType) {
      query.transportType = transportType;
    }
    if (search) {
      query.$or = [
        { from: { $regex: new RegExp(search, "i") } },
        { to: { $regex: new RegExp(search, "i") } },
        { title: { $regex: new RegExp(search, "i") } },
      ];
    }

    // Sorting options (price)
    let sortOptions = {};
    if (sort === "asc") {
      sortOptions = { price: 1 };
    } else if (sort === "desc") {
      sortOptions = { price: -1 };
    } else {
      sortOptions = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const ticketsList = await db.collection("tickets")
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    const totalTickets = await db.collection("tickets").countDocuments(query);

    res.json({
      tickets: ticketsList,
      total: totalTickets,
      pages: Math.ceil(totalTickets / Number(limit)),
      currentPage: Number(page),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get active premium/advertised tickets (Limit to 6)
app.get("/api/advertisements", async (req, res) => {
  try {
    // Exclude fraud vendors and expired tickets
    const fraudUsers = await db.collection("user").find({ isFraud: true }).toArray();
    const fraudVendorIds = fraudUsers.map(u => u.id);

    const query = {
      status: "approved",
      isAdvertised: true,
      ticketQuantity: { $gt: 0 },
      departureDateTime: { $gt: new Date().toISOString() },
      vendorId: { $nin: fraudVendorIds },
    };

    const ads = await db.collection("tickets").find(query).limit(6).toArray();
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Ticket details
app.get("/api/tickets/:id", async (req, res) => {
  try {
    const ticket = await db.collection("tickets").findOne({ _id: new ObjectId(req.params.id) });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Check if the vendor is fraud
    const vendor = await db.collection("user").findOne({ _id: new ObjectId(ticket.vendorId) });
    const isExpired = new Date(ticket.departureDateTime) < new Date();

    res.json({
      ...ticket,
      vendorName: vendor?.name || "Unknown Vendor",
      isVendorFraud: !!vendor?.isFraud,
      isExpired,
    });
  } catch (err) {
    res.status(500).json({ error: "Invalid ticket ID or server error" });
  }
});

// Update/Approve Ticket status & Advertising toggles (Admin/Vendor checks)
app.put("/api/tickets/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isAdvertised, title, from, to, transportType, departureDateTime, price, ticketQuantity, image, perks } = req.body;

    const ticket = await db.collection("tickets").findOne({ _id: new ObjectId(id) });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const updates = {};

    // Admin updates (status or advertisement slot toggle)
    if (req.user.role === "admin") {
      if (status) {
        updates.status = status; // "approved" or "rejected"
      }
      if (isAdvertised !== undefined) {
        if (isAdvertised === true) {
          // Verify hard ad limits of max 6 active advertised ads
          const activeAdsCount = await db.collection("tickets").countDocuments({
            isAdvertised: true,
            status: "approved",
            departureDateTime: { $gt: new Date().toISOString() },
          });

          if (activeAdsCount >= 6 && !ticket.isAdvertised) {
            return res.status(400).json({ error: "Ad Limit Exceeded! Max 6 ads allowed." });
          }
        }
        updates.isAdvertised = isAdvertised;
      }
    }

    // Vendor updates
    if (req.user.role === "vendor") {
      if (ticket.vendorId !== req.user.id) {
        return res.status(403).json({ error: "Permission denied." });
      }

      // Check fraud status
      const vendorUser = await db.collection("user").findOne({ _id: new ObjectId(req.user.id) });
      if (vendorUser?.isFraud) {
        return res.status(403).json({ error: "Fraud vendors cannot update tickets." });
      }

      if (title) updates.title = title;
      if (from) updates.from = from;
      if (to) updates.to = to;
      if (transportType) updates.transportType = transportType;
      if (departureDateTime) {
        if (new Date(departureDateTime) < new Date()) {
          return res.status(400).json({ error: "Departure date/time must be in future." });
        }
        updates.departureDateTime = new Date(departureDateTime).toISOString();
      }
      if (price !== undefined) updates.price = Number(price);
      if (ticketQuantity !== undefined) updates.ticketQuantity = Number(ticketQuantity);
      if (image) updates.image = image;
      if (perks !== undefined) updates.perks = Array.isArray(perks) ? perks : [];

      // Reset to pending if updated by vendor
      updates.status = "pending";
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    await db.collection("tickets").updateOne({ _id: new ObjectId(id) }, { $set: updates });
    res.json({ success: true, message: "Ticket updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Ticket
app.delete("/api/tickets/:id", requireAuth, async (req, res) => {
  try {
    const ticket = await db.collection("tickets").findOne({ _id: new ObjectId(req.params.id) });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Only creator vendor or Admin can delete
    if (req.user.role !== "admin" && ticket.vendorId !== req.user.id) {
      return res.status(403).json({ error: "Permission denied." });
    }

    await db.collection("tickets").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Ticket deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------------
// BOOKINGS ENDPOINTS
// -------------------------------------------------------------------

// Request booking for a Ticket
app.post("/api/bookings", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "admin" || req.user.role === "vendor") {
      return res.status(403).json({ error: "Booking is only allowed for passenger accounts." });
    }

    const { ticketId, bookedQuantity } = req.body;
    const qty = Number(bookedQuantity);

    const ticket = await db.collection("tickets").findOne({ _id: new ObjectId(ticketId) });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Fraud block check
    const vendor = await db.collection("user").findOne({ _id: new ObjectId(ticket.vendorId) });
    if (vendor?.isFraud) {
      return res.status(403).json({ error: "This ticket belongs to a fraud vendor and cannot be booked." });
    }

    // Expiration check
    if (new Date(ticket.departureDateTime) < new Date()) {
      return res.status(400).json({ error: "This transport departure time has passed." });
    }

    // Available quantity check
    if (ticket.ticketQuantity < qty) {
      return res.status(400).json({ error: "Not enough tickets available." });
    }

    const newBooking = {
      ticketId: ticket._id.toString(),
      ticketTitle: ticket.title,
      departureDateTime: ticket.departureDateTime,
      transportType: ticket.transportType,
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      vendorId: ticket.vendorId,
      bookedQuantity: qty,
      totalPrice: ticket.price * qty,
      status: "pending", // Default status
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(newBooking);
    res.status(201).json({ success: true, bookingId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user bookings or vendor requested bookings
app.get("/api/bookings", requireAuth, async (req, res) => {
  try {
    let bookingsList = [];
    if (req.user.role === "vendor") {
      bookingsList = await db.collection("bookings")
        .find({ vendorId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray();
    } else {
      bookingsList = await db.collection("bookings")
        .find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .toArray();
    }
    res.json(bookingsList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendor accepts/rejects a booking request
app.put("/api/bookings/:id/status", requireVendor, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "accepted" or "rejected"

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid booking status" });
    }

    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.vendorId !== req.user.id) {
      return res.status(403).json({ error: "Permission denied." });
    }

    await db.collection("bookings").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );

    if (status === "accepted") {
      await db.collection("tickets").updateOne(
        { _id: new ObjectId(booking.ticketId) },
        { $inc: { ticketQuantity: -Number(booking.bookedQuantity) } }
      );
    }

    res.json({ success: true, message: `Booking status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm booking payment (Fallback for local testing when Stripe webhooks aren't accessible)
app.put("/api/bookings/:id/pay", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.userId !== req.user.id) {
      return res.status(403).json({ error: "Permission denied." });
    }

    await db.collection("bookings").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "paid" } }
    );

    // Insert transaction details into transactions collection if not exists
    const txExists = await db.collection("transactions").findOne({ bookingId: id });
    if (!txExists) {
      await db.collection("transactions").insertOne({
        bookingId: id,
        paymentIntentId: "pi_local_" + Date.now(),
        amount: booking.totalPrice,
        email: req.user.email,
        createdAt: new Date(),
      });
    }

    res.json({ success: true, message: "Payment status updated to paid" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -------------------------------------------------------------------
// ADMIN ENDPOINTS FOR USERS & TICKETS
// -------------------------------------------------------------------

// List all users
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const usersList = await db.collection("user").find().toArray();
    const users = usersList.map(u => ({ ...u, id: u._id }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update role / fraud flags of user
app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isFraud } = req.body;
    console.log("PUT /api/admin/users/:id:", { id, role, isFraud });

    const updates = {};
    if (role) updates.role = role;
    if (isFraud !== undefined) updates.isFraud = isFraud;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    await db.collection("user").updateOne({ _id: new ObjectId(id) }, { $set: updates });
    res.json({ success: true, message: "User status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin list all tickets (pending, approved, rejected)
app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
  try {
    const ticketsList = await db.collection("tickets").find().sort({ createdAt: -1 }).toArray();
    res.json(ticketsList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------------
// VENDOR STATS (REVENUE / CHARTING)
// -------------------------------------------------------------------
app.get("/api/vendor/stats", requireVendor, async (req, res) => {
  try {
    const bookings = await db.collection("bookings")
      .find({ vendorId: req.user.id, status: "paid" })
      .toArray();

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    const transportBreakdown = {
      bus: { revenue: 0, bookings: 0, ticketsSold: 0 },
      train: { revenue: 0, bookings: 0, ticketsSold: 0 },
      air: { revenue: 0, bookings: 0, ticketsSold: 0 }
    };

    bookings.forEach((b) => {
      totalRevenue += b.totalPrice || 0;
      totalTicketsSold += b.bookedQuantity || 0;
      const type = (b.transportType || "bus").toLowerCase();
      if (transportBreakdown[type] !== undefined) {
        transportBreakdown[type].revenue += b.totalPrice || 0;
        transportBreakdown[type].bookings += 1;
        transportBreakdown[type].ticketsSold += b.bookedQuantity || 0;
      }
    });

    const chartData = [
      { 
        name: "Bus", 
        revenue: transportBreakdown.bus.revenue, 
        bookings: transportBreakdown.bus.bookings, 
        ticketsSold: transportBreakdown.bus.ticketsSold 
      },
      { 
        name: "Train", 
        revenue: transportBreakdown.train.revenue, 
        bookings: transportBreakdown.train.bookings, 
        ticketsSold: transportBreakdown.train.ticketsSold 
      },
      { 
        name: "Air", 
        revenue: transportBreakdown.air.revenue, 
        bookings: transportBreakdown.air.bookings, 
        ticketsSold: transportBreakdown.air.ticketsSold 
      },
    ];

    res.json({
      revenue: totalRevenue,
      totalBookings: bookings.length,
      totalTicketsSold,
      chartData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all tickets created by a specific vendor
app.get("/api/vendor/tickets", requireVendor, async (req, res) => {
  try {
    const list = await db.collection("tickets")
      .find({ vendorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user transaction history
app.get("/api/transactions", requireAuth, async (req, res) => {
  try {
    const list = await db.collection("transactions")
      .find({ email: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Start listening (skip in Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
