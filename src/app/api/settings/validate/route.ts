// API route for validating API keys
// Makes a lightweight test request to verify the key works

import { getSession } from "@/lib/auth";
import { PROVIDERS, isValidProvider } from "@/lib/providers";
import { parseProviderError } from "@/lib/provider-errors";
import { rateLimit } from "@/lib/rate-limit";
import { validateApiKey } from "@/lib/api-key-validators";
import { RATE_LIMITS } from "@/lib/constants";
import {
  unauthorizedResponse,
  rateLimitResponse,
  invalidContentTypeResponse,
  invalidJsonResponse,
  badRequestResponse,
} from "@/lib/api-responses";
import type { ValidationResult } from "@/lib/api-types";

// POST: Validate an API key
export async function POST(req: Request) {
  // Must be authenticated
  const session = await getSession();
  if (!session) {
    return unauthorizedResponse();
  }

  // Rate limit: 10 validation attempts per hour per user
  // Prevents abuse for validating stolen API keys
  const rateLimitResult = rateLimit(`validate:${session.userId}`, RATE_LIMITS.VALIDATE);

  if (!rateLimitResult.success) {
    return rateLimitResponse("Too many validation attempts. Please try again later.");
  }

  // Validate content type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return invalidContentTypeResponse();
  }

  let body: { provider: string; apiKey: string };
  try {
    body = await req.json();
  } catch {
    return invalidJsonResponse();
  }

  const { provider, apiKey } = body;

  // Validate provider
  if (!provider || !isValidProvider(provider)) {
    return badRequestResponse(`Invalid provider: ${provider}`);
  }

  // Validate API key is provided
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    return badRequestResponse("API key is required");
  }

  console.log(`[Validate] Testing ${PROVIDERS[provider].name} API key...`);

  // Run validation using centralized validator
  const result = await validateApiKey(provider, apiKey);

  if (result.valid) {
    console.log(`[Validate] ${PROVIDERS[provider].name} API key is valid`);
    return Response.json({
      provider,
      valid: true,
    } as ValidationResult);
  }

  // Parse the error into a user-friendly format
  const parsedError = parseProviderError(provider, result.error);
  console.log(`[Validate] ${PROVIDERS[provider].name} API key validation failed:`, result.error);

  return Response.json({
    provider,
    valid: false,
    error: parsedError,
  } as ValidationResult);
}
