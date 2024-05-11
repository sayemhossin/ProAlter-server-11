const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ha1geqx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

const database = client.db('ProAlter')
const allQueryCollection = database.collection('allquery')
const recommendedCollection = database.collection('recommendation')



app.post('/allquery', async(req,res)=>{
    const query = req.body
    const result = await allQueryCollection.insertOne(query)
    res.send(result)
})


app.get('/allquery', async(req,res)=>{
    const cursor = allQueryCollection.find()
    const result = await cursor.toArray()
    res.send(result)
})
app.get('/allquerys', async(req,res)=>{
    const cursor = allQueryCollection.find().sort({ 'added_by.date': -1 })
    
    const result = await cursor.toArray()
    res.send(result)
})



app.get('/allquery/:id', async(req,res) => {
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result =  await allQueryCollection.findOne(query)
    res.send(result)
})

app.put('/allquery/:id', async(req,res) =>{
    const id = req.params.id
    const query = req.body
    const filter = {_id: new ObjectId(id)}
    const options = {upsert:true}

    const updateCrafts = {
        $set:{
            product:query.product,
            product:query.product,
            photo:query.photo,
            title:query.title,
            boycott_reason:query.boycott_reason,
        }
      }
      const result = await allQueryCollection.updateOne(filter,updateCrafts,options)
      res.send(result)
})

app.delete('/allquery/:id', async(req,res)=>{
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result = await allQueryCollection.deleteOne(query)
    res.send(result)
  })
  
// sort

app.get("/myquery/:email", async (req, res) => {
    const result = await allQueryCollection.find({ 'added_by.email': req.params.email })
    .sort({ 'added_by.date': -1 })
    .toArray();
    res.send(result)
  })

// recommendation Part 

app.post('/recommendation', async(req,res)=>{
  const query = req.body
  const result = await recommendedCollection.insertOne(query)

  const queryId = query.query_id;
    await allQueryCollection.updateOne(
        { _id: new ObjectId(queryId) }, 
        { $inc: { 'added_by.recommendation_count': 1 } } 
    );
  res.send(result)
})


app.get('/recommendation', async(req,res)=>{
  const cursor = recommendedCollection.find()
  const result = await cursor.toArray()
  res.send(result)
})


app.get('/recommendation/:id', async(req,res) => {
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result =  await recommendedCollection.findOne(query)
  res.send(result)
})

app.delete('/recommendation/:id', async(req,res)=>{
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const deletedRecommendation = await recommendedCollection.findOne(query);
  const result = await recommendedCollection.deleteOne(query)
  await allQueryCollection.updateOne(
    { _id: new ObjectId(deletedRecommendation.query_id) }, 
    { $inc: { 'added_by.recommendation_count': -1 } } 
);
  res.send(result)
})




app.get('/recommendetion/:query_id', async(req,res)=>{
  const result = await recommendedCollection.find({query_id:req.params.query_id}).toArray()
  res.send(result)
})

app.get("/myrecommendetion/:email", async (req, res) => {
  const result = await recommendedCollection.find({ recommended_user_email: req.params.email }).toArray();
  res.send(result)
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










app.get('/', (req,res)=>{
    res.send('Assignment 11 is running')
})

app.listen(port,()=>{
    console.log(`assignment 11 running on port: ${port}`)
})