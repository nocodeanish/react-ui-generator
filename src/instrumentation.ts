// Polyfill localStorage for Node.js 25+
// Node.js 25 introduced an experimental localStorage API with --localstorage-file
// but it doesn't fully match the browser API, causing issues with libraries like react-resizable-panels
export async function register() {
  if (typeof globalThis.localStorage !== "undefined") {
    // Check if localStorage exists but doesn't have proper methods
    if (typeof globalThis.localStorage.getItem !== "function") {
      // Create a proper localStorage polyfill
      const storage = new Map<string, string>();

      globalThis.localStorage = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, String(value)),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
        get length() {
          return storage.size;
        },
      };
    }
  }
}
