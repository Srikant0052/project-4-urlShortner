const urlModel = require('../models/urlModel');
const shortid = require('shortid');

const isValid = (value) => {
    if(typeof value === 'undefined' || value === null) return false
    if(typeof value === 'string' && value.trim().length === 0) return false
    if(typeof value === 'number' && value.toString().trim().length === 0) return false
    return true;
}
const isValidRequestBody = (requestBody) => {
    if(Object.keys(requestBody).length) return true
    return false;
}
const urlRegex = /^(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
// const urlCodeRegex = /^[0-9,A-Z]{4}$/

const CreateShortUrl = async (req, res) => {
   try {
       const requestBody = req.body;
       const baseUrl =  "http://localhost:3000";
    if (!isValidRequestBody(requestBody)) {
        return res.status(400).send({ status: false, message: 'Invalid Request parameters. Please provide URL' })
    }
    const{ longUrl } = req.body

    if(!isValid(longUrl)){
        return res.status(400).send({tatus: false, message: "longUrl is required"});
    }
   if(!urlRegex.test(longUrl)){
       return res.status(400).send({status: false, message: "Please provide a valid url"});
   }
   const urlCode = shortid.generate();
   const shortUrl = `${baseUrl}/${urlCode}`;
   const url = {longUrl, shortUrl, urlCode}
   const shortUrlCreated = await urlModel.create(url);
   res.status(201).send({status: true, message: "success", data: shortUrlCreated})

}catch(error){
    return res.status(500).send({status: false, message: error.message});
}
}

const redirectUrl = async (req, res) => {
    try {
        const requestParams = req.params.urlCode;
       
        const url = await urlModel.findOne({urlCode: requestParams}).lean();
        if(url){
            return res.status(302).redirect(url.longUrl);
        }else{
            return res.status(404).send({status: false, message: "Url not found"})
        }
        
    } catch (error) {
    return res.status(500).send({status: false, message: error.message});
        
    }

}

module.exports = {CreateShortUrl,redirectUrl }