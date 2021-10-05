const fs = require('fs')
const express = require('express')
const app = express()
const mysql = require('mysql')
const cors = require('cors')
const db = require('./config/db')
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const https = require('https')
const port = 8001;
app.use(cors());

require('dotenv').config()
//passport, jwt
const jwt = require('jsonwebtoken')
const { checkLevel, logRequestResponse, isNotNullOrUndefined, namingImagesPath, nullResponse, lowLevelResponse, response } = require('./util')
const passport = require('passport');
const passportConfig = require('./passport');

//multer
const {upload} = require('./config/multerConfig')

//express
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

const path = require('path');
app.set('/routes', __dirname + '/routes');
app.use('/config', express.static(__dirname + '/config'));
//app.use('/image', express.static('./upload'));
app.use('/image', express.static(__dirname + '/image'));
app.use('/api', require('./routes/api'))

app.get('/', (req, res) => {
    console.log("back-end initialized")
    res.send('back-end initialized')
});


app.post('/api/addad', upload.single('image'), (req, res) =>{
        try{
                
                if(checkLevel(req.cookies.token, 40))
                {
                        
                        const sql = 'INSERT INTO ad_information_tb  (ad_name, ad_image) VALUE (? , ?)'
                        const adName = req.body.adName
                        const {image, isNull} = namingImagesPath("ad", req.file)
                        const param = [adName, image]
                        
                        console.log(req.file)
                        if(isNotNullOrUndefined([adName]))
                        {       
                                
                                db.query(sql, param, (err, rows, feild)=>{
                                        if (err) {
                                                
                                                console.log(err)
                                                response(req, res, -200, "광고 추가 실패", [])
                                        }
                                        else {
                                                
                                                response(req, res, 200, "광고 추가 성공", [])
                                        }
                                })
                        }
                        else
                                nullResponse(req, res)
                }
                else
                        lowLevelResponse(req, res)
        }
        catch(err)
        {
        console.log(err)
        response(req, res, -200, "서버 에러 발생", [])
        }
})

//상품 추가
app.post('/api/addproduct', upload.fields([{name : 'mainImage'}, {name : 'detailImage'}, {name : 'qrImage'}]), (req, res, next) => {
        try{
                if(checkLevel(req.cookies.token, 0))
                {
                        // fk(1~5), int, string, int, bool(0,1)
                        // console.log(req.files)
                        const {brandPk, itemNum, itemName, classification, middleClass, status} = req.body
                        const sql = 'INSERT INTO item_information_tb (brand_pk, item_num, item_name, classification, middle_class, main_image, detail_image, qr_image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                        const {mainImage, detailImage, qrImage, isNull} = namingImagesPath("product", req.files)
                        const param = [brandPk, itemNum, itemName, classification, middleClass, mainImage, detailImage, qrImage, status]
                        // console.log(req.files)
                        if(isNotNullOrUndefined(param))
                        {
                                db.query(sql, param, (err, result) => {
                                        if (err) {
                                                console.log(err)
                                                response(req, res, -200, "상품 추가 실패", [])
                                        }
                                        else {
                                                response(req, res, 200, "상품 추가 성공", [])
                                        }
                                })
                        }
                        else
                                nullResponse(req, res)
                }
                else
                        lowLevelResponse(req, res)
        }
        catch(err)
        {
        console.log(err)
        response(req, res, -200, "서버 에러 발생", [])
        }
})

app.listen(port, '0.0.0.0', () => {
        console.log("Server running on port " + port)
})

