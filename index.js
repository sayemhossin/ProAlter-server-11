const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000

app.use(cors())



app.get('/', (req,res)=>{
    res.send('Assignment 11 is running')
})

app.listen(port,()=>{
    console.log(`assignment 11 running on port: ${port}`)
})