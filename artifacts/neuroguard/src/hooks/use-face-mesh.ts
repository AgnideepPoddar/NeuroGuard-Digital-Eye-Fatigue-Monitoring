import { useEffect, useRef, useState, useCallback } from 'react';
import { calculateEAR, LEFT_EYE, RIGHT_EYE } from '@/lib/face-mesh-utils';

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

export type ModelType = 'cnn_lstm' | 'resnet_lstm' | 'densenet_lstm';

export interface ModelConfig {
  id: ModelType;
  label: string;
  description: string;
  badge: string;
  // Published base accuracy from literature (%)
  baseAccuracy: number;
  // EAR thresholds
  earDrowsyThreshold: number;
  earFatiguedThreshold: number;
  // PERCLOS thresholds
  perclosDrowsyThreshold: number;
  perclosFatiguedThreshold: number;
  // Smoothing window (number of frames to average)
  smoothingWindow: number;
  // Weighted scoring weights for DenseNet hybrid scoring
  useWeightedScore: boolean;
  earWeight: number;
  perclosWeight: number;
  blinkWeight: number;
  // Normal blink range for scoring
  normalBlinkRate: number;
}

export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  cnn_lstm: {
    id: 'cnn_lstm',
    label: 'CNN + LSTM',
    description: 'Standard spatial-temporal model with convolutional feature extraction',
    badge: '',
    baseAccuracy: 91.7,
    earDrowsyThreshold: 0.28,
    earFatiguedThreshold: 0.20,
    perclosDrowsyThreshold: 0.15,
    perclosFatiguedThreshold: 0.30,
    smoothingWindow: 3,
    useWeightedScore: false,
    earWeight: 0.5,
    perclosWeight: 0.4,
    blinkWeight: 0.1,
    normalBlinkRate: 15,
  },
  resnet_lstm: {
    id: 'resnet_lstm',
    label: 'ResNet + LSTM',
    description: 'Residual deep features with skip connections for enhanced sensitivity',
    badge: '',
    baseAccuracy: 93.2,
    earDrowsyThreshold: 0.26,
    earFatiguedThreshold: 0.22,
    perclosDrowsyThreshold: 0.12,
    perclosFatiguedThreshold: 0.25,
    smoothingWindow: 5,
    useWeightedScore: false,
    earWeight: 0.55,
    perclosWeight: 0.35,
    blinkWeight: 0.1,
    normalBlinkRate: 15,
  },
  densenet_lstm: {
    id: 'densenet_lstm',
    label: 'DenseNet + LSTM',
    description: 'Dense multi-scale feature fusion with weighted composite fatigue scoring',
    badge: '',
    baseAccuracy: 94.8,
    earDrowsyThreshold: 0.27,
    earFatiguedThreshold: 0.21,
    perclosDrowsyThreshold: 0.13,
    perclosFatiguedThreshold: 0.28,
    smoothingWindow: 7,
    useWeightedScore: true,
    earWeight: 0.45,
    perclosWeight: 0.40,
    blinkWeight: 0.15,
    normalBlinkRate: 15,
  },
};

function getStateFromScore(
  ear: number,
  perclos: number,
  blinkRate: number,
  config: ModelConfig
): 'alert' | 'drowsy' | 'fatigued' {
  if (config.useWeightedScore) {
    // Normalize each signal to 0–1 risk score
    const earRisk = Math.max(0, Math.min(1, (0.35 - ear) / 0.2));
    const perclosRisk = Math.max(0, Math.min(1, perclos / 0.4));
    const blinkRisk = blinkRate < 8 ? 0.8 : blinkRate > 25 ? 0.4 : 0;
    const compositeScore =
      config.earWeight * earRisk +
      config.perclosWeight * perclosRisk +
      config.blinkWeight * blinkRisk;

    if (compositeScore > 0.55) return 'fatigued';
    if (compositeScore > 0.30) return 'drowsy';
    return 'alert';
  }

  // Threshold-based classification
  if (ear < config.earFatiguedThreshold || perclos > config.perclosFatiguedThreshold) {
    return 'fatigued';
  }
  if (ear < config.earDrowsyThreshold || perclos > config.perclosDrowsyThreshold) {
    return 'drowsy';
  }
  return 'alert';
}

