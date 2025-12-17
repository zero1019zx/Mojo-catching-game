import React, { useRef, useEffect, useCallback } from 'react';
import { PoseResults, Landmark, Particle, FloatingItem } from '../types';
import { AudioEngine } from '../services/audioService';
import { generateCommentary } from '../services/geminiService';

// --- 配置区域：素材服务器地址 ---
// 使用 "/png" 绝对路径，确保从网站根目录下的 png 文件夹加载
const ASSET_BASE_URL = "/png";

// 素材文件名列表
// 请确保项目根目录下的 png 文件夹中包含这些文件: 1.png, 2.png, 3.png, 4.png, 5.png
const ASSET_FILES = [
    "1.png",
    "2.png",
    "3.png",
    "4.png",
    "5.png"
];

// Constants
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], // Left Arm
  [12, 14], [14, 16], // Right Arm
  [11, 23], [12, 24], // Torso
  [23, 24], // Hips
];
const PARTICLE_COLORS = ['#00ffff', '#ff00ff', '#ffff00', '#ffffff'];

interface GameCanvasProps {
  isPlaying: boolean;
  onScoreUpdate: (newScore: number) => void;
  onCommentaryUpdate: (text: string) => void;
  onError: (msg: string) => void;
  onLoadComplete: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  isPlaying, 
  onScoreUpdate, 
  onCommentaryUpdate,
  onError,
  onLoadComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  
  // Game State Refs
  const itemsRef = useRef<FloatingItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const lastCommentaryScoreRef = useRef(0);
  
  // Loaded Assets Cache
  const loadedAssetsRef = useRef<HTMLImageElement[]>([]);
  
  // We use a ref for isPlaying to avoid stale closures in the MediaPipe callback
  const isPlayingRef = useRef(isPlaying);

  // Helper: Create a fallback placeholder image if real asset fails
  const createFallbackImage = (name: string, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.beginPath();
        ctx.arc(64, 64, 60, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("PNG?", 64, 64);
    }
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  };

