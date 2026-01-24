"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Sanitize project name
function sanitizeName(name: string): string {
  // Strip HTML tags and trim whitespace
  const sanitized = name.replace(/<[^>]*>/g, "").trim();
  // Limit to 100 characters
  return sanitized.slice(0, 100);
}

/**
 * Rename a project
 * Requires authentication and ownership validation
 */
export async function renameProject(
  projectId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  if (!projectId || typeof projectId !== "string") {
    return { success: false, error: "Invalid project ID" };
  }

  if (!newName || typeof newName !== "string") {
    return { success: false, error: "Project name is required" };
  }

  const sanitizedName = sanitizeName(newName);
  if (!sanitizedName) {
    return { success: false, error: "Project name cannot be empty" };
  }

  // Require authentication
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Update project only if user owns it
    const result = await prisma.project.updateMany({
      where: {
        id: projectId,
        userId: session.userId,
      },
      data: {
        name: sanitizedName,
      },
    });

    if (result.count === 0) {
      return { success: false, error: "Project not found or access denied" };
    }

    // Revalidate paths
    revalidatePath("/");
    revalidatePath(`/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("[Rename Project] Error:", error);
    return { success: false, error: "Failed to rename project" };
  }
}
