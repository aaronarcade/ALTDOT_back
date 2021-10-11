const mysql = require('mysql')

const db = mysql.createConnection({
    host : "localhost",
    user : 'root',
    password : 'rlawndks4',
    port : 3306,
    database:'altdot',
})
db.connect();

module.exports = db;