export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

export interface GameState {
  score: number;
  gameStatus: 'idle' | 'playing' | 'finished';
  timeLeft: number;
  audioInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  aiCommentary: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface FloatingItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  img: HTMLImageElement; // Changed from emoji string to Image object
  width: number;
  height: number;
}

// MediaPipe Type Definitions (simplified for CDN usage)
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseResults {
  poseLandmarks: Landmark[];
  segmentationMask: CanvasImageSource;
  image: CanvasImageSource;
}

export interface PoseConfig {
  locateFile: (file: string) => string;
}

export interface PoseOptions {
  modelComplexity: number;
  smoothLandmarks: boolean;
  enableSegmentation: boolean;
  smoothSegmentation: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

declare global {
  interface Window {
    Pose: new (config: PoseConfig) => {
      setOptions: (options: PoseOptions) => void;
      onResults: (callback: (results: PoseResults) => void) => void;
      send: (inputs: { image: HTMLVideoElement }) => Promise<void>;
      close: () => Promise<void>;
    };
    Camera: new (element: HTMLVideoElement, config: {
      onFrame: () => Promise<void>;
      width: number;
      height: number;
    }) => {
      start: () => Promise<void>;
      stop: () => void;
    };
  }
}