  // 1. Preload Images with Fallback
  useEffect(() => {
    const loadAssets = async () => {
        const promises = ASSET_FILES.map((filename, index) => {
            return new Promise<HTMLImageElement>((resolve) => {
                const img = new Image();
                // 尝试加载图片
                img.src = `${ASSET_BASE_URL}/${filename}`;
                img.crossOrigin = "anonymous"; // Helps with some CDN/Server setups
                
                img.onload = () => {
                    console.log(`Loaded asset: ${filename} from ${img.src}`);
                    resolve(img);
                };
                
                img.onerror = (e) => {
                    console.warn(`Failed to load asset: ${filename} at ${img.src}. Using fallback.`);
                    // Generate a fallback image based on the index color
                    const fallbackColor = ['#33ccff', '#33ff33', '#ff9933', '#ff33cc', '#ffff33'][index % 5];
                    const fallbackImg = createFallbackImage(filename, fallbackColor);
                    resolve(fallbackImg); 
                };
            });
        });

        try {
            const images = await Promise.all(promises);
            // We now accept all images because fallback ensures they are valid
            loadedAssetsRef.current = images;
            console.log(`Assets ready: ${loadedAssetsRef.current.length}`);
        } catch (e) {
            console.error("Asset loading error", e);
        }
    };

    loadAssets();
  }, []);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    
    // Manage Audio & Game State Reset
    if (isPlaying) {
      // RESET STATE ON START
      scoreRef.current = 0;
      lastCommentaryScoreRef.current = 0;
      itemsRef.current = [];
      particlesRef.current = [];

      if (!audioEngineRef.current) {
        audioEngineRef.current = new AudioEngine();
      }
      audioEngineRef.current.start();
    } else {
      audioEngineRef.current?.stop();
    }
  }, [isPlaying]);

  useEffect(() => {
    let camera: any = null;
    let pose: any = null;
    let isMounted = true;

    const initMediaPipe = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      try {
        // Wait for global Pose to be available from CDN
        let attempts = 0;
        while (!(window as any).Pose && attempts < 100) {
            if (!isMounted) return;
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (!(window as any).Pose) {
            throw new Error("Failed to load MediaPipe Pose library. Please refresh.");
        }

        if (!isMounted) return;

        console.log("Initializing Pose...");
        pose = new (window as any).Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          },
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false, 
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults(onResults);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
           console.log("Initializing Camera...");
           camera = new (window as any).Camera(videoRef.current, {
            onFrame: async () => {
              if (pose && isMounted) {
                  await pose.send({ image: videoRef.current });
              }
            },
            width: 1280,
            height: 720,
          });
          
          await camera.start();
          console.log("Camera started.");
          
          if (isMounted) {
            onLoadComplete();
          }
        } else {
            throw new Error("Camera access not supported by this browser.");
        }

      } catch (err: any) {
        console.error("MediaPipe Init Error:", err);
        if (isMounted) {
          onError(err.message || "Failed to initialize vision system.");
        }
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (camera) {
          try { camera.stop(); } catch(e) { console.warn("Camera stop error", e); }
      }
      if (pose) {
          try { pose.close(); } catch(e) { console.warn("Pose close error", e); }
      }
      if (audioEngineRef.current) {
          audioEngineRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Physics Helper
  const spawnParticles = (x: number, y: number) => {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        size: Math.random() * 4 + 2
      });
    }
  };

  // 识别嘴巴位置进行碰撞检测
  const checkCollisions = (mouthX: number, mouthY: number) => {
      itemsRef.current = itemsRef.current.filter(item => {
          // Dynamic collision radius based on item size
          // 使用宽度的 60% 作为碰撞检测半径，更加宽容
          const collisionRadius = (item.width / 2) * 1.2; 

          const dx = item.x - mouthX;
          const dy = item.y - mouthY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < collisionRadius) {
              spawnParticles(item.x, item.y);
              scoreRef.current += 10;
              onScoreUpdate(scoreRef.current);
              
              if (scoreRef.current - lastCommentaryScoreRef.current >= 50) {
                  lastCommentaryScoreRef.current = scoreRef.current;
                  generateCommentary(scoreRef.current).then(onCommentaryUpdate);
              }
              return false; // Remove item
          }
          return true; // Keep item
      });
  };

  // Main Render Loop
  const onResults = useCallback((results: PoseResults) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    
    const width = canvas.width;
    const height = canvas.height;

    // 1. Always Draw Video (Cyberpunk Style)
    // IMPORTANT: Canvas z-index is higher than video, so we don't need to hide video with opacity
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.filter = "contrast(1.2) brightness(0.8) grayscale(0.5) hue-rotate(180deg)"; 
    ctx.drawImage(results.image as CanvasImageSource, 0, 0, width, height);
    ctx.restore();

    // Check if game is playing using Ref
    if (!isPlayingRef.current) return;

    // 2. Audio Analysis
    const audioVal = audioEngineRef.current ? audioEngineRef.current.getAnalysis() : 0;
    const beatScale = 1 + (audioVal / 255) * 0.5; 

    // 3. Draw Skeleton
    if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const start = landmarks[startIdx];
            const end = landmarks[endIdx];

            if (start && end && start.visibility! > 0.5 && end.visibility! > 0.5) {
                ctx.shadowBlur = 15 * beatScale;
                ctx.shadowColor = '#0ff';
                ctx.strokeStyle = '#0ff';
                ctx.lineWidth = 4 * beatScale;

                const startX = (1 - start.x) * width;
                const startY = start.y * height;
                const endX = (1 - end.x) * width;
                const endY = end.y * height;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });

        // --- 识别嘴巴 (Mouth) ---
        const mouthLeft = landmarks[9];
        const mouthRight = landmarks[10];

        if (mouthLeft && mouthRight && mouthLeft.visibility! > 0.5 && mouthRight.visibility! > 0.5) {
            const centerX = (mouthLeft.x + mouthRight.x) / 2;
            const centerY = (mouthLeft.y + mouthRight.y) / 2;

            const mouthX = (1 - centerX) * width;
            const mouthY = centerY * height;
            
            ctx.shadowBlur = 20 * beatScale;
            ctx.shadowColor = '#ff0055';
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(mouthX, mouthY, 15 * beatScale, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.5)';
            ctx.lineWidth = 2;
            ctx.arc(mouthX, mouthY, 40 * beatScale, 0, Math.PI * 2);
            ctx.stroke();
            
            checkCollisions(mouthX, mouthY);
        }
    }

    // 4. Floating Items (Images or Fallback)
    // Check if we have assets loaded (including fallbacks)
    if (Math.random() < 0.03 && itemsRef.current.length < 5 && loadedAssetsRef.current.length > 0) {
        const img = loadedAssetsRef.current[Math.floor(Math.random() * loadedAssetsRef.current.length)];
        
        // Responsive Scaling Logic with Aspect Ratio Preservation
        const isMobile = width < 768;
        const aspectRatio = img.width / (img.height || 1); // Avoid division by zero
        
        // Width is based on screen size (16% mobile, 10% desktop)
        const baseWidth = isMobile ? width * 0.16 : width * 0.10; 
        
        // Height is calculated to maintain aspect ratio
        const baseHeight = baseWidth / aspectRatio;
        
        itemsRef.current.push({
            id: Date.now() + Math.random(),
            x: Math.random() * (width - baseWidth),
            y: -baseHeight, // Start just above screen
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2 + 2, 
            img: img,
            width: baseWidth,
            height: baseHeight
        });
    }

    itemsRef.current.forEach(item => {
        item.x += item.vx;
        item.y += item.vy;
        
        const currentWidth = item.width * beatScale;
        const currentHeight = item.height * beatScale;

        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        
        // Draw image with correct aspect ratio
        ctx.drawImage(
            item.img, 
            item.x - currentWidth / 2, 
            item.y - currentHeight / 2, 
            currentWidth, 
            currentHeight
        );
    });
    itemsRef.current = itemsRef.current.filter(i => i.y < height + 100);

    // 5. Particles
    particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        
        if (p.life > 0) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

  }, []);

  return (
    <>
      <video 
        ref={videoRef} 
        // FIX: Removed opacity-0. Changed z-index to -20 to hide behind canvas (z-0).
        // This ensures browser still renders the video frames for MediaPipe processing.
        className="absolute top-0 left-0 w-full h-full object-cover -z-20"
        playsInline 
        muted 
        autoPlay 
      />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
    </>
  );
};
