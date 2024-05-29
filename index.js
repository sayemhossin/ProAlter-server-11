const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const nodemailer = require("nodemailer");
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
  origin:[
    'http://localhost:5173',
    'https://pro-alter.firebaseapp.com',
    'https://pro-alter.web.app'
  ],
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())


// send email 

const sendEmail = (emailAddress,emailData)=>{
  const transporter = nodemailer.createTransport({
    service:'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.TRANSPORTER_EMAIL,
      pass:  process.env.TRANSPORTER_PASS
    },
  });


  // verify transporter
  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });


  const mailBody = {
    from: `"ProAlter" <${ process.env.TRANSPORTER_EMAIL}>`, // sender address
    to: emailAddress, // list of receivers
    subject: emailData.subject, // Subject line
    html: emailData.message, // html body
  }

   transporter.sendMail(mailBody,(error,info)=>{
    if(error){
      console.log(error)
    }else{
      console.log('Email Sent: ' + info.response)
    }
  });

}






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



const verifyToken = async(req,res,next)=>{
  const token = req?.cookies?.token
  if(!token){
    return res.status(401).send({message:'Unauthorized User'})
  }
  jwt.verify(token,process.env.JWT_TOKEN,(err,decode)=>{
    if(err){
      return res.status(401).send({message:'Unauthorized User'})
    }
    req.user=decode
    next()
  })
}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

const database = client.db('ProAlter')
const allQueryCollection = database.collection('allquery')
const recommendedCollection = database.collection('recommendation')
const userCollection = database.collection('users')



// users related api 
app.post('/users', async (req, res) => {
  const user = req.body
  // insert email if doesn't exist
  //  you can do this many ways(1. email unique, 2. upsert 3. simple checking)
  const query = { email: user?.email }
  const existingUser = await userCollection.findOne(query)
  if (existingUser) {
    return res.send({ message: 'user already exists', insertedId: null })
  }
  const result = await userCollection.insertOne(user)
  res.send(result)
})










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
  const search = req.query.search;
  let query = {};

  if (typeof search === 'string') {
    query = {
      product: { $regex: search, $options: 'i' }
    };
  }
    const cursor = allQueryCollection.find(query).sort({ 'added_by.date': -1 })
    
    const result = await cursor.toArray()
    res.send(result)
})



app.get('/allquery/:id',verifyToken, async(req,res) => {
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

app.get("/myquery/:email",verifyToken, async (req, res) => {

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
     // sent email 
     sendEmail(query?.query_adder_email,{
      subject: 'You have Got a New Product Recommendation!',
      message: `${query?.recommended_user_email} Added a new Recommendation in your posted query Let check it in the website`
     })
     
  res.send(result)
})


app.get('/recommendation', async(req,res)=>{
  const cursor = recommendedCollection.find()
  const result = await cursor.toArray()
  res.send(result)
})


app.get('/recommendation/:id',verifyToken, async(req,res) => {
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




app.get('/recommendations/:query_id', async (req, res) => {
  const result = await recommendedCollection.find({ query_id: req.params.query_id }).toArray();
  res.send(result);
});




app.get("/myrecommendetion/:email", async (req, res) => {
  const result = await recommendedCollection.find({ recommended_user_email: req.params.email }).toArray();
  res.send(result)
})

// jwt part

app.post('/jwt', async(req,res)=>{
  const user = req.body
  const token = jwt.sign(user,process.env.JWT_TOKEN,{expiresIn:'7d'})
  res
  .cookie('token',token,{
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  })
  .send({success:true})
})


app.post('/logout', (req,res)=>{
  const user = req.body
  
  res.clearCookie('token',{
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge:0
  }).send({success:true})
 
})








    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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