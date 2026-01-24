// API route for managing project-specific settings
// GET: Get project's provider and model settings
// PATCH: Update project's provider and model

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROVIDERS, isValidProvider, type ProviderId } from "@/lib/providers";

type ProjectSettings = {
  provider: string;
  model: string;
};

// GET: Get project settings
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const settings: ProjectSettings = {
      provider: project.provider,
      model: project.model,
    };

    return Response.json(settings);
  } catch (error) {
    console.error("[ProjectSettings] Failed to get settings:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get project settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate content type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Invalid content type" }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { provider?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { provider, model } = body;

  // Validate provider if provided
  if (provider !== undefined) {
    if (!isValidProvider(provider)) {
      return new Response(
        JSON.stringify({ error: `Invalid provider: ${provider}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Validate model if provided (just check it's a string)
  if (model !== undefined && typeof model !== "string") {
    return new Response(
      JSON.stringify({ error: "Model must be a string" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
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
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
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
    return new Response(
      JSON.stringify({ error: "Failed to update project settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
