const mongoose = require('mongoose');

var ReviewSchemaFestival = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 80
  },
  body: {
    type: String,
    require: true,
    trim: true,
    minlength: 50,
    maxlength: 3000
  },
  rating: {
    type: Number,
    required:true
  },
  _creator: {
    type: mongoose.Schema.Types.ObjectId,
    require: true
  }
});

var ReviewSchemaUser = new mongoose.Schema({
  festival: {
    type: String,
    require: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 80
  },
  body: {
    type: String,
    require: true,
    trim: true,
    minlength: 20,
    maxlength: 3000
  },
  rating: {
    type: Number,
    required:true
  }
});

var ReviewFestival = mongoose.model('ReviewFestival', ReviewSchemaFestival);
var ReviewUser = mongoose.model('ReviewUser', ReviewSchemaUser);

module.exports = {ReviewSchemaFestival, ReviewFestival, ReviewSchemaUser, ReviewUser}
