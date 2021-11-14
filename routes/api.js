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
    console.log(modify)


    let keyword = req.query.keyword
    keyword = '%' + keyword + '%'
    let page = (req.query.page-1)*500
    console.log(req.query)
    if (org == 'MARTA') {
      db.query('SELECT ridership_data FROM marta_bus_table ORDER BY ridership_data DESC  LIMIT 200', async (err, resl) => {
        const marta200 = resl[199].ridership_data;
        let top200 = '';
        let tier = '';
        let rq = '';
        let issue = '';
        let ada = '';
        let count = 0;
        let string = 'AND (';
        if (req.query.top200 == 'true') {
          count = 1;
          top200 = 'ridership_data >= ' + marta200 + ' ';
        }
        if (req.query.tier != '6') {
          if (count > 0) {
            tier = 'AND tier=' + req.query.tier + ' ';
          }
          else {
            tier = 'tier=' + req.query.tier + ' ';
          }
          count = 2;
        }
        if (req.query.rq != '6') {
          if (count > 0) {
            rq = 'AND ridership_quintile=' + req.query.rq + ' ';
          }
          else {
            rq = 'ridership_quintile=' + req.query.rq + ' ';
          }
          count = 3;
        }
        if (req.query.issue != '') {
          if (count > 0) {
            issue = "AND problems LIKE '%" + req.query.issue + "%'";
          }
          else {
            issue = "problems LIKE '%" + req.query.issue + "%'";
          }
          count = 4;
        }
        if(req.query.ada != ''){
          if (count > 0) {
            ada = "AND ada_access='" + req.query.ada + "' ";
          }
          else {
            ada = "ada_access='" + req.query.ada + "' ";
          }
          count = 5;
        }
        string = string + top200 + tier + rq + issue +ada + ')'
        let sql = '';
        if (count > 0) {
          sql = 'SELECT * FROM marta_bus_table WHERE modify=? AND (stop_name LIKE ? OR stop_id LIKE ? OR problems LIKE ?) ' + string + ' ORDER BY pk DESC LIMIT ? , 500'
        }
        else {
          sql = 'SELECT * FROM marta_bus_table WHERE modify=? AND (stop_name LIKE ? OR stop_id LIKE ? OR problems LIKE ?) ORDER BY pk DESC LIMIT ? , 500';
        }
        console.log(sql)
        await db.query(sql, [modify, keyword, keyword,keyword, page], (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "Failed to take station", [])
          }
          else {
            for (var i = 0; i < result.length; i++) {
              if (result[i].ridership_data >= marta200) {
                result[i].color = '#D2EAC7';
              }
              else {
                result[i].color = 'white';
              }
            }
            response(req, res, 100, "Success to take station", result)
          }
        })
      })
    }
    else if (org == 'ATLDOT') {
      db.query('SELECT ridership_data FROM atldot_bus_table ORDER BY ridership_data DESC LIMIT 200', async (err, resl) => {
        const atldot200 = resl[199].ridership_data;
        let top200 = '';
        let tier = '';
        let rq = '';
        let issue = '';
        let ada = '';
        let count = 0;
        let string = 'AND (';
        console.log(req.query)
        if (req.query.top200 == 'true') {
          count = 1;
          top200 = 'ridership_data >= ' + atldot200 + ' ';
        }
        if (req.query.tier != '6') {
          if (count > 0) {
            tier = 'AND tier=' + req.query.tier + ' ';
          }
          else {
            tier = 'tier=' + req.query.tier + ' ';
          }
          count = 2;
        }
        if (req.query.rq != '6') {
          if (count > 0) {
            rq = 'AND ridership_quintile=' + req.query.rq + ' ';
          }
          else {
            rq = 'ridership_quintile=' + req.query.rq + ' ';
          }
          count = 3;
        }
        if (req.query.issue != '') {
          if (count > 0) {
            issue = "AND suggestions LIKE '%" + req.query.issue + "%'";
          }
          else {
            issue = "suggestions LIKE '%" + req.query.issue + "%'";
          }
          count = 4;
        }
        if(req.query.ada != ''){
          if (count > 0) {
            ada = "AND ada_access='" + req.query.ada + "' ";
          }
          else {
            ada = "ada_access='" + req.query.ada + "' ";
          }
          count = 5;
        }
        string = string + top200 + tier + rq + issue + ada + ')'
        let sql = '';
        if (count > 0) {
          sql = 'SELECT * FROM atldot_bus_table WHERE modify=? AND (stop_name LIKE ? OR stop_id LIKE ? OR suggestions LIKE ?) ' + string + 'ORDER BY pk DESC LIMIT ? , 500'
        }
        else {
          sql = 'SELECT * FROM atldot_bus_table WHERE modify=? AND (stop_name LIKE ? OR stop_id LIKE ? OR suggestions LIKE ?) ORDER BY pk DESC LIMIT ? , 500';
        }

        await db.query(sql, [modify, keyword, keyword,keyword, page], (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "Failed to take station", [])
          }
          else {
            for (var i = 0; i < result.length; i++) {
              if (result[i].ridership_data >= atldot200) {
                result[i].color = '#D2EAC7';
              }
              else {
                result[i].color = 'white';
              }
            }
            response(req, res, 100, "Success to take station", result)
          }
        })
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
//페이지 갯수만 출력
router.get('/maxpage/:org/:modify', (req, res, next) => {
  try {
    const org = req.params.org
    const modify = req.params.modify
    console.log(modify)
    let keyword = req.query.keyword
    keyword = '%' + keyword + '%'
    console.log(req.query.top200)
    if (org == 'MARTA') {
      db.query('SELECT ridership_data FROM marta_bus_table ORDER BY ridership_data DESC LIMIT 200', async (err, resl) => {
        const marta200 = resl[199].ridership_data;
        let top200 = '';
        let tier = '';
        let rq = '';
        let issue = '';
        let ada = '';
        let count = 0;
        let string = 'AND (';
        if (req.query.top200 == 'true') {
          count = 1;
          top200 = 'ridership_data >= ' + marta200 + ' ';
        }
        if (req.query.tier != '6') {
          if (count > 0) {
            tier = 'AND tier=' + req.query.tier + ' ';
          }
          else {
            tier = 'tier=' + req.query.tier + ' ';
          }
          count = 2;
        }
        if (req.query.rq != '6') {
          if (count > 0) {
            rq = 'AND ridership_quintile=' + req.query.rq + ' ';
          }
          else {
            rq = 'ridership_quintile=' + req.query.rq + ' ';
          }
          count = 3;
        }
        if (req.query.issue != '') {
          if (count > 0) {
            issue = "AND problems LIKE '%" + req.query.issue + "%'";
          }
          else {
            issue = "problems LIKE '%" + req.query.issue + "%'";
          }
          count = 4;
        }
        if(req.query.ada != ''){
          if (count > 0) {
            ada = "AND ada_access='" + req.query.ada + "' ";
          }
          else {
            ada = "ada_access='" + req.query.ada + "' ";
          }
          count = 5;
        }
        string = string + top200 + tier + rq + issue +ada + ')'
        let sql = '';
        if (count > 0) {
          sql = 'SELECT COUNT(*) FROM marta_bus_table WHERE modify=? AND (stop_name LIKE ? OR stop_id LIKE ?) ' + string
        }
        else {
          sql = 'SELECT COUNT(*) FROM marta_bus_table WHERE modify=? AND (stop_name LIKE ? OR stop_id LIKE ?) ';
        }
        await db.query(sql, [modify, keyword, keyword], (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "Failed to take max page", [])
          }
          else {
            response(req, res, 100, "Success to take max page", parseInt(result[0]['COUNT(*)']/500+1))
          }
        })
      })
    }
    else if (org == 'ATLDOT') {
      db.query('SELECT ridership_data FROM atldot_bus_table ORDER BY ridership_data DESC LIMIT 200', async (err, resl) => {
        const atldot200 = resl[199].ridership_data;
        let top200 = '';
        let tier = '';
        let rq = '';
        let issue = '';
        let ada = '';
        let count = 0;
        let string = 'AND (';
        console.log(req.query)
        if (req.query.top200 == 'true') {
          count = 1;
          top200 = 'ridership_data >= ' + atldot200 + ' ';
        }
        if (req.query.tier != '6') {
          if (count > 0) {
            tier = 'AND tier=' + req.query.tier + ' ';
          }
          else {
            tier = 'tier=' + req.query.tier + ' ';
          }
          count = 2;
        }
        if (req.query.rq != '6') {
          if (count > 0) {
            rq = 'AND ridership_quintile=' + req.query.rq + ' ';
          }
          else {
            rq = 'ridership_quintile=' + req.query.rq + ' ';
          }
          count = 3;
        }
        if (req.query.issue != '') {
          if (count > 0) {
            issue = "AND suggestions LIKE '%" + req.query.issue + "%'";
          }
          else {
            issue = "suggestions LIKE '%" + req.query.issue + "%'";
          }
          count = 4;
        }
        if(req.query.ada != ''){
          if (count > 0) {
            ada = "AND ada_access='" + req.query.ada + "' ";
          }
          else {
            ada = "ada_access='" + req.query.ada + "' ";
          }
          count = 5;
        }
        string = string + top200 + tier + rq + issue + ada + ')'
        let sql = '';
        if (count > 0) {
          sql = 'SELECT COUNT(*) FROM atldot_bus_table WHERE modify=? AND (stop_name LIKE ? OR stop_id LIKE ?) ' + string
        }
        else {
          sql = 'SELECT COUNT(*) FROM atldot_bus_table WHERE modify=? AND (stop_name LIKE ? OR stop_id LIKE ?) ';
        }

        await db.query(sql, [modify, keyword, keyword], (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "Failed to take max page", [])
          }
          else {
            response(req, res, 100, "Success to take max page", parseInt(result[0]['COUNT(*)']/500+1))
          }
        })
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
//다시 왼쪽으로 이동
router.post('/stopmodify', (req, res, next) => {
  try {
    const pk = req.body.pk
    const org = req.body.org
    if (org == 'MARTA') {
      db.query('UPDATE marta_bus_table SET modify=0 WHERE pk=?', [pk], (err, result) => {
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
      db.query('UPDATE atldot_bus_table SET modify=0 WHERE pk=?', [pk], (err, result) => {
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
router.post('/addproblem', async (req, res, next) => {
  try {
    const pk = req.body.pk
    let list = req.body.list
    console.log(req.body)
    list = JSON.parse(list);
    let arr = [];
    for (var i = 0; i < list.length; i++) {
          arr.push([
            list[i].date,
            list[i].name,
            list[i].organization,
            list[i].type,
            list[i].status,
            list[i].notes,
            pk
          ]);
    }
    await db.query('DELETE FROM problem_table WHERE status!="Complete"', async (err, result) => {
      if (err) {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to insert problems", [])
        }
      }
      else {
        let sql = 'INSERT INTO problem_table (date, name, organization, type, status, notes, bus_pk) VALUES ?'
        await db.query(sql, [arr], async (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "Failed to insert problems", [])
          }
          else {

            await db.query('SELECT DISTINCT type FROM problem_table WHERE bus_pk=? AND status!="Complete" ORDER BY pk DESC', [pk], async (err, result) => {
              if (err) {
                console.log(err)
                response(req, res, -200, "Failed to insert problems", [])
              }
              else {
                console.log(result)
                let string = '';
                for (var i = 0; i < result.length; i++) {
                  string += result[i].type + ', ';
                }
                string = string.substring(0, string.length - 2)

                await db.query('UPDATE marta_bus_table SET problems=? WHERE pk=?', [string, pk], (err, result) => {
                  if (err) {
                    console.log(err)
                    response(req, res, -200, "Failed to insert problems", [])
                  }
                  else {
                    response(req, res, 100, "Success to insert problems", [])
                  }
                })
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
//problem 삭제
router.post('/deleteproblem', (req, res, next) => {
  try {
    const pk = req.body.pk
    db.query('DELETE FROM problem_table WHERE pk=?',[pk],(err, result)=>{
      if (err) {
        console.log(err)
        response(req, res, -200, "Failed to delete problem", [])
      }
      else {
        response(req, res, 200, "Success to delete problem", [])
      }
    })
  }
  catch (err) {
    console.log(err)
    response(req, res, -200, "Server Error", [])
  }
})
//suggestion 삭제
  router.post('/deletesuggestion', (req, res, next) => {
    try {
      const pk = req.body.pk
      db.query('DELETE FROM suggestion_table WHERE pk=?',[pk],(err, result)=>{
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to delete suggestion", [])
        }
        else {
          response(req, res, 200, "Success to delete suggestion", [])
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
    console.log(req.body)
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
//suggestion 추가
router.post('/addsuggestion', async (req, res, next) => {
  try {
    const pk = req.body.pk
    let list = req.body.list
    console.log(req.body)
    list = JSON.parse(list);
    let arr = [];
    for (var i = 0; i < list.length; i++) {
      
          arr.push([
            list[i].date,
            list[i].name,
            list[i].organization,
            list[i].amenity,
            list[i].status,
            list[i].notes,
            pk
          ]);
        
    }
    console.log(arr)
    await db.query('DELETE FROM suggestion_table WHERE status!="Complete"', async (err, result) => {
      if (err) {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to insert suggestions", [])
        }
      }
      else {
        let sql = 'INSERT INTO suggestion_table (date, name, organization, amenity, status, notes, bus_pk) VALUES ?'
        await db.query(sql, [arr], async (err, result) => {
          if (err) {
            console.log(err)
            response(req, res, -200, "Failed to insert suggestions", [])
          }
          else {

            await db.query('SELECT DISTINCT amenity FROM suggestion_table WHERE bus_pk=? AND status!="Complete" ORDER BY pk DESC', [pk], async (err, result) => {
              if (err) {
                console.log(err)
                response(req, res, -200, "Failed to insert suggestions", [])
              }
              else {
                console.log(result)
                let string = '';
                for (var i = 0; i < result.length; i++) {
                  string += result[i].amenity + ', ';
                }
                string = string.substring(0, string.length - 2)

                await db.query('UPDATE atldot_bus_table SET suggestions=? WHERE pk=?', [string, pk], (err, result) => {
                  if (err) {
                    console.log(err)
                    response(req, res, -200, "Failed to insert suggestions", [])
                  }
                  else {
                    response(req, res, 100, "Success to insert suggestions", [])
                  }
                })
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
    const status = req.query.status
    if (status == 'Complete') {
      db.query('SELECT * FROM problem_table WHERE bus_pk=? AND status=? ORDER BY pk DESC', [pk, status], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to take station", [])
        }
        else {
          console.log(100)
          response(req, res, 100, "Success to take station", result)
        }
      })
    }
    else {
      db.query('SELECT * FROM problem_table WHERE bus_pk=? AND status!="Complete" ORDER BY pk ASC', [pk], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to take station", [])
        }
        else {
          console.log(result)
          for (var i = 0; i < result.length; i++) {
            if(result[i].type=='Curb Conflict'||result[i].type=='Sidewalk Improv'||result[i].type=='Sidewalk Conn'||result[i].type=='ADA'||result[i].type=='ROW'||result[i].type=='Streetlight'||
            result[i].type=='Crossing'||result[i].type=='Vegetation'||result[i].type=='Construction'||result[i].type=='Trash'||result[i].type=='Trash Can'||result[i].type=='Homeless'){
              result[i].firsttype = result[i].type
            }
            else{
              result[i].firsttype = 'Other'
            }
            result[i].firststatus = result[i].status
          }
          response(req, res, 100, "Success to take station", result)
        }
      })
    }

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
    const status = req.query.status
    if (status == 'Complete') {
      db.query('SELECT * FROM suggestion_table WHERE bus_pk=? AND status=? ORDER BY pk DESC', [pk, status], (err, result) => {
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
      db.query('SELECT * FROM suggestion_table WHERE bus_pk=? AND status!="Complete" ORDER BY pk ASC', [pk], (err, result) => {
        if (err) {
          console.log(err)
          response(req, res, -200, "Failed to take station", [])
        }
        else {
          console.log(result)
          for (var i = 0; i < result.length; i++) {
            result[i].firststatus = result[i].status
            if(result[i].amenity=='Bench'||result[i].amenity=='Simme Seat'||result[i].amenity=='Shelter'||result[i].amenity=='Pad'||result[i].amenity=='Trash Can'){
              result[i].firstamenity = result[i].amenity
            }
            else{
              result[i].firstamenity = 'Other'
            }
          }
          response(req, res, 100, "Success to take station", result)
        }
      })
    }

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

    db.query('SELECT * FROM image_table WHERE bus_pk=? AND organization=? ORDER BY pk DESC', [pk, org], (err, result) => {
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




module.exports = router;