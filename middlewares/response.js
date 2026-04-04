/**
 * Standard API Response Format
 * 
 * Success: { success: true, message, data, meta? }
 * Error:   { success: false, message, errors? }
 */

module.exports = {
  /**
   * 200 OK
   */
  success: (res, data = null, message = "Success", statusCode = 200, meta = null) => {
    const response = {
      success: true,
      message,
      data
    };
    if (meta) response.meta = meta;
    return res.status(statusCode).json(response);
  },

  /**
   * 201 Created
   */
  created: (res, data = null, message = "Created successfully") => {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  },

  /**
   * 400 Bad Request
   */
  badRequest: (res, message = "Bad request", errors = null) => {
    const response = { success: false, message };
    if (errors) response.errors = errors;
    return res.status(400).json(response);
  },

  /**
   * 401 Unauthorized
   */
  unauthorized: (res, message = "Unauthorized - Please login") => {
    return res.status(401).json({ success: false, message });
  },

  /**
   * 403 Forbidden
   */
  forbidden: (res, message = "Forbidden - You don't have permission") => {
    return res.status(403).json({ success: false, message });
  },

  /**
   * 404 Not Found
   */
  notFound: (res, message = "Resource not found") => {
    return res.status(404).json({ success: false, message });
  },

  /**
   * 409 Conflict
   */
  conflict: (res, message = "Resource already exists") => {
    return res.status(409).json({ success: false, message });
  },

  /**
   * 422 Validation Error
   */
  validationError: (res, errors, message = "Validation failed") => {
    return res.status(422).json({
      success: false,
      message,
      errors
    });
  },

  /**
   * 500 Internal Server Error
   */
  serverError: (res, message = "Internal server error", error = null) => {
    const response = { success: false, message };
    if (process.env.NODE_ENV === "development" && error) {
      response.debug = error.message || error;
    }
    return res.status(500).json(response);
  }
};
