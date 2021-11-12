const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const admin = require("firebase-admin");
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;

const serviceAccount =require("./road-padel-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1wea1.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }

  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("roadPadel");
    const productCollection = database.collection("allProducts");
    const orderCollection = database.collection("orderedProduct");
    const reviewCollection = database.collection("reviews");
    const userCollection = database.collection("users");

    //Get All Products
    app.get("/allProducts", async (req, res) => {
      const cursor = productCollection.find({});
      const allProducts = await cursor.toArray();
      res.json(allProducts);
    });

    //DELETE PRODUCTS 
    app.delete("/allProducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.json(result);
      console.log(result)
    });



    //Get All Ordered Product
    app.get("/orderedProducts", async (req, res) => {
      const cursor = orderCollection.find({});
      const orderedProducts = await cursor.toArray();
      res.json(orderedProducts);
    });

    //
    app.put('/orderedProducts/:id', async (req, res) => {
      const id= req.params.id;
      const query = {_id: ObjectId(id)}
      const updateDoc={
        $set:{
          status: "Shipped"
        }
      }
      const result = await orderCollection.updateOne(query, updateDoc)
      res.json(result);
      console.log(result)
    })




  //Get Ordered Product for Update status
    app.delete("/orderedProducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });




    //Get Single Product Details
    app.get("/allProducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.json(result);
    });

    //Ordered Product post
    app.post("/orderedProduct", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });

    //Get My order filter by email
    app.get("/orderedProduct/:email", async (req, res) => {
      const result = await orderCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
    });

    //Delete My order
    app.delete("/orderedProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });

    //Post Reviews
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.json(result);
    });

    //Get All reviews
    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find({});
      const reviews = await cursor.toArray();
      res.json(reviews);
    });

    //make admin part start

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    //post user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    //MakeAdmin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await userCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await userCollection.updateOne(filter, updateDoc);

          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "You have no permissions to make admin" });
      }
    });

    //Add Product

    //POST
    app.post("/allProducts", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.json(result);
    });

    console.log("db connected");
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Road pedal");
});

app.listen(port, () => {
  console.log(`Running Port ${port}`);
});
