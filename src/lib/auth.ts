import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SESSION_TTL_MS } from "./constants";

// Lazy initialization to avoid build-time errors
// JWT_SECRET validation happens at first use, not module load
let _jwtSecret: Uint8Array | null = null;

function getJWTSecret(): Uint8Array {
  if (_jwtSecret) return _jwtSecret;

  const secret = process.env.JWT_SECRET;

  // Warn in production if no secret is set (but don't crash during build)
  if (!secret && process.env.NODE_ENV === "production") {
    console.error(
      "[Security Warning] JWT_SECRET environment variable is not set in production. " +
      "Generate a secure secret with: openssl rand -base64 32"
    );
  }

  _jwtSecret = new TextEncoder().encode(
    secret || "development-secret-key-change-this-in-production"
  );

  return _jwtSecret;
}

const COOKIE_NAME = "auth-token";

export interface SessionPayload {
  userId: string;
  email: string;
  expiresAt: Date;
}

export async function createSession(userId: string, email: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session: SessionPayload = { userId, email, expiresAt };

  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getJWTSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload as unknown as SessionPayload;
  } catch {
    // Invalid or expired token - just return null
    // Cookie deletion happens via deleteSession() in server actions only
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifySession(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload as unknown as SessionPayload;
  } catch (error) {
    // Note: Can't delete cookie in middleware, but verification will fail
    return null;
  }
}
