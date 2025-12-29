import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  data: Uint8Array | null;
  color: string;
  width: number;
  height: number;
  mode?: 'bars' | 'line';
}

const Visualizer: React.FC<VisualizerProps> = ({ data, color, width, height, mode = 'bars' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    
    // Draw grid background
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<width; i+=10) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for(let i=0; i<height; i+=10) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.lineWidth = 1.5;

    const barWidth = width / (data.length / 1.5);
    
    if (mode === 'bars') {
      for (let i = 0; i < data.length; i++) {
        const value = (data[i] / 255.0) * height;
        ctx.fillRect(i * barWidth, height - value, barWidth - 1, value);
      }
    } else {
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = i * barWidth;
        const y = height - (data[i] / 255.0) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, [data, color, width, height, mode]);

  return (
    <div className="bg-black rounded border border-black overflow-hidden shadow-inner">
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="opacity-90 pointer-events-none"
      />
    </div>
  );
};

export default Visualizer;