// Represents a single node in the virtual file system tree
export interface FileNode {
  type: "file" | "directory";
  name: string;
  path: string;
  content?: string; // Only present for files
  children?: Map<string, FileNode>; // Only present for directories
}

// Security limits for virtual file system
const MAX_FILES = 100;
const MAX_FILE_SIZE = 500_000; // 500KB per file
const MAX_TOTAL_SIZE = 5_000_000; // 5MB total
const ALLOWED_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".json",
  ".md",
  ".txt",
];

// In-memory file system implementation using a tree structure
// Avoids disk I/O for performance and enables atomic save operations
export class VirtualFileSystem {
  private files: Map<string, FileNode> = new Map(); // Global index: path -> FileNode for O(1) lookups
  private root: FileNode; // Root directory node

  constructor() {
    this.root = {
      type: "directory",
      name: "/",
      path: "/",
      children: new Map(),
    };
    this.files.set("/", this.root);
  }

  // Validate path is safe (no traversal, valid format)
  private validatePath(path: string): boolean {
    // Must start with /
    if (!path.startsWith("/")) {
      return false;
    }

    // No path traversal attempts
    if (path.includes("..")) {
      return false;
    }

    // No double slashes (except normalization handles this)
    if (path.includes("//")) {
      return false;
    }

    // No null bytes
    if (path.includes("\0")) {
      return false;
    }

    // Check max path length
    if (path.length > 500) {
      return false;
    }

    return true;
  }

  // Validate file extension is allowed
  private validateFileExtension(path: string): boolean {
    const lastDot = path.lastIndexOf(".");
    if (lastDot === -1) {
      return false; // No extension
    }

    const ext = path.substring(lastDot).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  }

  // Check if adding a file would exceed size limits
  private checkSizeLimits(newFileSize: number): boolean {
    // Check file count
    const fileCount = Array.from(this.files.values()).filter(
      (node) => node.type === "file"
    ).length;

    if (fileCount >= MAX_FILES) {
      return false;
    }

    // Check individual file size
    if (newFileSize > MAX_FILE_SIZE) {
      return false;
    }

    // Check total size
    let totalSize = 0;
    for (const [_, node] of this.files) {
      if (node.type === "file") {
        totalSize += node.content?.length || 0;
      }
    }

    if (totalSize + newFileSize > MAX_TOTAL_SIZE) {
      return false;
    }

    return true;
  }

  // Normalize paths to consistent format: leading /, no trailing slash (except root), no double slashes
  // Input: "App.jsx", "/App.jsx", "App.jsx/", "//App.jsx//" all normalize to "/App.jsx"
  private normalizePath(path: string): string {
    // Ensure path starts with /
    if (!path.startsWith("/")) {
      path = "/" + path;
    }
    // Remove trailing slash except for root
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    // Normalize multiple slashes to single slash
    path = path.replace(/\/+/g, "/");
    return path;
  }

