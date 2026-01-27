/**
 * Standardized HTTP response helpers for API routes
 * Eliminates duplicated response patterns across routes
 */

/**
 * Create a JSON response with status code
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Create an error response with message and status code
 */
export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

// ============================================================================
// Common Error Responses
// ============================================================================

/**
 * 401 Unauthorized - Authentication required or failed
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return errorResponse(message, 401);
}

/**
 * 400 Bad Request - Invalid input
 */
export function badRequestResponse(message: string): Response {
  return errorResponse(message, 400);
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export function notFoundResponse(message = "Not found"): Response {
  return errorResponse(message, 404);
}

/**
 * 415 Unsupported Media Type - Invalid content type
 */
export function invalidContentTypeResponse(message = "Invalid content type"): Response {
  return errorResponse(message, 415);
}

/**
 * 400 Bad Request - Invalid JSON body
 */
export function invalidJsonResponse(message = "Invalid JSON"): Response {
  return errorResponse(message, 400);
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export function rateLimitResponse(message = "Rate limit exceeded"): Response {
  return errorResponse(message, 429);
}

/**
 * 500 Internal Server Error
 */
export function serverErrorResponse(message = "Internal server error"): Response {
  return errorResponse(message, 500);
}
