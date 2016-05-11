var express = require('express');
var router = express.Router();
var cities = require('../models/city.js')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.status(200).json({ title: 'Express' });
});

router.get('/cities',function listCities(req, res, next) {
  cities.find({}, function(err, docs) {
    if(!err) {
      res.status(200).json({ data: docs });
    } else {
      res.status(500).json({ message: err });
    }
  });
});

router.post('cities/:cityname', function(req, res, next){

});

router.get('/byage', function(req, res, next){
  cities.aggregate({ "$unwind": "$population"},{"$group" : { "_id":"$population.age", "value":{"$sum" :"$population.count"}}}).exec(function(err,docs){
    if(!err) {
    res.status(200).json({ data: docs });
  } else {
    res.status(500).json({ message: err });
  }});
});


module.exports = router;
