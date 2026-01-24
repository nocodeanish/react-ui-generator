"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getProject(projectId: string) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId: session.userId,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Safely parse JSON with validation and fallback
  let messages = [];
  let data = {};

  try {
    const parsedMessages = JSON.parse(project.messages);
    // Validate it's an array
    if (Array.isArray(parsedMessages)) {
      messages = parsedMessages;
    } else {
      console.error("[Data Corruption] Project messages is not an array:", projectId);
    }
  } catch (error) {
    console.error("[Data Corruption] Failed to parse project messages:", projectId, error);
  }

  try {
    const parsedData = JSON.parse(project.data);
    // Validate it's an object
    if (parsedData && typeof parsedData === "object" && !Array.isArray(parsedData)) {
      data = parsedData;
    } else {
      console.error("[Data Corruption] Project data is not an object:", projectId);
    }
  } catch (error) {
    console.error("[Data Corruption] Failed to parse project data:", projectId, error);
  }

  return {
    id: project.id,
    name: project.name,
    messages,
    data,
    provider: project.provider,
    model: project.model,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}