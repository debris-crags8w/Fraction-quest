declare module 'onnxruntime-web' {
  export const env: {
    wasm: {
      numThreads?: number;
      simd?: boolean;
      proxy?: boolean;
    };
  };
}