  // Get parent directory path by removing last path segment
  // Input: "/foo/bar/file.js" returns "/foo/bar"
  // Input: "/file.js" returns "/"
  private getParentPath(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === "/") return "/";
    const parts = normalized.split("/");
    parts.pop(); // Remove last segment
    return parts.length === 1 ? "/" : parts.join("/");
  }

  // Extract filename from path: "/foo/bar/file.js" returns "file.js"
  private getFileName(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === "/") return "/";
    const parts = normalized.split("/");
    return parts[parts.length - 1];
  }

  // Look up parent directory node by traversing to parent path in global index
  private getParentNode(path: string): FileNode | null {
    const parentPath = this.getParentPath(path);
    return this.files.get(parentPath) || null;
  }

  // Create a new file at the given path with optional content
  // Returns null if file already exists or parent directory doesn't exist
  // Auto-creates parent directories as needed
  createFile(path: string, content: string = ""): FileNode | null {
    const normalized = this.normalizePath(path);

    // Security: Validate path
    if (!this.validatePath(normalized)) {
      console.error("[Security] Invalid path rejected:", path);
      return null;
    }

    // Security: Validate file extension
    if (!this.validateFileExtension(normalized)) {
      console.error("[Security] Invalid file extension rejected:", path);
      return null;
    }

    // Security: Check size limits
    if (!this.checkSizeLimits(content.length)) {
      console.error("[Security] Size limit exceeded for:", path);
      return null;
    }

    // Check if file already exists - prevents overwriting
    if (this.files.has(normalized)) {
      return null;
    }

    // Auto-create parent directories to ensure path is valid
    // e.g., creating /foo/bar/file.js creates /foo and /foo/bar if missing
    const parts = normalized.split("/").filter(Boolean);
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += "/" + parts[i];
      if (!this.exists(currentPath)) {
        this.createDirectory(currentPath);
      }
    }

    // Verify parent exists and is actually a directory
    const parent = this.getParentNode(normalized);
    if (!parent || parent.type !== "directory") {
      return null;
    }

    const fileName = this.getFileName(normalized);
    const file: FileNode = {
      type: "file",
      name: fileName,
      path: normalized,
      content,
    };

    // Add to both global index (for O(1) lookup) and parent's children (for tree traversal)
    this.files.set(normalized, file);
    parent.children!.set(fileName, file);

    return file;
  }

  createDirectory(path: string): FileNode | null {
    const normalized = this.normalizePath(path);

    // Check if directory already exists
    if (this.files.has(normalized)) {
      return null;
    }

    const parent = this.getParentNode(normalized);
    if (!parent || parent.type !== "directory") {
      return null;
    }

    const dirName = this.getFileName(normalized);
    const directory: FileNode = {
      type: "directory",
      name: dirName,
      path: normalized,
      children: new Map(),
    };

    this.files.set(normalized, directory);
    parent.children!.set(dirName, directory);

    return directory;
  }

  readFile(path: string): string | null {
    const normalized = this.normalizePath(path);
    const file = this.files.get(normalized);

    if (!file || file.type !== "file") {
      return null;
    }

    return file.content || "";
  }

  updateFile(path: string, content: string): boolean {
    const normalized = this.normalizePath(path);
    const file = this.files.get(normalized);

    if (!file || file.type !== "file") {
      return false;
    }

    // Security: Check content size before update
    const oldSize = file.content?.length || 0;
    const newSize = content.length;
    const sizeDiff = newSize - oldSize;

    // If growing, check we don't exceed limits
    if (sizeDiff > 0 && !this.checkSizeLimits(sizeDiff)) {
      console.error("[Security] Size limit would be exceeded updating:", path);
      return false;
    }

    file.content = content;
    return true;
  }

  // Delete a file or directory (recursively deletes directory contents)
  // Returns false if file doesn't exist, parent is invalid, or trying to delete root
  deleteFile(path: string): boolean {
    const normalized = this.normalizePath(path);
    const file = this.files.get(normalized);

    // Can't delete root or non-existent files
    if (!file || normalized === "/") {
      return false;
    }

    const parent = this.getParentNode(normalized);
    if (!parent || parent.type !== "directory") {
      return false;
    }

    // If it's a directory, recursively delete all children first
    // This ensures the global index is cleaned up properly
    if (file.type === "directory" && file.children) {
      for (const [_, child] of file.children) {
        this.deleteFile(child.path);
      }
    }

    // Remove from parent's children map
    parent.children!.delete(file.name);
    // Remove from global index
    this.files.delete(normalized);

    return true;
  }

  // Rename/move a file or directory from oldPath to newPath
  // For directories, recursively updates all descendant paths
  // Returns false if source doesn't exist, destination exists, or validation fails
  rename(oldPath: string, newPath: string): boolean {
    const normalizedOld = this.normalizePath(oldPath);
    const normalizedNew = this.normalizePath(newPath);

    // Security: Validate both paths
    if (!this.validatePath(normalizedNew)) {
      console.error("[Security] Invalid rename target path:", newPath);
      return false;
    }

    // Can't rename root directory
    if (normalizedOld === "/" || normalizedNew === "/") {
      return false;
    }

    // Check if source exists
    const sourceNode = this.files.get(normalizedOld);
    if (!sourceNode) {
      return false;
    }

    // Security: If renaming a file, validate new extension
    if (sourceNode.type === "file" && !this.validateFileExtension(normalizedNew)) {
      console.error("[Security] Invalid file extension in rename:", newPath);
      return false;
    }

    // Check if destination already exists - prevents accidental overwrites
    if (this.files.has(normalizedNew)) {
      return false;
    }

    // Get parent of source and verify it's a directory
    const oldParent = this.getParentNode(normalizedOld);
    if (!oldParent || oldParent.type !== "directory") {
      return false;
    }

    // Create parent directories for destination if needed
    // e.g., renaming /file to /new/path/file creates /new and /new/path
    const newParentPath = this.getParentPath(normalizedNew);
    if (!this.exists(newParentPath)) {
      const parts = newParentPath.split("/").filter(Boolean);
      let currentPath = "";

      for (const part of parts) {
        currentPath += "/" + part;
        if (!this.exists(currentPath)) {
          this.createDirectory(currentPath);
        }
      }
    }

    // Get parent of destination and verify it's a directory
    const newParent = this.getParentNode(normalizedNew);
    if (!newParent || newParent.type !== "directory") {
      return false;
    }

    // Step 1: Remove node from old parent's children
    oldParent.children!.delete(sourceNode.name);

    // Step 2: Update the node's path and name properties
    const newName = this.getFileName(normalizedNew);
    sourceNode.name = newName;
    sourceNode.path = normalizedNew;

    // Step 3: Add to new parent's children
    newParent.children!.set(newName, sourceNode);

    // Step 4: Update global index - remove old path, add new path
    this.files.delete(normalizedOld);
    this.files.set(normalizedNew, sourceNode);

    // Step 5: If it's a directory, recursively update all descendant paths
    // Critical: descendants' indices must be updated or lookups will fail
    if (sourceNode.type === "directory" && sourceNode.children) {
      this.updateChildrenPaths(sourceNode);
    }

    return true;
  }

  // Recursively update paths for all descendants when a directory is renamed
  // e.g., renaming /foo to /bar updates /foo/child.js to /bar/child.js
  private updateChildrenPaths(node: FileNode): void {
    if (node.type === "directory" && node.children) {
      for (const [_, child] of node.children) {
        const oldChildPath = child.path;
        // Compute new path: parent's new path + "/" + child's name
        child.path = node.path + "/" + child.name;

        // Update in global index
        this.files.delete(oldChildPath);
        this.files.set(child.path, child);

        // Recursively update descendants
        if (child.type === "directory") {
          this.updateChildrenPaths(child);
        }
      }
    }
  }

  exists(path: string): boolean {
    const normalized = this.normalizePath(path);
    return this.files.has(normalized);
  }

  getNode(path: string): FileNode | null {
    const normalized = this.normalizePath(path);
    return this.files.get(normalized) || null;
  }

  listDirectory(path: string): FileNode[] | null {
    const normalized = this.normalizePath(path);
    const dir = this.files.get(normalized);

    if (!dir || dir.type !== "directory") {
      return null;
    }

    return Array.from(dir.children?.values() || []);
  }

  getAllFiles(): Map<string, string> {
    const fileMap = new Map<string, string>();

    for (const [path, node] of this.files) {
      if (node.type === "file") {
        fileMap.set(path, node.content || "");
      }
    }

    return fileMap;
  }

  // Convert tree structure to JSON-serializable object (for API/database storage)
  // Removes Map references to allow JSON.stringify. Output: { "/path": FileNode, ... }
  serialize(): Record<string, FileNode> {
    const result: Record<string, FileNode> = {};

    for (const [path, node] of this.files) {
      // Create a shallow copy without the Map children (JSON can't serialize Maps)
      if (node.type === "directory") {
        result[path] = {
          type: node.type,
          name: node.name,
          path: node.path,
          // Omit children Map - will be reconstructed on deserialize
        };
      } else {
        result[path] = {
          type: node.type,
          name: node.name,
          path: node.path,
          content: node.content,
        };
      }
    }

    return result;
  }

  // Rebuild tree from flat object of path->content strings
  // Used when loading from old format where children weren't stored
  deserialize(data: Record<string, string>): void {
    // Clear existing tree structure, keep only root
    this.files.clear();
    this.root.children?.clear();
    this.files.set("/", this.root);

    // Sort paths so parents are created before children ("/a" before "/a/b")
    const paths = Object.keys(data).sort();

    for (const path of paths) {
      const parts = path.split("/").filter(Boolean);
      let currentPath = "";

      // Ensure all parent directories exist before creating the file
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += "/" + parts[i];
        if (!this.exists(currentPath)) {
          this.createDirectory(currentPath);
        }
      }

      // Create the file with its content
      this.createFile(path, data[path]);
    }
  }

  // Rebuild tree from serialized FileNode objects (newer format with type info)
  // Called by API route when reconstructing VirtualFileSystem from client state
  deserializeFromNodes(data: Record<string, FileNode>): void {
    // Clear existing tree structure, keep only root
    this.files.clear();
    this.root.children?.clear();
    this.files.set("/", this.root);

    // Sort paths so parents are created before children ("/a" before "/a/b")
    const paths = Object.keys(data).sort();

    for (const path of paths) {
      if (path === "/") continue; // Root already initialized above

      const node = data[path];
      const parts = path.split("/").filter(Boolean);
      let currentPath = "";

      // Ensure all parent directories exist before creating the file/dir
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += "/" + parts[i];
        if (!this.exists(currentPath)) {
          this.createDirectory(currentPath);
        }
      }

      // Create the file or directory based on node type
      if (node.type === "file") {
        this.createFile(path, node.content || "");
      } else if (node.type === "directory") {
        this.createDirectory(path);
      }
    }
  }

  // Text editor command implementations for Claude's str_replace_editor tool

  // View file/directory contents. For directories, lists contents. For files, shows content with line numbers.
  // viewRange: [start, end] shows lines start-end (1-indexed). end=-1 means to end of file
  viewFile(path: string, viewRange?: [number, number]): string {
    const file = this.getNode(path);
    if (!file) {
      return `File not found: ${path}`;
    }

    // If it's a directory, list its contents with type indicators
    if (file.type === "directory") {
      const children = this.listDirectory(path);
      if (!children || children.length === 0) {
        return "(empty directory)";
      }

      return children
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((child) => {
          const prefix = child.type === "directory" ? "[DIR]" : "[FILE]";
          return `${prefix} ${child.name}`;
        })
        .join("\n");
    }

    // For files, show content (optionally filtered to line range)
    const content = file.content || "";

    // Handle view_range if provided (1-indexed line numbers)
    if (viewRange && viewRange.length === 2) {
      const lines = content.split("\n");
      const [start, end] = viewRange;
      const startLine = Math.max(1, start);
      // end=-1 means "to end of file", otherwise use specified line
      const endLine = end === -1 ? lines.length : Math.min(lines.length, end);

      const viewedLines = lines.slice(startLine - 1, endLine);
      return viewedLines
        .map((line, index) => `${startLine + index}\t${line}`)
        .join("\n");
    }

    // Return full file with line numbers for context
    const lines = content.split("\n");
    return (
      lines.map((line, index) => `${index + 1}\t${line}`).join("\n") ||
      "(empty file)"
    );
  }

  createFileWithParents(path: string, content: string = ""): string {
    // Check if file already exists
    if (this.exists(path)) {
      return `Error: File already exists: ${path}`;
    }

    // Create parent directories if they don't exist
    const parts = path.split("/").filter(Boolean);
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += "/" + parts[i];
      if (!this.exists(currentPath)) {
        this.createDirectory(currentPath);
      }
    }

    // Create the file
    this.createFile(path, content);
    return `File created: ${path}`;
  }

  // Replace all occurrences of oldStr with newStr in a file
  // Returns error message if file not found or string not found
  // Counts and reports how many replacements were made
  replaceInFile(path: string, oldStr: string, newStr: string): string {
    const file = this.getNode(path);
    if (!file) {
      return `Error: File not found: ${path}`;
    }

    if (file.type !== "file") {
      return `Error: Cannot edit a directory: ${path}`;
    }

    const content = this.readFile(path) || "";

    // Check if old_str exists in the file before replacing
    if (!oldStr || !content.includes(oldStr)) {
      return `Error: String not found in file: "${oldStr}"`;
    }

    // Count occurrences using regex to properly escape special characters
    const occurrences = (
      content.match(
        new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
      ) || []
    ).length;

    // Replace all occurrences using split/join (handles literal strings, not regex)
    const updatedContent = content.split(oldStr).join(newStr || "");
    this.updateFile(path, updatedContent);

    return `Replaced ${occurrences} occurrence(s) of the string in ${path}`;
  }

  // Insert text at a specific line number (0-indexed for before first line, 1-indexed conceptually)
  // insertLine=0 inserts at beginning, insertLine=N inserts after line N
  insertInFile(path: string, insertLine: number, text: string): string {
    const file = this.getNode(path);
    if (!file) {
      return `Error: File not found: ${path}`;
    }

    if (file.type !== "file") {
      return `Error: Cannot edit a directory: ${path}`;
    }

    const content = this.readFile(path) || "";
    const lines = content.split("\n");

    // Validate insert_line is within valid range [0, lines.length]
    if (
      insertLine === undefined ||
      insertLine < 0 ||
      insertLine > lines.length
    ) {
      return `Error: Invalid line number: ${insertLine}. File has ${lines.length} lines.`;
    }

    // Insert the text at the specified line index
    lines.splice(insertLine, 0, text || "");
    const updatedContent = lines.join("\n");
    this.updateFile(path, updatedContent);

    return `Text inserted at line ${insertLine} in ${path}`;
  }

  reset(): void {
    // Clear all files and reset to initial state
    this.files.clear();
    this.root = {
      type: "directory",
      name: "/",
      path: "/",
      children: new Map(),
    };
    this.files.set("/", this.root);
  }
}

export const fileSystem = new VirtualFileSystem();
