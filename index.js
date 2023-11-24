const express = require('express');
const cors = require('cors');
require('dotenv').config()
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;


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
        const userCollection = client.db('inventoryDB').collection('users');






        // user related api 
        app.get('/users', async (req, res) => {
            try {

                const result = await userCollection.find().toArray();
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