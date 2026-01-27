// API route for managing user API keys and settings
// GET: Retrieve configured providers (without exposing keys)
// POST: Save/update API keys (encrypted)
// DELETE: Remove API keys

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROVIDERS } from "@/lib/providers";
import { encryptApiKeys, decryptApiKeys, getKeyLastFour } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS, EMPTY_API_KEYS } from "@/lib/constants";
import {
  unauthorizedResponse,
  rateLimitResponse,
  invalidContentTypeResponse,
  invalidJsonResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import type { ProviderStatus, SettingsResponse } from "@/lib/api-types";

// GET: Get user's configured providers
export async function GET(req: Request) {
  const session = await getSession();

  const providers: Record<string, ProviderStatus> = {};

  // Check each provider for configuration
  for (const [id, config] of Object.entries(PROVIDERS)) {
    const envKey = process.env[config.envKey];
    const hasEnvKey = !!envKey && envKey.trim() !== "";

    if (hasEnvKey) {
      providers[id] = {
        configured: true,
        source: "env",
      };
    } else {
      providers[id] = {
        configured: false,
      };
    }
  }

  // If authenticated, check user settings
  if (session) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });

      if (settings?.apiKeys && settings.apiKeys !== EMPTY_API_KEYS) {
        const userKeys = decryptApiKeys(settings.apiKeys);

        for (const [id, key] of Object.entries(userKeys)) {
          if (key && key.trim() !== "") {
            providers[id] = {
              configured: true,
              source: "user",
              lastFour: getKeyLastFour(key),
            };
          }
        }
      }
    } catch (error) {
      console.error("[Settings] Failed to read user settings:", error);
    }
  }

  const response: SettingsResponse = { providers };
  return Response.json(response);
}

// POST: Save API keys
export async function POST(req: Request) {
  // Must be authenticated
  const session = await getSession();
  if (!session) {
    return unauthorizedResponse();
  }

  // Rate limit: 10 changes per hour
  const rateLimitResult = rateLimit(`settings:${session.userId}`, RATE_LIMITS.SETTINGS);

  if (!rateLimitResult.success) {
    return rateLimitResponse("Rate limit exceeded. Try again later.");
  }

  // Validate content type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return invalidContentTypeResponse();
  }

  let body: { apiKeys?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return invalidJsonResponse();
  }

  const { apiKeys } = body;
  if (!apiKeys || typeof apiKeys !== "object") {
    return badRequestResponse("Invalid apiKeys format");
  }

  // Validate provider IDs
  for (const key of Object.keys(apiKeys)) {
    if (!(key in PROVIDERS)) {
      return badRequestResponse(`Invalid provider: ${key}`);
    }
  }

  try {
    // Get existing settings
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });

    // Merge with existing keys
    let existingKeys: Record<string, string> = {};
    if (existingSettings?.apiKeys && existingSettings.apiKeys !== EMPTY_API_KEYS) {
      existingKeys = decryptApiKeys(existingSettings.apiKeys);
    }

    // Update keys (empty string = delete)
    const updatedKeys = { ...existingKeys };
    for (const [providerId, key] of Object.entries(apiKeys)) {
      if (key === "" || key === null) {
        delete updatedKeys[providerId];
      } else {
        updatedKeys[providerId] = key;
      }
    }

    // Encrypt and save
    const encryptedKeys = Object.keys(updatedKeys).length > 0
      ? encryptApiKeys(updatedKeys)
      : EMPTY_API_KEYS;

    await prisma.userSettings.upsert({
      where: { userId: session.userId },
      update: { apiKeys: encryptedKeys },
      create: {
        userId: session.userId,
        apiKeys: encryptedKeys,
      },
    });

    // Return updated provider status
    const providers: Record<string, ProviderStatus> = {};
    for (const [id, config] of Object.entries(PROVIDERS)) {
      const envKey = process.env[config.envKey];
      const hasEnvKey = !!envKey && envKey.trim() !== "";
      const userKey = updatedKeys[id];

      if (userKey && userKey.trim() !== "") {
        providers[id] = {
          configured: true,
          source: "user",
          lastFour: getKeyLastFour(userKey),
        };
      } else if (hasEnvKey) {
        providers[id] = {
          configured: true,
          source: "env",
        };
      } else {
        providers[id] = {
          configured: false,
        };
      }
    }

    return Response.json({ success: true, providers });
  } catch (error) {
    console.error("[Settings] Failed to save settings:", error);
    return serverErrorResponse("Failed to save settings");
  }
}

// DELETE: Remove all API keys
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    await prisma.userSettings.update({
      where: { userId: session.userId },
      data: { apiKeys: EMPTY_API_KEYS },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[Settings] Failed to delete settings:", error);
    return serverErrorResponse("Failed to delete settings");
  }
}
