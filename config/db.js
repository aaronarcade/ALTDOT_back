const mysql = require('mysql')

const db = mysql.createConnection({
    host : "database-2.c690vw2rmxwz.us-east-2.rds.amazonaws.com",
    user : 'root',
    password : 'qjfwk100djr!',
    port : 3306,
    database:'atldotmarta',
})
db.connect();

module.exports = db;