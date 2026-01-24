"use server";

import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { headers } from "next/headers";

export interface AuthResult {
  success: boolean;
  error?: string;
}

// Email validation regex - basic but secure
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password must contain: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // Rate limiting: 3 sign-up attempts per hour per IP
    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const rateLimitResult = rateLimit(`signup:${clientIP}`, {
      limit: 3,
      window: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.success) {
      const minutesUntilReset = Math.ceil(
        (rateLimitResult.resetAt - Date.now()) / 60000
      );
      return {
        success: false,
        error: `Too many sign-up attempts. Please try again in ${minutesUntilReset} minute(s).`,
      };
    }

    // Validate input
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return { success: false, error: "Invalid email format" };
    }

    // Normalize email to lowercase
    email = email.toLowerCase().trim();

    // Validate password strength
    if (password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters",
      };
    }

    if (!PASSWORD_REGEX.test(password)) {
      return {
        success: false,
        error: "Password must contain uppercase, lowercase, and number",
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Generic error to prevent user enumeration
      return {
        success: false,
        error: "Unable to create account. Please try a different email.",
      };
    }

    // Hash password with bcrypt (10 rounds is good balance of security/speed)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Create session
    await createSession(user.id, user.email);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[Auth Error]", error);
    return { success: false, error: "An error occurred during sign up" };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const rateLimitResult = rateLimit(`signin:${clientIP}`, {
      limit: 5,
      window: 15 * 60 * 1000, // 15 minutes
    });

    if (!rateLimitResult.success) {
      const minutesUntilReset = Math.ceil(
        (rateLimitResult.resetAt - Date.now()) / 60000
      );
      return {
        success: false,
        error: `Too many login attempts. Please try again in ${minutesUntilReset} minute(s).`,
      };
    }

    // Validate input
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    // Normalize email
    email = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // IMPORTANT: Always call bcrypt.compare even if user doesn't exist
    // This prevents timing attacks that could reveal valid email addresses
    const passwordToCheck = user?.password || await bcrypt.hash("dummy-password", 10);
    const isValidPassword = await bcrypt.compare(password, passwordToCheck);

    // Check both conditions together to prevent timing differences
    if (!user || !isValidPassword) {
      return { success: false, error: "Invalid email or password" };
    }

    // Create session
    await createSession(user.id, user.email);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[Auth Error]", error);
    return { success: false, error: "An error occurred during sign in" };
  }
}

export async function signOut() {
  await deleteSession();
  revalidatePath("/");
  redirect("/");
}

export async function getUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}
