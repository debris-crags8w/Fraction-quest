/* Kokoro runs on ONNX Runtime Web. Two choices here keep it off the build that crashes Safari 26 on iPhone:

   1. `onnxruntime-web` is aliased to `onnxruntime-web/wasm` (vite.config.ts), the plain WebAssembly build.
      The default build is the WebGPU-enabled "JSEP" one, which has severe CPU and memory problems in
      Safari/WebKit 26 and crashes on iOS (onnxruntime issue #26827). The app only ever uses plain WASM.
   2. The runtime's own files are served by the app. Otherwise Transformers.js points the runtime at its CDN
      copy of an older JSEP build, so the version installed here would never actually run.

   Loaded lazily (only when the natural voice starts), so the runtime stays out of the main bundle. */
import { env } from 'onnxruntime-web';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import glueUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';

/** Point ONNX Runtime at the app's own plain-WASM files. Must run before kokoro-js loads Transformers.js,
    which only sets its CDN path when none is set yet. */
export function configureOnnxRuntime(): void {
  env.wasm.wasmPaths = { wasm: wasmUrl, mjs: glueUrl };
  env.wasm.numThreads = 1; // no cross-origin isolation, so one thread either way; also lighter on iPhone memory
  env.wasm.proxy = false;
}

export const ONNX_RUNTIME_FILES = { wasm: wasmUrl, mjs: glueUrl };
