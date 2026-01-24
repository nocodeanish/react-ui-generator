// API route for managing user API keys and settings
// GET: Retrieve configured providers (without exposing keys)
// POST: Save/update API keys (encrypted)
// DELETE: Remove API keys

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { encryptApiKeys, decryptApiKeys, getKeyLastFour } from "@/lib/crypto";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

type ProviderStatus = {
  configured: boolean;
  source?: "env" | "user";
  lastFour?: string;
};

type SettingsResponse = {
  providers: Record<string, ProviderStatus>;
};

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

      if (settings?.apiKeys && settings.apiKeys !== "{}") {
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit
  const clientIP = getClientIP(req.headers);
  const rateLimitResult = rateLimit(`settings:${session.userId}`, {
    limit: 10,
    window: 60 * 60 * 1000, // 10 changes per hour
  });

  if (!rateLimitResult.success) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate content type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Invalid content type" }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { apiKeys?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { apiKeys } = body;
  if (!apiKeys || typeof apiKeys !== "object") {
    return new Response(JSON.stringify({ error: "Invalid apiKeys format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate provider IDs
  for (const key of Object.keys(apiKeys)) {
    if (!(key in PROVIDERS)) {
      return new Response(
        JSON.stringify({ error: `Invalid provider: ${key}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  try {
    // Get existing settings
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });

    // Merge with existing keys
    let existingKeys: Record<string, string> = {};
    if (existingSettings?.apiKeys && existingSettings.apiKeys !== "{}") {
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
      : "{}";

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
    return new Response(
      JSON.stringify({ error: "Failed to save settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// DELETE: Remove all API keys
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await prisma.userSettings.update({
      where: { userId: session.userId },
      data: { apiKeys: "{}" },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[Settings] Failed to delete settings:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
