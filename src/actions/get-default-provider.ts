"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROVIDERS, type ProviderId, getProviderIds } from "@/lib/providers";
import { decryptApiKeys } from "@/lib/crypto";

/**
 * Get the default provider based on available API keys
 * Priority:
 * 1. First provider with an API key in environment variables
 * 2. First provider with an API key stored in user settings (DB)
 * 3. Fall back to "anthropic" (will use mock provider)
 */
export async function getDefaultProvider(): Promise<{ provider: ProviderId; model: string }> {
  const providerIds = getProviderIds();

  // 1. Check environment variables first
  for (const providerId of providerIds) {
    const envKey = process.env[PROVIDERS[providerId].envKey];
    if (envKey && envKey.trim() !== "") {
      return {
        provider: providerId,
        model: PROVIDERS[providerId].default,
      };
    }
  }

  // 2. Check user's stored API keys in database
  const session = await getSession();
  if (session) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });

      if (settings?.apiKeys && settings.apiKeys !== "{}") {
        const userKeys = decryptApiKeys(settings.apiKeys);

        for (const providerId of providerIds) {
          const userKey = userKeys[providerId];
          if (userKey && userKey.trim() !== "") {
            return {
              provider: providerId,
              model: PROVIDERS[providerId].default,
            };
          }
        }
      }
    } catch (error) {
      console.error("[Get Default Provider] Failed to read user settings:", error);
    }
  }

  // 3. Fall back to anthropic (will use mock provider)
  return {
    provider: "anthropic",
    model: PROVIDERS.anthropic.default,
  };
}
