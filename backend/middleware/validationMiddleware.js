

// ===============================================
// PharmaCore - Validation Middleware
// ===============================================

const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate and parse the request body.
      const validatedData = await schema.parseAsync(req.body);

      // Replace request body with validated data.
      req.body = validatedData;

      return next();
    } catch (error) {
      // Handle Zod validation errors.
      if (
        error.name === "ZodError" ||
        Array.isArray(error.issues)
      ) {
        const errors = error.issues.map((issue) => ({
          field:
            issue.path && issue.path.length > 0
              ? issue.path.join(".")
              : "request",
          message: issue.message,
          code: issue.code,
          received: issue.received ?? null,
        }));

        // Create a readable message for the frontend.
        const detailedMessage = errors
          .map((item) => `${item.field}: ${item.message}`)
          .join("; ");

        console.error(
          "Validation failed:",
          JSON.stringify(errors, null, 2)
        );

        return res.status(400).json({
          success: false,
          message: `Validation failed: ${detailedMessage}`,
          errors,
        });
      }

      // Handle unexpected errors.
      console.error(
        "Unexpected validation middleware error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "An unexpected validation error occurred.",
      });
    }
  };
};

// ===============================================
// Export
// ===============================================

module.exports = {
  validate,
};
