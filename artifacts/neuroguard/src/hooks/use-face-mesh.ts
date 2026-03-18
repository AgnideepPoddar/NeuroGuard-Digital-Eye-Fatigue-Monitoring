import { useEffect, useRef, useState, useCallback } from 'react';
import { calculateEAR, LEFT_EYE, RIGHT_EYE, getFatigueState } from '@/lib/face-mesh-utils';

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

export interface MetricDataPoint {
  timestamp: number;
  ear: number;
}

export function useFaceMesh(isActive: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [currentEar, setCurrentEar] = useState(0.35);
  const [currentPerclos, setCurrentPerclos] = useState(0);
  const [blinkRate, setBlinkRate] = useState(0);
  const [fatigueState, setFatigueState] = useState<'alert' | 'drowsy' | 'fatigued'>('alert');
  const [history, setHistory] = useState<MetricDataPoint[]>([]);

  // Advanced tracking refs to avoid stale closures in onResults
  const historyRef = useRef<MetricDataPoint[]>([]);
  const isEyeClosedRef = useRef(false);
  const blinksInWindowRef = useRef<{timestamp: number}[]>([]);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw video frame
    canvasCtx.drawImage(
      results.image, 0, 0, canvasRef.current.width, canvasRef.current.height
    );

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Compute EAR
      const leftEar = calculateEAR(landmarks, LEFT_EYE);
      const rightEar = calculateEAR(landmarks, RIGHT_EYE);
      const avgEar = (leftEar + rightEar) / 2;
      
      const now = Date.now();
      
      // Blink detection (falling edge of EAR < 0.25)
      if (avgEar < 0.25 && !isEyeClosedRef.current) {
        isEyeClosedRef.current = true;
      } else if (avgEar > 0.25 && isEyeClosedRef.current) {
        isEyeClosedRef.current = false;
        blinksInWindowRef.current.push({ timestamp: now });
      }

      // Update historical data
      historyRef.current.push({ timestamp: now, ear: avgEar });
      
      // Keep only last 60 seconds of history
      const windowStart = now - 60000;
      historyRef.current = historyRef.current.filter(p => p.timestamp >= windowStart);
      blinksInWindowRef.current = blinksInWindowRef.current.filter(b => b.timestamp >= windowStart);

      // Compute PERCLOS (% of frames in last 60s where EAR < 0.2)
      const closedFrames = historyRef.current.filter(p => p.ear < 0.20).length;
      const totalFrames = historyRef.current.length || 1;
      const perclosVal = closedFrames / totalFrames;

      // Extrapolate blinks to BPM
      const windowDurationMins = Math.min((now - (historyRef.current[0]?.timestamp || now)) / 60000, 1) || 0.1;
      const currentBlinkRate = Math.round(blinksInWindowRef.current.length / windowDurationMins);

      const state = getFatigueState(avgEar, perclosVal);

      // Draw mesh points for eyes to look cool and neural
      canvasCtx.fillStyle = state === 'alert' ? '#00e5ff' : state === 'drowsy' ? '#ff9100' : '#ff1744';
      [...LEFT_EYE, ...RIGHT_EYE].forEach(idx => {
        const point = landmarks[idx];
        canvasCtx.beginPath();
        canvasCtx.arc(point.x * canvasRef.current!.width, point.y * canvasRef.current!.height, 1.5, 0, 2 * Math.PI);
        canvasCtx.fill();
      });

      setCurrentEar(Number(avgEar.toFixed(3)));
      setCurrentPerclos(Number(perclosVal.toFixed(3)));
      setBlinkRate(currentBlinkRate);
      setFatigueState(state);
      
      // Update history state for charts every ~10 frames to avoid React thrashing
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
        console.warn("MediaPipe not loaded yet");
        setTimeout(init, 500);
        return;
      }

      faceMesh = new window.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
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
      if (camera) camera.stop();
      setIsReady(false);
    }

    return () => {
      if (camera) camera.stop();
      if (faceMesh) faceMesh.close();
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
    history
  };
}