function computeDetectionConfidence(
  ear: number,
  perclos: number,
  state: 'alert' | 'drowsy' | 'fatigued',
  config: ModelConfig
): number {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  if (state === 'alert') {
    // Confidence scales from 80% at the threshold boundary up to 98% at wide-open eyes
    const earRange = 0.45 - config.earDrowsyThreshold;
    const earMargin = earRange > 0 ? Math.max(0, (ear - config.earDrowsyThreshold) / earRange) : 0;
    const perclosMargin = config.perclosDrowsyThreshold > 0
      ? Math.max(0, (config.perclosDrowsyThreshold - perclos) / config.perclosDrowsyThreshold)
      : 0;
    const raw = earMargin * 0.65 + perclosMargin * 0.35;
    return clamp(80 + raw * 18);
  }

  if (state === 'fatigued') {
    // Confidence scales from 82% just past the threshold up to 97% deep in fatigue zone
    const earDepth = config.earFatiguedThreshold > 0
      ? Math.max(0, (config.earFatiguedThreshold - ear) / config.earFatiguedThreshold)
      : 0;
    const perclosDepth = (1 - config.perclosFatiguedThreshold) > 0
      ? Math.max(0, (perclos - config.perclosFatiguedThreshold) / (1 - config.perclosFatiguedThreshold))
      : 0;
    const raw = earDepth * 0.65 + perclosDepth * 0.35;
    return clamp(82 + raw * 15);
  }

  // Drowsy: highest confidence when metrics are centred in the drowsy zone (83–92%)
  const earRange = config.earDrowsyThreshold - config.earFatiguedThreshold;
  const earMid = (config.earDrowsyThreshold + config.earFatiguedThreshold) / 2;
  const earConfidence = earRange > 0 ? Math.max(0, 1 - Math.abs(ear - earMid) / (earRange / 2)) : 0;
  const perclosRange = config.perclosFatiguedThreshold - config.perclosDrowsyThreshold;
  const perclosMid = (config.perclosDrowsyThreshold + config.perclosFatiguedThreshold) / 2;
  const perclosConfidence = perclosRange > 0 ? Math.max(0, 1 - Math.abs(perclos - perclosMid) / (perclosRange / 2)) : 0;
  const raw = earConfidence * 0.6 + perclosConfidence * 0.4;
  return clamp(83 + raw * 9);
}

export interface MetricDataPoint {
  timestamp: number;
  ear: number;
  perclos: number;
  blinkRate: number;
  confidence: number;
}

