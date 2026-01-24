"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface CreateProjectInput {
  name: string;
  messages: any[];
  data: Record<string, any>;
}

export async function createProject(input: CreateProjectInput) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Validate and sanitize project name
  let projectName = input.name?.trim() || "Untitled Project";

  // Limit length
  if (projectName.length > 100) {
    projectName = projectName.substring(0, 100);
  }

  // Remove any HTML/script tags for safety
  projectName = projectName.replace(/<[^>]*>/g, "");

  // Validate messages is an array
  if (!Array.isArray(input.messages)) {
    throw new Error("Invalid messages format");
  }

  // Validate data is an object
  if (!input.data || typeof input.data !== "object" || Array.isArray(input.data)) {
    throw new Error("Invalid data format");
  }

  const project = await prisma.project.create({
    data: {
      name: projectName,
      userId: session.userId,
      messages: JSON.stringify(input.messages),
      data: JSON.stringify(input.data),
    },
  });

  return project;
}