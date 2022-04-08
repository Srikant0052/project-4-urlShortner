const urlModel = require('../models/urlModel');
const redis = require("redis");
// const shortid = require('shortid');

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
    16368,
    "redis-16368.c15.us-east-1-2.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("Y52LH5DG1XbiVCkNC2G65MvOFswvQCRQ", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//Connection setup for redis
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


const isValid = (value) => {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true;
}
const isValidRequestBody = (requestBody) => {
    if (Object.keys(requestBody).length) return true
    return false;
}
const urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
const CreateShortUrl = async (req, res) => {
    try {
        const requestBody = req.body;
        const baseUrl = "http://localhost:3000";
        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid Request parameters. Please provide URL' })
        }
        const { longUrl } = requestBody

        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, message: "longUrl is required" });
        }
        if (!urlRegex.test(longUrl)) {
            return res.status(400).send({ status: false, message: "Please provide a valid url" });
        }

        let cahcedUrl = await GET_ASYNC(`${longUrl}`);

        if (cahcedUrl) {
            const urlData = JSON.parse(cahcedUrl);
            return res.status(200).send({ status: true, message: "Success", data: urlData });

        } else {

            const urlCodeExist = await urlModel.findOne({ longUrl }).select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).lean();

            if (urlCodeExist) {
                await SET_ASYNC(`${longUrl}`, JSON.stringify(urlCodeExist), 'EX', 30);

                return res.status(200).send({ status: true, message: "Success", data: urlCodeExist });
            } else {
                //    const urlCode = shortid.generate();
                function rand(length, ...ranges) {
                    let str = "";                                                       // the string (initialized to "")
                    while (length--) {                                                   // repeat this length of times
                        let ind = Math.floor(Math.random() * ranges.length);              // get a random range from the ranges object
                        let min = ranges[ind][0].charCodeAt(0),                           // get the minimum char code allowed for this range
                            max = ranges[ind][1].charCodeAt(0);                           // get the maximum char code allowed for this range
                        let c = Math.floor(Math.random() * (max - min + 1)) + min;        // get a random char code between min and max
                        str += String.fromCharCode(c);                                    // convert it back into a character and append it to the string str
                    }
                    return str;                                                         // return str
                }
                const urlCode = rand(4, ["A", "Z"], ["0", "9"]);
                const shortUrl = `${baseUrl}/${urlCode}`;
                const url = { longUrl, shortUrl, urlCode }
                const shortUrlCreated = await urlModel.create(url);
                await SET_ASYNC(`${longUrl}`, JSON.stringify(shortUrlCreated), 'EX', 30);

                res.status(201).send({ status: true, message: "success", data: shortUrlCreated })
            }
        }
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

const redirectUrl = async (req, res) => {
    try {
        const requestParams = req.params.urlCode;
        let cahcedUrl = await GET_ASYNC(`${requestParams}`);

        if (cahcedUrl) {
            const data = JSON.parse(cahcedUrl);
           return res.status(302).redirect(data);
        } else {
            const url = await urlModel.findOne({ urlCode: requestParams });
            await SET_ASYNC(`${requestParams}`, JSON.stringify(url.longUrl), 'EX', 30)

            if (url) {
                return res.status(302).redirect(url.longUrl);
            } else {
                return res.status(404).send({ status: false, message: "Url not found" })
            }
        }
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

module.exports = { CreateShortUrl, redirectUrl }