import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { hashPassword } from "../ticketbari-client/node_modules/@better-auth/utils/dist/password.node.mjs";

dotenv.config();

const MONGO_URI = process.env.MONGO_DB_URI;
if (!MONGO_URI) {
  console.error("Missing MONGO_DB_URI environment variable.");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI);

async function run() {
  try {
    await client.connect();
    const db = client.db("ticketbari");
    console.log("Connected to MongoDB database.");

    // 1. Seed Users
    const usersToSeed = [
      {
        email: "admin@ticketbari.com",
        name: "Demo Admin",
        role: "admin",
      },
      {
        email: "skyline@ticketbari.com",
        name: "Skyline Travels",
        role: "vendor",
      },
      {
        email: "greenline@ticketbari.com",
        name: "Green Line Express",
        role: "vendor",
      },
      {
        email: "railway@ticketbari.com",
        name: "Railways Direct",
        role: "vendor",
      },
      {
        email: "john@ticketbari.com",
        name: "John Traveller",
        role: "user",
      },
      {
        email: "sarah@ticketbari.com",
        name: "Sarah Passenger",
        role: "user",
      },
    ];

    const passwordHash = await hashPassword("Password123!");
    const vendorMap = {}; // email -> id string

    console.log("Seeding users...");
    for (const u of usersToSeed) {
      let userDoc = await db.collection("user").findOne({ email: u.email });
      let userIdStr = "";

      if (!userDoc) {
        const newUserId = new ObjectId();
        userIdStr = newUserId.toString();

        userDoc = {
          _id: newUserId,
          name: u.name,
          email: u.email,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          role: u.role,
          isFraud: false,
        };

        await db.collection("user").insertOne(userDoc);
        console.log(`Created user: ${u.email} (${u.role})`);

        // Create credential record in account collection
        const accountDoc = {
          _id: new ObjectId(),
          accountId: userIdStr,
          providerId: "credential",
          userId: userIdStr,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.collection("account").insertOne(accountDoc);
      } else {
        userIdStr = userDoc._id.toString();
        console.log(`User already exists: ${u.email} (${u.role})`);
      }

      if (u.role === "vendor") {
        vendorMap[u.email] = userIdStr;
      }
    }

    // 2. Seed Tickets
    console.log("Generating 55 tickets...");
    const destinations = [
      "Dhaka", "Chittagong", "Cox's Bazar", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Rangpur"
    ];

    const flightImages = [
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&q=80&w=400"
    ];
    const busImages = [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=400"
    ];
    const trainImages = [
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1532103054090-334e6e60ab29?auto=format&fit=crop&q=80&w=400"
    ];

    const ticketsList = [];

    // Helper to generate a date relative to now
    function getRelativeDate(hoursFromNow) {
      const d = new Date();
      d.setHours(d.getHours() + hoursFromNow);
      return d.toISOString();
    }

    // Helper to make random route
    function getRandomRoute() {
      const fromIdx = Math.floor(Math.random() * destinations.length);
      let toIdx = Math.floor(Math.random() * destinations.length);
      while (toIdx === fromIdx) {
        toIdx = Math.floor(Math.random() * destinations.length);
      }
      return { from: destinations[fromIdx], to: destinations[toIdx] };
    }

    // Helper to generate details
    function makeTicket(vendorEmail, transportType, status, isPast, index) {
      const { from, to } = getRandomRoute();
      const hoursOffset = isPast
        ? -Math.floor(Math.random() * 72 + 2) // 2 to 74 hours ago
        : Math.floor(Math.random() * 240 + 5); // 5 to 245 hours from now

      const vendorId = vendorMap[vendorEmail];
      const departureDateTime = getRelativeDate(hoursOffset);

      let price = 15;
      let title = "";
      let image = "";

      if (transportType === "air") {
        price = Math.floor(Math.random() * 300 + 100); // 100 to 400
        title = `Skyline Airways - Flight ${100 + index} (${from} to ${to})`;
        image = flightImages[index % flightImages.length];
      } else if (transportType === "bus") {
        price = Math.floor(Math.random() * 25 + 10); // 10 to 35
        title = `Green Line Luxury Coach ${index} (${from} to ${to})`;
        image = busImages[index % busImages.length];
      } else {
        price = Math.floor(Math.random() * 15 + 5); // 5 to 20
        title = `Railways Intercity Express ${index} (${from} to ${to})`;
        image = trainImages[index % trainImages.length];
      }

      return {
        title,
        from,
        to,
        transportType,
        departureDateTime,
        price,
        ticketQuantity: Math.floor(Math.random() * 40 + 5), // 5 to 45 seats
        image,
        vendorId,
        status,
        isAdvertised: false,
        createdAt: new Date(),
      };
    }

    // Skyline: 20 air tickets
    // 12 approved future, 4 approved past, 2 pending, 2 rejected
    for (let i = 1; i <= 12; i++) ticketsList.push(makeTicket("skyline@ticketbari.com", "air", "approved", false, i));
    for (let i = 13; i <= 16; i++) ticketsList.push(makeTicket("skyline@ticketbari.com", "air", "approved", true, i));
    for (let i = 17; i <= 18; i++) ticketsList.push(makeTicket("skyline@ticketbari.com", "air", "pending", false, i));
    for (let i = 19; i <= 20; i++) ticketsList.push(makeTicket("skyline@ticketbari.com", "air", "rejected", false, i));

    // Green Line: 20 bus tickets
    // 12 approved future, 4 approved past, 2 pending, 2 rejected
    for (let i = 1; i <= 12; i++) ticketsList.push(makeTicket("greenline@ticketbari.com", "bus", "approved", false, i));
    for (let i = 13; i <= 16; i++) ticketsList.push(makeTicket("greenline@ticketbari.com", "bus", "approved", true, i));
    for (let i = 17; i <= 18; i++) ticketsList.push(makeTicket("greenline@ticketbari.com", "bus", "pending", false, i));
    for (let i = 19; i <= 20; i++) ticketsList.push(makeTicket("greenline@ticketbari.com", "bus", "rejected", false, i));

    // Railways: 15 train tickets
    // 10 approved future, 3 approved past, 1 pending, 1 rejected
    for (let i = 1; i <= 10; i++) ticketsList.push(makeTicket("railway@ticketbari.com", "train", "approved", false, i));
    for (let i = 13; i <= 15; i++) ticketsList.push(makeTicket("railway@ticketbari.com", "train", "approved", true, i));
    ticketsList.push(makeTicket("railway@ticketbari.com", "train", "pending", false, 16));
    ticketsList.push(makeTicket("railway@ticketbari.com", "train", "rejected", false, 17));

    // Clean up old demo tickets (created by our seeded vendors)
    console.log("Cleaning up old tickets for our seeded vendors...");
    const vendorIds = Object.values(vendorMap);
    await db.collection("tickets").deleteMany({ vendorId: { $in: vendorIds } });

    // Insert new tickets
    console.log(`Inserting ${ticketsList.length} tickets...`);
    const insertResult = await db.collection("tickets").insertMany(ticketsList);
    console.log(`Successfully seeded ${insertResult.insertedCount} tickets.`);

  } catch (err) {
    console.error("Error seeding data:", err);
  } finally {
    await client.close();
    console.log("Database connection closed.");
  }
}

run();
