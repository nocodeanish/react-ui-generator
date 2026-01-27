// API route for managing project-specific settings
// GET: Get project's provider and model settings
// PATCH: Update project's provider and model

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidProvider } from "@/lib/providers";
import {
  unauthorizedResponse,
  notFoundResponse,
  invalidContentTypeResponse,
  invalidJsonResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import type { ProjectSettings } from "@/lib/api-types";

// GET: Get project settings
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.userId,
      },
      select: {
        provider: true,
        model: true,
      },
    });

    if (!project) {
      return notFoundResponse("Project not found");
    }

    const settings: ProjectSettings = {
      provider: project.provider,
      model: project.model,
    };

    return Response.json(settings);
  } catch (error) {
    console.error("[ProjectSettings] Failed to get settings:", error);
    return serverErrorResponse("Failed to get project settings");
  }
}

// PATCH: Update project settings
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getSession();
  if (!session) {
    return unauthorizedResponse();
  }

  // Validate content type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return invalidContentTypeResponse();
  }

  let body: { provider?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return invalidJsonResponse();
  }

  const { provider, model } = body;

  // Validate provider if provided
  if (provider !== undefined) {
    if (!isValidProvider(provider)) {
      return badRequestResponse(`Invalid provider: ${provider}`);
    }
  }

  // Validate model if provided (just check it's a string)
  if (model !== undefined && typeof model !== "string") {
    return badRequestResponse("Model must be a string");
  }

  try {
    // Verify project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.userId,
      },
    });

    if (!existingProject) {
      return notFoundResponse("Project not found");
    }

    // Build update data
    const updateData: { provider?: string; model?: string } = {};
    if (provider !== undefined) {
      updateData.provider = provider;
      // Reset model when provider changes (unless model also provided)
      if (model === undefined) {
        updateData.model = "";
      }
    }
    if (model !== undefined) {
      updateData.model = model;
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      select: {
        provider: true,
        model: true,
      },
    });

    const settings: ProjectSettings = {
      provider: updatedProject.provider,
      model: updatedProject.model,
    };

    return Response.json(settings);
  } catch (error) {
    console.error("[ProjectSettings] Failed to update settings:", error);
    return serverErrorResponse("Failed to update project settings");
  }
}
