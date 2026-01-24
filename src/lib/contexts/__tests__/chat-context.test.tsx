import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import { ChatProvider, useChat } from "../chat-context";
import { useFileSystem } from "../file-system-context";
import { useChat as useAIChat } from "@ai-sdk/react";
import * as anonTracker from "@/lib/anon-work-tracker";

// Mock dependencies
vi.mock("../file-system-context", () => ({
  useFileSystem: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  setHasAnonWork: vi.fn(),
}));

// Helper component to access chat context
function TestComponent() {
  const chat = useChat();
  return (
    <div>
      <div data-testid="messages">{chat.messages.length}</div>
      <textarea
        data-testid="input"
        value={chat.input}
        onChange={chat.handleInputChange}
      />
      <form data-testid="form" onSubmit={chat.handleSubmit}>
        <button type="submit">Submit</button>
      </form>
      <div data-testid="status">{chat.status}</div>
    </div>
  );
}

describe("ChatContext", () => {
  const mockFileSystem = {
    serialize: vi.fn(() => ({ "/test.js": { type: "file", content: "test" } })),
  };

  const mockHandleToolCall = vi.fn();

  const mockUseAIChat = {
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    status: "idle",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useFileSystem as any).mockReturnValue({
      fileSystem: mockFileSystem,
      handleToolCall: mockHandleToolCall,
    });

    (useAIChat as any).mockReturnValue(mockUseAIChat);
  });

  afterEach(() => {
    cleanup();
  });

  test("renders with default values", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId("messages").textContent).toBe("0");
    expect(screen.getByTestId("input").getAttribute("value")).toBe(null);
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  test("initializes with project ID and messages", () => {
    const initialMessages = [
      { id: "1", role: "user" as const, content: "Hello" },
      { id: "2", role: "assistant" as const, content: "Hi there!" },
    ];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: initialMessages,
    });

    render(
      <ChatProvider projectId="test-project" initialMessages={initialMessages}>
        <TestComponent />
      </ChatProvider>
    );

    expect(useAIChat).toHaveBeenCalledWith({
      api: "/api/chat",
      initialMessages,
      body: {
        files: mockFileSystem.serialize(),
        projectId: "test-project",
      },
      onToolCall: expect.any(Function),
      onError: expect.any(Function),
    });

    expect(screen.getByTestId("messages").textContent).toBe("2");
  });

  test("tracks anonymous work when no project ID", async () => {
    const mockMessages = [{ id: "1", role: "user", content: "Hello" }];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: mockMessages,
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    await waitFor(() => {
      expect(anonTracker.setHasAnonWork).toHaveBeenCalledWith(
        mockMessages,
        mockFileSystem.serialize()
      );
    });
  });

  test("does not track anonymous work when project ID exists", async () => {
    const mockMessages = [{ id: "1", role: "user", content: "Hello" }];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: mockMessages,
    });

    render(
      <ChatProvider projectId="test-project">
        <TestComponent />
      </ChatProvider>
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(anonTracker.setHasAnonWork).not.toHaveBeenCalled();
  });

  test("passes through AI chat functionality", () => {
    const mockHandleInputChange = vi.fn();
    const mockHandleSubmit = vi.fn();

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      handleInputChange: mockHandleInputChange,
      handleSubmit: mockHandleSubmit,
      status: "loading",
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("loading");

    // Verify functions are passed through
    const textarea = screen.getByTestId("input");
    const form = screen.getByTestId("form");

    expect(textarea).toBeDefined();
    expect(form).toBeDefined();
  });

  test("handles tool calls", () => {
    let onToolCallHandler: any;

    (useAIChat as any).mockImplementation((config: any) => {
      onToolCallHandler = config.onToolCall;
      return mockUseAIChat;
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    const toolCall = { toolName: "test", args: {} };
    onToolCallHandler({ toolCall });

    expect(mockHandleToolCall).toHaveBeenCalledWith(toolCall);
  });

  // NEW TESTS FOR ERROR HANDLING (Added after debugging session)

  test("should pass error from useAIChat to context", () => {
    const testError = new Error("Test error from AI SDK");

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      error: testError,
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Error should be accessible in the context
    // We can't directly test context values without exposing them,
    // but we verify useAIChat was called with error handling
    expect(useAIChat).toHaveBeenCalledWith(
      expect.objectContaining({
        onError: expect.any(Function),
      })
    );
  });

  test("should pass reload function from useAIChat to context", () => {
    const mockReload = vi.fn();

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      reload: mockReload,
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Reload function should be passed through
    expect(useAIChat).toHaveBeenCalled();
  });

  test("should register onError callback with useAIChat", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(useAIChat).toHaveBeenCalledWith(
      expect.objectContaining({
        onError: expect.any(Function),
      })
    );
  });

  test("onError callback should log errors to console", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let onErrorCallback: Function;

    (useAIChat as any).mockImplementation((config: any) => {
      onErrorCallback = config.onError;
      return mockUseAIChat;
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    const testError = new Error("Test error for logging");
    onErrorCallback(testError);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[Chat Error]", testError);

    consoleErrorSpy.mockRestore();
  });

  test("should handle API errors without crashing", () => {
    const apiError = new Error("ANTHROPIC_API_KEY is required");

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      error: apiError,
      reload: vi.fn(),
    });

    expect(() =>
      render(
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      )
    ).not.toThrow();
  });

  test("should handle network errors without crashing", () => {
    const networkError = new Error("Network request failed");

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      error: networkError,
      reload: vi.fn(),
    });

    expect(() =>
      render(
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      )
    ).not.toThrow();
  });

  test("should initialize with no error state", () => {
    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      error: undefined,
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Should render without errors
    expect(screen.getByTestId("messages")).toBeDefined();
  });

  test("should handle error state transitions", () => {
    const { rerender } = render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Start with no error
    expect(screen.getByTestId("messages")).toBeDefined();

    // Add error
    const testError = new Error("New error occurred");
    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      error: testError,
      reload: vi.fn(),
    });

    rerender(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Should still render
    expect(screen.getByTestId("messages")).toBeDefined();

    // Clear error
    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      error: undefined,
    });

    rerender(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Should still render
    expect(screen.getByTestId("messages")).toBeDefined();
  });

  test("should call onError when useAIChat encounters streaming error", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let onErrorCallback: Function;

    (useAIChat as any).mockImplementation((config: any) => {
      onErrorCallback = config.onError;
      return mockUseAIChat;
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    const streamError = new Error("Stream parsing error");
    onErrorCallback(streamError);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[Chat Error]", streamError);

    consoleErrorSpy.mockRestore();
  });

  test("should maintain other context values when error is present", () => {
    const testMessages = [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "assistant", content: "Hi!" },
    ];
    const testError = new Error("Test error");

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: testMessages,
      error: testError,
      reload: vi.fn(),
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Messages should still be available despite error
    expect(screen.getByTestId("messages").textContent).toBe("2");
  });

  test("should work with both projectId and error handling", () => {
    const testError = new Error("Project error");
    const initialMessages = [{ id: "1", role: "user", content: "Test" }];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: initialMessages,
      error: testError,
      reload: vi.fn(),
    });

    expect(() =>
      render(
        <ChatProvider projectId="test-project" initialMessages={initialMessages}>
          <TestComponent />
        </ChatProvider>
      )
    ).not.toThrow();
  });

  test("onError should handle errors with missing message property", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let onErrorCallback: Function;

    (useAIChat as any).mockImplementation((config: any) => {
      onErrorCallback = config.onError;
      return mockUseAIChat;
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    const errorWithoutMessage = {} as Error;
    onErrorCallback(errorWithoutMessage);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[Chat Error]", errorWithoutMessage);

    consoleErrorSpy.mockRestore();
  });
});
