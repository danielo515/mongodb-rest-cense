var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var citySchema = new Schema({
  ts: Date,
  city: String,
  population: [{
    _id: false,
    age: Number,
    count: Number
  }]
},{versionKey: false});


var City = mongoose.model('city', citySchema);

module.exports = City;
