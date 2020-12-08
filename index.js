const express = require('express');
const app = express();
const port = 3000;

const mongoose = require('mongoose');

mongoose
  .connect(
    'mongodb+srv://nth:fpal0224@cluster0.mfeec.mongodb.net/oneclickAI?retryWrites=true&w=majority',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    }
  )
  .then(() => console.log('MongoDB Connection'))
  .catch((err) => console.log(err));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
