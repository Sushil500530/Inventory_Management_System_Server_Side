const express = require('express');
const cors = require('cors');
require('dotenv').config()
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
}))
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
        const managersCollection = client.db('inventoryDB').collection('managers');
        const shopsCollection = client.db('inventoryDB').collection('shops');
        const productsCollection = client.db('inventoryDB').collection('products');
        const salesCollection = client.db('inventoryDB').collection('sales');


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
        // verify token 
        const verifyToken = (req, res, next) => {
            try {
                if (!req?.headers?.authorization) {
                    return res.status(401).send({ message: 'unAuthorized access' })
                }
                const token = req?.headers?.authorization?.split(' ')[1];
                jwt.verify(token, process.env.ACCEASS_TOKEN_SECRET, (error, decoded) => {
                    if (error) {
                        console.log(error);
                        return res.status(401).send({ message: 'unAuthorized access' })
                    }
                    req.user = decoded;
                    next();
                })
            }
            catch (err) {
                console.log(err);
            }
        }
        // use verify admin after verify token
        const verfyAdmin = async (req, res, next) => {
            try {
                const email = req.user?.email;
                console.log(req.user);
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                const isAdmin = user?.role === 'admin';
                if (!isAdmin) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                next()
            }
            catch (error) {
                console.log(error);
            }
        }


        // user related api 
        app.get('/users', verifyToken, verfyAdmin, async (req, res) => {
            try {
                const result = await usersCollection.find().toArray();
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })

        // find admin email 
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            try {
                const email = req.params.email;
                if (req.params.email !== req.user?.email) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                let admin = false;
                if (user) {
                    admin = user?.role === 'admin'
                }
                res.send({ admin })
            }
            catch (err) {
                console.log(err);
            }
        })
        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                const query = { email: user?.email };
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

        // products related api 
        // get product for unique email 
        app.get('/all-products', async (req, res) => {
            try {
                const result = await productsCollection.find().toArray();
                res.send(result);
            }
            catch (err) {
                console.log(err);
            }
        })
        // data query from email 
        app.get('/products', async (req, res) => {
            try {
                const email = req.query.email;
                const query = { email: email }
                const result = await productsCollection.find(query).toArray();
                res.send(result);
            }
            catch (err) {
                console.log(err);
            }
        })

        // get data from client side 
        app.post('/products', async (req, res) => {
            try {
                const product = req.body;
                const result = await productsCollection.insertOne(product);
                res.send(result)
            }
            catch (err) {
                console.log(err);
            }
        })

        // delete method find unique product id
        app.delete('/products/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await productsCollection.deleteOne(query);
                res.send(result);
            }
            catch (err) {
                console.log(err);
            }
        })
        // delete method find unique product id
        app.get('/product/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await productsCollection.findOne(query);
                res.send(result);
            }
            catch (err) {
                console.log(err);
            }
        })

        // patch method updated product 
        app.put('/products/:id', async (req, res) => {
            try {
                const product = req.body;
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const options = { upsert: true };
                const updateDoc = {
                    $set: {
                        ...product
                    }
                }
                const result = await productsCollection.updateOne(filter, updateDoc, options);
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })

        // became managers related api 
          // user related api 
          app.get('/managers', verifyToken, async (req, res) => {
            try {
                const result = await managersCollection.find().toArray();
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })

       
        app.patch('/managers',verifyToken, async (req, res) => {
            try {
                const manager = req.body;
                const email = req.user?.email;
                const find = {email: email}
                const query = {role:manager.role}
                const updateDoc = {
                    $set : {
                        ...query
                    }
                }
                const existingUser = await usersCollection.findOne(find);
                const currentUser = await usersCollection.updateOne(existingUser,updateDoc);
                console.log(currentUser);
                const result = await managersCollection.insertOne(manager);
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })
        // sales related api 



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