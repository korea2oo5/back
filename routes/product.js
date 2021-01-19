const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Product } = require('../models/Product');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

var upload = multer({ storage: storage }).single('file');
// 이미지 등록
router.post('/image', (req, res) => {
    // 가져온 이미지를 저장
    upload(req, res, (err) => {
        if (err) {
            return res.json({ success: false, err });
        }
        return res.json({
            success: true,
            image: res.req.file.path,
            fileName: res.req.file.filename,
        });
    });
});
// 상품 등록
router.post('/', (req, res) => {
    // 받아온 정보들을 DB에 저장
    const product = new Product(req.body);
    product.save((err) => {
        if (err) return res.status(400).json({ success: false, err });
        return res.status(200).json({ success: true });
    });
});

router.post('/products', (req, res) => {
    // product collection에 들어 있는 모든 상품 정보 찾기

    let limit = req.body.limit ? parseInt(req.body.limit) : 20;
    let skip = req.body.skip ? parseInt(req.body.skip) : 0;

    let findArgs = {};

    for (let key in req.body.filters) {
        if (req.body.filters[key].length > 0) {
            findArgs[key] = req.body.filters[key];
        }
    }
    console.log(findArgs);
    Product.find(findArgs)
        .populate('writer')
        .skip(skip)
        .limit(limit)
        .exec((err, productInfo) => {
            if (err) return res.status(400).json({ success: false, err });
            return res.status(200).json({
                success: true,
                productInfo,
                postSize: productInfo.length,
            });
        });
});

module.exports = router;
