const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// Load environment variables from .env file
dotenv.config();

const stripe = require('stripe')(process.env.Payment_Gateway_Key);
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());




// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.swu9d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.42osioc.mongodb.net/?appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('parcelDB'); // database name
        const parcelCollection = db.collection('parcels'); // collection

        app.get('/parcels', async (req, res) => {
            const parcels = await parcelCollection.find().toArray();
            res.send(parcels);
        });

        // parcels api
        // GET: All parcels OR parcels by user (created_by), sorted by latest
        app.get('/parcels', async (req, res) => {
            try {
                const userEmail = req.query.email;

                const query = userEmail ? { created_by: userEmail } : {};
                const options = {
                    sort: { createdAt: -1 }, // Newest first
                };

                const parcels = await parcelCollection.find(query, options).toArray();
                res.send(parcels);
            } catch (error) {
                console.error('Error fetching parcels:', error);
                res.status(500).send({ message: 'Failed to get parcels' });
            }
        });


        // POST: Create a new parcel
        app.post('/parcels', async (req, res) => {
            try {
                const newParcel = req.body;
                // newParcel.createdAt = new Date();
                const result = await parcelCollection.insertOne(newParcel);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error inserting parcel:', error);
                res.status(500).send({ message: 'Failed to create parcel' });
            }
        });

        app.delete('/parcels/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });

                res.send(result);
            } catch (error) {
                console.error('Error deleting parcel:', error);
                res.status(500).send({ message: 'Failed to delete parcel' });
            }
        });

        //get: get a specific parcel by id
        app.get('/parcels/:id',async(req,res)=>{
            try{
                const id = req.params.id;
                const parcel = await parcelCollection.findOne({_id: new ObjectId(id)});
                if(!parcel){
                    return  res.status(404).send({message: 'Parcel not found'});
                }
                res.send(parcel);
            }
            catch(error){
                console.error('Error fetching parcel:', error);
                res.status(500).send({message: 'Failed to get parcel'});
            }
        })

        // payment related apis
        app.post('/payment-checkout-session', async (req, res) => {
            const paymentInfo = req.body;
            const amount = parseInt(paymentInfo.cost) * 100;
            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            unit_amount: amount,
                            product_data: {
                                name: `Please pay for: ${paymentInfo.parcelName}`
                            }
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                metadata: {
                    parcelId: paymentInfo.parcelId
                },
                customer_email: paymentInfo.senderEmail,
                success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
            })

            res.send({ url: session.url })
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



// Sample route
app.get('/', (req, res) => {
    res.send('Parcel Server is running');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});