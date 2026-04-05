const path = require('path');
const config = require('../../configs');
const response = require('../../middlewares/response');
const uploadFileModel = require('../../schemas/uploadFiles');
const { logAction } = require('../../middlewares/auth');

/**
 * Helper fn to create DB record for an uploaded file
 */
const saveFileMetadata = async (file, user, type) => {
  const fileUrl = `${config.BASE_URL}/uploads/${file.filename}`;
  
  const uploadRec = new uploadFileModel({
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: path.join(config.UPLOAD_DIR, file.filename).replace(/\\/g, '/'),
    url: fileUrl,
    type,
    uploadedBy: user ? user._id : null
  });
  
  await uploadRec.save();
  return uploadRec;
};

/**
 * POST /api/v1/uploads/single
 * Upload a single image file
 */
const uploadSingle = async (req, res) => {
  try {
    if (!req.file) {
      return response.badRequest(res, "No file uploaded. Expected field name: 'file'");
    }

    const type = req.body.type || 'other'; // avatar, product, other
    const uploadRec = await saveFileMetadata(req.file, req.user, type);

    if (req.user) await logAction(req, "UPLOAD_FILE_SINGLE", "uploadFile", uploadRec._id);

    return response.success(res, {
      url: uploadRec.url,
      fileName: uploadRec.fileName,
      size: uploadRec.size,
      type: uploadRec.type
    }, "File uploaded successfully");
  } catch (error) {
    return response.serverError(res, "Upload failed", error);
  }
};

/**
 * POST /api/v1/uploads/multiple
 * Upload multiple files (max 10 default)
 */
const uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return response.badRequest(res, "No files uploaded. Expected field name: 'files'");
    }

    const type = req.body.type || 'other';
    const uploadedRecords = [];

    for (const file of req.files) {
      const rec = await saveFileMetadata(file, req.user, type);
      uploadedRecords.push({
        url: rec.url,
        fileName: rec.fileName,
        size: rec.size,
        type: rec.type
      });
    }

    if (req.user) await logAction(req, "UPLOAD_FILE_MULTIPLE", "uploadFile", null, { count: uploadedRecords.length });

    return response.success(res, uploadedRecords, "Files uploaded successfully");
  } catch (error) {
    return response.serverError(res, "Upload failed", error);
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple
};
