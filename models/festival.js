const mongoose = require('mongoose');
const {ReviewSchemaFestival} = require('./review');

let FestivalSchema = new mongoose.Schema({
  name: {
    type: String
  },
  country: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    require: true,
  },
  photoUrl: {
    type: String,
    required: true,
  },
  genre: {
    type: String,
    require: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    require: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  month: {
    type: String,
    require: true,
  },
  meta: {
    numberOfReviews: {
      type: Number,
      required: true,
      default: 0
    },
    rating: {
      type: Number,
      require: true,
      default: 0
    }
  }
});

var FestivalReviewsSchema = new mongoose.Schema({
  reviews: [ReviewSchemaFestival],
  name: {
    type: String
  }});

var Festival = mongoose.model('Festival', FestivalSchema);

var Festivalreview = mongoose.model('Festivalreview', FestivalReviewsSchema);

module.exports = {Festivalreview, FestivalReviewsSchema, Festival}
