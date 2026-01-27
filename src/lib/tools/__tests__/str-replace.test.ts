import { describe, test, expect, beforeEach } from "vitest";
import { buildStrReplaceTool } from "../str-replace";
import { VirtualFileSystem } from "@/lib/file-system";

// Helper to execute tool (v6 API requires two arguments)
async function executeTool(tool: ReturnType<typeof buildStrReplaceTool>, args: any) {
  return tool.execute!(args, {} as any) as Promise<string>;
}

describe("str-replace tool", () => {
  let fileSystem: VirtualFileSystem;
  let tool: ReturnType<typeof buildStrReplaceTool>;

  beforeEach(() => {
    fileSystem = new VirtualFileSystem();
    tool = buildStrReplaceTool(fileSystem);
  });

  describe("tool structure", () => {
    test("should have description", () => {
      expect(tool.description).toBeDefined();
      expect(tool.description).toContain("text editor");
    });

    test("should have inputSchema", () => {
      // In AI SDK v6, parameters is now inputSchema
      expect(tool.inputSchema).toBeDefined();
    });

    test("should have execute function", () => {
      expect(typeof tool.execute).toBe("function");
    });
  });

  describe("view command", () => {
    test("should view file contents", async () => {
      fileSystem.createFileWithParents("/App.jsx", "const App = () => {};");

      const result = await executeTool(tool, {
        command: "view",
        path: "/App.jsx",
      });

      expect(result).toContain("const App = () => {}");
    });

    test("should view file with line range", async () => {
      const content = "line1\nline2\nline3\nline4\nline5";
      fileSystem.createFileWithParents("/test.txt", content);

      const result = await executeTool(tool, {
        command: "view",
        path: "/test.txt",
        view_range: [2, 4],
      });

      expect(result).toContain("line2");
      expect(result).toContain("line4");
    });

    test("should handle view of non-existent file", async () => {
      const result = await executeTool(tool, {
        command: "view",
        path: "/non-existent.txt",
      });

      // Returns file not found message
      expect(result).toContain("not found");
    });
  });

  describe("create command", () => {
    test("should create a new file", async () => {
      const content = "export default function App() { return <div>Hello</div>; }";

      const result = await executeTool(tool, {
        command: "create",
        path: "/App.jsx",
        file_text: content,
      });

      expect(result).toContain("created");
      expect(fileSystem.readFile("/App.jsx")).toBe(content);
    });

    test("should create file with empty content when file_text is not provided", async () => {
      const result = await executeTool(tool, {
        command: "create",
        path: "/empty.txt",
      });

      expect(result).toContain("created");
      expect(fileSystem.readFile("/empty.txt")).toBe("");
    });

    test("should create nested directories as needed", async () => {
      const result = await executeTool(tool, {
        command: "create",
        path: "/components/ui/Button.jsx",
        file_text: "export const Button = () => <button />;",
      });

      expect(result).toContain("created");
      expect(fileSystem.exists("/components")).toBe(true);
      expect(fileSystem.exists("/components/ui")).toBe(true);
      expect(fileSystem.readFile("/components/ui/Button.jsx")).toBeDefined();
    });

    test("should handle file with special content", async () => {
      const content = `
        export default function App() {
          const [count, setCount] = useState(0);
          return (
            <div className="p-4">
              <h1>Count: {count}</h1>
              <button onClick={() => setCount(c => c + 1)}>+</button>
            </div>
          );
        }
      `;

      await executeTool(tool, {
        command: "create",
        path: "/App.jsx",
        file_text: content,
      });

      expect(fileSystem.readFile("/App.jsx")).toBe(content);
    });
  });

  describe("str_replace command", () => {
    test("should replace string in file", async () => {
      fileSystem.createFileWithParents("/App.jsx", "const name = 'old';");

      const result = await executeTool(tool, {
        command: "str_replace",
        path: "/App.jsx",
        old_str: "old",
        new_str: "new",
      });

      expect(result.toLowerCase()).toContain("replaced");
      expect(fileSystem.readFile("/App.jsx")).toBe("const name = 'new';");
    });

    test("should handle empty old_str", async () => {
      fileSystem.createFileWithParents("/App.jsx", "content");

      const result = await executeTool(tool, {
        command: "str_replace",
        path: "/App.jsx",
        old_str: "",
        new_str: "new",
      });

      // Should handle gracefully - behavior depends on implementation
      expect(result).toBeDefined();
    });

    test("should handle empty new_str (deletion)", async () => {
      fileSystem.createFileWithParents("/App.jsx", "const x = 'remove';");

      await executeTool(tool, {
        command: "str_replace",
        path: "/App.jsx",
        old_str: "'remove'",
        new_str: "",
      });

      expect(fileSystem.readFile("/App.jsx")).toBe("const x = ;");
    });

    test("should handle multiline replacement", async () => {
      const original = `function App() {
  return (
    <div>Old Content</div>
  );
}`;
      const oldStr = "<div>Old Content</div>";
      const newStr = "<div>New Content</div>";

      fileSystem.createFileWithParents("/App.jsx", original);

      await executeTool(tool, {
        command: "str_replace",
        path: "/App.jsx",
        old_str: oldStr,
        new_str: newStr,
      });

      expect(fileSystem.readFile("/App.jsx")).toContain("New Content");
      expect(fileSystem.readFile("/App.jsx")).not.toContain("Old Content");
    });

    test("should handle string not found", async () => {
      fileSystem.createFileWithParents("/App.jsx", "const x = 1;");

      const result = await executeTool(tool, {
        command: "str_replace",
        path: "/App.jsx",
        old_str: "not found string",
        new_str: "replacement",
      });

      expect(result).toContain("Error");
    });

    test("should handle non-existent file", async () => {
      const result = await executeTool(tool, {
        command: "str_replace",
        path: "/non-existent.txt",
        old_str: "old",
        new_str: "new",
      });

      expect(result).toContain("Error");
    });
  });

  describe("insert command", () => {
    test("should insert at specified line", async () => {
      const original = "line1\nline2\nline3";
      fileSystem.createFileWithParents("/test.txt", original);

      const result = await executeTool(tool, {
        command: "insert",
        path: "/test.txt",
        insert_line: 2,
        new_str: "inserted line",
      });

      expect(result.toLowerCase()).toContain("insert");
      const content = fileSystem.readFile("/test.txt");
      expect(content).toContain("inserted line");
    });

    test("should handle insert with default line 0", async () => {
      fileSystem.createFileWithParents("/test.txt", "existing content");

      await executeTool(tool, {
        command: "insert",
        path: "/test.txt",
        new_str: "prepended",
      });

      const content = fileSystem.readFile("/test.txt");
      expect(content).toBeDefined();
    });

    test("should handle insert with empty new_str", async () => {
      fileSystem.createFileWithParents("/test.txt", "content");

      const result = await executeTool(tool, {
        command: "insert",
        path: "/test.txt",
        insert_line: 1,
        new_str: "",
      });

      expect(result).toBeDefined();
    });
  });

  describe("undo_edit command", () => {
    test("should return error message as undo is not supported", async () => {
      fileSystem.createFileWithParents("/App.jsx", "content");

      const result = await executeTool(tool, {
        command: "undo_edit",
        path: "/App.jsx",
      });

      expect(result).toContain("Error");
      expect(result).toContain("undo_edit");
      expect(result).toContain("not supported");
    });
  });

  describe("edge cases", () => {
    test("should handle file with unicode content", async () => {
      const content = "const greeting = '你好世界 🌍';";

      await executeTool(tool, {
        command: "create",
        path: "/unicode.jsx",
        file_text: content,
      });

      expect(fileSystem.readFile("/unicode.jsx")).toBe(content);
    });

    test("should handle JSX content correctly", async () => {
      const jsx = `
export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-4xl font-bold">{count}</h1>
      <div className="flex gap-2">
        <button onClick={() => setCount(c => c - 1)}>-</button>
        <button onClick={() => setCount(0)}>Reset</button>
        <button onClick={() => setCount(c => c + 1)}>+</button>
      </div>
    </div>
  );
}`;

      await executeTool(tool, {
        command: "create",
        path: "/Counter.jsx",
        file_text: jsx,
      });

      expect(fileSystem.readFile("/Counter.jsx")).toBe(jsx);
    });

    test("should handle CSS file", async () => {
      const css = `
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.button:hover {
  background-color: #0070f3;
}`;

      await executeTool(tool, {
        command: "create",
        path: "/styles.css",
        file_text: css,
      });

      expect(fileSystem.readFile("/styles.css")).toBe(css);
    });

    test("should handle JSON file", async () => {
      const json = JSON.stringify({ name: "test", version: "1.0.0" }, null, 2);

      await executeTool(tool, {
        command: "create",
        path: "/package.json",
        file_text: json,
      });

      expect(fileSystem.readFile("/package.json")).toBe(json);
    });
  });
});
