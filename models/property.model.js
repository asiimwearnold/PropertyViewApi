const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  coverImage: String,
  images: [String],
  location: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  numberOfRooms: Number,
  numberOfBathrooms: Number
});

module.exports = mongoose.model("Property", propertySchema);
