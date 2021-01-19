const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const config = require('./config/key');

// express.js도 빌트인 body parser를 추가 그러므로 Express 쓸 때, bodyparser를 따로 임포트하지 않아도 된다

// application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cookieParser());

const mongoose = require('mongoose');

mongoose
    .connect(config.mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    })
    .then(() => console.log('MongoDB Connection'))
    .catch((err) => console.log(err));

app.use('/api/users', require('./routes/users'));
app.use('/api/product', require('./routes/product'));
app.use('/api/machineLearning', require('./routes/machineLearning'));

app.use('/uploads', express.static('uploads'));

const port = 5000;

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
