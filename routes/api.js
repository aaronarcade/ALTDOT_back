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


//---------------------------------------------------------
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
            await db.query(sql, [id, hash, name, email, organization], (err, result) => {

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
      let id = decode.id
      let organization = decode.organization
      let name = decode.name
      res.send({ pk, id, name, organization })
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
        const id = req.body.id
        const organization = req.body.organization
        await db.query('SELECT * FROM user_table WHERE user_name=?', [id], (err, result) => {
          if (err) {
            console.log(err)
          }
          else {
            if (organization != result[0].organization) {
              return response(req, res, -200, "Error Organization.", [])
            }
            else {
              var expiresTime;

              expiresTime = '60m'

              const token = jwt.sign({
                code: user.pk,
                id: user.user_name,
                name: user.name,
                user_level: user.user_level,
                organization: user.organization
              },
                jwtSecret,
                {
                  expiresIn: '60m',
                  issuer: 'fori',
                });


              res.cookie("token", token, { httpOnly: true, maxAge: 60 * 60 * 1000 });

              return response(req, res, 200, 'Welcome to ATLDOT, ' + user.name, []);
            }
          }
        })

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

//------------------------------------------------bus
//정류장 추가
router.post('/addstation', (req, res, next) => {
  try {
    const organization = req.body.organization
    const stopId = req.body.stopId
    const tier = req.body.tier
    const riderQuin = req.body.riderQuin
    const stopName = req.body.stopName
    const problems = req.body.problems
    const suggestions = req.body.suggestions
    if (organization == 'MARTA') {
      db.query('INSERT INTO marta_bus_table (stop_id, tier, ridership_quintile, stop_name) VALUE (?, ?, ?, ?)',
        [stopId, tier, riderQuin, stopName], (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "Failed to add station", [])
          }
          else {
            response(req, res, 100, "Success to add station", [])
          }
        })
    }
    else if (organization == 'ATLDOT') {
      db.query('INSERT INTO atldot_bus_table (stop_id, tier, ridership_quintile, stop_name) VALUE (?, ?, ?, ?)',
        [stopId, tier, riderQuin, stopName], (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "Failed to add station", [])
          }
          else {
            response(req, res, 100, "Success to add station", [])
          }
        })
    }
    else {
      console.log(err)
      response(req, res, -200, "Organization Error", [])
    }
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//정류장 출력
router.get('/stations/:org/:modify', (req, res, next) => {
  try {
    const org = req.params.org
    const modify = req.params.modify
    if (org == 'MARTA') {
      db.query('SELECT * FROM marta_bus_table WHERE modify=? ORDER BY pk DESC', [modify], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to take station", [])
        }
        else {
          response(req, res, 100, "Success to take station", result)
        }
      })
    }
    else if (org == 'ATLDOT') {
      db.query('SELECT * FROM atldot_bus_table WHERE modify=? ORDER BY pk DESC', [modify], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to take station", [])
        }
        else {
         
          response(req, res, 100, "Success to take station", result)
        }
      })
    }
    else {
      console.log(err)
      response(req, res, -200, "Organization Error", [])
    }
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//정류장 하나 출력
router.get('/onestation/:pk/:org', (req, res, next) => {
  try {
    const pk = req.params.pk
    const org = req.params.org
    if (org == 'MARTA') {
      db.query('SELECT * FROM marta_bus_table WHERE pk=?', [pk], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to take station", [])
        }
        else {
          
          response(req, res, 100, "Success to take station", result[0])
        }
      })
    }
    else if (org == 'ATLDOT') {
      db.query('SELECT * FROM atldot_bus_table WHERE pk=?', [pk], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to take station", [])
        }
        else {
          
          response(req, res, 100, "Success to take station", result[0])
        }
      })
    }
    else {
      console.log(err)
      response(req, res, -200, "Organization Error", [])
    }
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
// 리스트 오른쪽으로 이동
router.post('/addmodify', (req, res, next) => {
  try {
    const pk = req.body.pk
    const org = req.body.org
    if (org == 'MARTA') {
      db.query('UPDATE marta_bus_table SET modify=1 WHERE pk=?', [pk], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to change modify", [])
        }
        else {
          response(req, res, 100, "Success to change modify", [])
        }
      })
    }
    else if (org == 'ATLDOT') {
      db.query('UPDATE atldot_bus_table SET modify=1 WHERE pk=?', [pk], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to change modify", [])
        }
        else {
          response(req, res, 100, "Success to change modify", [])
        }
      })
    }
    else {
      console.log(err)
      response(req, res, -200, "Organization Error", [])
    }
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//problem 추가
router.post('/addproblem', (req, res, next) => {
  try {
    const pk = req.body.pk
    let list = req.body.list
    list = JSON.parse(list);
    let arr = [];
    for (var i = 0; i < list.length; i++) {
      arr.push([
        list[i].date,
        list[i].initiated,
        list[i].org,
        list[i].type,
        list[i].note,
        pk
      ]);
    }
    
    let sql = 'INSERT INTO problem_table (date, name, organization, type, notes, bus_pk) VALUES ?'
     db.query(sql, [arr],async (err, result) => {
      if (err) {
        console.log(err)
        response(req, res, -200, "Failed to insert problems", [])
      }
      else {
        await db.query('SELECT type FROM problem_table WHERE bus_pk=? ORDER BY pk DESC LIMIT 1',[pk], async (err,result)=>{
          if(err){
            console.log(err)
            response(req, res, -200, "Failed to insert problems", [])
          }
          else{
            const problem = result[0].type
           
            await db.query('UPDATE marta_bus_table SET problems=? WHERE pk=?',[problem,pk],(err, result)=>{
              if(err){
                console.log(err)
                response(req, res, -200, "Failed to insert problems", [])
              }
              else{
                response(req, res, 100, "Success to insert problems", [])
              }
            })
          }
        })
        
      }
    })
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//update 교체
router.post('/updatecreate', (req, res, next) => {
  try {
    const createBy = req.body.create
    const pk = req.body.pk
    const org = req.body.org
    if (org == 'MARTA') {
      db.query('UPDATE marta_bus_table SET create_by=? WHERE pk=?', [createBy, pk], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to change creator", [])
        }
        else {
          response(req, res, 100, "Success to change creator", [])
        }
      })
    }
    else if (org == 'ATLDOT') {
      db.query('UPDATE atldot_bus_table SET create_by=? WHERE pk=?', [createBy, pk], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to change creator", [])
        }
        else {
          response(req, res, 100, "Success to change creator", [])
        }
      })
    }
    else {
      console.log(err)
      response(req, res, -200, "Organization Error", [])
    }
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//atldot 추가
router.post('/addsuggestion', (req, res, next) => {
  try {
    const pk = req.body.pk
    let list = req.body.list
    list = JSON.parse(list);
    let arr = [];
    for (var i = 0; i < list.length; i++) {
      arr.push([
        list[i].date,
        list[i].initiated,
        list[i].org,
        list[i].amenity,
        list[i].note,
        pk
      ]);
    }
    
    let sql = 'INSERT INTO suggestion_table (date, name, organization, amenity, notes, bus_pk) VALUES ?'
     db.query(sql, [arr],async (err, result) => {
      if (err) {
        console.log(err)
        response(req, res, -200, "Failed to insert suggestions", [])
      }
      else {
        await db.query('SELECT amenity FROM suggestion_table WHERE bus_pk=? ORDER BY pk DESC LIMIT 1',[pk], async (err,result)=>{
          if(err){
            console.log(err)
            response(req, res, -200, "Failed to insert suggestions", [])
          }
          else{
            const problem = result[0].amenity
           
            await db.query('UPDATE atldot_bus_table SET suggestions=? WHERE pk=?',[problem,pk],(err, result)=>{
              if(err){
                console.log(err)
                response(req, res, -200, "Failed to insert suggestions", [])
              }
              else{
                response(req, res, 100, "Success to insert suggestions", [])
              }
            })
          }
        })
        
      }
    })
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//problem 출력
router.get('/problems/:pk', (req, res, next) => {
  try {
    const pk = req.params.pk
    db.query('SELECT * FROM problem_table WHERE bus_pk=? ORDER BY pk DESC', [pk], (err, result) => {
      if (err) {
        console.log(err)
        response(req, res, -200, "Failed to take station", [])
      }
      else {
        
        response(req, res, 100, "Success to take station", result)
      }
    })
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//suggestion 출력
router.get('/suggestions/:pk', (req, res, next) => {
  try {
    const pk = req.params.pk
    db.query('SELECT * FROM suggestion_table WHERE bus_pk=? ORDER BY pk DESC', [pk], (err, result) => {
      if (err) {
        console.log(err)
        response(req, res, -200, "Failed to take station", [])
      }
      else {
        
        response(req, res, 100, "Success to take station", result)
      }
    })
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//image 불러오기
router.get('/image/:pk/:org', (req, res, next) => {
  try {
    const pk = req.params.pk
    const org = req.params.org
    
      db.query('SELECT * FROM image_table WHERE bus_pk=? AND organization=? ORDER BY pk DESC',[pk,org],(err, result)=>{
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to take image", [])
        }
        else {
          response(req, res, 100, "Success to take image", result[0])
        }
      })
    
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//영화 리스트 출력



module.exports = router;