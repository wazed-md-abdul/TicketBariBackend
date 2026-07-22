import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const MONGO_URI = process.env.MONGO_DB_URI;
if (!MONGO_URI) {
  console.error("Missing MONGO_DB_URI environment variable in .env");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI);

async function seedDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB database for seeding...");
    const db = client.db("ticketbari");

    const usersCollection = db.collection("user");
    const ticketsCollection = db.collection("tickets");

    // 1. Create Demo Vendors if not present
    const demoVendors = [
      {
        name: "Green Line Paribahan",
        email: "greenline@ticketbari.com",
        role: "vendor",
        isFraud: false,
        emailVerified: true,
        createdAt: new Date(),
      },
      {
        name: "Shohagh Travels",
        email: "shohagh@ticketbari.com",
        role: "vendor",
        isFraud: false,
        emailVerified: true,
        createdAt: new Date(),
      },
      {
        name: "Bangladesh Railway Services",
        email: "railway@ticketbari.com",
        role: "vendor",
        isFraud: false,
        emailVerified: true,
        createdAt: new Date(),
      },
      {
        name: "Biman Bangladesh Airlines",
        email: "biman@ticketbari.com",
        role: "vendor",
        isFraud: false,
        emailVerified: true,
        createdAt: new Date(),
      },
    ];

    const vendorMap = {};

    for (const vendorData of demoVendors) {
      let existingVendor = await usersCollection.findOne({ email: vendorData.email });
      if (!existingVendor) {
        const result = await usersCollection.insertOne(vendorData);
        existingVendor = { ...vendorData, _id: result.insertedId };
        console.log(`Created vendor: ${vendorData.name}`);
      } else {
        console.log(`Using existing vendor: ${vendorData.name}`);
      }
      vendorMap[vendorData.name] = existingVendor._id.toString();
    }

    // Default fallbacks
    const greenLineId = vendorMap["Green Line Paribahan"];
    const shohaghId = vendorMap["Shohagh Travels"];
    const railwayId = vendorMap["Bangladesh Railway Services"];
    const bimanId = vendorMap["Biman Bangladesh Airlines"];

    // 2. Prepare Demo Tickets
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    const ticketsData = [
      // BUSES
      {
        title: "Green Line Scania Multi-Axle AC Sleeper",
        from: "Dhaka",
        to: "Cox's Bazar",
        transportType: "bus",
        departureDateTime: new Date(now + 2 * dayInMs).toISOString(),
        price: 2200,
        ticketQuantity: 32,
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC Sleeper", "Free WiFi", "Water & Snacks", "Reclining Seats", "Charging Port"],
        vendorId: greenLineId,
        status: "approved",
        isAdvertised: true,
        createdAt: new Date(),
      },
      {
        title: "Shohagh Hyundai Universe VIP Class",
        from: "Dhaka",
        to: "Chittagong",
        transportType: "bus",
        departureDateTime: new Date(now + 3 * dayInMs).toISOString(),
        price: 1600,
        ticketQuantity: 28,
        image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC Business", "Personal Screen", "Snack Box", "Blanket"],
        vendorId: shohaghId,
        status: "approved",
        isAdvertised: true,
        createdAt: new Date(),
      },
      {
        title: "Green Line Volvo B11R Luxury Express",
        from: "Chittagong",
        to: "Dhaka",
        transportType: "bus",
        departureDateTime: new Date(now + 5 * dayInMs).toISOString(),
        price: 1550,
        ticketQuantity: 30,
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop",
        perks: ["Air Conditioning", "WiFi", "Reading Light", "Water Bottle"],
        vendorId: greenLineId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },
      {
        title: "Shohagh Express Executive Sleeper",
        from: "Dhaka",
        to: "Sylhet",
        transportType: "bus",
        departureDateTime: new Date(now + 4 * dayInMs).toISOString(),
        price: 1400,
        ticketQuantity: 24,
        image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC", "Bed/Sleeper", "Tea/Coffee", "Free WiFi"],
        vendorId: shohaghId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },
      {
        title: "Green Line Royal Class Coach",
        from: "Dhaka",
        to: "Rajshahi",
        transportType: "bus",
        departureDateTime: new Date(now + 6 * dayInMs).toISOString(),
        price: 1300,
        ticketQuantity: 36,
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC", "Reclining Seats", "Charging Socket", "Emergency Kit"],
        vendorId: greenLineId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },
      {
        title: "Shohagh Direct Night Express",
        from: "Cox's Bazar",
        to: "Dhaka",
        transportType: "bus",
        departureDateTime: new Date(now + 7 * dayInMs).toISOString(),
        price: 2100,
        ticketQuantity: 34,
        image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC", "Full Reclining", "Snacks", "Water"],
        vendorId: shohaghId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },

      // TRAINS
      {
        title: "Suborno Express AC Deluxe Seat",
        from: "Dhaka",
        to: "Chittagong",
        transportType: "train",
        departureDateTime: new Date(now + 3 * dayInMs).toISOString(),
        price: 950,
        ticketQuantity: 45,
        image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC Snigdha", "Food Catering", "Panoramic Windows", "Spacious Seats"],
        vendorId: railwayId,
        status: "approved",
        isAdvertised: true,
        createdAt: new Date(),
      },
      {
        title: "Sonar Bangla Express AC Chair",
        from: "Chittagong",
        to: "Dhaka",
        transportType: "train",
        departureDateTime: new Date(now + 4 * dayInMs).toISOString(),
        price: 980,
        ticketQuantity: 50,
        image: "https://images.unsplash.com/photo-1532105956626-9569c03602f6?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC Chair", "Complimentary Breakfast", "Plug Point", "Clean Washroom"],
        vendorId: railwayId,
        status: "approved",
        isAdvertised: true,
        createdAt: new Date(),
      },
      {
        title: "Cox's Bazar Express Deluxe AC Cabin",
        from: "Dhaka",
        to: "Cox's Bazar",
        transportType: "train",
        departureDateTime: new Date(now + 2 * dayInMs).toISOString(),
        price: 1750,
        ticketQuantity: 20,
        image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC Cabin Sleeper", "Meals Included", "Security Guard", "Charging Ports"],
        vendorId: railwayId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },
      {
        title: "Parabat Express AC Snigdha",
        from: "Dhaka",
        to: "Sylhet",
        transportType: "train",
        departureDateTime: new Date(now + 5 * dayInMs).toISOString(),
        price: 820,
        ticketQuantity: 40,
        image: "https://images.unsplash.com/photo-1532105956626-9569c03602f6?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC Snigdha", "Food Pantry", "Reclining Seats"],
        vendorId: railwayId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },
      {
        title: "Silk City Express AC Coach",
        from: "Dhaka",
        to: "Rajshahi",
        transportType: "train",
        departureDateTime: new Date(now + 6 * dayInMs).toISOString(),
        price: 780,
        ticketQuantity: 35,
        image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=1000&auto=format&fit=crop",
        perks: ["AC Chair", "Quiet Carriage", "Mobile Charging"],
        vendorId: railwayId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },

      // AIR
      {
        title: "Biman Bangladesh Boeing 787 Dreamliner",
        from: "Dhaka",
        to: "Cox's Bazar",
        transportType: "air",
        departureDateTime: new Date(now + 2 * dayInMs).toISOString(),
        price: 4500,
        ticketQuantity: 15,
        image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
        perks: ["In-flight Meals", "20kg Baggage", "In-flight Entertainment", "Extra Legroom"],
        vendorId: bimanId,
        status: "approved",
        isAdvertised: true,
        createdAt: new Date(),
      },
      {
        title: "Biman BG-0088 Direct Flight",
        from: "Dhaka",
        to: "Chittagong",
        transportType: "air",
        departureDateTime: new Date(now + 3 * dayInMs).toISOString(),
        price: 3800,
        ticketQuantity: 18,
        image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop",
        perks: ["20kg Checked Baggage", "Complimentary Refreshments", "Priority Boarding"],
        vendorId: bimanId,
        status: "approved",
        isAdvertised: true,
        createdAt: new Date(),
      },
      {
        title: "Biman Sylhet Shuttle Flight",
        from: "Dhaka",
        to: "Sylhet",
        transportType: "air",
        departureDateTime: new Date(now + 4 * dayInMs).toISOString(),
        price: 3600,
        ticketQuantity: 12,
        image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
        perks: ["Snacks & Juice", "20kg Baggage", "Window View"],
        vendorId: bimanId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },
      {
        title: "Biman International BG-0047 to Bangkok",
        from: "Dhaka",
        to: "Bangkok",
        transportType: "air",
        departureDateTime: new Date(now + 8 * dayInMs).toISOString(),
        price: 28500,
        ticketQuantity: 10,
        image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop",
        perks: ["Full Hot Meal", "30kg Baggage", "Movies & Music", "Free Soft Drinks"],
        vendorId: bimanId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },
      {
        title: "Biman Direct Flight to Dubai",
        from: "Dhaka",
        to: "Dubai",
        transportType: "air",
        departureDateTime: new Date(now + 10 * dayInMs).toISOString(),
        price: 42000,
        ticketQuantity: 8,
        image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
        perks: ["International Dining", "35kg Baggage", "WiFi Onboard", "USB Charging"],
        vendorId: bimanId,
        status: "approved",
        isAdvertised: false,
        createdAt: new Date(),
      },
    ];

    // Delete existing demo tickets to prevent duplication when re-seeding
    await ticketsCollection.deleteMany({
      vendorId: { $in: [greenLineId, shohaghId, railwayId, bimanId] },
    });

    const insertResult = await ticketsCollection.insertMany(ticketsData);
    console.log(`Successfully seeded ${insertResult.insertedCount} demo tickets!`);

  } catch (err) {
    console.error("Error during database seeding:", err);
  } finally {
    await client.close();
    console.log("Database connection closed.");
  }
}

seedDatabase();
