const mysql = require('mysql')

const db = mysql.createConnection({
    host : "emart.cafe24app.com",
    user : 'inlightek5',
    password : 'qjfwk100djr!',
    port : 3306,
    database:'inlightek5',
    timezone: 'Asia/Seoul'
})
db.connect();

module.exports = db;