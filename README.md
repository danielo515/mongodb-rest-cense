# Mongodb rest cense

Just an example application that uses MongoDB as database engine.
It has a rest interface that simulates a very basic cense of people.

## Endpoints

The server exposes the following endpoints

* `/bycity` 
* `/byage`
* `/byageandcity`
* `/latest`

## Data model

The database will be named cense and have a collection called `cities`.
Each document on the collection will be a record representing the state of the city in certain timestamp.
The following data model is expected for each record:

```
{
  ts: Date,
  city: String,
  population: [{
    age: Number,
    count: Number
  }]
}
```

* `ts`: The timestamp of the record
* `city`: The city named
* `population`: an array holding several objects for each age group
* `age`: The age group of this entry of the array
* `count`: The count of people for this age group