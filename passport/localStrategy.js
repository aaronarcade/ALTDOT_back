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
        organizationField: 'organization'
    }, async (username, password, done) => {
        try {
            
            db.query('SELECT * FROM user_table WHERE user_name=?', [username], (err, result) => {
                if (result.length>0) {
                    crypto.pbkdf2(password, salt, saltRounds, pwBytes, 'sha512', async (err, decoded)=> {
                        // bcrypt.hash(pw, salt, async (err, hash) => {
                        let hash = decoded.toString('base64')
                        
                        if(err)
                        {
                            console.log(err.message)
                            done(null, false, { message: 'An error occurred during the account verification process.'})
                        }
                        else if(hash === result[0].password){     
                                done(null, result[0])
                                console.log()
                        }
                            
                        else
                            done(null, false, { message: 'Passwords do not match.' })
                    });
                }
                else {
                    done(null, false, { message: 'You are not a registered member.' });
                }
            });
        } catch (error) {
            console.error(error);
            done(error);
        }
    }));
};