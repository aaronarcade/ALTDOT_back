const db = require('./config/db')

const dbQueryRows = (sql) => {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result, fields) => {
            if (err) {
                console.log(sql)
                console.log(err)
                reject({
                    code: -200,
                    maxPage: 0
                })
            }
            else {
                resolve({
                    code : 200, 
                    maxPage : parseInt((result[0].TABLE_ROWS / 10) + 0.9)
                })
            }
        })
    })
}
const dbQueryList = (sql) => {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result, fields) => {
            if (err) {
                console.log(sql)
                console.log(err)
                reject({
                    code: -200,
                    result: result
                })
            }
            else {
                resolve({
                    code: 200, 
                    result: result
                })
            }
        })
    })
}

async function getRowsNumWithKeyword(table, columns, keyword){
    let sql = 'SELECT COUNT(*) as TABLE_ROWS FROM ' + table
    let count = 0
    if(columns.length > 0)
    {
        sql += ' WHERE '
        for(let i = 0; i < columns.length; i++)
        {
            if(count > 0)
                sql += ' OR '
            sql += columns[i] + " LIKE '%" + keyword + "%' "
            count++
        }
    }
    else
        return {code: 200, maxPage: 0}
    
    return await dbQueryRows(sql).then(result => {
        return result
    })
}

async function getRowsNum(table) {
    let sql = 'select TABLE_ROWS FROM information_schema.tables WHERE TABLE_NAME="' + table + '"'
    return await dbQueryRows(sql).then(result => {
        return result
    })
}

async function getAllDatas(table, columns) {
    let sql = ''
    if(columns === '*')
        sql = 'SELECT * FROM "' + table + '"'
    else
        sql = 'SELECT ' + columns.join(', ') + ' FROM ' + table
    return await dbQueryList(sql).then(result => {
        return result
    })
}

async function getDatasWithKeywordAtPage(table, columns, keyword, page) {
    let columns_str
    if(columns == '*') 
        columns_str = '*' 
    else
        columns_str = columns.join(', ')
    let sql = 'SELECT pk, ' + columns_str + ' FROM ' + table
    let count = 0
    if(columns.length > 0)
    {
        sql += ' WHERE '
        for(let i = 0; i < columns.length; i++)
        {
            if(count > 0)
                sql += ' OR '
            sql += columns[i] + " LIKE '%" + keyword + "%' "
            count++
        }
        sql += 'ORDER BY pk DESC '
        if(page)
            sql += ' LIMIT ' + page + ', 10'
        else
            sql += ' LIMIT 0, 10'
    }
    
    return await dbQueryList(sql).then(result => {
        return result;
    })
}

async function getDatasAtPage(table, columns, page) {
    let columns_str
    if(columns == '*') 
        columns_str = '*' 
    else
        columns_str = columns.join(', ')
    let sql = 'SELECT pk, '+ columns_str +' FROM ' + table + ' ORDER BY pk DESC LIMIT ' + page + ', 10'
    return await dbQueryList(sql).then(result => {
        return result;
    })
}

async function getKioskList(status, from, to, page) {
    let isFirst = true
    let rowsSQL = `SELECT COUNT(*) as TABLE_ROWS `
    let kioskSQL = `SELECT pk, kiosk_num, store_name, unique_code, status, create_time `
    let afterSQL = ` FROM kiosk_information_tb`

    if(from != null && to != null)
    {
        isFirst = false
        if(from && to)
            afterSQL += ` WHERE DATE(create_time) BETWEEN '${from}' AND '${to}'`
        else
            afterSQL += ` WHERE DATE(create_time) BETWEEN '${to}' AND '${from}'`
    }

    if(status === '0' || status === '1')
    {
        if(isFirst)
            afterSQL += ' WHERE'
        else
            afterSQL += ' AND'
        afterSQL += ` status=${status}`
    }
    let rows = await dbQueryRows(rowsSQL + afterSQL).then(result => {return result})

    if(rows.code > 0)
    {
        afterSQL += ` ORDER BY pk DESC` 
        if(page > -1)
            afterSQL += ' LIMIT ' + page + ', 10'
        else if(page !== -1)
            afterSQL += ' LIMIT 0, 10'

        let kioskList = await dbQueryList(kioskSQL + afterSQL).then(result => {return result})
        if(kioskList.code > 0)
            return {code: 200, result: kioskList.result, maxPage: rows.maxPage}
        else
            return {code: -200, result: null, maxPage: 0}
    }
    else
        return {code: -200, result: null, maxPage: 0}
}

async function getItemList(brandPKs, keyword, page) {
    let isFirst = true;
    let brandPK_json = JSON.stringify(brandPKs)
    brandPK_json = brandPK_json.replace("[","(")
    brandPK_json = brandPK_json.replace("]",")")

    let sql = `
    SELECT * 
    FROM item_information_tb
    `
    if(brandPKs.length > 0 && brandPK_json.indexOf('null') == -1)
    {
        sql += ' WHERE brand_pk IN ' + brandPK_json
        isFirst = false;
    }
    if(keyword)
    {
        if(isFirst)
            sql += ' WHERE '
        else
            sql += ' AND'
        sql += `
        item_num LIKE '%` + keyword + `%' 
        OR item_name LIKE '%` + keyword + `%' 
        OR middle_class LIKE '%` + keyword + `%'
        `
    }
    sql += ' ORDER BY pk DESC'
    if(page)
        sql += ' LIMIT ' + page + ', 10'
    else
        sql += ' LIMIT 0, 10'

    return await dbQueryList(sql).then(result => {
        return result;
    })
}
async function getItemRows(brandPKs, keyword) {
    let isFirst = true;
    let brandPK_json = JSON.stringify(brandPKs)
    brandPK_json = brandPK_json.replace("[","(")
    brandPK_json = brandPK_json.replace("]",")")

    let sql = 'SELECT COUNT(*) as TABLE_ROWS FROM item_information_tb'
    
    if(brandPKs.length > 0 && brandPK_json.indexOf('null') == -1)
    {
        sql += ' WHERE brand_pk IN ' + brandPK_json
        isFirst = false;
    }
    if(keyword)
    {
        if(isFirst)
            sql += ' WHERE'
        else
            sql += ' AND'
        sql += `
        item_num LIKE '%` + keyword + `%' 
        OR item_name LIKE '%` + keyword + `%' 
        OR middle_class LIKE '%` + keyword + `%'
        `
    }
    
    return await dbQueryRows(sql).then(result => {
        return result
    })
}
module.exports = {
    getRowsNumWithKeyword, getRowsNum, getAllDatas,
    getDatasWithKeywordAtPage, getDatasAtPage,
    getKioskList, getItemRows, getItemList,
    dbQueryList, dbQueryRows
}