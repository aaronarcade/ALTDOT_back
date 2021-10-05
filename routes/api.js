const express = require('express')
const passport = require('passport')
//const { json } = require('body-parser')
const router = express.Router()
const cors = require('cors')
router.use(cors())
router.use(express.json())

const crypto = require('crypto')
//const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { checkLevel, getSQLnParams, getUserPKArrStrWithNewPK, 
    isNotNullOrUndefined, namingImagesPath, nullResponse,
    lowLevelResponse, response,removeItems
} = require('../util')
const {
    getRowsNumWithKeyword, getRowsNum, getAllDatas,
    getDatasWithKeywordAtPage, getDatasAtPage,
    getKioskList, getItemRows, getItemList,dbQueryList, dbQueryRows
} = require('../query-util')

const db = require('../config/db')
const { upload } = require('../config/multerConfig')
const { Console } = require('console')
const { abort } = require('process')
//const { pbkdf2 } = require('crypto')
const salt = "435f5ef2ffb83a632c843926b35ae7855bc2520021a73a043db41670bfaeb722"
const saltRounds = 10
const pwBytes = 64
const jwtSecret = "djfudnsqlalfKeyFmfRkwu"
router.get('/', (req, res) => {
    console.log("back-end initialized")
    res.send('back-end initialized')
});

