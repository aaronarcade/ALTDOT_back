const multer = require('multer');

const storage = multer.diskStorage({
        destination: function (req, file, cb) {
                //console.log(file)
                if(file.fieldname === 'mainImage')
                        cb(null, __dirname + '/../image/item/')
                else if(file.fieldname === 'detailImage')
                        cb(null, __dirname + '/../image/detailItem/')
                else if(file.fieldname === 'qrImage')
                        cb(null, __dirname + '/../image/qr/')
                else
                        cb(null, __dirname + '/../image/')
        },
        filename: function (req, file, cb) {
                if(file.fieldname === 'mainImage')
                        cb(null, Date.now() + '-emartitem.' + file.mimetype.split('/')[1])
                else if(file.fieldname === 'detailImage')
                        cb(null, Date.now() + '-emartdetail.' + file.mimetype.split('/')[1])  
                else if(file.fieldname === 'qrImage')
                        cb(null, Date.now() + '-emartqr.' + file.mimetype.split('/')[1])
                else
                        cb(null, Date.now() + '-atldotmarta.' + file.mimetype.split('/')[1])
                
        }
})
const fileFilter = (req, file, cb) => {
        let typeArray = file.mimetype.split('/')
        let filetype = typeArray[1]
        if(file.fieldname === 'image')
        {
                if(filetype == 'jpg' || filetype == 'png' || filetype == 'gif' || filetype == 'jpeg' || filetype == 'bmp' || filetype == 'mp4' || filetype == 'avi') 
                        return cb(null, true)
        }
        else
        {
                if(filetype == 'jpg' || filetype == 'png' || filetype == 'jpeg' || filetype == 'bmp') 
                        return cb(null, true)
        }
        console.log((file.fieldname === 'image') ? '광고 ' : '상품 ' + '파일 확장자 제한: ', filetype)
        req.fileValidationError = "파일 형식이 올바르지 않습니다(.jpg, .png, .gif 만 가능)"
        cb(null, false, new Error("파일 형식이 올바르지 않습니다(.jpg, .png, .gif 만 가능)"))
}
const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limit: {fileSize : 100 * 1024 * 1024}
})

module.exports = {upload}