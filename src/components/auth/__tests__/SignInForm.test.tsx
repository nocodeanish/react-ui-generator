import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "../SignInForm";

// Mock useAuth hook
const mockSignIn = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
  }),
}));

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    test("should render email input", () => {
      render(<SignInForm />);

      expect(screen.getByLabelText("Email")).toBeTruthy();
      expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
    });

    test("should render password input", () => {
      render(<SignInForm />);

      expect(screen.getByLabelText("Password")).toBeTruthy();
    });

    test("should render sign in button", () => {
      render(<SignInForm />);

      expect(screen.getByRole("button", { name: "Sign In" })).toBeTruthy();
    });

    test("should not show error initially", () => {
      render(<SignInForm />);

      expect(screen.queryByText(/failed/i)).toBeNull();
    });
  });

  describe("Form submission", () => {
    test("should call signIn with email and password on submit", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: true });

      render(<SignInForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("should call onSuccess callback on successful sign in", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockSignIn.mockResolvedValue({ success: true });

      render(<SignInForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    test("should display error message on failed sign in", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid email or password",
      });

      render(<SignInForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "wrongpassword");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Invalid email or password")).toBeTruthy();
      });
    });

    test("should display default error message when no error provided", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({ success: false });

      render(<SignInForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to sign in")).toBeTruthy();
      });
    });

    test("should not call onSuccess on failed sign in", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockSignIn.mockResolvedValue({ success: false, error: "Error" });

      render(<SignInForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "wrongpassword");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Error")).toBeTruthy();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Input validation", () => {
    test("should have required email input", () => {
      render(<SignInForm />);

      const emailInput = screen.getByLabelText("Email");
      expect(emailInput.hasAttribute("required")).toBe(true);
    });

    test("should have required password input", () => {
      render(<SignInForm />);

      const passwordInput = screen.getByLabelText("Password");
      expect(passwordInput.hasAttribute("required")).toBe(true);
    });

    test("should have email type input", () => {
      render(<SignInForm />);

      const emailInput = screen.getByLabelText("Email");
      expect(emailInput.getAttribute("type")).toBe("email");
    });

    test("should have password type input", () => {
      render(<SignInForm />);

      const passwordInput = screen.getByLabelText("Password");
      expect(passwordInput.getAttribute("type")).toBe("password");
    });
  });

  describe("Error handling", () => {
    test("should clear error when resubmitting", async () => {
      const user = userEvent.setup();

      // First submission fails
      mockSignIn.mockResolvedValueOnce({
        success: false,
        error: "Invalid credentials",
      });

      // Second submission succeeds
      mockSignIn.mockResolvedValueOnce({ success: true });

      render(<SignInForm />);

      // First attempt
      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "wrong");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeTruthy();
      });

      // Second attempt - error should clear during submit
      await user.clear(screen.getByLabelText("Password"));
      await user.type(screen.getByLabelText("Password"), "correct");
      await user.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.queryByText("Invalid credentials")).toBeNull();
      });
    });
  });

  describe("Input state", () => {
    test("should update email input on change", async () => {
      const user = userEvent.setup();

      render(<SignInForm />);

      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      await user.type(emailInput, "user@test.com");

      expect(emailInput.value).toBe("user@test.com");
    });

    test("should update password input on change", async () => {
      const user = userEvent.setup();

      render(<SignInForm />);

      const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
      await user.type(passwordInput, "mypassword");

      expect(passwordInput.value).toBe("mypassword");
    });
  });
});
