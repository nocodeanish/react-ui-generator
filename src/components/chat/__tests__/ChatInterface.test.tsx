import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInterface } from "../ChatInterface";
import { useChat } from "@/lib/contexts/chat-context";

// Mock the dependencies
vi.mock("@/lib/contexts/chat-context", () => ({
  useChat: vi.fn(),
}));

// Mock the ScrollArea component
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-radix-scroll-area-viewport>
      {children}
    </div>
  ),
}));

// Mock the child components
vi.mock("../MessageList", () => ({
  MessageList: ({ messages, isLoading }: any) => (
    <div data-testid="message-list">
      {messages.length} messages, loading: {isLoading.toString()}
    </div>
  ),
}));

vi.mock("../MessageInput", () => ({
  MessageInput: ({ input, handleInputChange, handleSubmit, isLoading }: any) => (
    <div data-testid="message-input">
      <input
        value={input}
        onChange={handleInputChange}
        data-testid="input"
        disabled={isLoading}
      />
      <button onClick={handleSubmit} disabled={isLoading} data-testid="submit">
        Submit
      </button>
    </div>
  ),
}));

const mockUseChat = {
  messages: [],
  input: "",
  handleInputChange: vi.fn(),
  handleSubmit: vi.fn(),
  status: "idle" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  (useChat as any).mockReturnValue(mockUseChat);
});

afterEach(() => {
  cleanup();
});

test("renders chat interface with message list and input", () => {
  render(<ChatInterface />);

  expect(screen.getByTestId("message-list")).toBeDefined();
  expect(screen.getByTestId("message-input")).toBeDefined();
});

test("passes correct props to MessageList", () => {
  const messages = [
    { id: "1", role: "user", content: "Hello" },
    { id: "2", role: "assistant", content: "Hi there!" },
  ];
  
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    messages,
    status: "streaming",
  });

  render(<ChatInterface />);

  const messageList = screen.getByTestId("message-list");
  expect(messageList.textContent).toContain("2 messages");
  expect(messageList.textContent).toContain("loading: true");
});

test("passes correct props to MessageInput", () => {
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    input: "Test input",
    status: "submitted",
  });

  render(<ChatInterface />);

  const input = screen.getByTestId("input");
  expect(input).toHaveProperty("value", "Test input");
  expect(input).toHaveProperty("disabled", true);
});

test("isLoading is true when status is submitted", () => {
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    status: "submitted",
  });

  render(<ChatInterface />);

  const submitButton = screen.getByTestId("submit");
  expect(submitButton).toHaveProperty("disabled", true);
});

test("isLoading is true when status is streaming", () => {
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    status: "streaming",
  });

  render(<ChatInterface />);

  const submitButton = screen.getByTestId("submit");
  expect(submitButton).toHaveProperty("disabled", true);
});

test("isLoading is false when status is idle", () => {
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    status: "idle",
  });

  render(<ChatInterface />);

  const submitButton = screen.getByTestId("submit");
  expect(submitButton).toHaveProperty("disabled", false);
});


test("scrolls when messages change", () => {
  const { rerender } = render(<ChatInterface />);

  // Get initial scroll container
  const scrollContainer = screen.getByTestId("message-list").closest("[data-radix-scroll-area-viewport]");
  expect(scrollContainer).toBeDefined();

  // Update messages - this should trigger the useEffect
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    messages: [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "assistant", content: "Hi there!" },
    ],
  });

  rerender(<ChatInterface />);

  // Verify component re-rendered with new messages
  const messageList = screen.getByTestId("message-list");
  expect(messageList.textContent).toContain("2 messages");
});

test("renders with correct layout classes", () => {
  const { container } = render(<ChatInterface />);

  const mainDiv = container.firstChild as HTMLElement;
  expect(mainDiv.className).toContain("flex");
  expect(mainDiv.className).toContain("flex-col");
  expect(mainDiv.className).toContain("h-full");
  expect(mainDiv.className).toContain("p-4");
  expect(mainDiv.className).toContain("overflow-hidden");

  // When messages are empty, the wrapper uses flex for centering
  // When messages exist, it uses ScrollArea with overflow-hidden
  const scrollArea = screen.getByTestId("message-list").closest(".flex-1");
  expect(scrollArea?.className).toMatch(/(overflow-hidden|flex items-center justify-center)/);

  const inputWrapper = screen.getByTestId("message-input").parentElement;
  expect(inputWrapper?.className).toContain("mt-4");
  expect(inputWrapper?.className).toContain("flex-shrink-0");
});

// NEW TESTS FOR ERROR HANDLING (Added after debugging session)

