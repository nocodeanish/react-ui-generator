"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Delete all projects for the current user
 * Requires authentication
 */
export async function deleteAllProjects(): Promise<{ success: boolean; error?: string; count?: number }> {
  // Require authentication
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Delete all projects owned by user
    const result = await prisma.project.deleteMany({
      where: {
        userId: session.userId,
      },
    });

    // Revalidate the home page
    revalidatePath("/");

    return { success: true, count: result.count };
  } catch (error) {
    console.error("[Delete All Projects] Error:", error);
    return { success: false, error: "Failed to delete projects" };
  }
}
