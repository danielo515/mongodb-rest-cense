var express = require('express');
var router = express.Router();
var cities = require('../models/city.js')
var cense = require('../controllers/cense_controller.js')

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

router.get('/byage', cense.byAge);
router.get('/bycity', cense.byCity);
router.get('/latest', cense.latest);

router.post('/cities/:cityname', cense.create);
router.put('/cities/:cityname', cense.update);

module.exports = router;
