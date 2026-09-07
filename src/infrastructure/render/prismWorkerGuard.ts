/**
 * Must be the FIRST import of the render worker.
 *
 * @react-email/components includes a CodeBlock component built on Prism.js.
 * When Prism loads inside a Web Worker it assumes the worker exists to
 * highlight code and installs its own `message` listener that calls
 * `JSON.parse(event.data)`. Our messages are structured objects, so that
 * listener throws and crashes the worker. Prism reads these flags from the
 * global before it initialises, which is why this module has to run first.
 */
declare global {
  // eslint-disable-next-line no-var
  var Prism: { manual?: boolean; disableWorkerMessageHandler?: boolean } | undefined
}

globalThis.Prism = { manual: true, disableWorkerMessageHandler: true }

export {}
