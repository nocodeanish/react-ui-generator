"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProvider } from "./get-default-provider";
import { sanitizeProjectName } from "@/lib/validation";

interface CreateProjectInput {
  name?: string;
  messages?: any[];
  data?: Record<string, any>;
}

/**
 * Generate a user-friendly default project name
 * Format: "Untitled Design 1", "Untitled Design 2", etc.
 */
async function generateDefaultName(userId: string): Promise<string> {
  // Count existing projects to determine the next number
  const count = await prisma.project.count({
    where: { userId },
  });

  return `Untitled Design ${count + 1}`;
}

export async function createProject(input: CreateProjectInput = {}) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Generate default name if not provided, then sanitize
  let projectName = input.name?.trim();

  if (!projectName) {
    projectName = await generateDefaultName(session.userId);
  } else {
    // Sanitize user-provided name (strip HTML, trim, truncate)
    projectName = sanitizeProjectName(projectName);
  }

  // Default to empty array for messages if not provided
  const messages = Array.isArray(input.messages) ? input.messages : [];

  // Default to empty object for data if not provided
  const data =
    input.data && typeof input.data === "object" && !Array.isArray(input.data)
      ? input.data
      : {};

  // Get the default provider based on available API keys
  const { provider, model } = await getDefaultProvider();

  const project = await prisma.project.create({
    data: {
      name: projectName,
      userId: session.userId,
      messages: JSON.stringify(messages),
      data: JSON.stringify(data),
      provider,
      model,
    },
  });

  return project;
}