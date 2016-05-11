var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var citySchema = new Schema({
  ts: Date,
  coty: String,
  population: [{
    age: Number,
    count: Number
  }]
});


var City = mongoose.model('city', citySchema);

module.exports = City;
