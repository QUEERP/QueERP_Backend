//////////////////////////////////////////////////////
// RESPONSE UTILITIES
//////////////////////////////////////////////////////

exports.successResponse = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

exports.errorResponse = (res, message = "Error", statusCode = 500, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
  });
};
