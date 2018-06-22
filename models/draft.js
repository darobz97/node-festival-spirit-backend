const mongoose = require('mongoose');

var DraftSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: 80
  },
  body: {
    type: String,
    trim: true,
    maxlength: 3000
  },
  rating: {
    type: Number,
  },
  festival: {
    type: String
  }
});

var Draft = mongoose.model('Draft', DraftSchema);

module.exports = {DraftSchema, Draft}
