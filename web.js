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
const xlsxFile = require('read-excel-file/node')
//multer
const { upload } = require('./config/multerConfig')

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
// app.post('/api/addstationmarta',(req, res, next)=>{
//         try {
//                 xlsxFile('./SampleData.xlsx').then((rows)=>{
//                         let a = (req.body.count-1)*500+1;
//                         let arr = [];
//                         if(req.body.count==7){
//                                 arr = rows.slice(a,rows.length);
//                         }
//                         else{
//                                 arr = rows.slice(a,a+500);
//                         }
//                         //let arr = rows.slice(501,1001);
//                         //let arr = rows.slice(1001,1501);
//                         //let arr = rows.slice(1501,2001);
//                         //let arr = rows.slice(2001,2501);
//                         //let arr = rows.slice(2501,3001);
//                         //let arr = rows.slice(3001,rows.length);
//                                  db.query('INSERT INTO marta_bus_table (stop_id, tier, ridership_quintile,stop_name,ridership_data,facing_dir, position, ada_access) VALUES ?',[arr],(err, result)=>{
//                                         if (err) {
//                                                  console.log(err)
//                                                  response(req, res, -200, "Failed to add station", [])
//                                                }
//                                                else {
//                                                  response(req, res, 100, "Success to add station", [])
                                                 
//                                                }
//                                  })
                        
                        
//                 })
//         }
//         catch (err) {
//                 console.log(err)
//                 response(req, res, -200, "서버 에러 발생", [])
//         }
// })
// app.post('/api/addstationatldot',(req, res, next)=>{
//         try {
//                 xlsxFile('./SampleData.xlsx').then((rows)=>{
//                         let a = (req.body.count-1)*500+1;
//                         let arr = [];
//                         if(req.body.count==7){
//                                 arr = rows.slice(a,rows.length);
//                         }
//                         else{
//                                 arr = rows.slice(a,a+500);
//                         }
                        

//                                  db.query('INSERT INTO atldot_bus_table (stop_id, tier, ridership_quintile,stop_name,ridership_data,facing_dir, position, ada_access) VALUES ?',[arr],(err, result)=>{
//                                         if (err) {
//                                                  console.log(err)
//                                                  response(req, res, -200, "Failed to add station", [])
//                                                }
//                                                else {
//                                                  response(req, res, 100, "Success to add station", [])
                                                 
//                                                }
//                                  })
                        
                        
//                 })
//         }
//         catch (err) {
//                 console.log(err)
//                 response(req, res, -200, "서버 에러 발생", [])
//         }
// })

app.post('/api/addimage', upload.single('image'), async (req, res) => {
        try {
                let pk = req.body.pk
                let orga = req.body.org
                console.log(req.file)
                await db.query('SELECT * FROM image_table WHERE bus_pk=? AND organization=?', [pk, orga], async (err, result) => {
                        if (err) {
                                console.log(err)
                                response(req, res, -200, "Failed added image", [])
                        }
                        else {
                                if (result.length > 0) {
                                        await db.query('DELETE FROM image_table WHERE bus_pk=? AND organization=?', [pk, orga], async (err, result) => {
                                                if (err) {
                                                        console.log(err)
                                                        response(req, res, -200, "Failed added image", [])
                                                }
                                                else {
                                                        let busPk2 = req.body.pk
                                                        let org2 = req.body.org
                                                        let sql2 = 'INSERT INTO image_table  (image_src, bus_pk, organization) VALUE (?, ?, ?)'
                                                        const { image, isNull } = await namingImagesPath("image", req.file)
                                                        console.log(image)
                                                        let param2 = [image, busPk2, org2]
                                                        await db.query(sql2, param2, (err, rows, feild) => {
                                                                if (err) {

                                                                        console.log(err)
                                                                        response(req, res, -200, "Failed added image", [])
                                                                }
                                                                else {

                                                                        response(req, res, 200, "Success added image", [])
                                                                }
                                                        })
                                                }
                                        })
                                }
                                else {
                                        let busPk = req.body.pk
                                        let org = req.body.org
                                        let sql = 'INSERT INTO image_table  (image_src, bus_pk, organization) VALUE (?, ?, ?)'
                                        const { image, isNull } = await namingImagesPath("image", req.file)
                                        console.log(image)
                                        let param = [image, busPk, org]
                                        await db.query(sql, param, (err, rows, feild) => {
                                                if (err) {

                                                        console.log(err)
                                                        response(req, res, -200, "Failed added image", [])
                                                }
                                                else {

                                                        response(req, res, 200, "Success added image", [])
                                                }
                                        })
                                }
                        }
                })

        }
        catch (err) {
                console.log(err)
                response(req, res, -200, "서버 에러 발생", [])
        }
})

//상품 추가
app.post('/api/addproduct', upload.fields([{ name: 'mainImage' }, { name: 'detailImage' }, { name: 'qrImage' }]), (req, res, next) => {
        try {
                if (checkLevel(req.cookies.token, 0)) {
                        // fk(1~5), int, string, int, bool(0,1)
                        // console.log(req.files)
                        const { brandPk, itemNum, itemName, classification, middleClass, status } = req.body
                        const sql = 'INSERT INTO item_information_tb (brand_pk, item_num, item_name, classification, middle_class, main_image, detail_image, qr_image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                        const { mainImage, detailImage, qrImage, isNull } = namingImagesPath("product", req.files)
                        const param = [brandPk, itemNum, itemName, classification, middleClass, mainImage, detailImage, qrImage, status]
                        // console.log(req.files)
                        if (isNotNullOrUndefined(param)) {
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
        catch (err) {
                console.log(err)
                response(req, res, -200, "서버 에러 발생", [])
        }
})

app.listen(port, '0.0.0.0', () => {
        console.log("Server running on port " + port)
})

