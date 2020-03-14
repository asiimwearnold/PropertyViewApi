const express = require("express");

const router = express.Router();

const propertyController = require("../controllers/property.controller");

router
  .route("/")
  .get(propertyController.getAllProperty)
  .post(
    propertyController.uploadImages,
    propertyController.resizeImages,
    propertyController.createProperty
  );

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
