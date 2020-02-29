const express = require("express");

const propertyController = require("../controllers/property.controller");

const router = express.Router();

router
  .route("/")
  .get(propertyController.getAllProperty)
  .post(propertyController.createProperty);

router
  .route("/within-radius/:distance/center/:pin/unit/:unit")
  .get(propertyController.getCloseProperty);

router.route("/distances/:pin/unit/:unit").get(propertyController.getDistances);

router
  .route("/:id")
  .get(propertyController.getProperty)
  .patch(propertyController.updateProperty)
  .delete(propertyController.deleteProperty);

module.exports = router;
