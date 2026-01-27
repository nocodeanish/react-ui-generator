import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "../anon-work-tracker";

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

describe("Anonymous Work Tracker", () => {
  beforeEach(() => {
    // Clear mock storage before each test
    mockSessionStorage.clear();
    vi.clearAllMocks();

    // Mock window and sessionStorage
    vi.stubGlobal("window", { sessionStorage: mockSessionStorage });
    vi.stubGlobal("sessionStorage", mockSessionStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("setHasAnonWork", () => {
    test("should store work when messages exist", () => {
      const messages = [{ role: "user", content: "test message" }];
      const fileSystemData = { "/": {} };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "react-ai-ui-generator_has_anon_work",
        "true"
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "react-ai-ui-generator_anon_data",
        JSON.stringify({ messages, fileSystemData })
      );
    });

    test("should store work when file system has more than root", () => {
      const messages: any[] = [];
      const fileSystemData = {
        "/": {},
        "/App.jsx": { content: "test" },
      };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalled();
    });

    test("should not store work when no messages and only root exists", () => {
      const messages: any[] = [];
      const fileSystemData = { "/": {} };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    test("should not store work when empty messages and empty file system", () => {
      const messages: any[] = [];
      const fileSystemData = {};

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    test("should handle multiple messages", () => {
      const messages = [
        { role: "user", content: "first" },
        { role: "assistant", content: "response" },
        { role: "user", content: "second" },
      ];
      const fileSystemData = {};

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalled();
      const dataCall = mockSessionStorage.setItem.mock.calls.find(
        (call: [string, string]) => call[0] === "react-ai-ui-generator_anon_data"
      );
      expect(dataCall).toBeDefined();
      const storedData = JSON.parse(dataCall![1]);
      expect(storedData.messages).toEqual(messages);
    });
  });

  describe("getHasAnonWork", () => {
    test("should return true when work exists", () => {
      mockSessionStorage.setItem(
        "react-ai-ui-generator_has_anon_work",
        "true"
      );
      // Reset the mock to return the stored value
      mockSessionStorage.getItem.mockImplementation(
        (key: string): string | null => key === "react-ai-ui-generator_has_anon_work" ? "true" : null
      );

      expect(getHasAnonWork()).toBe(true);
    });

    test("should return false when no work exists", () => {
      mockSessionStorage.getItem.mockReturnValue(null as unknown as string);

      expect(getHasAnonWork()).toBe(false);
    });

    test("should return false when value is not 'true'", () => {
      mockSessionStorage.getItem.mockReturnValue("false" as string);

      expect(getHasAnonWork()).toBe(false);
    });
  });

  describe("getAnonWorkData", () => {
    test("should return stored work data", () => {
      const workData = {
        messages: [{ role: "user", content: "test" }],
        fileSystemData: { "/App.jsx": "code" },
      };
      mockSessionStorage.getItem.mockImplementation(
        (key: string): string | null => key === "react-ai-ui-generator_anon_data"
          ? JSON.stringify(workData)
          : null
      );

      expect(getAnonWorkData()).toEqual(workData);
    });

    test("should return null when no data exists", () => {
      mockSessionStorage.getItem.mockReturnValue(null as unknown as string);

      expect(getAnonWorkData()).toBeNull();
    });

    test("should return null for invalid JSON", () => {
      mockSessionStorage.getItem.mockReturnValue("invalid json {" as string);

      expect(getAnonWorkData()).toBeNull();
    });

    test("should handle empty object", () => {
      mockSessionStorage.getItem.mockImplementation(
        (key: string): string | null => key === "react-ai-ui-generator_anon_data"
          ? "{}"
          : null
      );

      expect(getAnonWorkData()).toEqual({});
    });
  });

  describe("clearAnonWork", () => {
    test("should remove both storage keys", () => {
      clearAnonWork();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "react-ai-ui-generator_has_anon_work"
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "react-ai-ui-generator_anon_data"
      );
    });

    test("should work even when no data exists", () => {
      // Should not throw
      expect(() => clearAnonWork()).not.toThrow();
    });
  });

  describe("Server-side rendering (no window)", () => {
    beforeEach(() => {
      vi.stubGlobal("window", undefined);
    });

    test("setHasAnonWork should not throw when window is undefined", () => {
      expect(() => setHasAnonWork([{ content: "test" }], {})).not.toThrow();
    });

    test("getHasAnonWork should return false when window is undefined", () => {
      expect(getHasAnonWork()).toBe(false);
    });

    test("getAnonWorkData should return null when window is undefined", () => {
      expect(getAnonWorkData()).toBeNull();
    });

    test("clearAnonWork should not throw when window is undefined", () => {
      expect(() => clearAnonWork()).not.toThrow();
    });
  });

  describe("Integration scenarios", () => {
    test("should correctly store and retrieve a full workflow", () => {
      const messages = [
        { role: "user", content: "Create a counter component" },
        { role: "assistant", content: "I'll create a counter for you." },
      ];
      const fileSystemData = {
        "/": { type: "directory", children: ["App.jsx"] },
        "/App.jsx": { type: "file", content: "export default function App() {}" },
      };

      // Store the work
      setHasAnonWork(messages, fileSystemData);

      // Simulate page reload by updating mock implementation
      let storedHasWork: string | null = null;
      let storedData: string | null = null;

      mockSessionStorage.setItem.mockImplementation((key, value) => {
        if (key === "react-ai-ui-generator_has_anon_work") storedHasWork = value;
        if (key === "react-ai-ui-generator_anon_data") storedData = value;
      });

      setHasAnonWork(messages, fileSystemData);

      mockSessionStorage.getItem.mockImplementation((key: string): string | null => {
        if (key === "react-ai-ui-generator_has_anon_work") return storedHasWork;
        if (key === "react-ai-ui-generator_anon_data") return storedData;
        return null;
      });

      // Verify work exists
      expect(getHasAnonWork()).toBe(true);

      // Retrieve and verify data
      const retrieved = getAnonWorkData();
      expect(retrieved?.messages).toEqual(messages);
      expect(retrieved?.fileSystemData).toEqual(fileSystemData);

      // Clear the work
      mockSessionStorage.removeItem.mockImplementation((key: string) => {
        if (key === "react-ai-ui-generator_has_anon_work") storedHasWork = null;
        if (key === "react-ai-ui-generator_anon_data") storedData = null;
      });
      clearAnonWork();

      // Update mock after clear
      mockSessionStorage.getItem.mockImplementation((key: string): string | null => {
        if (key === "react-ai-ui-generator_has_anon_work") return storedHasWork;
        if (key === "react-ai-ui-generator_anon_data") return storedData;
        return null;
      });

      // Verify cleared
      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toBeNull();
    });
  });
});
