require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1d0tmkb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("foodtracker");

    // Get or create collections
    const foodCollection = database.collection("food");
    const usersCollection = database.collection("users");
    const addFoodCollection = database.collection("addfood");

    // Create collections if they don't exist
    const collections = await database.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    if (!collectionNames.includes("food")) {
      await database.createCollection("food");
      console.log("✅ Created 'food' collection");

      // Create indexes for food collection
      await foodCollection.createIndex({ name: 1 });
      await foodCollection.createIndex({ expiryDate: 1 });
      await foodCollection.createIndex({ userId: 1 });
      console.log("✅ Created indexes for 'food' collection");
    }

    if (!collectionNames.includes("users")) {
      await database.createCollection("users");
      console.log("✅ Created 'users' collection");

      // Create indexes for users collection
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      await usersCollection.createIndex({ uid: 1 }, { unique: true });
      console.log("✅ Created indexes for 'users' collection");
    }

    if (!collectionNames.includes("addfood")) {
      await database.createCollection("addfood");
      console.log("✅ Created 'addfood' collection");

      // Create indexes for addfood collection
      await addFoodCollection.createIndex({ name: 1 });
      await addFoodCollection.createIndex({ expiryDate: 1 });
      await addFoodCollection.createIndex({ userId: 1 });
      console.log("✅ Created indexes for 'addfood' collection");
    }

