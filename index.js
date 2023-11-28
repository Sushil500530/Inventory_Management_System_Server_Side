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

// console.log(process.env.STRIPE_SECRET_KEY);

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
        const paymentsCollection = client.db('inventoryDB').collection('payments');


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
        app.get('/users', verifyToken, async (req, res) => {
            try {
                const result = await usersCollection.find().toArray();
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })
        app.get('/user/:email', async (req, res) => {
            try {
                const email = req.params?.email;
                // console.log('who is this',email);
                const result = await usersCollection.findOne({ email });
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
        app.delete('/user/:id', verifyToken,verfyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await usersCollection.deleteOne(query);
                res.send(result);
            }
            catch (err) {
                console.log(err);
            }
        })
        // products related api 
        // get all product
        app.get('/all-products', async (req, res) => {
            try {
                const result = await productsCollection.find().toArray();
                res.send(result);
            }
            catch (err) {
                console.log(err);
            }
        })
        // find unique product 
        app.get('/all-product/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await productsCollection.findOne(query);
                res.send(result);
            }
            catch (err) {
                console.log(err);
            }
        })
        // data query from email 
        app.get('/products', verifyToken, async (req, res) => {
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
        // delete product in database 
        app.delete('/delete-product/:id', verifyToken,verfyAdmin, async (req, res) => {
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
        app.delete('/products/:id', verifyToken, async (req, res) => {
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
        app.get('/product/:id', verifyToken, async (req, res) => {
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
        app.put('/products/:id', verifyToken, async (req, res) => {
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
        //   app.get('/manager', async (req, res) => {
        //     try {
        //         const email = req.query.email;
        //         console.log('find i -->',email);
        //         const query = {email: email}
        //         console.log('find i -->',query);
        //         const result = await managersCollection.findOne();
        //         res.send(result)
        //     }
        //     catch (error) {
        //         console.log(error);
        //     }
        // })

        //    patch method add other find and insert data 
        app.patch('/managers', verifyToken, async (req, res) => {
            try {
                const manager = req.body;
                const email = req.user?.email;
                const find = { email: email }
                console.log(find);
                const query = { role: manager.role }
                const updateDoc = {
                    $set: {
                        ...query
                    }
                }
                const existingUser = await usersCollection.findOne(find);
                console.log(existingUser);
                const currentUser = await usersCollection.updateOne(existingUser, updateDoc);
                console.log(currentUser);
                const result = await managersCollection.insertOne(manager);
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })

        // sales related api 
        // get sales data 
        app.get('/sales-products', async (req, res) => {
            try {
                const result = await salesCollection.find().toArray();
                res.send(result)
            }
            catch (err) {
                console.log(err);
            }
        })
        // insert sales data from client side 
        app.post('/sales-product', async (req, res) => {
            try {
                const buyData = req.body;
                const result = await salesCollection.insertOne(buyData);
                res.send(result)
            }
            catch (err) {
                console.log(err);
            }
        })
        // find sales collection procuct for unique email
        app.get('/sales-product', async (req, res) => {
            try {
                const email = req.query?.email;
                const query = { email: email }
                const result = await salesCollection.find(query).toArray();
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })
        // delete method for sale one product 
        app.delete('/sales-product-delete/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await salesCollection.deleteOne(query);
                res.send(result)
            }
            catch (error) {
                console.log(error);
            }
        })

        // payment related api or payment details 
        app.post('/create-payment-intent', async (req, res) => {
            try {
                const { price } = req.body;
                const amount = parseInt(price * 100);
                console.log('get price--->', amount);
                const paymentIntent = await stripe?.paymentIntents?.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card']
                });
                res.send({
                    clientSecret: paymentIntent?.client_secret
                })
            }
            catch (err) {
                console.log(err);
            }
        })
        // get payment details 
        app.post('/payments', async (req, res) => {
            try {
                const paymentInfo = req.body;
                const paymentResult = await paymentsCollection.insertOne(paymentInfo);
                // delete data from sale collection in unique data 
                const query = {
                    _id: {
                        $in: paymentInfo.saleIds.map(id => new ObjectId(id))
                    }
                }
                const deleteResult = await salesCollection.deleteMany(query);
                res.send({ paymentResult, deleteResult })
            }
            catch (error) {
                console.log(error);
            }
        })
        //  get all payment data find in one email id 
        app.get('/payments/:email', verifyToken, async (req, res) => {
            const query = { email: req.params.email };
            console.log('====>', query);
            // console.log('payment user email--->',req?.user?.email);
            if (req?.params?.email !== req?.user?.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const result = await paymentsCollection.find(query).toArray();
            res.send(result);
        })

        // data analysis ro stats 
        app.get('/admin-stats', async(req,res) => {
            try{
                const users = await usersCollection.estimatedDocumentCount();
                const productItems = await productsCollection.estimatedDocumentCount();
                const orders = await paymentsCollection.estimatedDocumentCount();
                
                const result = await paymentsCollection.aggregate([
                    {
                        $group: {
                            _id:null,
                            totalRevenue:{
                                $sum:'$price'
                            }
                        }
                    }
                ]).toArray();
                const revenue = result?.length > 0 ? result[0]?.totalRevenue  : 0 ;

                res.send({users,productItems,orders,revenue});
            }
            catch(error){
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