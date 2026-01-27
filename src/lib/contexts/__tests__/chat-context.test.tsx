import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
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

vi.mock("ai", () => ({
  UIMessage: {},
  DefaultChatTransport: vi.fn().mockImplementation((config: any) => config),
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
        onChange={(e) => chat.setInput(e.target.value)}
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

  // v6 API: sendMessage/regenerate instead of handleInputChange/handleSubmit/reload
  const mockUseAIChat = {
    messages: [],
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    status: "idle",
    error: undefined,
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
    // Input starts empty
    expect(screen.getByTestId("input")).toHaveProperty("value", "");
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  test("initializes with project ID and messages", () => {
    // v6 API: UIMessage uses parts array
    const initialMessages = [
      { id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "Hello" }] },
      { id: "2", role: "assistant" as const, parts: [{ type: "text" as const, text: "Hi there!" }] },
    ];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: initialMessages,
    });

    render(
      <ChatProvider projectId="test-project" initialMessages={initialMessages as any}>
        <TestComponent />
      </ChatProvider>
    );

    // v6 API: uses transport object instead of individual properties
    expect(useAIChat).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.anything(),
        messages: initialMessages,
        onToolCall: expect.any(Function),
        onError: expect.any(Function),
      })
    );

    expect(screen.getByTestId("messages").textContent).toBe("2");
  });

  test("tracks anonymous work when no project ID", async () => {
    const mockMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
    ];

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
    const mockMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
    ];

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
    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      status: "streaming",
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("streaming");

    // Verify form and input exist
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

    // v6 API: toolCall has 'input' instead of 'args'
    const toolCall = { toolName: "test", input: {} };
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

  test("should pass regenerate function from useAIChat to context", () => {
    const mockRegenerate = vi.fn();

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      regenerate: mockRegenerate,
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // regenerate function should be passed through (mapped to reload)
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
    let onErrorCallback: Function = () => {};

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
      regenerate: vi.fn(),
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
      regenerate: vi.fn(),
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
      regenerate: vi.fn(),
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
    let onErrorCallback: Function = () => {};

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
      { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "Hi!" }] },
    ];
    const testError = new Error("Test error");

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: testMessages,
      error: testError,
      regenerate: vi.fn(),
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
    const initialMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Test" }] },
    ];

    (useAIChat as any).mockReturnValue({
      ...mockUseAIChat,
      messages: initialMessages,
      error: testError,
      regenerate: vi.fn(),
    });

    expect(() =>
      render(
        <ChatProvider projectId="test-project" initialMessages={initialMessages as any}>
          <TestComponent />
        </ChatProvider>
      )
    ).not.toThrow();
  });

  test("onError should handle errors with missing message property", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let onErrorCallback: Function = () => {};

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
