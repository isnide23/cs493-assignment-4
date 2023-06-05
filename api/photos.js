/*
 * API sub-router for photo collection endpoints.
 */

const { Router } = require('express')
const { getChannel, connectToRabbitMQ } = require('../lib/rabbitmq')

const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');

const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  getPhotoInfoById, 
  savePhotoInfo, 
  savePhotoFile, 
  getDownloadStreamByFilename
} = require('../models/photo')

const router = Router()

const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      const basename = crypto.pseudoRandomBytes(16).toString('hex');
      const extension = imageTypes[file.mimetype];
      callback(null, `${basename}.${extension}`);
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, !!imageTypes[file.mimetype])
  }
});

function removeUploadedFile(file) {
  return new Promise((resolve, reject) => {
    fs.unlink(file.path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

}

/*
 * POST /photos - Route to create a new photo.
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  console.log("== req.file:", req.file);
  console.log("== req.body:", req.body);
  if (req.file && req.body && req.body.userId) {
    try {
      const image = {
        path: req.file.path,
        filename: req.file.filename,
        contentType: req.file.mimetype,
        userId: req.body.userId
      };
      // const id = await saveImageInfo(image);
      const id = await saveImageFile(image);
      await removeUploadedFile(req.file);
      res.status(200).send({ id: id });
    } catch (err) {
      next(err);
    }
  } else {
    res.status(400).send({
      err: "Request body was invalid."
    });
  }
});


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

module.exports = router
