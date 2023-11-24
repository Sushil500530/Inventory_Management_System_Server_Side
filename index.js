const express = require('express');
const cors = require('cors');
require('dotenv').config()
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174"
    ]
}));
app.use(express.json());



const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.ruakr2a.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // all collection here 
        const usersCollection = client.db('inventoryDB').collection('users');


        // jwt related api 
        app.post('/jwt', async (req, res) => {
            try {
                const user = req.body;
                const token = jwt.sign(user, process.env.ACCEASS_TOKEN_SECRET, { expiresIn: '365d' });
                res.send({ token })
            }
            catch (err) {
                console.log(err);
            }
        })



        // user related api 
        app.get('/users', async (req, res) => {
            try {

                const result = await usersCollection.find().toArray();
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })

        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                const query = { email: user.email };
                const existingUser = await usersCollection.findOne(query);
                if (existingUser) {
                    return res.send({ message: 'user already exists', insertedId: null })
                }
                const result = await usersCollection.insertOne(user);
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("Inventory Management System is Running.....")
})

app.listen(port, () => {
    console.log(`Inventory Management System is Running on Port : ${port}`);
})