import { describe, it, expect } from "vitest";
import {
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  invalidContentTypeResponse,
  invalidJsonResponse,
  rateLimitResponse,
  serverErrorResponse,
} from "../api-responses";

describe("api-responses", () => {
  describe("jsonResponse", () => {
    it("creates response with data and default status 200", async () => {
      const response = jsonResponse({ message: "ok" });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: "ok" });
    });

    it("creates response with custom status", async () => {
      const response = jsonResponse({ data: "test" }, 201);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ data: "test" });
    });

    it("handles array data", async () => {
      const response = jsonResponse([1, 2, 3]);
      expect(await response.json()).toEqual([1, 2, 3]);
    });

    it("handles null data", async () => {
      const response = jsonResponse(null);
      expect(await response.json()).toBeNull();
    });
  });

  describe("errorResponse", () => {
    it("creates error response with message and status", async () => {
      const response = errorResponse("Something went wrong", 500);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Something went wrong" });
    });

    it("works with different status codes", async () => {
      const response400 = errorResponse("Bad request", 400);
      expect(response400.status).toBe(400);

      const response422 = errorResponse("Unprocessable", 422);
      expect(response422.status).toBe(422);
    });
  });

  describe("unauthorizedResponse", () => {
    it("returns 401 with default message", async () => {
      const response = unauthorizedResponse();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("accepts custom message", async () => {
      const response = unauthorizedResponse("Token expired");
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Token expired" });
    });
  });

  describe("badRequestResponse", () => {
    it("returns 400 with message", async () => {
      const response = badRequestResponse("Invalid input");
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid input" });
    });
  });

  describe("notFoundResponse", () => {
    it("returns 404 with default message", async () => {
      const response = notFoundResponse();
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not found" });
    });

    it("accepts custom message", async () => {
      const response = notFoundResponse("User not found");
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "User not found" });
    });
  });

  describe("invalidContentTypeResponse", () => {
    it("returns 415 with default message", async () => {
      const response = invalidContentTypeResponse();
      expect(response.status).toBe(415);
      expect(await response.json()).toEqual({ error: "Invalid content type" });
    });

    it("accepts custom message", async () => {
      const response = invalidContentTypeResponse("Expected application/json");
      expect(response.status).toBe(415);
      expect(await response.json()).toEqual({ error: "Expected application/json" });
    });
  });

  describe("invalidJsonResponse", () => {
    it("returns 400 with default message", async () => {
      const response = invalidJsonResponse();
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid JSON" });
    });

    it("accepts custom message", async () => {
      const response = invalidJsonResponse("Malformed JSON body");
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Malformed JSON body" });
    });
  });

  describe("rateLimitResponse", () => {
    it("returns 429 with default message", async () => {
      const response = rateLimitResponse();
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ error: "Rate limit exceeded" });
    });

    it("accepts custom message", async () => {
      const response = rateLimitResponse("Too many requests. Try again in 5 minutes.");
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ error: "Too many requests. Try again in 5 minutes." });
    });
  });

  describe("serverErrorResponse", () => {
    it("returns 500 with default message", async () => {
      const response = serverErrorResponse();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Internal server error" });
    });

    it("accepts custom message", async () => {
      const response = serverErrorResponse("Database connection failed");
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Database connection failed" });
    });
  });
});
