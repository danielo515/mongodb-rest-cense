var cities = require('../models/city.js')

module.exports = {
    byAge: byAge,
    byCity: byCity,
    latest: latest,
    create: createCity
}

/** =========================  QUERYING METHODS ============ */


function byAge(req, res) {
    cities.aggregate(
        { "$unwind": "$population" },
        { "$group": { "_id": null, "max": { "$max": "$population.age" }, "min": { "$min": "$population.age" }, "average": { "$avg": "$population.age" }, "total": { "$sum": "$population.count" } } },
        includeFactory('max', 'min', 'average', 'total')
    ).exec() // we have to call exect to get a promise
        .then(makeResponse)
        .catch(errHandler.bind(res));

    function makeResponse(docs) {
        res.status(200).json({ data: docs });
    }
}


/**
 * Get the latest record for each city
 * The aggregate call could be simpler if you first extracts the maximum timestamps and then queries the database again,
 * but it was a requirment to use as less as possible aggregate calls.
 * @param {Express} req an express request object
 * @param {Express} response an express response object
 */
function latest(req, res) {
    cities.aggregate({ "$group": { "_id": "$city", "maxTs": { "$max": "$ts" }, "docs": { "$push": { population: "$population", ts: "$ts" } } } },
        { "$project": { match: { "$setDifference": [{ "$map": { input: "$docs", as: "doc", in: { "$cond": [{ "$eq": ["$maxTs", "$$doc.ts"] }, "$$doc", false] } } }, [false]] } } })
        .exec() // we have to call exect to get a promise
        .then(makeResponse)
        .catch(errHandler.bind(res));

    function makeResponse(docs) {
        var result = [];
        docs.forEach(function (city) {
            var currCity = {};
            currCity[city._id] = city.match[0].population;
            result.push(currCity);
        });
        res.status(200).json({ data: result });
    }
}


/**
 * Aggregated data by city
 * sums all the populations records of each city and calculates the maximum, minimum and average ages. 
 * 
 * @param req express request object
 * @param res express response object
 * 
 */
function byCity(req, res) {
    cities.aggregate({ "$unwind": "$population" },
        { "$group": { "_id": "$city", "max": { "$max": "$population.age" }, "min": { "$min": "$population.age" }, "average": { "$avg": "$population.age" }, "total": { "$sum": "$population.count" } } })
        .exec() // we have to call exect to get a promise
        .then(function (docs) {
            res.status(200).json({ data: docs });
        })
        .catch(errHandler.bind(res));
}


/** =========================  CREATE AND UPDATE METHODS ============ */

function createCity(req, res) {
    ifRecordExists(
        { "city": req.params.cityname },
        function(){res.status(403).json({err:"Already existing city"})},
        function(){
            var newCity = {"ts": new Date().getTime(),"city":req.params.cityname, "population":[]};
            if(req.body.population){
                req.body.population.forEach(function(pop){
                    if(pop.age && pop.count){
                        newCity.population.push({age:pop.age,count:pop.count})
                    }
                })
             cities.create(newCity,function(err,city){if(err){errHandler.call(res,err)}else {res.status(201).json({newCity:city})}})   
            }else{
                res.status(500).json({err:"A population array of at least one element is required to create a new city"})
            }
        }
    )
    .catch(errHandler.bind(res))
}




/** =========================  UTILS ============ */


function ifRecordExists(search, itDoes, doesNot) {
    return cities.findOne(search).exec()
        .then(function (document) {
            if (document !== null) {
                itDoes(document)
            } else {
                doesNot(null)
            }
        })

}

/**
 * Very basic error handler. Just returns whatever error it gets
 * in order to work should be binded with a valid Express response object as this: .bind(res)
 * @param err whatever error to be returned
 */
function errHandler(err) {
    this.status(500).json({ message: err });
}

/**
 * Factory that returns a $project object that excludes the _id property https://docs.mongodb.com/v3.0/reference/operator/aggregation/project/ 
 * @params {String} variable list of properties to be included  
 * @return {Object} $project object including all the properties but _id
 */
function includeFactory(/* properties */) {
    var included = { "_id": 0 };
    Array.prototype.slice.call(arguments).forEach(function (include) {
        included[include] = true
    })

    return { "$project": included }
}