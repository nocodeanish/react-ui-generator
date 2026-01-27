// API route for checking stored API key validity
// Uses the stored (encrypted) API key to validate with the provider

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROVIDERS, isValidProvider } from "@/lib/providers";
import { decryptApiKeys } from "@/lib/crypto";
import { parseProviderError } from "@/lib/provider-errors";
import { rateLimit } from "@/lib/rate-limit";
import { validateApiKey } from "@/lib/api-key-validators";
import { RATE_LIMITS, EMPTY_API_KEYS } from "@/lib/constants";
import {
  unauthorizedResponse,
  rateLimitResponse,
  invalidContentTypeResponse,
  invalidJsonResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import type { CheckResult } from "@/lib/api-types";

// POST: Check a stored API key's validity
export async function POST(req: Request) {
  // Must be authenticated
  const session = await getSession();
  if (!session) {
    return unauthorizedResponse();
  }

  // Rate limit: 20 checks per hour per user
  // More lenient than validate since this uses stored keys
  const rateLimitResult = rateLimit(`check:${session.userId}`, RATE_LIMITS.CHECK);

  if (!rateLimitResult.success) {
    return rateLimitResponse("Too many check requests. Please try again later.");
  }

  // Validate content type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return invalidContentTypeResponse();
  }

  let body: { provider: string };
  try {
    body = await req.json();
  } catch {
    return invalidJsonResponse();
  }

  const { provider } = body;

  // Validate provider
  if (!provider || !isValidProvider(provider)) {
    return badRequestResponse(`Invalid provider: ${provider}`);
  }

  // Get the stored API key
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });

    if (!settings?.apiKeys || settings.apiKeys === EMPTY_API_KEYS) {
      return Response.json({
        provider,
        valid: false,
        message: "No API key stored for this provider",
      } as CheckResult);
    }

    const userKeys = decryptApiKeys(settings.apiKeys);
    const apiKey = userKeys[provider];

    if (!apiKey || apiKey.trim() === "") {
      return Response.json({
        provider,
        valid: false,
        message: "No API key stored for this provider",
      } as CheckResult);
    }

    // Validate the key using centralized validator
    console.log(`[Check] Verifying stored ${PROVIDERS[provider].name} API key...`);
    const result = await validateApiKey(provider, apiKey);

    if (result.valid) {
      console.log(`[Check] ${PROVIDERS[provider].name} API key is valid`);
      return Response.json({
        provider,
        valid: true,
      } as CheckResult);
    }

    // Parse error for user-friendly message
    const parsedError = parseProviderError(provider, result.error);
    console.log(`[Check] ${PROVIDERS[provider].name} API key check failed:`, result.error);

    return Response.json({
      provider,
      valid: false,
      error: parsedError,
    } as CheckResult);
  } catch (error) {
    console.error("[Check] Error checking API key:", error);
    return serverErrorResponse("Failed to check API key");
  }
}
