const errorMiddleware = (err, req, res, next) => {

  console.log("ERROR MIDDLEWARE HIT");

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });

};

export default errorMiddleware;