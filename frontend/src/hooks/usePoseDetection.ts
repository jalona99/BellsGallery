// src/hooks/usePoseDetection.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PoseLandmark, PoseDetectionConfig, PoseDetectionResult } from '@/types/tryon';

let PoseLandmarker: any = null;
let FilesetResolver: any = null;

export function usePoseDetection(
  videoElement: HTMLVideoElement | null,
  config: PoseDetectionConfig = {}
) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PoseDetectionResult | null>(null);
  const [fps, setFps] = useState(0);

  const poseLandmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastVideoTimeRef = useRef(-1);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!videoElement) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const startDetectionLoop = () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      const loop = () => {
        if (cancelled || !poseLandmarkerRef.current || !videoElement) {
          isRunningRef.current = false;
          return;
        }

        if (videoElement.readyState >= 2) {
          const currentTime = videoElement.currentTime;

          if (currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = currentTime;

            try {
              const startMs = performance.now();
              const result = poseLandmarkerRef.current.detectForVideo(videoElement, startMs);

              fpsCounterRef.current.frames++;
              const now = performance.now();
              if (now - fpsCounterRef.current.lastTime >= 1000) {
                setFps(fpsCounterRef.current.frames);
                fpsCounterRef.current.frames = 0;
                fpsCounterRef.current.lastTime = now;
              }

              if (result.landmarks && result.landmarks.length > 0) {
                const raw = result.landmarks[0];
                const isMirrored = config.isMirrored !== false;
                const landmarks: PoseLandmark[] = raw.map((l: any) => ({
                  x: isMirrored ? 1 - l.x : l.x,
                  y: l.y,
                  z: l.z,
                  visibility: l.visibility,
                }));

                const visibleCount = landmarks.filter((l: any) => (l.visibility || 0) > 0.35).length;
                const confidence = visibleCount / landmarks.length;

                setLastResult({
                  landmarks,
                  worldLandmarks: result.worldLandmarks?.[0],
                  confidence,
                });
              } else {
                setLastResult(null);
              }
            } catch (e) {
              // Ignore occasional frame drop
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(loop);
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    const initDetector = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!FilesetResolver || !PoseLandmarker) {
          const vision = await import('@mediapipe/tasks-vision');
          FilesetResolver = vision.FilesetResolver;
          PoseLandmarker = vision.PoseLandmarker;
        }

        console.log('📷 Loading MediaPipe FilesetResolver...');
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        const modelComplexity = config.modelComplexity || 'lite';
        const modelPath = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${modelComplexity}/float16/1/pose_landmarker_${modelComplexity}.task`;

        console.log('🧠 Creating PoseLandmarker...');
        let landmarker: any;
        try {
          landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: config.minDetectionConfidence || 0.45,
            minTrackingConfidence: config.minTrackingConfidence || 0.45,
            minPosePresenceConfidence: 0.45,
          });
          console.log('⚡ MediaPipe Pose initialized with GPU delegate');
        } catch (gpuErr) {
          console.warn('⚠️ GPU delegate failed, falling back to CPU:', gpuErr);
          landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: config.minDetectionConfidence || 0.45,
            minTrackingConfidence: config.minTrackingConfidence || 0.45,
            minPosePresenceConfidence: 0.45,
          });
          console.log('🖥️ MediaPipe Pose initialized with CPU delegate');
        }

        if (!cancelled) {
          poseLandmarkerRef.current = landmarker;
          setIsLoading(false);
          // Langsung jalankan detection loop begitu model siap!
          startDetectionLoop();
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('❌ Failed to initialize MediaPipe Pose:', err);
          setError(err?.message || 'Failed to initialize MediaPipe Pose');
          setIsLoading(false);
        }
      }
    };

    initDetector();

    return () => {
      cancelled = true;
      isRunningRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement, config.modelComplexity, config.minDetectionConfidence, config.minTrackingConfidence]);

  return {
    isLoading,
    error,
    landmarks: lastResult?.landmarks || null,
    confidence: lastResult?.confidence || 0,
    fps,
  };
}
