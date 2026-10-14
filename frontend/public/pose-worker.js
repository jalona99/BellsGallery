importScripts(
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm",
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection"
);

let detector = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    try {
      // Set WASM path for WebAssembly binaries
      tf.wasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm/dist/');
      await tf.setBackend('wasm');
      await tf.ready();
      
      const model = poseDetection.SupportedModels.BlazePose;
      const detectorConfig = {
        runtime: 'tfjs',
        enableSmoothing: true,
        modelType: 'lite' // lite is fast and good enough for web
      };
      
      detector = await poseDetection.createDetector(model, detectorConfig);
      self.postMessage({ type: 'INIT_DONE' });
    } catch (error) {
      console.error("Worker Init Error:", error);
    }
  }

  if (type === 'PREDICT') {
    if (!detector) return;
    try {
      // payload is an ImageBitmap
      const poses = await detector.estimatePoses(payload);
      self.postMessage({ type: 'PREDICT_RESULT', poses, timestamp: performance.now() });
      
      // Free memory manually to prevent leaks in rapid frames
      if (payload && typeof payload.close === 'function') {
        payload.close();
      }
    } catch (error) {
      console.error("Worker Predict Error:", error);
    }
  }
};
