import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, resetRateLimit, getClientIP } from "../rate-limit";

describe("Rate Limit", () => {
  beforeEach(() => {
    // Reset all rate limits before each test
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rateLimit", () => {
    test("should allow requests within the limit", () => {
      const key = "test-key-1";
      const options = { limit: 5, window: 60000 };

      const result1 = rateLimit(key, options);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = rateLimit(key, options);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    test("should block requests after limit is exceeded", () => {
      const key = "test-key-2";
      const options = { limit: 3, window: 60000 };

      // Use up all allowed requests
      rateLimit(key, options);
      rateLimit(key, options);
      rateLimit(key, options);

      // Fourth request should be blocked
      const result = rateLimit(key, options);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test("should return resetAt timestamp", () => {
      const key = "test-key-3";
      const options = { limit: 5, window: 60000 };

      const before = Date.now();
      const result = rateLimit(key, options);
      const after = Date.now();

      expect(result.resetAt).toBeGreaterThanOrEqual(before + options.window);
      expect(result.resetAt).toBeLessThanOrEqual(after + options.window);
    });

    test("should reset after window expires", () => {
      const key = "test-key-4";
      const options = { limit: 2, window: 60000 };

      // Use up all requests
      rateLimit(key, options);
      rateLimit(key, options);

      // Should be blocked
      expect(rateLimit(key, options).success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(60001);

      // Should be allowed again
      const result = rateLimit(key, options);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    test("should track different keys independently", () => {
      const options = { limit: 2, window: 60000 };

      // Use up key1
      rateLimit("key1", options);
      rateLimit("key1", options);
      expect(rateLimit("key1", options).success).toBe(false);

      // key2 should still be allowed
      const result = rateLimit("key2", options);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    test("should handle limit of 1", () => {
      const key = "test-key-5";
      const options = { limit: 1, window: 60000 };

      const result1 = rateLimit(key, options);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = rateLimit(key, options);
      expect(result2.success).toBe(false);
      expect(result2.remaining).toBe(0);
    });

    test("should correctly decrement remaining count", () => {
      const key = "test-key-6";
      const options = { limit: 5, window: 60000 };

      for (let i = 0; i < 5; i++) {
        const result = rateLimit(key, options);
        expect(result.remaining).toBe(4 - i);
      }
    });

    test("should preserve resetAt when blocked", () => {
      const key = "test-key-7";
      const options = { limit: 1, window: 60000 };

      const firstResult = rateLimit(key, options);
      const blockedResult = rateLimit(key, options);

      expect(blockedResult.resetAt).toBe(firstResult.resetAt);
    });
  });

  describe("resetRateLimit", () => {
    test("should clear rate limit for a key", () => {
      const key = "test-key-reset";
      const options = { limit: 1, window: 60000 };

      // Hit the limit
      rateLimit(key, options);
      expect(rateLimit(key, options).success).toBe(false);

      // Reset and try again
      resetRateLimit(key);
      const result = rateLimit(key, options);
      expect(result.success).toBe(true);
    });

    test("should not affect other keys", () => {
      const options = { limit: 1, window: 60000 };

      // Hit limits for both keys
      rateLimit("keyA", options);
      rateLimit("keyB", options);

      // Reset only keyA
      resetRateLimit("keyA");

      // keyA should work, keyB should still be blocked
      expect(rateLimit("keyA", options).success).toBe(true);
      expect(rateLimit("keyB", options).success).toBe(false);
    });

    test("should handle resetting non-existent key gracefully", () => {
      // Should not throw
      expect(() => resetRateLimit("non-existent-key")).not.toThrow();
    });
  });

  describe("getClientIP", () => {
    test("should return first IP from x-forwarded-for header", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1, 10.0.0.1, 172.16.0.1");

      expect(getClientIP(headers)).toBe("192.168.1.1");
    });

    test("should trim whitespace from forwarded IP", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "  192.168.1.1  , 10.0.0.1");

      expect(getClientIP(headers)).toBe("192.168.1.1");
    });

    test("should return x-real-ip when x-forwarded-for is not present", () => {
      const headers = new Headers();
      headers.set("x-real-ip", "10.0.0.1");

      expect(getClientIP(headers)).toBe("10.0.0.1");
    });

    test("should prioritize x-forwarded-for over x-real-ip", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1");
      headers.set("x-real-ip", "10.0.0.1");

      expect(getClientIP(headers)).toBe("192.168.1.1");
    });

    test("should return 'unknown' when no IP headers are present", () => {
      const headers = new Headers();

      expect(getClientIP(headers)).toBe("unknown");
    });

    test("should handle single IP in x-forwarded-for", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "192.168.1.1");

      expect(getClientIP(headers)).toBe("192.168.1.1");
    });

    test("should handle IPv6 addresses", () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "2001:db8::1, ::1");

      expect(getClientIP(headers)).toBe("2001:db8::1");
    });
  });

  describe("Edge Cases", () => {
    test("should handle very small window", () => {
      const key = "small-window-key";
      const options = { limit: 10, window: 1 }; // 1ms window

      const result1 = rateLimit(key, options);
      expect(result1.success).toBe(true);

      // Window is so small it might have already expired
      vi.advanceTimersByTime(2);
      const result2 = rateLimit(key, options);
      expect(result2.success).toBe(true);
    });

    test("should handle very large limit", () => {
      const key = "large-limit-key";
      const options = { limit: 1000000, window: 60000 };

      const result = rateLimit(key, options);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999999);
    });

    test("should handle empty key", () => {
      const options = { limit: 5, window: 60000 };

      const result = rateLimit("", options);
      expect(result.success).toBe(true);
    });

    test("should handle special characters in key", () => {
      const key = "test:key:with:special-chars@domain.com";
      const options = { limit: 5, window: 60000 };

      const result = rateLimit(key, options);
      expect(result.success).toBe(true);
    });
  });
});
