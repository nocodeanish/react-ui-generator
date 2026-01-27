import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validateAnthropicKey,
  validateOpenAIKey,
  validateGoogleKey,
  validateOpenRouterKey,
  validateXAIKey,
  validateApiKey,
  KEY_VALIDATORS,
  type KeyValidationResult,
} from "../api-key-validators";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("api-key-validators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to create a mock response
  function mockResponse(ok: boolean, data?: any, status = 200): Response {
    return {
      ok,
      status,
      json: () => Promise.resolve(data || {}),
    } as Response;
  }

  describe("validateAnthropicKey", () => {
    it("returns valid:true when API responds OK", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      const result = await validateAnthropicKey("test-key");

      expect(result).toEqual({ valid: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/models",
        expect.objectContaining({
          method: "GET",
          headers: {
            "x-api-key": "test-key",
            "anthropic-version": "2023-06-01",
          },
        })
      );
    });

    it("returns valid:false with error message on failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(false, { error: { message: "Invalid API key" } }, 401)
      );

      const result = await validateAnthropicKey("invalid-key");

      expect(result).toEqual({ valid: false, error: "Invalid API key" });
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const result = await validateAnthropicKey("test-key");

      expect(result).toEqual({ valid: false, error: "Network failure" });
    });

    it("handles timeout errors", async () => {
      const abortError = new DOMException("Aborted", "AbortError");
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await validateAnthropicKey("test-key");

      expect(result).toEqual({
        valid: false,
        error: "Request timeout - provider API did not respond",
      });
    });

    it("handles malformed JSON response", async () => {
      const response = {
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as Response;
      mockFetch.mockResolvedValueOnce(response);

      const result = await validateAnthropicKey("test-key");

      expect(result).toEqual({ valid: false, error: "HTTP 500" });
    });
  });

  describe("validateOpenAIKey", () => {
    it("sends Bearer token in Authorization header", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      await validateOpenAIKey("sk-test-key");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/models",
        expect.objectContaining({
          headers: { Authorization: "Bearer sk-test-key" },
        })
      );
    });

    it("returns valid:true on success", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      const result = await validateOpenAIKey("sk-test-key");

      expect(result).toEqual({ valid: true });
    });

    it("returns error on invalid key", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(false, { error: { message: "Invalid authentication" } }, 401)
      );

      const result = await validateOpenAIKey("invalid");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid authentication");
    });
  });

  describe("validateGoogleKey", () => {
    it("sends API key as query parameter", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      await validateGoogleKey("google-api-key");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://generativelanguage.googleapis.com/v1/models?key=google-api-key",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("returns valid:true on success", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      const result = await validateGoogleKey("valid-key");

      expect(result).toEqual({ valid: true });
    });
  });

  describe("validateOpenRouterKey", () => {
    it("uses auth/key endpoint", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      await validateOpenRouterKey("or-key");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/auth/key",
        expect.objectContaining({
          headers: { Authorization: "Bearer or-key" },
        })
      );
    });

    it("returns valid:true on success", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      const result = await validateOpenRouterKey("valid-key");

      expect(result).toEqual({ valid: true });
    });
  });

  describe("validateXAIKey", () => {
    it("uses x.ai API endpoint", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      await validateXAIKey("xai-key");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/models",
        expect.objectContaining({
          headers: { Authorization: "Bearer xai-key" },
        })
      );
    });

    it("returns valid:true on success", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      const result = await validateXAIKey("valid-key");

      expect(result).toEqual({ valid: true });
    });
  });

  describe("KEY_VALIDATORS registry", () => {
    it("has all providers registered", () => {
      expect(KEY_VALIDATORS.anthropic).toBe(validateAnthropicKey);
      expect(KEY_VALIDATORS.openai).toBe(validateOpenAIKey);
      expect(KEY_VALIDATORS.google).toBe(validateGoogleKey);
      expect(KEY_VALIDATORS.openrouter).toBe(validateOpenRouterKey);
      expect(KEY_VALIDATORS.xai).toBe(validateXAIKey);
    });

    it("has exactly 5 providers", () => {
      expect(Object.keys(KEY_VALIDATORS)).toHaveLength(5);
    });
  });

  describe("validateApiKey", () => {
    it("delegates to correct validator based on provider", async () => {
      mockFetch.mockResolvedValue(mockResponse(true));

      await validateApiKey("anthropic", "test-key");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/models",
        expect.anything()
      );

      mockFetch.mockClear();

      await validateApiKey("openai", "test-key");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/models",
        expect.anything()
      );
    });

    it("trims the API key before validation", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(true));

      await validateApiKey("anthropic", "  test-key  ");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": "test-key",
          }),
        })
      );
    });

    it("returns error for unknown provider", async () => {
      // @ts-expect-error - testing invalid provider
      const result = await validateApiKey("unknown", "key");

      expect(result).toEqual({ valid: false, error: "Unknown provider: unknown" });
    });
  });
});
