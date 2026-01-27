import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";

// Mock dependencies
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    test("should call signInAction with email and password", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "Password123");
      });

      expect(signInAction).toHaveBeenCalledWith("test@example.com", "Password123");
    });

    test("should set isLoading to true during sign in", async () => {
      let resolveSignIn: (value: { success: boolean }) => void;
      vi.mocked(signInAction).mockImplementation(
        () => new Promise((resolve) => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "Password123");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the sign in
      await act(async () => {
        resolveSignIn!({ success: false });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("should return success result from signInAction", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "proj-1", name: "Test" }] as any);

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "Password123");
      });

      expect(signInResult.success).toBe(true);
    });

    test("should return error result from signInAction", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Invalid email or password",
      });

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrong");
      });

      expect(signInResult.success).toBe(false);
      expect(signInResult.error).toBe("Invalid email or password");
    });

    test("should navigate to project after successful sign in with anonymous work", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      });
      vi.mocked(createProject).mockResolvedValue({ id: "new-proj-123" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "Password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "test" }],
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-proj-123");
    });

    test("should navigate to most recent project after successful sign in without anonymous work", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([
        { id: "recent-proj", name: "Recent", createdAt: new Date(), updatedAt: new Date() },
      ] as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "Password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-proj");
    });

    test("should create new project if user has no projects", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "new-default-proj" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "Password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/new-default-proj");
    });
  });

  describe("signUp", () => {
    test("should call signUpAction with email and password", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "Password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "Password123");
    });

    test("should return success result from signUpAction", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "new-proj" } as any);

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("new@example.com", "Password123");
      });

      expect(signUpResult.success).toBe(true);
    });

    test("should return error result from signUpAction", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Unable to create account",
      });

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("existing@example.com", "Password123");
      });

      expect(signUpResult.success).toBe(false);
      expect(signUpResult.error).toBe("Unable to create account");
    });

    test("should navigate after successful sign up with anonymous work", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({
        messages: [{ role: "assistant", content: "Created component" }],
        fileSystemData: { "/App.jsx": "code" },
      });
      vi.mocked(createProject).mockResolvedValue({ id: "saved-proj" } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "Password123");
      });

      expect(createProject).toHaveBeenCalled();
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/saved-proj");
    });
  });

  describe("isLoading state", () => {
    test("should initially be false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("should reset to false even if action throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "Password123");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
