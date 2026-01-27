import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "../SignUpForm";

// Mock useAuth hook
const mockSignUp = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    isLoading: false,
  }),
}));

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    test("should render email input", () => {
      render(<SignUpForm />);

      expect(screen.getByLabelText("Email")).toBeTruthy();
      expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
    });

    test("should render password input", () => {
      render(<SignUpForm />);

      expect(screen.getByLabelText("Password")).toBeTruthy();
    });

    test("should render confirm password input", () => {
      render(<SignUpForm />);

      expect(screen.getByLabelText("Confirm Password")).toBeTruthy();
    });

    test("should render sign up button", () => {
      render(<SignUpForm />);

      expect(screen.getByRole("button", { name: "Sign Up" })).toBeTruthy();
    });

    test("should show password requirements hint", () => {
      render(<SignUpForm />);

      expect(screen.getByText(/Must be at least 8 characters/)).toBeTruthy();
    });

    test("should not show error initially", () => {
      render(<SignUpForm />);

      expect(screen.queryByText(/failed/i)).toBeNull();
      expect(screen.queryByText(/do not match/i)).toBeNull();
    });
  });

  describe("Form submission", () => {
    test("should call signUp with email and password on submit", async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ success: true });

      render(<SignUpForm />);

      await user.type(screen.getByLabelText("Email"), "new@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText("Confirm Password"), "Password123");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "Password123");
    });

    test("should call onSuccess callback on successful sign up", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockSignUp.mockResolvedValue({ success: true });

      render(<SignUpForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText("Email"), "new@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText("Confirm Password"), "Password123");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    test("should display error message on failed sign up", async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({
        success: false,
        error: "Unable to create account",
      });

      render(<SignUpForm />);

      await user.type(screen.getByLabelText("Email"), "existing@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText("Confirm Password"), "Password123");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      await waitFor(() => {
        expect(screen.getByText("Unable to create account")).toBeTruthy();
      });
    });

    test("should display default error message when no error provided", async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ success: false });

      render(<SignUpForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText("Confirm Password"), "Password123");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to sign up")).toBeTruthy();
      });
    });

    test("should not call onSuccess on failed sign up", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockSignUp.mockResolvedValue({ success: false, error: "Error" });

      render(<SignUpForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText("Confirm Password"), "Password123");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      await waitFor(() => {
        expect(screen.getByText("Error")).toBeTruthy();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Password matching", () => {
    test("should show error when passwords do not match", async () => {
      const user = userEvent.setup();

      render(<SignUpForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText("Confirm Password"), "DifferentPassword");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      await waitFor(() => {
        expect(screen.getByText("Passwords do not match")).toBeTruthy();
      });

      // Should not call signUp when passwords don't match
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    test("should not show mismatch error when passwords match", async () => {
      const user = userEvent.setup();
      mockSignUp.mockResolvedValue({ success: true });

      render(<SignUpForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText("Confirm Password"), "Password123");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      expect(screen.queryByText("Passwords do not match")).toBeNull();
    });
  });

  describe("Input validation", () => {
    test("should have required email input", () => {
      render(<SignUpForm />);

      const emailInput = screen.getByLabelText("Email");
      expect(emailInput.hasAttribute("required")).toBe(true);
    });

    test("should have required password input", () => {
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText("Password");
      expect(passwordInput.hasAttribute("required")).toBe(true);
    });

    test("should have required confirm password input", () => {
      render(<SignUpForm />);

      const confirmInput = screen.getByLabelText("Confirm Password");
      expect(confirmInput.hasAttribute("required")).toBe(true);
    });

    test("should have email type input", () => {
      render(<SignUpForm />);

      const emailInput = screen.getByLabelText("Email");
      expect(emailInput.getAttribute("type")).toBe("email");
    });

    test("should have password type inputs", () => {
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText("Password");
      const confirmInput = screen.getByLabelText("Confirm Password");

      expect(passwordInput.getAttribute("type")).toBe("password");
      expect(confirmInput.getAttribute("type")).toBe("password");
    });

    test("should have minLength on password input", () => {
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText("Password");
      expect(passwordInput.getAttribute("minLength")).toBe("8");
    });
  });

  describe("Error handling", () => {
    test("should clear error when resubmitting", async () => {
      const user = userEvent.setup();

      // First submission with mismatched passwords
      render(<SignUpForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText("Confirm Password"), "Different");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      await waitFor(() => {
        expect(screen.getByText("Passwords do not match")).toBeTruthy();
      });

      // Fix the password mismatch
      mockSignUp.mockResolvedValue({ success: true });
      await user.clear(screen.getByLabelText("Confirm Password"));
      await user.type(screen.getByLabelText("Confirm Password"), "Password123");
      await user.click(screen.getByRole("button", { name: "Sign Up" }));

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Passwords do not match")).toBeNull();
      });
    });
  });

  describe("Input state", () => {
    test("should update email input on change", async () => {
      const user = userEvent.setup();

      render(<SignUpForm />);

      const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
      await user.type(emailInput, "newuser@test.com");

      expect(emailInput.value).toBe("newuser@test.com");
    });

    test("should update password input on change", async () => {
      const user = userEvent.setup();

      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
      await user.type(passwordInput, "MyPassword123");

      expect(passwordInput.value).toBe("MyPassword123");
    });

    test("should update confirm password input on change", async () => {
      const user = userEvent.setup();

      render(<SignUpForm />);

      const confirmInput = screen.getByLabelText("Confirm Password") as HTMLInputElement;
      await user.type(confirmInput, "MyPassword123");

      expect(confirmInput.value).toBe("MyPassword123");
    });
  });
});
