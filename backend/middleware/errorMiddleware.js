
// ======================================================
// Global Error Middleware
// ======================================================
//
// Catches anything passed to next(err) from controllers or
// from unhandled promise rejections (if the app is wired
// correctly). Logs the full error server-side and returns
// a safe, consistent JSON response.
//
// In production, 5xx errors never leak their real message.
// ======================================================

const errorMiddleware = (err, req, res, next) => {
  console.error("=================================");
  console.error("Unhandled application error:");
  console.error(err);
  console.error("=================================");

  const statusCode = err.statusCode || err.status || 500;

  const isProduction = process.env.NODE_ENV === "production";

  const message =
    statusCode >= 500 && isProduction
      ? "An unexpected server error occurred."
      : err.message || "An unexpected server error occurred.";

  return res.status(statusCode).json({
    success: false,
    message
  });
};

// ======================================================
// Not Found Middleware
// ======================================================
//
// Catches any request that didn't match a route. Mount this
// AFTER all your routes but BEFORE errorMiddleware.
// ======================================================

const notFoundMiddleware = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

// ======================================================
// Export
// ======================================================

module.exports = {
  errorMiddleware,
  notFoundMiddleware
};