"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Delete a project by ID
 * Requires authentication and ownership validation
 */
export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  // Validate input
  if (!projectId || typeof projectId !== "string") {
    return { success: false, error: "Invalid project ID" };
  }

  // Require authentication
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Delete project only if user owns it
    const result = await prisma.project.deleteMany({
      where: {
        id: projectId,
        userId: session.userId,
      },
    });

    if (result.count === 0) {
      return { success: false, error: "Project not found or access denied" };
    }

    // Revalidate the home page to refresh project list
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("[Delete Project] Error:", error);
    return { success: false, error: "Failed to delete project" };
  }
}
