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
  lowLevelResponse, response, removeItems
} = require('../util')
const {
  getRowsNumWithKeyword, getRowsNum, getAllDatas,
  getDatasWithKeywordAtPage, getDatasAtPage,
  getKioskList, getItemRows, getItemList, dbQueryList, dbQueryRows
} = require('../query-util')

const db = require('../config/db')
const { upload } = require('../config/multerConfig')
const { Console } = require('console')
const { abort } = require('process')
const { stringify } = require('querystring')
//const { pbkdf2 } = require('crypto')
const salt = "435f5ef2ffb83a632c843926b35ae7855bc2520021a73a043db41670bfaeb722"
const saltRounds = 10
const pwBytes = 64
const jwtSecret = "djfudnsqlalfKeyFmfRkwu"
router.get('/', (req, res) => {
  console.log("back-end initialized")
  res.send('back-end initialized')
});


//---------------------------------------------------------회원
//회원가입
router.post('/signup', (req, res, next) => {
  // 값 받아올 때, id, pw, userLevel, brandList
  try {
    const id = req.body.id
    const pw = req.body.pw
    const name = req.body.name
    const email = req.body.email
    const organization = req.body.organization
    console.log(req.body)
    //중복 체크 
    let sql = "SELECT * FROM user_table WHERE user_name=?"

    db.query(sql, [id], (err, result) => {
      if (result.length > 0)
        response(req, res, -200, "Usernames are duplicated", [])
      else {
        console.log(salt)
        crypto.pbkdf2(pw, salt, saltRounds, pwBytes, 'sha512', async (err, decoded) => {
          // bcrypt.hash(pw, salt, async (err, hash) => {
          let hash = decoded.toString('base64')

          if (err) {
            console.log(err)
            response(req, res, -200, "An error occurred during password encryption.", [])
          }
          else {
            sql = 'INSERT INTO user_table (user_name, password,name, email, organization) VALUES (?, ?, ?, ?, ?)'
            await db.query(sql, [id,hash, name, email, organization], (err, result) => {

              if (err) {
                console.log(err)
                response(req, res, -200, "Failed to add member", [])
              }
              else {
                response(req, res, 100, "Success to add member", [])
              }
            })
          }


        })
      }
    })

  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error.", [])
  }
})

// 권한 체크
router.get('/auth', (req, res, next) => {
  try {
    const decode = checkLevel(req.cookies.token, 0)

    if (decode) {
      let pk = decode.code
      console.log(pk)
      res.send({pk})
    }
    else {
      res.send({
        id: decode.id,
        first: false,
        second: false
      })
    }
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server error.", [])
  }
})

router.post('/login', (req, res, next) => {
  try {
    passport.authenticate('local', { session: false }, async (err, user, info) => {

      if (!user)
        return response(req, res, -200, "Account does not exist.", []);

      try {
        var expiresTime;

        expiresTime = '60m'

        const token = jwt.sign({
          code: user.pk,
          id: user.user_name,
          name: user.name,
          user_level: user.user_level

        },
          jwtSecret,
          {
            expiresIn: '60m',
            issuer: 'fori',
          });


        res.cookie("token", token, { httpOnly: true, maxAge: 60 * 60 * 1000 });

        return response(req, res, 200, 'Welcome to ALTDOT, '+user.name, []);
      }
      catch (err) {
        console.log(err);
        return response(req, res, -200, "Error Logging in.", [])
      }
    })(req, res, next);
  }
  catch (err) {
    console.log(err);
    response(req, res, -200, "Error Logging in.", [])
  }
})