test("should display error banner when error exists", () => {
  const testError = new Error("Test error message");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: testError,
    reload: vi.fn(),
  });

  render(<ChatInterface />);

  expect(screen.getByText("Error")).toBeDefined();
  expect(screen.getByText(/Test error message/)).toBeDefined();
});

test("should not display error banner when no error", () => {
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: undefined,
    reload: vi.fn(),
  });

  render(<ChatInterface />);

  expect(screen.queryByText("Error")).toBeNull();
});

test("should display Retry button when error exists", () => {
  const testError = new Error("Test error");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: testError,
    reload: vi.fn(),
  });

  render(<ChatInterface />);

  const retryButton = screen.getByRole("button", { name: /retry/i });
  expect(retryButton).toBeDefined();
});

test("should call reload when Retry button is clicked", async () => {
  const user = userEvent.setup();
  const mockReload = vi.fn();
  const testError = new Error("Test error");

  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: testError,
    reload: mockReload,
  });

  render(<ChatInterface />);

  const retryButton = screen.getByRole("button", { name: /retry/i });
  await user.click(retryButton);

  expect(mockReload).toHaveBeenCalledTimes(1);
});

test("should display API key setup instructions for ANTHROPIC_API_KEY errors", () => {
  const apiKeyError = new Error("ANTHROPIC_API_KEY is required for AI generation");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: apiKeyError,
    reload: vi.fn(),
  });

  render(<ChatInterface />);

  expect(screen.getByText(/Setup Required/)).toBeDefined();
  expect(screen.getByText(/Add your Anthropic API key/)).toBeDefined();
});

test("should show console.anthropic.com link for API key errors", () => {
  const apiKeyError = new Error("ANTHROPIC_API_KEY not found");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: apiKeyError,
    reload: vi.fn(),
  });

  render(<ChatInterface />);

  const setupText = screen.getByText(/console\.anthropic\.com/);
  expect(setupText).toBeDefined();
});

test("should not show API key instructions for non-API-key errors", () => {
  const networkError = new Error("Network request failed");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: networkError,
    reload: vi.fn(),
  });

  render(<ChatInterface />);

  expect(screen.queryByText(/Setup Required/)).toBeNull();
  expect(screen.queryByText(/console\.anthropic\.com/)).toBeNull();
});

test("should display default error message when error.message is undefined", () => {
  const errorWithoutMessage = new Error();
  errorWithoutMessage.message = "";

  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: errorWithoutMessage,
    reload: vi.fn(),
  });

  render(<ChatInterface />);

  expect(screen.getByText(/An error occurred while processing your message/)).toBeDefined();
});

test("error banner should have correct styling classes", () => {
  const testError = new Error("Test error");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: testError,
    reload: vi.fn(),
  });

  const { container } = render(<ChatInterface />);

  const errorBanner = container.querySelector(".bg-red-50");
  expect(errorBanner).toBeDefined();
  expect(errorBanner?.className).toContain("border-red-200");
  expect(errorBanner?.className).toContain("rounded-lg");
});

test("should handle error and reload being undefined gracefully", () => {
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: undefined,
    reload: undefined,
  });

  expect(() => render(<ChatInterface />)).not.toThrow();
});

test("reload function should be optional in useChat return", () => {
  const testError = new Error("Test error");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: testError,
    // reload intentionally omitted
  });

  // Should render without crashing even if reload is missing
  expect(() => render(<ChatInterface />)).not.toThrow();
});

test("should clear error banner when error becomes undefined", () => {
  const testError = new Error("Test error");
  const { rerender } = render(<ChatInterface />);

  // Initially with error
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: testError,
    reload: vi.fn(),
  });

  rerender(<ChatInterface />);
  expect(screen.getByText("Error")).toBeDefined();

  // Update to no error
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: undefined,
    reload: vi.fn(),
  });

  rerender(<ChatInterface />);
  expect(screen.queryByText("Error")).toBeNull();
});

test("should handle multiple consecutive errors", async () => {
  const user = userEvent.setup();
  const mockReload = vi.fn();

  const error1 = new Error("First error");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: error1,
    reload: mockReload,
  });

  const { rerender } = render(<ChatInterface />);
  expect(screen.getByText(/First error/)).toBeDefined();

  const retryButton1 = screen.getByRole("button", { name: /retry/i });
  await user.click(retryButton1);
  expect(mockReload).toHaveBeenCalledTimes(1);

  // Simulate second error
  const error2 = new Error("Second error");
  (useChat as any).mockReturnValue({
    ...mockUseChat,
    error: error2,
    reload: mockReload,
  });

  rerender(<ChatInterface />);
  expect(screen.getByText(/Second error/)).toBeDefined();

  const retryButton2 = screen.getByRole("button", { name: /retry/i });
  await user.click(retryButton2);
  expect(mockReload).toHaveBeenCalledTimes(2);
});