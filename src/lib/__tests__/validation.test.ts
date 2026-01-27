import { describe, it, expect } from "vitest";
import {
  EMAIL_REGEX,
  validateEmail,
  normalizeEmail,
  PASSWORD_REGEX,
  validatePassword,
  sanitizeProjectName,
} from "../validation";

describe("validation", () => {
  describe("EMAIL_REGEX", () => {
    it("matches valid emails", () => {
      expect(EMAIL_REGEX.test("user@example.com")).toBe(true);
      expect(EMAIL_REGEX.test("user.name@example.co.uk")).toBe(true);
      expect(EMAIL_REGEX.test("user+tag@example.com")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(EMAIL_REGEX.test("")).toBe(false);
      expect(EMAIL_REGEX.test("user")).toBe(false);
      expect(EMAIL_REGEX.test("user@")).toBe(false);
      expect(EMAIL_REGEX.test("@example.com")).toBe(false);
      expect(EMAIL_REGEX.test("user @example.com")).toBe(false);
      expect(EMAIL_REGEX.test("user@ example.com")).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("returns true for valid emails", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("a@b.c")).toBe(true);
    });

    it("returns false for invalid emails", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("normalizeEmail", () => {
    it("converts to lowercase", () => {
      expect(normalizeEmail("USER@EXAMPLE.COM")).toBe("user@example.com");
      expect(normalizeEmail("User@Example.Com")).toBe("user@example.com");
    });

    it("trims whitespace", () => {
      expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
      expect(normalizeEmail("\tuser@example.com\n")).toBe("user@example.com");
    });

    it("combines lowercase and trim", () => {
      expect(normalizeEmail("  USER@EXAMPLE.COM  ")).toBe("user@example.com");
    });
  });

  describe("PASSWORD_REGEX", () => {
    it("matches passwords meeting all requirements", () => {
      expect(PASSWORD_REGEX.test("Password1")).toBe(true);
      expect(PASSWORD_REGEX.test("MyPass123")).toBe(true);
      expect(PASSWORD_REGEX.test("Abcdefg1")).toBe(true);
    });

    it("rejects passwords too short", () => {
      expect(PASSWORD_REGEX.test("Pass1")).toBe(false);
      expect(PASSWORD_REGEX.test("Ab1")).toBe(false);
    });

    it("rejects passwords without uppercase", () => {
      expect(PASSWORD_REGEX.test("password1")).toBe(false);
    });

    it("rejects passwords without lowercase", () => {
      expect(PASSWORD_REGEX.test("PASSWORD1")).toBe(false);
    });

    it("rejects passwords without number", () => {
      expect(PASSWORD_REGEX.test("Passwordd")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("returns true for valid passwords", () => {
      expect(validatePassword("ValidPass1")).toBe(true);
    });

    it("returns false for invalid passwords", () => {
      expect(validatePassword("weak")).toBe(false);
      expect(validatePassword("")).toBe(false);
    });
  });

  describe("sanitizeProjectName", () => {
    it("strips HTML tags", () => {
      expect(sanitizeProjectName("<b>Test</b>")).toBe("Test");
      expect(sanitizeProjectName("<script>alert('xss')</script>")).toBe("alert('xss')");
      expect(sanitizeProjectName("Hello <em>World</em>")).toBe("Hello World");
    });

    it("trims whitespace", () => {
      expect(sanitizeProjectName("  Test Project  ")).toBe("Test Project");
      expect(sanitizeProjectName("\tProject\n")).toBe("Project");
    });

    it("truncates to 100 characters", () => {
      const longName = "a".repeat(150);
      expect(sanitizeProjectName(longName)).toHaveLength(100);
    });

    it("applies operations in correct order: strip HTML -> trim -> truncate", () => {
      // Edge case: HTML at boundaries
      const input = "  <b>Test Project</b>  ";
      expect(sanitizeProjectName(input)).toBe("Test Project");

      // Edge case: HTML that would exceed limit after stripping
      const htmlWithLongContent = "<div>" + "a".repeat(150) + "</div>";
      const result = sanitizeProjectName(htmlWithLongContent);
      expect(result).toHaveLength(100);
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    it("handles empty strings", () => {
      expect(sanitizeProjectName("")).toBe("");
      expect(sanitizeProjectName("   ")).toBe("");
      expect(sanitizeProjectName("<br>")).toBe("");
    });

    it("handles names with only HTML", () => {
      expect(sanitizeProjectName("<div></div>")).toBe("");
      expect(sanitizeProjectName("<b><i></i></b>")).toBe("");
    });

    it("preserves valid characters", () => {
      expect(sanitizeProjectName("My Project 2024")).toBe("My Project 2024");
      expect(sanitizeProjectName("project-name_v1.0")).toBe("project-name_v1.0");
    });
  });
});
