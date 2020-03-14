const catchAsync = require("../utils/catchAsync");
const Property = require("../models/property.model");
const resHandler = require("./responseHandler");
const AppError = require("../utils/app-error");
const multer = require("multer");
const sharp = require("sharp");

// const multerStorage = multer.diskStorage({
//   destination: (req, file, callback) => {
//     callback(null, "public/img/property");
//   },
//   filename: (req, file, callback) => {
//     // Get file type for example image/jpg split it and extract the file extension
//     const extension = file.mimetype.split("/")[1];
//     callback(null, `property-${Date.now()}.${extension}`);
//   }
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, callback) => {
  if (file.mimetype.startsWith("image")) {
    callback(null, true);
  } else {
    callback(
      new AppError("Not an image! Only image uploads are allowed.", 400),
      false
    );
  }
};

// Configure Multer upload
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadImages = upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "images", maxCount: 5 }
]);

exports.resizeImages = catchAsync(async (req, res, next) => {
  if (!req.files.coverImage || !req.files.images) return next();

  // Get the cover Images
  req.body.coverImage = `property-cover-${Date.now()}.jpeg`;

  await sharp(req.files.coverImage[0].buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/property/${req.body.coverImage}`);

  // Get all the other images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, index) => {
      const filename = `property-${Date.now()}-${index + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/property/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

// TODO Delete this after refactoring
const document = "station";

exports.getAllProperty = catchAsync(async (req, res, next) => {
  // Filter object to catch any userid params and send only transactions for that user
  let filter = {};

  if (req.params.userid) {
    console.log(req.params.userid);
    filter = {
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    };
  }

  // Save the query parameters in an object
  let queryObj = { ...req.query };

  // Exclude some fields from the query
  const excludeFields = ["page", "limit", "sort", "fields"];
  excludeFields.forEach(el => delete queryObj[el]);

  // add the "$" operator on the gte, gt, lte and lt keys
  queryObj = JSON.parse(
    JSON.stringify(queryObj).replace(
      /\b(gt|gte|lt|lte)\b/g,
      match => `$${match}`
    )
  );

  filter = { ...filter, ...queryObj };

  const query = Property.find(filter);

  // Sorting returned values by specified value in the req query or by default if no specified value
  if (req.query.sort) query.sort(req.query.sort);
  else query.sort("-createdAt");

  // Limiting fields
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query.select(fields);
  } else {
    query.select("-__v");
  }

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  query.skip(skip).limit(limit);

  const doc = await query;

  res.status(200).json({
    status: "Success",
    results: doc.length,
    data: doc
  });
});

exports.getProperty = resHandler.getOne(Property, document);

exports.updateProperty = resHandler.updateOne(Property, document);

exports.deleteProperty = resHandler.deleteOne(Property, document);

exports.createProperty = catchAsync(async (req, res, next) => {
  if (req.file) req.body.coverImage = req.file.filename;

  const newProperty = await Property.create({
    description: req.body.description,
    coverImage: req.body.coverImage,
    images: req.body.images,
    location: req.body.location,
    price: req.body.price,
    numberOfRooms: req.body.numberOfRooms,
    numberOfBathrooms: req.body.numberOfBathrooms
  });

  res.status(201).json({
    status: "Success",
    property: newProperty
  });
});

// Get all stations that are within a given radius from a defined point
exports.getCloseProperty = catchAsync(async (req, res, next) => {
  const { distance, pin, unit } = req.params;
  const [lat, long] = pin.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !long)
    next(
      new AppError(
        "Please provide your co-ordinates in the format lat,lng",
        500
      )
    );

  const stations = await Property.find({
    location: { $geoWithin: { $centerSphere: [[long, lat], radius] } }
  });

  res.status(200).json({
    status: "Success",
    results: stations.length,
    data: stations
  });
});

// Get the distances of all stations from a defined point
exports.getDistances = catchAsync(async (req, res, next) => {
  const { pin, unit } = req.params;
  const [lat, long] = pin.split(",");

  if (!lat || !long)
    next(
      new AppError(
        "Please provide your co-ordinates in the format lat,lng",
        500
      )
    );

  const distances = await Property.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [long * 1, lat * 1]
        },

        distanceField: "distance"
      }
    }
  ]);

  res.status(200).json({
    status: "Success",
    data: distances
  });
});
