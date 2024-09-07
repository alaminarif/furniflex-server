require("dotenv").config();
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

function createToken(user) {
  const token = jwt.sign(
    {
      email: user.email,
    },
    "secret",
    { expiresIn: "7d" }
  );
  return token;
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const verify = jwt.verify(token, "secret");
  if (!verify?.email) {
    return res.send("You are not authorized");
  }
  req.user = verify.email;
  next();
}

const uri = process.env.DATABASE_URL;

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
    const db = client.db("furniflex");
    const userCollection = db.collection("users");
    const productsCollection = db.collection("products");
    const cartsCollection = db.collection("carts");

    // product
    app.post("/products/create-product", async (req, res) => {
      const productsData = req.body;
      const result = await productsCollection.insertOne(productsData);
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const filter = req.query;
      let query = {};

      try {
        const productsData = productsCollection.find(query);
        const result = await productsData.toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while fetching products." });
      }
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const productsData = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(productsData);
    });

    app.patch("/products/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await productsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.send(result);
    });

    app.delete("/products/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // user
    app.post("/users", async (req, res) => {
      const user = req.body;

      const token = createToken(user);

      const isUserExist = await userCollection.findOne({ email: user?.email });

      if (isUserExist?._id) {
        return res.send({
          statu: "success",
          message: "Login success",
          token,
        });
      }

      await userCollection.insertOne(user);
      return res.send({ token });
    });

    app.get("/users/get/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await userCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const userData = req.body;
      const result = await userCollection.updateOne({ email }, { $set: userData }, { upsert: true });
      res.send(result);
    });

    app.post("/carts/create-cart", async (req, res) => {
      const cartData = req.body;
      const result = await cartsCollection.insertOne(cartData);
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      // const filter = req.query;
      const email = req.query.email;
      const query = { email: email };

      try {
        const cartData = cartsCollection.find(query);
        const result = await cartData.toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while fetching cart." });
      }
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const result = await cartsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    console.log("Database is connected");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Route is working");
});

app.listen(port, (req, res) => {
  console.log("App is listening on port :", port);
});

// if (filter.search) {
//   query = {
//     $or: [
//       {
//         title: {
//           $regex: filter.search,
//           $options: "i",
//         },
//       },
//       {
//         brand: {
//           $regex: filter.search,
//           $options: "i",
//         },
//       },
//       {
//         price: {
//           $regex: filter.search,
//           $options: "i",
//         },
//       },
//     ],
//   };
// }
