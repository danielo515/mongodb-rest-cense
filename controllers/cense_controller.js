var cities = require('../models/city.js')

module.exports = {
    byAge: byAge,
    byCity: byCity,
    byAgeAndCity: byAgeAndCity,
    latest: latest,
    create: createNewCity,
    update: updateCity
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
        .then(makeResponse)
        .catch(errHandler.bind(res));


    function makeResponse(docs) {
        var result = [];
        docs.forEach(function (city) {
            var currCity = {
                "city": city._id,
                "population": [{ "age" : {"max": city.max, "min": city.min, "average": city.average}, "total": city.total }] // it's better to keep population as an array of objects, even with a single object
            };
            result.push(currCity);
        });
        res.status(200).json({ data: result });
    }

}


function byAgeAndCity(req, res) {
    cities.aggregate({ "$unwind": "$population" },
        { "$group": { "_id": { "city": "$city", "age": "$population.age" }, "max": { "$max": "$population.count" }, "min": { "$min": "$population.count" }, "average": { "$avg": "$population.count" }, "total": { "$sum": "$population.count" } } })
        .exec() // we have to call exect to get a promise
        .then(function (docs) {
            res.status(200).json({ data: groupOtput(docs) });
        })
        .catch(errHandler.bind(res));

    function groupOtput(docs) {
        var result = [], hashmap = {};
        docs.forEach(function (record) {
            var cityNAme = record._id.city, age = record._id.age,
                inResultsArray = hashmap[cityNAme] !== undefined,
                city = inResultsArray ? result[hashmap[cityNAme]] : { "city": cityNAme, population: [] };

            city.population.push({ "age": age, "count": { "max": record.max, "min": record.min, "average": record.average, "total": record.total } });
            if (!inResultsArray) {
                hashmap[cityNAme] = (result.push(city) - 1);
            }
        })
        return result
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
            var currCity = { "city": city._id, "population": city.match[0].population };
            result.push(currCity);
        });
        res.status(200).json({ data: result });
    }
}


/** =========================  CREATE AND UPDATE METHODS ============ */

// POST city 
function createNewCity(req, res) {
    ifRecordExists({ "city": req.params.cityname })
        /** if document exists we do not want to allow the creation of a new one. Use put operation instead */
        .then(function (document) {
            console.log('Tried to update existing document: ', document)
            res.status(403).json({ err: "Already existing city" })
        })
        /** Rejected promise means no existing city, create a new one */
        .catch(createCity)
        .catch(errHandler.bind(res))

    function createCity(doc) {
        if (doc !== null) throw doc // if doc is not null, some other error may have happened, bubble to next error handler
        if (req.body.population) {
            var newCity = { "ts": new Date().getTime(), "city": req.params.cityname, "population": mergePopultaion([], req.body.population) };
            cities.create(newCity, function (err, city) { if (err) { errHandler.call(res, err) } else { res.status(201).json({ newRecord: city }) } })
        } else {
            res.status(500).json({ err: "A population array of at least one element is required to create a new city" })
        }
    }

}


// PUT city

function updateCity(req, res) {
    ifRecordExists({ "city": req.params.cityname })
        .then(updateRecord)

    function updateRecord(document) {
        if (!req.body.population) {
            res.status(500).json({ err: "A population array of at least one element is required" });
            return
        }
        var newRecord = { "ts": new Date().getTime(), "city": document.city, "population": mergePopultaion(document.population, req.body.population) };
        cities.create(newRecord, function (err, city) { if (err) { errHandler.call(res, err) } else { res.status(201).json({ newRecord: city }) } })

    }
}


/** =========================  UTILS ============ */


/**
 * Wrapper that returns a promise that is rejected if the document does not exists and fulfilled if it does
 * I do it this way because findOne does not reject the promise if it does not finds any document
 * it just returns a null document  
 * 
 * @param search an object to perform the find one operation
 * @returns {Promise} a promise fulfilled if the document is found, rejected otherwhise
 */
function ifRecordExists(search) {

    return new Promise(
        function (resolve, reject) {
            cities.findOne(search).exec()
                .then(function (document) {
                    if (document !== null) {
                        resolve(document)
                    } else {
                        reject(null)
                    }
                })
        })

}


/**
 * Merges two populatoins arrays.
 * Existing values on the original array are updated.
 * Duplicated values ones on the incoming array are removed by keeping the rightmost
 * Validates the contents of the incoming array
 * 
 * @param {Array} original The original population array
 * @param {AbstractWorker} incoming The array to add. Should be an array of valid population objecs like [{"age":28,"count":50}]
 * @returns {Array} The original array with the new
 */
function mergePopultaion(original, incoming) {
    var hash = {};
    original.map(function (popu, i) {
        hash[popu.age] = i
    });

    incoming.forEach(function (popu) {
        if (popu.age && popu.count) {
            var existing = hash[popu.age];
            if (existing !== undefined) {
                original[existing].count = popu.count
            } else {
                original.push({ "age": popu.age, "count": popu.count })
            }
        }
    })

    return original
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