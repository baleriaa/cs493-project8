/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require('express')

const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  insertNewPhoto,
  getPhotoById
} = require('../models/photo')

const router = Router()
const multer = require('multer')
const crypto = require('crypto')
const fs = require('fs')

async function saveImageInfo(image) {
  const db = getDBReference();
  const collection = db.collection('photos');
  const result = await collection.insertOne(image);
  
  return result.insertedId;
}

async function getImageInfoById(id) {
  const db = getDBReference();
  const collection = db.collection('photos');

  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();

    return results[0];
  }
}

function savePhotoFile(photo) {
  return new Promise((resolve, reject) => {
    const db = getDBReference();

    const bucket = 
      new GridFSBucket(db, { bucketName: 'photos' });

    const metadata = {
      contentType: photo.contentType,
      businessId: photo.businessId
    };

    const uploadStream = bucket. openUploadStream(
      image.filename, 
      { metadata: metadata}
    );

    fs.createReadStream(photo.path).pipe(uploadStream).on('error', (err) => {
      reject(err);
    })
    .on('finish', (result) => {
      resolve(result._id);
    });
  });
}

/*
 * POST /photos - Route to create a new photo.
 */
router.post(
  '/', upload.single('image'), async (req, res) => {
  if (req.file && req.body && req.body.businessId) {
    // TODO ...
  } else {
    res.status(400).send({
      err: "Request body needs 'image' file and 'businessId'."
    })
  }
  try {
    const image = {
      contentType: req.file.mimetype,
      filename: req.file.filename,
      path: req.file.path,
      businessId: req.body.businessId
    };
    const id = await saveImageInfo(image);
    res.status(200).send({ id: id });
  } catch (err) {
    next(err);
  }

  if (validateAgainstSchema(req.body, PhotoSchema)) {
    try {
      const id = await insertNewPhoto(req.body)
      res.status(201).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${req.body.businessId}`
        }
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error inserting photo into DB.  Please try again later."
      })
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object"
    })
  }
})

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getPhotoById(req.params.id)
    if (photo) {
      res.status(200).send(photo)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later."
    })
  }
})

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getImageInfoById(req.params.id);
    if (photo) {
      delete photo.path;
      photo.url = `/media/photos/${photo.filename}`;
      res.status(200).send(photo);
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

router.use(
  `/media/images`,
  express.static(`${__dirname}/uploads`)
);

module.exports = router