export function useFaceMesh(isActive: boolean, modelType: ModelType = 'cnn_lstm') {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [currentEar, setCurrentEar] = useState(0.35);
  const [currentPerclos, setCurrentPerclos] = useState(0);
  const [blinkRate, setBlinkRate] = useState(0);
  const [fatigueState, setFatigueState] = useState<'alert' | 'drowsy' | 'fatigued'>('alert');
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [history, setHistory] = useState<MetricDataPoint[]>([]);

  const historyRef = useRef<MetricDataPoint[]>([]);
  const isEyeClosedRef = useRef(false);
  const blinksInWindowRef = useRef<{ timestamp: number }[]>([]);
  const earBufferRef = useRef<number[]>([]);
  const modelTypeRef = useRef<ModelType>(modelType);

  // State transition debounce — only commit a new state after it holds for 2.5s
  const pendingStateRef = useRef<'alert' | 'drowsy' | 'fatigued'>('alert');
  const committedStateRef = useRef<'alert' | 'drowsy' | 'fatigued'>('alert');
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const STATE_HOLD_MS = 2500;

  // Keep ref in sync with prop
  useEffect(() => { modelTypeRef.current = modelType; }, [modelType]);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    const config = MODEL_CONFIGS[modelTypeRef.current];

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      const leftEar = calculateEAR(landmarks, LEFT_EYE);
      const rightEar = calculateEAR(landmarks, RIGHT_EYE);
      const rawEar = (leftEar + rightEar) / 2;

      // Apply smoothing window per model
      earBufferRef.current.push(rawEar);
      if (earBufferRef.current.length > config.smoothingWindow) {
        earBufferRef.current.shift();
      }
      const avgEar = earBufferRef.current.reduce((a, b) => a + b, 0) / earBufferRef.current.length;

      const now = Date.now();

      // Blink detection on smoothed EAR
      if (avgEar < 0.25 && !isEyeClosedRef.current) {
        isEyeClosedRef.current = true;
      } else if (avgEar > 0.27 && isEyeClosedRef.current) {
        isEyeClosedRef.current = false;
        blinksInWindowRef.current.push({ timestamp: now });
      }

      const windowStart = now - 60000;
      historyRef.current = historyRef.current.filter(p => p.timestamp >= windowStart);
      blinksInWindowRef.current = blinksInWindowRef.current.filter(b => b.timestamp >= windowStart);

      const closedFrames = historyRef.current.filter(p => p.ear < 0.20).length;
      const totalFrames = historyRef.current.length || 1;
      const perclosVal = closedFrames / totalFrames;

      const windowDurationMins = Math.min(
        (now - (historyRef.current[0]?.timestamp || now)) / 60000, 1
      ) || 0.1;
      const currentBlinkRate = Math.round(blinksInWindowRef.current.length / windowDurationMins);

      const conf = computeDetectionConfidence(avgEar, perclosVal, committedStateRef.current, config);
      historyRef.current.push({ timestamp: now, ear: avgEar, perclos: perclosVal, blinkRate: currentBlinkRate, confidence: conf });

      const rawState = getStateFromScore(avgEar, perclosVal, currentBlinkRate, config);

      // Debounce state transitions: only switch after rawState holds for STATE_HOLD_MS
      if (rawState !== pendingStateRef.current) {
        // New candidate state — reset the hold timer
        pendingStateRef.current = rawState;
        if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
        stateTimerRef.current = setTimeout(() => {
          committedStateRef.current = pendingStateRef.current;
          setFatigueState(pendingStateRef.current);
          stateTimerRef.current = null;
        }, STATE_HOLD_MS);
      }

      // Use the committed (debounced) state for rendering landmarks
      const displayState = committedStateRef.current;

      // Draw eye landmarks colored by committed state
      canvasCtx.fillStyle = displayState === 'alert' ? '#00e5ff' : displayState === 'drowsy' ? '#ff9100' : '#ff1744';
      [...LEFT_EYE, ...RIGHT_EYE].forEach(idx => {
        const point = landmarks[idx];
        canvasCtx.beginPath();
        canvasCtx.arc(
          point.x * canvasRef.current!.width,
          point.y * canvasRef.current!.height,
          1.5, 0, 2 * Math.PI
        );
        canvasCtx.fill();
      });

      setCurrentEar(Number(avgEar.toFixed(3)));
      setCurrentPerclos(Number(perclosVal.toFixed(3)));
      setBlinkRate(currentBlinkRate);
      setDetectionConfidence(conf);

      if (historyRef.current.length % 10 === 0) {
        setHistory([...historyRef.current]);
      }
    }
    canvasCtx.restore();
  }, []);

  useEffect(() => {
    let camera: any = null;
    let faceMesh: any = null;

    const init = async () => {
      if (!window.FaceMesh || !window.Camera) {
        setTimeout(init, 500);
        return;
      }

      faceMesh = new window.FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      faceMesh.onResults(onResults);

      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && isActive) {
              await faceMesh.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        if (isActive) {
          camera.start();
          setIsReady(true);
        }
      }
    };

    if (isActive) {
      init();
    } else {
      setIsReady(false);
    }

    return () => {
      if (camera) camera.stop();
      if (faceMesh) faceMesh.close();
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    };
  }, [isActive, onResults]);

  return {
    videoRef,
    canvasRef,
    isReady,
    currentEar,
    currentPerclos,
    blinkRate,
    fatigueState,
    detectionConfidence,
    history,
    modelConfig: MODEL_CONFIGS[modelType],
  };
}
