"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { VirtualFileSystem, FileNode } from "@/lib/file-system";

// Represents a tool call from Claude (str_replace_editor or file_manager)
interface ToolCall {
  toolName: string;
  args: any; // Tool-specific arguments
}

// Context API type definition for FileSystemContext
interface FileSystemContextType {
  fileSystem: VirtualFileSystem; // Instance managing the virtual file tree
  selectedFile: string | null; // Currently open file path in editor
  setSelectedFile: (path: string | null) => void; // Update selected file
  createFile: (path: string, content?: string) => void; // Create file and notify UI
  updateFile: (path: string, content: string) => void; // Update file and notify UI
  deleteFile: (path: string) => void; // Delete file and notify UI
  renameFile: (oldPath: string, newPath: string) => boolean; // Rename and update UI
  getFileContent: (path: string) => string | null; // Read file content
  getAllFiles: () => Map<string, string>; // Get all files for serialization
  refreshTrigger: number; // Incremented to force UI re-renders
  handleToolCall: (toolCall: ToolCall) => void; // Execute Claude's tool calls
  reset: () => void; // Clear all files
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(
  undefined
);

// Provider component that gives descendants access to the virtual file system
// Manages file state, auto-selection of files, and tool call execution
export function FileSystemProvider({
  children,
  fileSystem: providedFileSystem,
  initialData,
}: {
  children: React.ReactNode;
  fileSystem?: VirtualFileSystem; // Optional: reuse existing instance
  initialData?: Record<string, any>; // Optional: load existing file state
}) {
  // Initialize or reuse VirtualFileSystem instance
  // If initialData provided, deserialize it into the file system
  const [fileSystem] = useState(() => {
    const fs = providedFileSystem || new VirtualFileSystem();
    if (initialData) {
      fs.deserializeFromNodes(initialData);
    }
    return fs;
  });

  // Track which file is open in the editor
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  // Increment this to force UI re-renders when file structure changes
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Helper to trigger UI refresh by incrementing refreshTrigger
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Auto-select a file to display in editor on initial load
  // Prefers /App.jsx (entry point), falls back to first root-level file
  useEffect(() => {
    if (!selectedFile) {
      const files = fileSystem.getAllFiles();

      // Check if App.jsx (the entry point) exists
      if (files.has("/App.jsx")) {
        setSelectedFile("/App.jsx");
      } else {
        // Find all root-level files (no parent directory)
        const rootFiles = Array.from(files.keys())
          .filter((path) => {
            const parts = path.split("/").filter(Boolean);
            return parts.length === 1; // Root level file
          })
          .sort();

        // Select first root file if available
        if (rootFiles.length > 0) {
          setSelectedFile(rootFiles[0]);
        }
      }
    }
  }, [selectedFile, fileSystem, refreshTrigger]);

  const createFile = useCallback(
    (path: string, content: string = "") => {
      fileSystem.createFile(path, content);
      triggerRefresh();
    },
    [fileSystem, triggerRefresh]
  );

  const updateFile = useCallback(
    (path: string, content: string) => {
      fileSystem.updateFile(path, content);
      triggerRefresh();
    },
    [fileSystem, triggerRefresh]
  );

  const deleteFile = useCallback(
    (path: string) => {
      fileSystem.deleteFile(path);
      if (selectedFile === path) {
        setSelectedFile(null);
      }
      triggerRefresh();
    },
    [fileSystem, selectedFile, triggerRefresh]
  );

  const renameFile = useCallback(
    (oldPath: string, newPath: string): boolean => {
      const success = fileSystem.rename(oldPath, newPath);
      if (success) {
        // Update selected file if it was renamed
        if (selectedFile === oldPath) {
          setSelectedFile(newPath);
        } else if (selectedFile && selectedFile.startsWith(oldPath + "/")) {
          // Update selected file if it's inside a renamed directory
          const relativePath = selectedFile.substring(oldPath.length);
          setSelectedFile(newPath + relativePath);
        }
        triggerRefresh();
      }
      return success;
    },
    [fileSystem, selectedFile, triggerRefresh]
  );

  const getFileContent = useCallback(
    (path: string) => {
      return fileSystem.readFile(path);
    },
    [fileSystem]
  );

  const getAllFiles = useCallback(() => {
    return fileSystem.getAllFiles();
  }, [fileSystem]);

  const reset = useCallback(() => {
    fileSystem.reset();
    setSelectedFile(null);
    triggerRefresh();
  }, [fileSystem, triggerRefresh]);

  // Execute tool calls from Claude
  // Routes to either str_replace_editor (file content) or file_manager (file ops)
  const handleToolCall = useCallback(
    (toolCall: ToolCall) => {
      const { toolName, args } = toolCall;

      // STR_REPLACE_EDITOR TOOL: Create/edit files
      // Commands: create, str_replace, insert, view
      if (toolName === "str_replace_editor" && args) {
        const { command, path, file_text, old_str, new_str, insert_line } = args;

        switch (command) {
          // Create a new file with content
          case "create":
            if (path && file_text !== undefined) {
              // First update the backend file system
              const result = fileSystem.createFileWithParents(path, file_text);
              // Then trigger UI update (only if no error)
              if (!result.startsWith("Error:")) {
                createFile(path, file_text);
              }
            }
            break;

          // Replace all occurrences of old_str with new_str in a file
          case "str_replace":
            if (path && old_str !== undefined && new_str !== undefined) {
              // Execute replacement in file system
              const result = fileSystem.replaceInFile(path, old_str, new_str);
              // Update UI with new content (only if no error)
              if (!result.startsWith("Error:")) {
                const content = fileSystem.readFile(path);
                if (content !== null) {
                  updateFile(path, content);
                }
              }
            }
            break;

          // Insert text at a specific line
          case "insert":
            if (path && new_str !== undefined && insert_line !== undefined) {
              // Execute insertion in file system
              const result = fileSystem.insertInFile(path, insert_line, new_str);
              // Update UI with new content (only if no error)
              if (!result.startsWith("Error:")) {
                const content = fileSystem.readFile(path);
                if (content !== null) {
                  updateFile(path, content);
                }
              }
            }
            break;
        }
      }

      // FILE_MANAGER TOOL: File/directory operations
      // Commands: rename, delete
      if (toolName === "file_manager" && args) {
        const { command, path, new_path } = args;

        switch (command) {
          // Rename or move a file
          case "rename":
            if (path && new_path) {
              renameFile(path, new_path);
            }
            break;

          // Delete a file or directory
          case "delete":
            if (path) {
              const success = fileSystem.deleteFile(path);
              // Update UI if deletion succeeded
              if (success) {
                deleteFile(path);
              }
            }
            break;
        }
      }
    },
    [fileSystem, createFile, updateFile, deleteFile, renameFile]
  );

  return (
    <FileSystemContext.Provider
      value={{
        fileSystem,
        selectedFile,
        setSelectedFile,
        createFile,
        updateFile,
        deleteFile,
        renameFile,
        getFileContent,
        getAllFiles,
        refreshTrigger,
        handleToolCall,
        reset,
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error("useFileSystem must be used within a FileSystemProvider");
  }
  return context;
}
