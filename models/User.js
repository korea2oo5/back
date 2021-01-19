const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        maxlength: 50,
    },
    email: {
        type: String,
        trim: true,
        unique: 1,
    },
    password: {
        type: String,
        minlength: 5,
    },
    lastname: {
        type: String,
        maxlength: 50,
    },
    role: {
        type: Number,
        defalut: 0,
    },
    image: {
        type: String,
    },
    token: {
        type: String,
    },
    tokenExp: {
        type: Number,
    },
});
// pre.함수는 첫번째 파라미터로 설정된 event가 일어나기 전(pre)에 먼저 callback 함수를 실행합니다.
// "save" event는 Model.create, model.save 함수 실행시 발생하는 event 입니다.
// 즉 user를 생성하거나 user를 수정한 뒤 save 함수를 실행 할 때 callback 함수가 먼저 호출된다.
userSchema.pre('save', function (next) {
    const user = this;
    // 비밀번호를 암호화
    // isModified 함수는 해당 값이 DB에 기록된 값과 비교해서 변경된 경우 true를 그렇지 않은 경우 false를 반환하는 함수입니다.
    // user 생성시는 항상 true이며, user 수정시는 password가 변경되는 경우에만 true를 반환합니다.
    // user.isModified('password') user의 password를 바꿀 경우에만 password 암호화
    if (user.isModified('password')) {
        // bcrypt.genSalt(saltRounds, callback) 메소드를 이용하여 salt 값을 생성
        bcrypt.genSalt(saltRounds, function (err, salt) {
            if (err) return next(err);
            // salt값과 password를 bcrypt.hash(myPlaintextPassword, salt, callback) 메소드의 인자로 넘겨준다.
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) return next(err);
                // 마지막으로 콜백 함수의 인자로 넘어오는 hash값을 user의 password에 넣어준다.
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});
// userSchema.methods 객체의 인스턴스를 만들어야만 사용이 가능하지만
// userSchema.statics 객체의 인스턴스를 만들지 않아도 사용이 가능하다
// const temp = new User() 이런식으로 선언하고난 뒤
// temp.(메소드) 이런식으로 호출해야만 쓸 수 있는 것이 메소드
// User.(스태틱) 이런식으로 호출할 수 있는 것이 스태틱
userSchema.methods.comparePassword = function (plainPassword, callback) {
    // plainPassword 123456 암호화된 $2b$10$5pBiXHiyZs3bjbfV2uBWDOD3IErBXbhkT.buHOYYY0hi1PIebql1i
    bcrypt.compare(plainPassword, this.password, function (err, isMatch) {
        if (err) return callback(err);
        callback(null, isMatch);
    });
};

userSchema.methods.generateToken = function (callback) {
    const user = this;
    const token = jwt.sign(user._id.toHexString(), 'secretToken');
    user.token = token;
    user.save(function (err, user) {
        if (err) return callback(err);
        callback(null, user);
    });
};

userSchema.statics.findByToken = function (token, callback) {
    const user = this;

    // 토큰을 decode
    jwt.verify(token, 'secretToken', function (err, decoded) {
        // 유저 아이디를 이용해서 유저를 찾은 다음에 클라이언트에서 가져온 token과 DB에 보관된 토큰이 일치하는지 확인
        user.findOne({ _id: decoded, token: token }, function (err, user) {
            if (err) return callback(err);
            callback(null, user);
        });
    });
};

const User = mongoose.model('User', userSchema);

module.exports = { User };
