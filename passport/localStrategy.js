const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
//const bcrypt = require('bcryptjs');
const db = require('../config/db');
const salt = "435f5ef2ffb83a632c843926b35ae7855bc2520021a73a043db41670bfaeb722"
const saltRounds = 10
const pwBytes = 64
// const { User } = require('../models');

var isEmpty = function (value) {
    if (value == "" || value == null || value == undefined || (value != null && typeof value == "object" && !Object.keys(value).length)) {
        return true
    } else {
        return false
    }
};

module.exports = (passport) => {
    passport.use(new LocalStrategy({
        usernameField: 'id',
        passwordField: 'pw',
    }, async (userid, password, done) => {
        try {
            db.query('SELECT * FROM user_table WHERE user_name=?', [userid], (err, result) => {
                if (result.length>0) {
                    crypto.pbkdf2(password, salt, saltRounds, pwBytes, 'sha512', async (err, decoded)=> {
                        // bcrypt.hash(pw, salt, async (err, hash) => {
                        let hash = decoded.toString('base64')
                        
                        if(err)
                        {
                            console.log(err.message)
                            done(null, false, { message: '계정 확인 과정에 오류가 발생했습니다.'})
                        }
                        else if(hash === result[0].password)
                            done(null, result[0])
                        else
                            done(null, false, { message: '비밀번호가 일치하지 않습니다.' })
                    });
                }
                else {
                    done(null, false, { message: '가입되지 않은 회원입니다.' });
                }
            });
        } catch (error) {
            console.error(error);
            done(error);
        }
    }));
};