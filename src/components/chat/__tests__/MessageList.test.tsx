import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { UIMessage } from "ai";

// Mock the MarkdownRenderer component
vi.mock("../MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  User: ({ className }: { className?: string }) => (
    <div className={className}>User</div>
  ),
  Bot: ({ className }: { className?: string }) => (
    <div className={className}>Bot</div>
  ),
  Loader2: ({ className }: { className?: string }) => (
    <div className={className}>Loader2</div>
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <div className={className}>Sparkles</div>
  ),
}));

// Mock the isToolUIPart function
vi.mock("ai", async () => {
  const actual = await vi.importActual("ai");
  return {
    ...actual,
    isToolUIPart: (part: any) => part.type?.startsWith("tool-"),
  };
});

afterEach(() => {
  cleanup();
});

// Helper to create UIMessage (AI SDK v6 format - parts only, no content)
function createMessage(overrides: Partial<UIMessage> & { id: string; role: UIMessage['role'] }): UIMessage {
  return {
    parts: [],
    ...overrides,
  } as UIMessage;
}

test("MessageList shows empty state when no messages", () => {
  render(<MessageList messages={[]} />);

  expect(
    screen.getByText("Start creating React components")
  ).toBeDefined();
  expect(
    screen.getByText("I can help you create buttons, forms, cards, and more")
  ).toBeDefined();
});

test("MessageList renders user messages", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "Create a button component" }],
    }),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Create a button component")).toBeDefined();
});

test("MessageList renders assistant messages", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "I'll help you create a button component." }],
    }),
  ];

  render(<MessageList messages={messages} />);

  expect(
    screen.getByText("I'll help you create a button component.")
  ).toBeDefined();
});

test("MessageList renders messages with tool parts", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Creating your component..." },
        {
          type: "tool-str_replace_editor",
          toolCallId: "asdf",
          input: { command: "create", path: "App.jsx" },
          state: "output-available",
          output: "Success",
        } as any,
      ],
    }),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Creating your component...")).toBeDefined();
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("MessageList shows content for assistant message with text parts", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "Generating your component..." }],
    }),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  // The component shows the content
  expect(screen.getByText("Generating your component...")).toBeDefined();
});

test("MessageList shows loading state for last assistant message without content", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [],
    }),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  expect(screen.getByText("Generating...")).toBeDefined();
});

test("MessageList doesn't show loading state for non-last messages", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "First response" }],
    }),
    createMessage({
      id: "2",
      role: "user",
      parts: [{ type: "text", text: "Another request" }],
    }),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  // Loading state should not appear because the last message is from user, not assistant
  expect(screen.queryByText("Generating...")).toBeNull();
});

test("MessageList renders reasoning parts", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Let me analyze this." },
        {
          type: "reasoning",
          text: "The user wants a button component with specific styling.",
        } as any,
      ],
    }),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Reasoning")).toBeDefined();
  expect(
    screen.getByText("The user wants a button component with specific styling.")
  ).toBeDefined();
});

test("MessageList renders multiple messages in correct order", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "First user message" }],
    }),
    createMessage({
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "First assistant response" }],
    }),
    createMessage({
      id: "3",
      role: "user",
      parts: [{ type: "text", text: "Second user message" }],
    }),
    createMessage({
      id: "4",
      role: "assistant",
      parts: [{ type: "text", text: "Second assistant response" }],
    }),
  ];

  const { container } = render(<MessageList messages={messages} />);

  // Get all message containers in order (rounded-2xl is the new class)
  const messageContainers = container.querySelectorAll(".rounded-2xl");

  // Verify we have 4 messages
  expect(messageContainers).toHaveLength(4);

  // Check the content of each message in order
  expect(messageContainers[0].textContent).toContain("First user message");
  expect(messageContainers[1].textContent).toContain(
    "First assistant response"
  );
  expect(messageContainers[2].textContent).toContain("Second user message");
  expect(messageContainers[3].textContent).toContain(
    "Second assistant response"
  );
});

test("MessageList handles step-start parts", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Step 1 content" },
        { type: "step-start" } as any,
        { type: "text", text: "Step 2 content" },
      ],
    }),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Step 1 content")).toBeDefined();
  expect(screen.getByText("Step 2 content")).toBeDefined();
  // Check that a separator exists (hr element)
  const container = screen.getByText("Step 1 content").closest(".rounded-2xl");
  expect(container?.querySelector("hr")).toBeDefined();
});

test("MessageList applies correct styling for user vs assistant messages", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "User message" }],
    }),
    createMessage({
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "Assistant message" }],
    }),
  ];

  render(<MessageList messages={messages} />);

  const userMessage = screen.getByText("User message").closest(".rounded-2xl");
  const assistantMessage = screen
    .getByText("Assistant message")
    .closest(".rounded-2xl");

  // Both messages should have same background styling
  expect(userMessage?.className).toContain("bg-secondary");
  expect(userMessage?.className).toContain("text-secondary-foreground");
  expect(assistantMessage?.className).toContain("bg-secondary");
  expect(assistantMessage?.className).toContain("text-secondary-foreground");

  // User messages have rounded-br-md, assistant has rounded-bl-md
  expect(userMessage?.className).toContain("rounded-br-md");
  expect(assistantMessage?.className).toContain("rounded-bl-md");
});

test("MessageList handles messages with only text parts", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "This is from parts" }],
    }),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("This is from parts")).toBeDefined();
});

test("MessageList shows loading for assistant message with empty parts", () => {
  const messages: UIMessage[] = [
    createMessage({
      id: "1",
      role: "assistant",
      parts: [],
    }),
  ];

  const { container } = render(
    <MessageList messages={messages} isLoading={true} />
  );

  // Check that exactly one "Generating..." text appears
  const loadingText = container.querySelectorAll(".text-muted-foreground");
  const generatingElements = Array.from(loadingText).filter(
    (el) => el.textContent?.includes("Generating...")
  );
  expect(generatingElements).toHaveLength(1);
});
