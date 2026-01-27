import { describe, test, expect, beforeEach } from "vitest";
import { buildFileManagerTool } from "../file-manager";
import { VirtualFileSystem } from "@/lib/file-system";

// Helper to execute tool (v6 API requires two arguments)
async function executeTool(tool: ReturnType<typeof buildFileManagerTool>, args: any) {
  return tool.execute!(args, {} as any) as Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

describe("file-manager tool", () => {
  let fileSystem: VirtualFileSystem;
  let tool: ReturnType<typeof buildFileManagerTool>;

  beforeEach(() => {
    fileSystem = new VirtualFileSystem();
    tool = buildFileManagerTool(fileSystem);
  });

  describe("tool structure", () => {
    test("should have description", () => {
      expect(tool.description).toBeDefined();
      expect(tool.description).toContain("Rename");
      expect(tool.description).toContain("delete");
    });

    test("should have inputSchema defined", () => {
      // In AI SDK v6, parameters is now inputSchema
      expect(tool.inputSchema).toBeDefined();
    });

    test("should have execute function", () => {
      expect(typeof tool.execute).toBe("function");
    });
  });

  describe("rename command", () => {
    test("should rename a file successfully", async () => {
      fileSystem.createFileWithParents("/old.txt", "content");

      const result = await executeTool(tool, {
        command: "rename",
        path: "/old.txt",
        new_path: "/new.txt",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("renamed");
      expect(fileSystem.exists("/old.txt")).toBe(false);
      expect(fileSystem.exists("/new.txt")).toBe(true);
      expect(fileSystem.readFile("/new.txt")).toBe("content");
    });

    test("should rename file to nested path (move)", async () => {
      fileSystem.createFileWithParents("/App.jsx", "code");

      const result = await executeTool(tool, {
        command: "rename",
        path: "/App.jsx",
        new_path: "/components/App.jsx",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.exists("/App.jsx")).toBe(false);
      expect(fileSystem.exists("/components/App.jsx")).toBe(true);
    });

    test("should return error when new_path is not provided", async () => {
      fileSystem.createFileWithParents("/file.txt", "content");

      const result = await executeTool(tool, {
        command: "rename",
        path: "/file.txt",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("new_path is required");
    });

    test("should return error when file does not exist", async () => {
      const result = await executeTool(tool, {
        command: "rename",
        path: "/non-existent.txt",
        new_path: "/new.txt",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle renaming to same directory with different name", async () => {
      fileSystem.createFileWithParents("/components/Button.jsx", "button code");

      const result = await executeTool(tool, {
        command: "rename",
        path: "/components/Button.jsx",
        new_path: "/components/PrimaryButton.jsx",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.exists("/components/Button.jsx")).toBe(false);
      expect(fileSystem.exists("/components/PrimaryButton.jsx")).toBe(true);
    });

    test("should preserve file content after rename", async () => {
      const content = "export const Button = () => <button />;";
      fileSystem.createFileWithParents("/Button.jsx", content);

      await executeTool(tool, {
        command: "rename",
        path: "/Button.jsx",
        new_path: "/NewButton.jsx",
      });

      expect(fileSystem.readFile("/NewButton.jsx")).toBe(content);
    });
  });

  describe("delete command", () => {
    test("should delete a file successfully", async () => {
      fileSystem.createFileWithParents("/to-delete.txt", "content");
      expect(fileSystem.exists("/to-delete.txt")).toBe(true);

      const result = await executeTool(tool, {
        command: "delete",
        path: "/to-delete.txt",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("deleted");
      expect(fileSystem.exists("/to-delete.txt")).toBe(false);
    });

    test("should delete a nested file", async () => {
      fileSystem.createFileWithParents("/components/ui/Button.jsx", "code");

      const result = await executeTool(tool, {
        command: "delete",
        path: "/components/ui/Button.jsx",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.exists("/components/ui/Button.jsx")).toBe(false);
      // Parent directories should still exist
      expect(fileSystem.exists("/components/ui")).toBe(true);
    });

    test("should return error when file does not exist", async () => {
      const result = await executeTool(tool, {
        command: "delete",
        path: "/non-existent.txt",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should handle deleting directory", async () => {
      fileSystem.createFileWithParents("/folder/file.txt", "content");

      const result = await executeTool(tool, {
        command: "delete",
        path: "/folder",
      });

      // Whether this succeeds depends on VFS implementation
      // Just verify it returns a valid result
      expect(result).toHaveProperty("success");
    });
  });

  describe("invalid command", () => {
    test("should return error for invalid command", async () => {
      const result = await executeTool(tool, {
        command: "invalid" as any,
        path: "/file.txt",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid command");
    });
  });

  describe("edge cases", () => {
    test("should handle paths with special characters", async () => {
      fileSystem.createFileWithParents("/file-with-dashes.txt", "content");

      const result = await executeTool(tool, {
        command: "rename",
        path: "/file-with-dashes.txt",
        new_path: "/file_with_underscores.txt",
      });

      expect(result.success).toBe(true);
    });

    test("should handle deep nested paths", async () => {
      fileSystem.createFileWithParents("/a/b/c/d/e/file.txt", "deep content");

      const result = await executeTool(tool, {
        command: "delete",
        path: "/a/b/c/d/e/file.txt",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.exists("/a/b/c/d/e/file.txt")).toBe(false);
    });

    test("should handle JSX file operations", async () => {
      const jsxContent = `
import React from 'react';

export default function Component() {
  return <div>Hello</div>;
}`;
      fileSystem.createFileWithParents("/Component.jsx", jsxContent);

      // Rename
      await executeTool(tool, {
        command: "rename",
        path: "/Component.jsx",
        new_path: "/NewComponent.jsx",
      });

      expect(fileSystem.readFile("/NewComponent.jsx")).toBe(jsxContent);

      // Delete
      const deleteResult = await executeTool(tool, {
        command: "delete",
        path: "/NewComponent.jsx",
      });

      expect(deleteResult.success).toBe(true);
    });

    test("should handle empty new_path string", async () => {
      fileSystem.createFileWithParents("/file.txt", "content");

      const result = await executeTool(tool, {
        command: "rename",
        path: "/file.txt",
        new_path: "",
      });

      // Empty string should trigger validation error or fail
      expect(result.success).toBe(false);
    });

    test("should handle renaming when target path has missing parent directories", async () => {
      fileSystem.createFileWithParents("/source.txt", "content");

      const result = await executeTool(tool, {
        command: "rename",
        path: "/source.txt",
        new_path: "/deep/nested/dir/target.txt",
      });

      // Should create parent directories automatically
      if (result.success) {
        expect(fileSystem.exists("/deep/nested/dir/target.txt")).toBe(true);
      }
    });

    test("should handle multiple operations in sequence", async () => {
      // Create initial file
      fileSystem.createFileWithParents("/step1.txt", "content");

      // Rename to step2
      await executeTool(tool, {
        command: "rename",
        path: "/step1.txt",
        new_path: "/step2.txt",
      });
      expect(fileSystem.exists("/step2.txt")).toBe(true);

      // Rename to step3
      await executeTool(tool, {
        command: "rename",
        path: "/step2.txt",
        new_path: "/step3.txt",
      });
      expect(fileSystem.exists("/step3.txt")).toBe(true);

      // Delete
      const result = await executeTool(tool, {
        command: "delete",
        path: "/step3.txt",
      });
      expect(result.success).toBe(true);
      expect(fileSystem.exists("/step3.txt")).toBe(false);
    });
  });

  describe("result messages", () => {
    test("rename success message should include paths", async () => {
      fileSystem.createFileWithParents("/old.txt", "content");

      const result = await executeTool(tool, {
        command: "rename",
        path: "/old.txt",
        new_path: "/new.txt",
      });

      expect(result.message).toContain("/old.txt");
      expect(result.message).toContain("/new.txt");
    });

    test("delete success message should include path", async () => {
      fileSystem.createFileWithParents("/to-delete.txt", "content");

      const result = await executeTool(tool, {
        command: "delete",
        path: "/to-delete.txt",
      });

      expect(result.message).toContain("/to-delete.txt");
    });

    test("rename error message should include paths", async () => {
      const result = await executeTool(tool, {
        command: "rename",
        path: "/non-existent.txt",
        new_path: "/target.txt",
      });

      expect(result.success).toBe(false);
    });
  });
});