app.post('/jwt', (req, res) => {
    const user = { email: req.body.email };
    console.log(user);

    // Generate actual JWT token
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.send({ token });
});






    // ========== USER ROUTES ========== //

    // POST API to register new user
    app.post('/users', async (req, res) => {
      try {
        const newUser = req.body;

        // Basic validation
        if (!newUser.email || !newUser.uid) {
          return res.status(400).json({ error: "Email and UID are required" });
        }

        // Check if user already exists
        const existingUser = await usersCollection.findOne({
          $or: [
            { email: newUser.email },
            { uid: newUser.uid }
          ]
        });

        if (existingUser) {
          return res.status(409).json({ error: "User already exists" });
        }

        // Add timestamps
        newUser.createdAt = new Date();
        newUser.updatedAt = new Date();

        const result = await usersCollection.insertOne(newUser);

        // Return the user without sensitive data
        const user = await usersCollection.findOne(
          { _id: result.insertedId },
          { projection: { password: 0 } }
        );

        res.status(201).json(user);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // GET user by ID
    app.get('/users/:id', async (req, res) => {
      try {
        const userId = req.params.id;

        if (!ObjectId.isValid(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        const user = await usersCollection.findOne(
          { _id: new ObjectId(userId) },
          { projection: { password: 0 } }
        );

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // ========== FOOD ROUTES ========== //

    // POST API to add new food item
    app.post('/food', async (req, res) => {
      try {
        const newFood = req.body;

        // Basic validation
        if (!newFood.name || !newFood.expiryDate || !newFood.userId) {
          return res.status(400).json({
            error: "Name, Expiry Date, and User ID are required"
          });
        }

        // Convert string date to Date object if needed
        if (typeof newFood.expiryDate === 'string') {
          newFood.expiryDate = new Date(newFood.expiryDate);
        }

        // Add additional fields
        const foodData = {
          ...newFood,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await foodCollection.insertOne(foodData);
        const insertedFood = await foodCollection.findOne({
          _id: result.insertedId
        });

        res.status(201).json(insertedFood);
      } catch (error) {
        console.error("Error adding food:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get('/foodexpiry', async (req, res) => {
      try {
        const foods = await foodCollection.find().toArray();
        res.status(200).json(foods);
      } catch (error) {
        console.error("Error fetching food items:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get('/food', async (req, res) => {
      try {
        const foods = await foodCollection.find().toArray();
        res.status(200).json(foods);
      } catch (error) {
        console.error("Error fetching food items:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // GET all food items for a specific user
    app.get('/food/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;

        // Validate userId
        if (!userId) {
          return res.status(400).json({ error: "User ID is required" });
        }

        const foods = await foodCollection.find({ userId }).toArray();
        res.json(foods);
      } catch (error) {
        console.error("Error fetching food items:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // GET single food item by ID
    app.get('/food/item/:id', async (req, res) => {
      try {
        const foodId = req.params.id;

        if (!ObjectId.isValid(foodId)) {
          return res.status(400).json({ error: "Invalid food ID" });
        }

        const food = await foodCollection.findOne({
          _id: new ObjectId(foodId)
        });

        if (!food) {
          return res.status(404).json({ error: "Food item not found" });
        }

        res.json(food);
      } catch (error) {
        console.error("Error fetching food item:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // GET food items expiring soon (within 7 days)
    app.get('/food/expiring-soon/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const foods = await foodCollection.find({
          userId,
          expiryDate: {
            $gte: today,
            $lte: nextWeek
          },
          status: 'active'
        }).toArray();

        res.json(foods);
      } catch (error) {
        console.error("Error fetching expiring food items:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // UPDATE food item
    app.put('/food/:id', async (req, res) => {
      try {
        const foodId = req.params.id;
        const updates = req.body;

        // Validate foodId
        if (!ObjectId.isValid(foodId)) {
          return res.status(400).json({ error: "Valid Food ID is required" });
        }

        // Add updated timestamp
        const foodData = {
          ...updates,
          updatedAt: new Date()
        };

        // Convert string date to Date object if needed
        if (foodData.expiryDate && typeof foodData.expiryDate === 'string') {
          foodData.expiryDate = new Date(foodData.expiryDate);
        }

        const result = await foodCollection.updateOne(
          { _id: new ObjectId(foodId) },
          { $set: foodData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Food item not found" });
        }

        const updatedFood = await foodCollection.findOne({
          _id: new ObjectId(foodId)
        });

        res.json(updatedFood);
      } catch (error) {
        console.error("Error updating food item:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // DELETE food item
    app.delete('/food/:id', async (req, res) => {
      try {
        const foodId = req.params.id;

        // Validate foodId
        if (!ObjectId.isValid(foodId)) {
          return res.status(400).json({ error: "Valid Food ID is required" });
        }

        const result = await foodCollection.deleteOne({
          _id: new ObjectId(foodId)
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Food item not found" });
        }

        res.json({ message: "Food item deleted successfully" });
      } catch (error) {
        console.error("Error deleting food item:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // ========== ADD FOOD ROUTES ========== //
// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers?.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    // Attach the decoded user information to the request
    req.user = decoded;
    next();
  });
};

// POST API to add new food item to addfood collection
app.post('/addfood', verifyToken, async (req, res) => {
  try {
    const newFood = req.body;

    // Basic validation
    if (!newFood.name || !newFood.expiryDate) {
      return res.status(400).json({
        error: "Name and Expiry Date are required"
      });
    }

    // Convert string date to Date object if needed
    if (typeof newFood.expiryDate === 'string') {
      newFood.expiryDate = new Date(newFood.expiryDate);
    }

    // Add additional fields with user ID from token
    const foodData = {
      ...newFood,
      userId: req.user.userId, // Ensure the food is associated with the authenticated user
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await addFoodCollection.insertOne(foodData);
    const insertedFood = await addFoodCollection.findOne({
      _id: result.insertedId
    });

    res.status(201).json(insertedFood);
  } catch (error) {
    console.error("Error adding food to addfood collection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET all food items from addfood collection (with optional filtering)
app.get('/addfood', verifyToken, async (req, res) => {
  try {
    const { status } = req.query;

    // Create a query object - always filter by the authenticated user
    const query = {
      userId: req.user.userId
    };

    if (status) {
      query.status = status;
    } else {
      // If status not specified, only get active items by default
      query.status = 'active';
    }

    // Find foods matching the query
    const foods = await addFoodCollection.find(query).toArray();

    res.status(200).json(foods);
  } catch (error) {
    console.error("Error retrieving food items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET all food items from addfood collection for a specific user
app.get('/addfood/:userId', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate userId matches the authenticated user
    if (userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden - You can only access your own food items" });
    }

    const foods = await addFoodCollection.find({ userId }).toArray();
    res.json(foods);
  } catch (error) {
    console.error("Error fetching food items from addfood collection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE food item in addfood collection
app.put('/addfood/:id', verifyToken, async (req, res) => {
  try {
    const foodId = req.params.id;
    const updates = req.body;

    if (!ObjectId.isValid(foodId)) {
      return res.status(400).json({ error: "Valid Food ID is required" });
    }

    // First find the food item to verify ownership
    const existingFood = await addFoodCollection.findOne({
      _id: new ObjectId(foodId)
    });

    if (!existingFood) {
      return res.status(404).json({ error: "Food item not found" });
    }

    // Check if the authenticated user owns this food item
    if (existingFood.userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden - You can only update your own food items" });
    }

    const foodData = {
      ...updates,
      updatedAt: new Date()
    };

    const result = await addFoodCollection.updateOne(
      { _id: new ObjectId(foodId) },
      { $set: foodData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Food item not found" });
    }

    const updatedFood = await addFoodCollection.findOne({
      _id: new ObjectId(foodId)
    });

    res.json(updatedFood);
  } catch (error) {
    console.error("Error updating food item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE food item from addfood collection
app.delete('/addfood/:id', verifyToken, async (req, res) => {
  try {
    const foodId = req.params.id;

    if (!ObjectId.isValid(foodId)) {
      return res.status(400).json({ error: "Valid Food ID is required" });
    }

    // First find the food item to verify ownership
    const existingFood = await addFoodCollection.findOne({
      _id: new ObjectId(foodId)
    });

    if (!existingFood) {
      return res.status(404).json({ error: "Food item not found" });
    }

    // Check if the authenticated user owns this food item
    if (existingFood.userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden - You can only delete your own food items" });
    }

    const result = await addFoodCollection.deleteOne({
      _id: new ObjectId(foodId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Food item not found" });
    }

    res.json({ message: "Food item deleted successfully" });
  } catch (error) {
    console.error("Error deleting food item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});















     app.post('/food/:foodId/notes', async (req, res) => {
      try {
        const { foodId } = req.params;
        const { text, postedBy } = req.body;

        // Validate input
        if (!ObjectId.isValid(foodId)) {
          return res.status(400).json({ error: "Invalid food ID" });
        }
        if (!text || !postedBy) {
          return res.status(400).json({ error: "Text and postedBy are required" });
        }

        // Check if food item exists
        const foodItem = await addFoodCollection.findOne({ _id: new ObjectId(foodId) });
        if (!foodItem) {
          return res.status(404).json({ error: "Food item not found" });
        }

        // Create new note
        const newNote = {
          foodId: new ObjectId(foodId),
          text,
          postedBy: new ObjectId(postedBy),
          postedDate: new Date(),
          updatedAt: new Date()
        };

        // Insert note into notes collection
        const result = await notesCollection.insertOne(newNote);

        // Get the created note
        const createdNote = await notesCollection.findOne({ _id: result.insertedId });

        res.status(201).json(createdNote);
      } catch (error) {
        console.error("Error adding note:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // GET all notes for a specific food item
    app.get('/food/:foodId/notes', async (req, res) => {
      try {
        const { foodId } = req.params;

        // Validate foodId
        if (!ObjectId.isValid(foodId)) {
          return res.status(400).json({ error: "Invalid food ID" });
        }

        // Get notes sorted by postedDate (newest first)
        const notes = await notesCollection.find({
          foodId: new ObjectId(foodId)
        }).sort({ postedDate: -1 }).toArray();

        res.status(200).json(notes);
      } catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // DELETE a note
    app.delete('/notes/:noteId', async (req, res) => {
      try {
        const { noteId } = req.params;

        // Validate noteId
        if (!ObjectId.isValid(noteId)) {
          return res.status(400).json({ error: "Invalid note ID" });
        }

        // Check if note exists
        const note = await notesCollection.findOne({ _id: new ObjectId(noteId) });
        if (!note) {
          return res.status(404).json({ error: "Note not found" });
        }

        // Delete the note
        await notesCollection.deleteOne({ _id: new ObjectId(noteId) });

        res.status(200).json({ message: "Note deleted successfully" });
      } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });


    console.log("✅ MongoDB Connected and Routes Ready!");

  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}

run().catch(console.dir);

// Basic route
app.get('/', (req, res) => {
  res.send('✅ Food Tracker API is Running!');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});