router.post('/logout', (req, res, next) => {
  try {
    res.clearCookie('token')
    //res.clearCookie('rtoken')
    response(req, res, 200, "Logout success", [])
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
});

//------------------------------------------------영화
//영화 리스트 출력
router.get('/movie:page', (req, res, next) => {
  try {
    let page = (req.params.page - 1) * 10;

    db.query('SELECT * FROM movies ORDER BY pk DESC LIMIT ?, ?', [page, page + 10], async (err, result) => {
      if (err) {
        console.log(err);
      }
      else {
        await db.query('SELECT COUNT(*) FROM movies', (err, resl) => {
          console.log(resl)
          response(req, res, 100, { result: result, maxPage: resl })
        })


      }
    })
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "서버 에러 발생", [])
  }
});
//영화 수정
router.put('/updatemovie', upload.single('image'), (req, res) => {
  try {
    const decode = checkLevel(req.cookies.token, 40)
    if (decode) {
      const pk = req.body.pk;
      const movieName = req.body.adName;
      const { image, isNull } = namingImagesPath("movie", req.file)
      let query = 'UPDATE movies SET '
      let params = [movieName]
      let colNames = ['ad_name']
      if (!isNull) { params.push(image); colNames.push('movie_image') }
      let { sql, param } = getSQLnParams(query, params, colNames)
      sql += ' WHERE pk=?'
      param.push(pk)

      if (param.length == 1)
        return response(req, res, -200, "입력된 데이터가 없습니다.", [])

      if (isNotNullOrUndefined(param)) {
        db.query(sql, param, (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "영화 수정 실패", [])
          } else {
            response(req, res, 200, "영화 수정 성공", [])
          }
        })
      }
    }
    else
      lowLevelResponse(req, res)
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "서버 에러 발생", [])
  }
})
//영화 삭제
router.post('/deletemovie', (req, res) => {
  try {
    const decode = checkLevel(req.cookies.token, 40)
    if (decode) {
      const pk = req.body.pk
      const param = [pk]
      if (isNotNullOrUndefined(param)) {
        let sql = "DELETE FROM movies WHERE pk=?"
        db.query(sql, param, (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "영화 삭제 실패", [])
          } else {
            response(req, res, 200, "영화 삭제 성공", [])
          }
        })
      }
      else {
        nullResponse(req, res)
      }
    }
    else
      lowLevelResponse(req, res)
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "서버 에러 발생", [])
  }
})
//영화 예매
router.post('/ticketingmovie', async (req, res) => {
  try {
    if (checkLevel(req.cookies.token, 0)) {
      const userPk = req.body.userPk;
      const seatNum = req.body.seatNum;
      const moviePk = req.body.movieNum;
      await db.query('SELECT seat FROM movies WHERE pk=?', moviePk, async (err, result) => {
        if (err) {
          console.log(err);
        }
        else {
          const movie_seat = JSON.parse(result[0].seat);
          if (movie_seat[seatNum - 1] != 0) {
            response(req, res, -100, "이미 예약이 된 좌석 입니다.", []);
          }
          else {
            movie_seat[seatNum - 1] = userPk;

            const string = JSON.stringify(movie_seat);

            await db.query('UPDATE movies SET seat=? WHERE pk=?', [string, moviePk], (err, result) => {
              if (err) {
                console.log(err);
              }
              else {
                response(req, res, 200, "영화 예매 성공", [])
              }
            })
            await db.query('SELECT my_seat FROM users WHERE pk=?', userPk, async (err, result) => {
              if (err) {
                console.log(err);
              }
              else {
                const user_seat = JSON.parse(result[0].my_seat);
                user_seat.push(moviePk * 100 + seatNum);

                const string = JSON.stringify(user_seat);

                await db.query('UPDATE users SET my_seat=? WHERE pk=?', [string, userPk], (err, result) => {
                  if (err) {
                    console.log(err);
                  }
                })
              }
            })
          }
        }
      })
    }
    else
      lowLevelResponse(req, res);
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "서버 에러 발생", [])
  }
});
//자신의 프로필 출력
router.get('/myprofile:pk', (req, res) => {
  try {
    const pk = req.params.pk
    if (checkLevel(req.cookies.token, 0)) {
      db.query('SELECT * FROM users WHERE pk=?',pk,(err, result)=>{
        if(err){
          console.log(err);
        }
        else{
          response(req, res, 200, "프로필 출력 성공", [result])
        }
      })
    }
    else
      lowLevelResponse(req, res);
    }
    catch (err) {
    console.log(err)
    response(req, res, -200, "서버 에러 발생", [])
  }
});
//자신이 예매한 영화 출력
router.get('/ordermovie:pk',(req, res)=>{
  try {
    const pk = req.params.pk;
    db.query('SELECT * FROM movies WHERE pk=?',pk,(err,result)=>{
      if(err){
        console.log(err)
      }
      else{
        response(req, res, 200, "영화 가져오기 성공", result[0])
      }
    })
    }
    catch (err) {
      console.log(err)
      response(req, res, -200, "서버 에러 발생", [])
    }
})
//영화 예매 취소
router.post('/cancelmovie', async (req, res) => {
  try {
    if (checkLevel(req.cookies.token, 0)) {
      const userPk = req.body.userPk;
      const seatNum = req.body.seatNum;
      const moviePk = req.body.movieNum;
      await db.query('SELECT seat FROM movies WHERE pk=?', moviePk, async (err, result) => {
        if (err) {
          console.log(err);
        }
        else {
          const movie_seat = JSON.parse(result[0].seat);
          if (movie_seat[seatNum - 1] != 0) {


            movie_seat[seatNum - 1] = 0;

            const string = JSON.stringify(movie_seat);

            await db.query('UPDATE movies SET seat=? WHERE pk=?', [string, moviePk], (err, result) => {
              if (err) {
                console.log(err);
              }
              else {
                response(req, res, 200, "영화 취소 성공", [])
              }
            })
            await db.query('SELECT my_seat FROM users WHERE pk=?', userPk, async (err, result) => {
              if (err) {
                console.log(err);
              }
              else {
                const user_seat = JSON.parse(result[0].my_seat);
                for (var i = 0; i < user_seat.length; i++) {
                  if (user_seat[i] == moviePk * 100 + seatNum) {
                    user_seat.splice(i, 1);
                    break;
                  }
                }
                const string = JSON.stringify(user_seat);
                console.log(string)
                await db.query('UPDATE users SET my_seat=? WHERE pk=?', [string, userPk], (err, result) => {
                  if (err) {
                    console.log(err);
                  }
                })
              }
            })


          }
          else {
            response(req, res, -100, "이미 취소가 된 좌석 입니다.", []);
          }
        }
      })
    }
    else
      lowLevelResponse(req, res);
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "서버 에러 발생", [])
  }
});
//광고리스트
router.get('/ad/:page', async (req, res) => {
  try {
    if (checkLevel(req.cookies.token, 40)) {
      let page = ((req.params.page || req.body.page) - 1) * 10;
      if (isNotNullOrUndefined([page])) {
        let keyword = req.query.keyword
        let rows = {}, adList = {}
        let table = 'ad_information_tb'
        let columns = ['ad_name', 'ad_image', 'create_time']

        if (keyword)
          rows = await getRowsNumWithKeyword(table, columns, keyword)
        else
          rows = await getRowsNum(table)

        if (rows.code > 0) {
          if (keyword)
            adList = await getDatasWithKeywordAtPage(table, columns, keyword, page)
          else
            adList = await getDatasAtPage(table, columns, page)

          if (adList.code > 0)
            await response(req, res, 200, "광고 조회 성공", { result: adList.result, maxPage: rows.maxPage })
          else
            await response(req, res, -200, "광고 조회 실패", []);
        }
        else
          await response(req, res, -200, "광고 조회 실패", [])
      }
      else {
        nullResponse(req, res)
      }
    }
    else
      lowLevelResponse(req, res)
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "서버 에러 발생", [])
  }
})


module.exports = router;