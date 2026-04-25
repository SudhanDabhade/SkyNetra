import React, { useRef, useEffect, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

const YoloScanner = ({ videoSrc }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let animationId;
    let model;

    const loadModel = async () => {
      model = await cocoSsd.load();
      setIsLoaded(true);
      detectFrame();
    };

    const detectFrame = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Match canvas internal resolution to video's native resolution
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const predictions = await model.detect(video);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        predictions.forEach(prediction => {
          if (prediction.class === 'person') {
            const [x, y, width, height] = prediction.bbox;
            
            // Draw Tactical Box
            ctx.strokeStyle = '#00E5FF';
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, width, height);
            
            // Draw Label Background
            ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
            ctx.fillRect(x, y, width, height);
            
            // Draw Text
            ctx.fillStyle = '#00E5FF';
            ctx.font = 'bold 18px Courier New';
            ctx.fillText(`THREAT [PERSON]: ${Math.round(prediction.score * 100)}%`, x, y > 20 ? y - 10 : 20);
          }
        });
      }
      animationId = requestAnimationFrame(detectFrame);
    };

    loadModel();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-[#00E5FF] font-mono text-xs z-20 animate-pulse bg-black/80">
          [ INITIALIZING AI CORE - LOADING WEIGHTS ]
        </div>
      )}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      />
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none z-10" 
      />
    </div>
  );
};

export default YoloScanner;
