var express = require('express');
var router = express.Router();

var cense = require('../controllers/cense_controller.js')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.status(200).json({ title: 'Mongo db cense demo example', repository:'https://github.com/danielo515/mongodb-rest-cense' });
});


router.get('/byage', cense.byAge);
router.get('/bycity', cense.byCity);
router.get('/byageandcity', cense.byAgeAndCity);
router.get('/latest', cense.latest);
router.get('/all',cense.all);

router.post('/cities/:cityname', cense.create);
router.put('/cities/:cityname', cense.update);

module.exports = router;
