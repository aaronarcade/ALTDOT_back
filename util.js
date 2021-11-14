//const { request } = require('express')
const jwt = require('jsonwebtoken')
const db = require('./config/db')
const jwtSecret = "djfudnsqlalfKeyFmfRkwu"

let checkLevel = (token, level) => {
    try{
        if(token == undefined)
            return false

        //const decoded = jwt.decode(token)
        const decoded = jwt.verify(token, jwtSecret, (err,decoded) => {
            //console.log(decoded)
            if(err) {
                console.log("token이 변조되었습니다." + err);
                return false
            }
            else return decoded;
        })
        const user_level = decoded.user_level
        console.log(user_level)
        if(level > user_level)
            return false
        else
            return decoded
    }
    catch(err)
    {
        console.log(err)
        return false
    }
}

const lowLevelException = {
    code: 403,
    message: "권한이 없습니다."
}
const nullRequestParamsOrBody = {
    code: 400,
    message: "입력이 잘못되었습니다.(요청 데이터 확인)"
}

const logRequestResponse = (req, res) => {

    let requestIp;
    try{
        requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip || '0.0.0.0'
    }catch(err){
        requestIp = '0.0.0.0'
    }

    let request = {
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        params: req.params, 
        body: req.body,
        file: req.file || req.files || null
    }
    request = JSON.stringify(request)
    let response = JSON.stringify(res)
    // console.log(request)
    // console.log(response)

    

}
const logRequest = (req) => {
    const requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip
    let request = {
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        params: req.params, 
        body: req.body
    }
    request = JSON.stringify(request)
    
}
const logResponse = (req, res) => {
    const requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip
    let response = JSON.stringify(res)
    // db.query(
    //     "UPDATE log_information_tb SET response=? WHERE request_ip=? ORDER BY pk DESC LIMIT 1",
    //     [response, requestIp],
    //     (err, result, fields) => {
    //         if(err)
    //             console.log(err)
    //         else {
    //             console.log(result)
    //         }
    //     }
    // )
}

/*

*/
const getUserPKArrStrWithNewPK = (userPKArrStr, newPK) => {
    let userPKList = JSON.parse(userPKArrStr)
    if(userPKList.indexOf(newPK) == -1)
        userPKList.push(newPK)
    return JSON.stringify(userPKList)
}

const isNotNullOrUndefined = (paramList) => {
    for(let i in paramList)
        if(i == undefined || i == null)
            return false
    return true
}

//이미지 저장소 설정
const namingImagesPath = (api, files) => {
    if(api == "image")
    {
        return { 
            image: (files) ? "/image/" + files.filename : "/image/defaultMovie.png", 
            isNull: !(files) 
        }
    }
    else if(api == "pdf"){
        
    }
}
function removeItems(arr, value) {
    var i = 0;
    while (i < arr.length) {
      if (arr[i] === value) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }
    return arr;
}

function getSQLnParams(query, params, colNames) {
    let sql = query
    let returnParams = []

    for(let i = 0, count = 0; i < params.length; i++)
    {
        if(params[i])
        {
            if(count > 0)
                sql+=', '
            sql += colNames[i] + '=?'
            returnParams.push(params[i])
            count++
        }
    }
    return {sql, param: returnParams}
}

function response(req, res, code, message, data) {
    var resDict = {
        'result': code,
        'message': message,
        'data': data,
    }
    logRequestResponse(req, resDict)
    res.send(resDict)
}
function nullResponse(req, res)
{
    response(req, res, -200, "입력이 잘못되었습니다.(요청 데이터 확인)", [])
}
function lowLevelResponse(req, res)
{
    response(req, res, -200, "권한이 없습니다", [])
}

module.exports = {
    checkLevel, lowLevelException, nullRequestParamsOrBody,
    logRequestResponse, logResponse, logRequest,
    getUserPKArrStrWithNewPK, isNotNullOrUndefined, 
    namingImagesPath, getSQLnParams,
    nullResponse, lowLevelResponse, response,removeItems
}