const urlModel = require("../models/urlModel")
const Validator = require("../Validator/validation")
const shortid = require('shortid');
const { promisify } = require("util");
const redis = require("redis");
const { url } = require("inspector");

//Connect to redis
const redisClient = redis.createClient(    // connect to the redis server
  17060,
  "redis-17060.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("T8oeQuSIlE1TNffE1tx4DASywDUV7lA5", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {  // on used to connect redis
  console.log("connected to Redis..");
});


//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient); // used to save data in catch
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient); // fatch data from catch



const postUrl = async function (req, res) {
  try {
    const body = req.body
    if (!Validator.isValidBody(body)) return res.status(400).send({ status: false, message: " Provide details " })
    const newBody = body.longUrl.trim()
    if (!Validator.isValid(newBody)) return res.status(400).send({ status: false, message: "Enter url" })
    if (!Validator.isValidurl(newBody)) return res.status(400).send({ status: false, message: "Url is not valid" })

    const urlCode = shortid.generate().toLowerCase(); // generating urlcode
    const obj = {
      "longUrl": body.longUrl,
      "shortUrl": `http://localhost:3000/${urlCode.trim()}`, // api for short url
      "urlCode": urlCode
    }

    let CahceData = await GET_ASYNC(`${body.longUrl}`)
    if (CahceData) {
      return res.status(200).send({ status: true, data: JSON.parse(CahceData) })
    }

    const findUrl = await urlModel.findOne({ longUrl: body.longUrl })
    if (findUrl) {
      return res.status(200).send({ status: true, data: findUrl })
    }

    const data = await urlModel.create(obj)
    if (data) { 
      await SET_ASYNC(`${data.longUrl}`, JSON.stringify(data));
      return res.status(201).send({ status: true, data: data })
    }

  } catch (err) {
    return res.status(500).send({ status: false, message: err.message })
  }
}

const getUrl = async function (req, res) {
  try {
    const urlCode = req.params.urlCode  // find url in catch
    let cahceData = await GET_ASYNC(`${urlCode}`) // fatch the data from catch

    if (cahceData) {
      return res.redirect(JSON.parse(cahceData).longUrl);
    } else {
      let checkUrl = await urlModel.findOne({ urlCode: urlCode });
      if (!checkUrl) return res.status(404).send({ status: false, message: "No url found" })
      // if not then save data in catch
      await SET_ASYNC(`${urlCode}`, JSON.stringify(checkUrl))
      return res.redirect(checkUrl.longUrl);
    }


  } catch (err) {
    return res.status(500).send({ status: false, message: err.message })
  }
}


module.exports.postUrl = postUrl
module.exports.getUrl = getUrl