//--------------------------------------------------------키오스크
//키오스크 리스트
router.get('/kiosk/:page', async (req, res) => {
    try{
        let decoded = checkLevel(req.cookies.token, 40)
        if(decoded.user_level == 50)
        {
            let page = ((req.params.page || req.query.page) - 1) * 10;
            if(isNotNullOrUndefined([page]))
            {
                let status = req.query.status
                let firstdate = req.query.firstdate
                let lastdate = req.query.lastdate
                
                if(parseInt(req.params.page) === 0)
                    page = -1

                let kioskList = await getKioskList(status, firstdate, lastdate, page)

                if (kioskList.code > 0) 
                    await response(req, res, 200, "키오스크 조회", { result: kioskList.result, maxPage: kioskList.maxPage })
                else 
                    await response(req, res, -200, "키오스크 조회 실패", []);
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
//브랜드 전체 조회(pk, brand_name만)
router.get('/brand', (req, res) => {
    try{
        if(checkLevel(req.cookies.token, 40))
        {
            let sql = 'SELECT pk, brand_name FROM brand_information_tb'
            db.query(sql, (err, result, fields) => {
                if (err) {
                    console.log(err)
                    response(req, res, -200, "브랜드 조회 실패", []);
                }
                else {
                    response(req, res, 200, "키오스크 조회: ", result)
                }
            })
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

 router.post('/addkiosk', (req, res) => {
    //3개 데이터 + 추가할 회원 이름(id)
    //kiostNum에 맞는 키오스크가 이미 있으면 user_pk_list에 회원 pk 추가, 없으면 새 row 생성
    try{
        const decode = checkLevel(req.cookies.token, 50)
        if(decode)
        {
            const kioskNum = req.body.kioskNum
            const uniNum = req.body.uniNum
            const store = req.body.store
            const userPK = req.body.pk
            if(isNotNullOrUndefined([kioskNum, uniNum, store, userPK]))
            {
                db.query('select * from kiosk_information_tb where kiosk_num=?', [kioskNum], (err, result) =>{
                    if (result.length > 0)
                    {
                        let userPKList = getUserPKArrStrWithNewPK(result[0].user_pk_list, userPK)

                        let sql = "update kiosk_information_tb set user_pk_list = ? WHERE kiosk_num=?"
                        db.query(sql, [userPKList, kioskNum], (err,result)=>{
                            if(!err)
                                response(req, res, 200, "기존 키오스크에 추가 성공", [])
                            else
                            {
                                console.log(err)
                                response(req, res, -200, "키오스크 추가 실패", [])
                            }
                        })
                    }
                    else
                    {
                        let sql = 'INSERT INTO kiosk_information_tb (kiosk_num, store_name, user_pk_list, unique_code) VALUES (?, ?, ?, ?)'
                        db.query(sql, [kioskNum, store, '['+decode.code+']',uniNum], (err, result) => {
                            if(!err)
                                response(req, res, 200, "새 키오스크 추가 성공", [])
                            else
                            {
                                console.log(err)
                                response(req, res, -200, "키오스크 추가 실패", [])
                            }
                        })
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
//키오스크 수정
router.put('/updatekiosk', (req, res) => {
    try{
        const decode = checkLevel(req.cookies.token, 50)
        if(decode)
        {
            const pk = req.body.pk
            const num = req.body.num
            const uniNum = req.body.uniNum
            const store = req.body.store
            let query = 'UPDATE kiosk_information_tb SET '
            let params = [num, uniNum, store]
            let {sql, param} = getSQLnParams(query, params, ['kiosk_num', 'unique_code', 'store_name'])
            sql += ' WHERE pk=?'
            param.push(pk)
            if(param.length == 1)
                return response(req, res, -200, "입력된 데이터가 없습니다.", [])

            if(isNotNullOrUndefined(param))
            {
                db.query(sql, param, (err, result) => {
                    if(!err)
                        response(req, res, 200, "키오스크 수정 성공", [])
                    else
                    {
                        console.log(err)
                        response(req, res, -200, "키오스크 수정 실패", [])
                    }
                })
            }
            else
            {
                nullResponse(req, res)
            }
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
router.post('/kioskstatus',(req, res)=>{
    try{
        const pk = req.body.pk
        const status = req.body.status
        if(status){
            db.query('UPDATE kiosk_information_tb SET status=0 WHERE pk=?',[pk],(err,result)=>{
                if(err){
                    console.log(err)
                }
                else{
                    response(req, res, 200, "상태변화 성공" , [])
                }
            })
        }
        else{
            db.query('UPDATE kiosk_information_tb SET status=1 WHERE pk=?',[pk],(err,result)=>{
                if(err){
                    console.log(err)
                }
                else{
                    response(req, res, 200, "상태변화 성공" , [])
                }
            })
        }
    }
    catch(err){
        console.log(err)
        response(req, res, -200, "서버 에러 발생", [])
    }
})
//키오스크 삭제
router.post('/deletekiosk', (req, res) => {
    try{
        const pk = req.body.pk
        const decode = checkLevel(req.cookies.token, 40)
        if(decode)
        {
            let param = [pk]
            if(isNotNullOrUndefined(param))
            {
                let sql = "DELETE FROM kiosk_information_tb WHERE pk=?"
                db.query(sql, param, (err, result) => {
                    if(!err)
                        response(req, res, 200, "키오스크 삭제 성공", [])
                    else
                    {
                        console.log(err)
                        response(req, res, -200, "키오스크 삭제 실패", [])
                    }
                })
            }
            else
            {
                nullResponse(req, res)
            }
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
//------------------------------------------------유저
//로그인


//회원리스트
router.get('/user/:page', async (req, res) => {
    try{
        if(checkLevel(req.cookies.token, 40))
        {
            let page = ((req.params.page || req.body.page) - 1) * 10;
            if(isNotNullOrUndefined([page]))
            {
                let keyword = req.query.keyword
                let rows = {}, userList = {}
                let table = 'user_information_tb'
                let columns = ['id', 'pw', 'user_level', 'create_time']

                if(keyword)
                    rows = await getRowsNumWithKeyword(table, columns, keyword)
                else
                    rows = await getRowsNum(table)
                
                if(rows.code > 0)
                {
                    if(keyword)
                        userList = await getDatasWithKeywordAtPage(table, columns, keyword, page)
                    else
                        userList = await getDatasAtPage(table, columns, page)

                    if (userList.code > 0) 
                        await response(req, res, 200, "회원 조회 성공", { result: userList.result, maxPage: rows.maxPage})
                    else 
                        await response(req, res, -200, "회원 조회 실패", []);
                }
                else
                    await response(req, res, -200, "회원 조회 실패", [])
            }
            else
            {
                nullResponse(req, res)
            }
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

//회원추가
router.post('/adduser', (req, res, next) => {
    // 값 받아올 때, id, pw, userLevel, brandList
    try{
        if(checkLevel(req.cookies.token, 40))
        {
            //logRequest(req)
            const id = req.body.id
            const pw = req.body.pw
            const userLevel = req.body.userLevel
           
            let brandList = req.body.brandPk
            let brandSQL = 'SELECT * FROM brand_information_tb WHERE pk IN (' + brandList.substring(1, brandList.length - 1) +')'
            brandList = JSON.parse(brandList)

            if(isNotNullOrUndefined([id, pw, userLevel,brandList]))
            {
                //중복 체크 
                let sql = "SELECT * FROM user_information_tb WHERE id=?"

                db.query(sql, [id], (err, result) => {
                    if(result.length > 0)
                        response(req, res, -200, "ID가 중복됩니다.", [])
                    else
                    {
                        console.log(salt)
                        crypto.pbkdf2(pw, salt, saltRounds, pwBytes, 'sha512', async (err, decoded)=> {
                        // bcrypt.hash(pw, salt, async (err, hash) => {
                            let hash = decoded.toString('base64')

                            if(err)
                            {
                                console.log(err)
                                response(req, res, -200, "비밀번호 암호화 도중 에러 발생", [])
                            }
                            let userPK, userPKList
                            sql = 'INSERT INTO user_information_tb (id, pw, user_level) VALUES (?, ?, ?)'
                            await db.query(sql , [id, hash, userLevel], (err, result) => {
                                userPK = result.insertId
                                if(err)
                                {
                                    console.log(err)
                                    response(req, res, -200, "회원 추가 실패", [])
                                }
                            })
                            
                            
                
                            await db.query(brandSQL, brandList, async (err, result, fields) => {
                                if(result == undefined || err)
                                {
                                    !err || console.log(err)
                                    response(req, res, err ? -200 : 200, "회원 추가 성공, 키오스크 등록 성공, 브랜드 등록 " + err ? "중 오류":"없음", [])
                                }
                                else if(result.length > 0)
                                {
                                    sql = "UPDATE brand_information_tb SET user_pk_list=? WHERE pk=?"
                                    for(let i = 0; i < result.length; i++)
                                    {
                                        userPKList = JSON.parse(result[0].user_pk_list)
                                        if(userPKList.indexOf(userPK) == -1)
                                            userPKList.push(userPK)
                                        userPKList = JSON.stringify(userPKList)
                
                                        await db.query("UPDATE brand_information_tb SET user_pk_list=? WHERE pk=?", [userPKList, result[i].pk], (err, result) =>{
                                            if(err)
                                            {
                                                console.log(err)
                                                response(req, res, -200, "회원 추가 성공, 키오스크 등록 성공, "+ i +"번 브랜드 등록 중 실패", [])
                                            }
                                        })
                
                                        if(i == result.length - 1)
                                            response(req, res, 200, "회원 추가 성공, 키오스크 등록 성공, 브랜드 등록 성공", [])
                                    }
                                }
                            })
                        })
                    }
                })
            }
            else
            {
                nullResponse(req, res)
            }
        }
        else
            lowLevelResponse(req, res);
    }
    catch(err)
    {
        console.log(err)
        response(req, res, -200, "서버 에러 발생", [])
    }
})

// 권한 체크
router.get('/auth', (req, res, next) => {
    try{
        const decode = checkLevel(req.cookies.token, 0)

        if(decode)
        {
            let id = decode.id
            let first = decode.user_level == 50
            let second = decode.user_level >= 40
            let third = decode.user_level >= 0
            res.send({id, first, second, third})
        }
        else
        {
            res.send({
                id: decode.id,
                first: false,
                second: false,
                third: false
            })
        }
    }
    catch(err)
    {
        console.log(err)
        response(req, res, -200, "서버 에러 발생", [])
    }
})

router.post('/login', (req, res, next) => {
    try{
        let level = ["일반회원", "관리자", "개발자"];
        
        passport.authenticate('local', {session : false}, async (err, user, info) => {

            if (!user) 
                return response(req, res, -200, "해당 계정이 존재하지 않습니다.", []);

            try{
                var expiresTime;

                if(user.userLevel < 40){
                    expiresTime='15m'
                }else{
                    expiresTime='60m'
                }
//
                const token = jwt.sign({
                    code : user.pk,
                    id : user.id,
                    user_level : user.user_level
                },
                jwtSecret,
                {
                    expiresIn : '60m',
                    issuer : 'fori',
                });
                
                /*
                **  TODO: 
                **  토큰 갱신 필요하면 refresh, newToken 활성화
                **  갱신용 refresh token DB에 저장 후 받은 refresh 토큰과 DB의 refresh 토큰을 비교
                */

                // const refreshtoken = jwt.sign(
                // {
                //     id : user.id,
                // },
                // process.env.JWT_SECRET,
                // {
                //     expiresIn : '60m',
                //     issuer : 'fori',
                // });

                res.cookie("token", token, { httpOnly: true, maxAge: 60 * 60 * 1000});
                // res.cookie("rtoken", refreshtoken, { httpOnly: true, maxAge: 60 * 60 * 1000});

                let user_type = ""
                if(user.user_level === 0)
                    user_type = level[0]
                else if(user.user_level === 40)
                    user_type = level[1]
                else if(user.user_level === 50)
                    user_type = level[2]
                else
                {
                    user_type = "비정상"
                    console.log("이 유저는 권한이 잘못 설정되어 있습니다." )
                    throw "이 유저는 권한이 잘못 설정되어 있습니다."
                }
                
                return response(req, res, 200, user.id + '(' + user_type + ')님 환영합니다.', []);
            }
            catch(err){
                console.log(err);
                return response(req, res, -200, "로그인 중 오류 발생", [])
            }
        })(req, res, next); 
    }
    catch(err){
        console.log(err);
        response(req, res, -200, "로그인 중 오류 발생", [])
    }
})

router.post('/logout', (req, res, next) => {
    try{
        res.clearCookie('token')
        //res.clearCookie('rtoken')
        response(req, res, 200, "로그아웃 성공", [])
    }
    catch(err)
    {
        console.log(err)
        response(req, res, -200, "서버 에러 발생", [])
    }
});

// router.post('/newToken',function(req,res,next){
//     var refreshtoken = req.cookies.refreshtoken;
//     var tokenValue=jwt.decode(authorization);
//     var userId = tokenValue.id;
//     db.query('SELECT refresh_token FROM user_information_tb WHERE id=?', [userId], (err, result) => {
//         if(isEmpty(result)){
//             res.json({
//                 code:400,
//                 message:"토큰이 만료되었습니다. 재 로그인 해주세요."
//             });
//         }else if(result==refreshtoken){
//             var expiresTime;
//             if(tokenValue.status==0){
//                 expiresTime='60m';
//             }else{
//                 expiresTime='1440m'
//             }
//             const token = jwt.sign({
//                 user_id : tokenValue.user_id,
//                 user_level : tokenValue.user_level,
//             },
//             process.env.JWT_SECRET,
//             {
//                 expiresIn : expiresTime,
//                 issuer : 'comeOn',
//             });
      
//         res.status(200).json({
//             code : 200,
//             message : '토큰이 발급되었습니다.',
//             token,
//         }).send();  
//     }else{
//         res.json({
//             code:500,
//             message:"토큰이 변조되었습니다. 재 로그인 해주세요."
//         });
//     }
//     })
// });

//회원 수정
router.put('/updateuser', (req, res) => {
    try{
        const decode = checkLevel(req.cookies.token, 40)
        if(decode)
        {
            const pk = req.body.pk
            const pw = req.body.pw
            const brandPk = req.body.brandPk
           
            let brandList = JSON.parse(brandPk)
            
            console.log()
          
            const param = [pw, pk]
            console.log(brandList)
           
            if(isNotNullOrUndefined(param))
            {
                crypto.pbkdf2(pw, salt, saltRounds, pwBytes, 'sha512', async (err, decoded)=> {
                    // bcrypt.hash(pw, salt, async (err, hash) => {
                        let hash = decoded.toString('base64')
                    if(err)
                    {
                        console.log(err)
                        response(req, res, -200, "회원 수정 실패", [])
                    }
                    let sql = 'UPDATE user_information_tb SET pw=? WHERE pk=?'
                    await db.query( sql, [hash, pk], (err, result) => {
                        if (err) {
                            console.log(err)
                            response(req, res, -200, "회원 수정 실패", [])
                        } else {
                            response(req, res, 200, "회원 수정 성공", [])
                        }
                    })
                    await db.query('SELECT user_pk_list FROM brand_information_tb', async (err, result)=>{
                        if(err){
                            console.log(err)
                        }
                        else{
                            console.log(result.length)
                            for(var i = 0; i< result.length; i++){
                                let delete_pk = result[i].user_pk_list;
                                delete_pk = JSON.parse(delete_pk)
                                
                                for(var j = 0; j < delete_pk.length;j++){
                                    if(delete_pk[j]==pk){
                                        delete_pk.splice(j, 1);
                                        break;
                                    }
                                }
                                for(var k = 0; k < brandList.length;k++){
                                    if(brandList[k]==i+1){
                                        delete_pk.push(pk)
                                    }
                                }
                                delete_pk = JSON.stringify(delete_pk)
                                await db.query('UPDATE brand_information_tb SET user_pk_list=? WHERE pk=?',[delete_pk, i+1],(err, resule)=>{
                                    if(err){
                                        console.log(err)
                                       
                                    }
                                    else{
                                       
                                    }
                                })

                            }
                            
                        }
                    })
                   
                 

                })
            }
            else
            {
                nullResponse(req, res)
            }
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
//회원 브랜드 수정
// router.put('/updateuser-brand', (req, res) => {
//     try{
//         const decode = checkLevel(req.cookies.token, 50)
//         if(decode)
//         {
//             const pk = req.body.pk
//             const param = []
//             if(isNotNullOrUndefined(param))
//             {
                
//             }
//             else
//             {
//                 nullResponse(req, res)
//             }
//         }
//         else
//             lowLevelResponse(req, res)
//     }
//     catch(err)
//     {
//         console.log(err)
//         response(req, res, -200, "서버 에러 발생", [])
//     }
// })

//회원삭제
router.post('/deleteuser', async (req, res) => {
    try{
        if(checkLevel(req.cookies.token, 40))
        {
            const pk = req.body.pk
            const param = [pk]
            if(isNotNullOrUndefined(param))
            {
                let sql = "DELETE FROM user_information_tb WHERE pk=?"
                await db.query(sql, param, (err, result) => {
                    if (err) {
                        console.log(err)
                        response(req, res, -200, "회원 삭제 실패", [])
                    } else {
                        response(req, res, 200, "회원 삭제 성공", [])
                    }
                })
            }
            else
            {
                nullResponse(req, res)
            }
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
//------------------------------------------------광고

//광고 추가시 광고가 이미 존재하면 광고 추가를 못하도록 하는 api
router.get('/howmanyad', (req, res)=>{
    try{
        db.query('SELECT * FROM ad_information_tb',(err, result)=>{
            if(err){
                console.log(err)
            }
            else{
                if(result.length>0){
                    response(req, res, -100 , "이미 광고가 존재함", false)
                }
                else{
                    response(req, res, 100 , "광고 추가 가능", true)
                }
            }
        })
    }
    catch(err){
        console.log(err)
        response(req, res, -200, "서버 에러 발생", [])
    }
})
//광고리스트
router.get('/ad/:page', async (req, res) => {
    try{
        if(checkLevel(req.cookies.token, 40))
        {
            let page = ((req.params.page || req.body.page) - 1) * 10;
            if(isNotNullOrUndefined([page]))
            {
                let keyword = req.query.keyword
                let rows = {}, adList = {}
                let table = 'ad_information_tb'
                let columns = ['ad_name', 'ad_image', 'create_time']

                if(keyword)
                    rows = await getRowsNumWithKeyword(table, columns, keyword)
                else
                    rows = await getRowsNum(table)
                
                if(rows.code > 0)
                {
                    if(keyword)
                        adList = await getDatasWithKeywordAtPage(table, columns, keyword, page)
                    else
                        adList = await getDatasAtPage(table, columns, page)

                    if (adList.code > 0) 
                        await response(req, res, 200, "광고 조회 성공", { result: adList.result, maxPage: rows.maxPage})
                    else 
                        await response(req, res, -200, "광고 조회 실패", []);
                }
                else
                    await response(req, res, -200, "광고 조회 실패", [])
            }
            else
            {
                nullResponse(req, res)
            }
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
//광고수정창에서 광고정보 가져오기
//광고수정
router.put('/updatead', upload.single('image'), (req, res) => {
    try{
        const decode = checkLevel(req.cookies.token, 40)
        if(decode)
        {
            const pk = req.body.pk;
            const adName = req.body.adName;
            const {image, isNull} = namingImagesPath("ad", req.file)
            let query = 'UPDATE ad_information_tb SET '
            let params = [adName]
            let colNames = ['ad_name']
            if(!isNull) { params.push(image); colNames.push('ad_image') }
            let {sql, param} = getSQLnParams(query, params, colNames)

            sql += ' WHERE pk=?'
            param.push(pk)

            if(param.length == 1)
                return response(req, res, -200, "입력된 데이터가 없습니다.", [])

            if(isNotNullOrUndefined(param))
            {
                db.query( sql, param, (err, result) => {
                    if (err) {
                        console.log(err)
                        response(req, res, -200, "광고 수정 실패", [])
                    } else {
                        response(req, res, 200, "광고 수정 성공", [])
                    }
                })
            }
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
//광고삭제
router.post('/deletead', (req, res) => {
    try{
        const decode = checkLevel(req.cookies.token, 40)
        if(decode)
        {
            const pk = req.body.pk
            const param = [pk]
            if(isNotNullOrUndefined(param))
            {
                let sql = "DELETE FROM ad_information_tb WHERE pk=?"
                db.query(sql, param, (err, result) => {
                    if (err) {
                        console.log(err)
                        response(req, res, -200, "광고 삭제 실패", [])
                    } else {
                        response(req, res, 200, "광고 삭제 성공", [])
                    }
                })
            }
            else
            {
                nullResponse(req, res)
            }
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
//------------------------------------------------------브랜드
//브랜드 리스트
router.get('/allbrand/:brandPk', (req, res)=>{
    try{
        let pk = req.params.brandPk;
        
        db.query('SELECT pk, middle_class_1,middle_class_2,middle_class_3,middle_class_4 FROM brand_information_tb WHERE brand_name=?',[pk],(err, result)=>{
            if(err){
                console.log(err)
            }
            else{
                response(req, res, 200, "성공", result[0])
            }
        })
    }
    catch(err){
        console.log(err)
        response(req, res, -200, "서버 에러 발생", [])
    }
})
router.get('/brand/:page', async (req, res) => {
    try{
        let decoded = checkLevel(req.cookies.token, 40);
        if(decoded)
        {
            let page = ((req.params.page || req.body.page) - 1) * 10;
            if(isNotNullOrUndefined([page]))
            {
                let keyword = req.query.keyword
                let rows = {}, brandList = {}
                let table = 'brand_information_tb'
                let columns = ['brand_name', 'middle_class_1', 'middle_class_2', 'middle_class_3', 'middle_class_4', 'middle_class_5', 'status', 'create_time']
                if(decoded.user_level == 50)
                {
                    if(keyword)
                        rows = await getRowsNumWithKeyword(table, columns, keyword)
                    else
                        rows = await getRowsNum(table)
                    
                    if(rows.code > 0)
                    {
                        if(keyword)
                            brandList = await getDatasWithKeywordAtPage(table, columns, keyword, page)
                        else
                            brandList = await getDatasAtPage(table, columns, page)

                        if (brandList.code > 0) 
                            await response(req, res, 200, "브랜드 조회 성공", { result: brandList.result, maxPage: rows.maxPage})
                        else 
                            await response(req, res, -200, "브랜드 조회 실패", []);
                    }
                    else
                        await response(req, res, -200, "브랜드 조회 실패", [])
                }
                else if(decoded.user_level == 40)
                {
                    let pk = decoded.code
                    let sql = `
                    SELECT COUNT(*) as TABLE_ROWS FROM brand_information_tb 
                    WHERE user_pk_list LIKE '%[${pk}]%' 
                    OR user_pk_list LIKE '%[${pk},%' 
                    OR user_pk_list LIKE '%,${pk},%' 
                    OR user_pk_list LIKE '%,${pk}]%'
                    `
                    rows = await dbQueryRows(sql).then(result => {return result})
                    if(rows.code > 0)
                    {
                        sql = `
                        SELECT pk, brand_name, middle_class_1, middle_class_2, middle_class_3, middle_class_4, middle_class_5, status, create_time FROM brand_information_tb 
                        WHERE user_pk_list LIKE '%[${pk}]%' 
                        OR user_pk_list LIKE '%[${pk},%' 
                        OR user_pk_list LIKE '%,${pk},%' 
                        OR user_pk_list LIKE '%,${pk}]%'
                        ORDER BY pk
                        LIMIT ${page}, 10
                        `
                        brandList = await dbQueryList(sql).then(result => {return result})
                        if(brandList.code > 0)
                            await response(req, res, 200, "관리자 브랜드 조회 성공", {result: brandList.result, maxPage: rows.maxPage})
                        else 
                            await response(req, res, -200, "브랜드 조회 실패", []);
                    }
                    else
                        await response(req, res, -200, "브랜드 조회 실패", [])
                }
            }
            else
            {
                nullResponse(req, res)
            }
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
//브랜드 추가
// router.post('/addbrand', (req, res, next) => {
//     if(checkLevel(req.cookies.token, 50))
//     {
//         const brandName = req.body.brandName
//         const middleClass1 = req.body.middleClass1
//         const middleClass2 = req.body.middleClass2
//         const middleClass3 = req.body.middleClass3
//         const middleClass4 = req.body.middleClass4
//         const status = req.body.status 
//         const param = [brandName, middleClass1, middleClass2, middleClass3, middleClass4, status]
//         if(isNotNullOrUndefined(param))
//         {
//             let sql = 'INSERT INTO brand_information_tb (brand_name, middle_class_1, middle_class_2, middle_class_3, middle_class_4) VALUES (?, ?, ?, ?, ?, ?)'
//             db.query(sql, param, (err, result) => {
//                 logRequestResponse(
//                     req,
//                     {
//                         query: sql,
//                         param: param,
//                         success: (err) ? false : true,
//                         err: (err) ? err.message : '' 
//                     }
//                 )
//                 if (err) {
//                     console.log(err)
//                     response(req, res, -200, "브랜드 추가 실패", [])
//                 } else {
//                     response(req, res, 200, "브랜드 추가 성공", [])
//                 }
//             })
//         }
//         else
//         {
//             nullResponse(req, res)
//         }
//     }
//     else
//         lowLevelResponse(req, res)
// })

//브랜드 수정
router.put('/updatebrand',  async (req, res) => {
    try{
        const decode = checkLevel(req.cookies.token, 40)
        if(decode)
        {
            const pk = req.body.pk;
            const brandName = req.body.name
            const middleClass1 = req.body.class1
            const middleClass2 = req.body.class2
            const middleClass3 = req.body.class3
            const middleClass4 = req.body.class4
            const status = req.body.status
            
            const param = [middleClass1, middleClass2, middleClass3, middleClass4]
           
            if(isNotNullOrUndefined(param))
            {   
                let pullSql = 'SELECT * FROM brand_information_tb WHERE pk=?'
               await db.query(pullSql, pk, async (err, result)=>{
                    if(err){
                        console.log(err)
                    }
                    else{
                        const firstbrandName = result[0].brand_name
                        const firstclass1 = result[0].middle_class_1
                        const firstclass2 = result[0].middle_class_2
                        const firstclass3 = result[0].middle_class_3
                        const firstclass4 = result[0].middle_class_4
                        const firststatus = result[0].status
                        const firstclassList = [firstclass1, firstclass2, firstclass3, firstclass4]
                        
                       
                        await db.query('SELECT * FROM item_information_tb WHERE brand_pk=?',pk, async (err,result)=>{
                            if(err){
                                console.log(err)
                            }
                            else{
                                for(var i=0; i<result.length;i++){
                                    for(var j=0;j<firstclassList.length;j++){
                                        if(firstclassList[j]==result[i].middle_class){
                                            await db.query('UPDATE item_information_tb SET middle_class=? WHERE pk=?',[param[j], result[i].pk],(err,result)=>{
                                                if(err){
                                                    console.log(err)
                                                }
                                                else{
                                                }
                                            })
                                        }
                                        
                                    }
                                }
                            }
                        })
                        let sql = 'UPDATE brand_information_tb SET brand_name=?, middle_class_1=?, middle_class_2=?, middle_class_3=?, middle_class_4=?, status=? WHERE pk=?'
                        await db.query( sql, [brandName ,middleClass1, middleClass2, middleClass3, middleClass4,status , pk], (err, result) => {
                        if (err) {
                            console.log(err)
                            response(req, res, -200, "브랜드 수정 실패", [])
                        } else {
                            
                            response(req, res, 200, "브랜드 수정 성공", [])
                            
                        }
                    }
                )
                    }
                })
            
            }
            else
            {
                nullResponse(req, res)
            }
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

//브랜드 삭제 
// router.delete('/deletebrand/:brandName', (req, res) => {
//     const decode = checkLevel(req.cookies.token, 0)
//     if(decode)
//     {
//         const brandName = req.body.brandName
//         const param = [brandName]
//         if(isNotNullOrUndefined(param))
//         {
//             let sql = "DELETE FROM brand_information_tb WHERE brand_name=?"
//             db.query(sql, param, (err, result) => {
//                 logRequestResponse(
//                     req,
//                     {
//                         query: sql,
//                         param: param,
//                         success: (err) ? false : true,
//                         err: (err) ? err.message : '' 
//                     }
//                 )
//                 if (err) {
//                     console.log(err)
//                     response(req, res, -200, "브랜드 삭제 실패", [])
//                 } else {
//                     response(req, res, 200, "브랜드 삭제 성공", [])
//                 }
//             })
//         }
//         else
//         {
//             nullResponse(req, res)
//         }
//     }
//     else
//         lowLevelResponse(req, res)
// })

//-------------------------------------------------------상품
//상품리스트
router.get('/product/:page', async (req, res) => {
    try{
        const decode = checkLevel(req.cookies.token, 0)
        if(decode)
        {
            let page = ((req.params.page || req.body.page) - 1) * 10;
            if(isNotNullOrUndefined([page]))
            {
                let keyword = req.query.keyword
                let rows = {}, brandList = {}, itemList = {}
                let table = 'brand_information_tb'
                let columns = ['pk', 'brand_name', 'user_pk_list']

                brandList = await getAllDatas(table, columns)
                if(brandList.code > 0)
                {
                    let brandPK = [], result = brandList.result
                    for(let i = 0; i < result.length; i++) 
                    {
                        pk_list = JSON.parse(result[i].user_pk_list)
                        if(pk_list.indexOf(decode.code) != -1)
                            brandPK.push(result[i].pk);
                        else
                            continue
                    }
                    if(brandPK.length == 0)
                        response(req, req, res, 200, "소유한 상품이 없습니다.", []);
                    else
                    {
                        
                        rows = await getItemRows(brandPK, keyword)
                        
                        
                        if(rows.code > 0)
                        {
                            itemList = await getItemList(brandPK, keyword, page)

                            if (itemList.code > 0) 
                                await response(req, res, 200, "상품 조회 성공", { result: itemList.result, maxPage: rows.maxPage})
                            else 
                                await response(req, res, -200, "상품 조회 실패", []);
                        }
                        else
                            await response(req, res, -200, "상품 조회 실패", [])
                    }
                }
                else
                    await response(req, res, -200, "상품 조회 실패", [])
            }
            else
            {
                nullResponse(req, res)
            }
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
//상품 수정
router.post('/updateitem', upload.fields([{name : 'mainImage'}, {name : 'detailImage'}, {name : 'qrImage'}]), (req, res) => {
    try{
        const decode = checkLevel(req.cookies.token, 0)
        if(decode)
        {
            const pk = req.body.pk
            const brandPK = req.body.brandPk
            const itemNum = req.body.itemNum
            const itemName = req.body.itemName
            const classification = req.body.classification
            const middleClass = req.body.middleClass
            const status = req.body.status

            const {mainImage, detailImage, qrImage, isNull} = namingImagesPath("product", req.files)
            let query = 'UPDATE item_information_tb SET '
            let params = [brandPK, itemNum, itemName, classification, middleClass, status]
            let colNames = ['brand_pk', 'item_num', 'item_name', 'classification','middle_class','status']

            if(!isNull[0]) { params.push(mainImage); colNames.push('main_image') }
            if(!isNull[1]) { params.push(detailImage); colNames.push('detail_image') }
            if(!isNull[2]) { params.push(qrImage); colNames.push('qr_image') }
            let {sql, param} = getSQLnParams(query, params, colNames)

            param.push(pk)
            sql += ' WHERE pk=?'

            if(isNotNullOrUndefined(param))
            {
                db.query( sql, param, (err, result) => {
                    if (err) {
                        console.log(err)
                        response(req, res, -200, "상품 수정 실패", [])
                    } else {
                        response(req, res, 200, "상품 수정 성공", [])
                    }
                })
            }
            else
            {
                nullResponse(req, res)
            }
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
//상품 삭제
router.post('/deleteitem', (req, res) => {
    try{
        const decode = checkLevel(req.cookies.token, 40)
        if(decode)
        {
            const pk = req.body.pk
            const param = [pk]
            if(isNotNullOrUndefined(param))
            {
                let sql = "DELETE FROM item_information_tb WHERE pk=?"
                db.query(sql, param, (err, result) => {
                    if (err) {
                        console.log(err)
                        response(req, res, -200, "상품 삭제 실패", [])
                    } else {
                        response(req, res, 200, "상품 삭제 성공", [])
                    }
                })
            }
            else
            {
                nullResponse(req, res)
            }
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

//-------------------------------------------------------키오스크api


module.exports = router;