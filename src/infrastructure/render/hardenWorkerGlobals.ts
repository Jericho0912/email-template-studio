/**
 * Defence in depth for the render worker.
 *
 * Template code runs with `new Function`, so it can touch the worker's
 * globals. A worker cannot reach the page DOM, but it CAN normally make
 * network requests with the app's cookies. Before any template code runs we
 * replace the network-capable globals with `undefined` (non-writable,
 * non-configurable) on the global object AND on its prototype chain, so the
 * code cannot restore them with `delete` or via the prototype.
 *
 * This is a mitigation, not a security boundary. See docs/ARCHITECTURE.md.
 */
export const NETWORK_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'Worker',
  'SharedWorker',
  'indexedDB',
  'caches',
  'BroadcastChannel',
] as const

export function hardenWorkerGlobals(scope: object, names: readonly string[] = NETWORK_GLOBALS): void {
  for (const name of names) {
    let target: object | null = scope
    while (target !== null) {
      if (Object.hasOwn(target, name)) freeze(target, name)
      target = Object.getPrototypeOf(target) as object | null
    }
    if (!Object.hasOwn(scope, name)) freeze(scope, name)
  }
}

function freeze(target: object, name: string): void {
  try {
    Object.defineProperty(target, name, {
      value: undefined,
      writable: false,
      configurable: false,
      enumerable: false,
    })
  } catch {
    // Some engines mark a few globals non-configurable; nothing more we can do.
  }
}
