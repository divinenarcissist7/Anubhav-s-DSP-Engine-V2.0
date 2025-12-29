import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  label?: string;
  min: number;
  max: number;
  value: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
  unit?: string;
  onChange: (val: number) => void;
  accentColor?: string;
}

const Knob: React.FC<KnobProps> = ({ 
  label, 
  min, 
  max, 
  value, 
  step = 0.01, 
  size = 'md', 
  unit = '', 
  onChange,
  accentColor = '#c41e4d'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startVal = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startY.current - e.clientY;
      const range = max - min;
      const sensitivity = 200; 
      const newVal = Math.min(max, Math.max(min, startVal.current + (deltaY / sensitivity) * range));
      onChange(Number(newVal.toFixed(2)));
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, max, min, onChange]);

  const percentage = (value - min) / (max - min);
  const rotation = -135 + percentage * 270;
  
  const diameter = size === 'lg' ? 90 : size === 'md' ? 44 : 32;

  return (
    <div className="flex flex-col items-center select-none">
      <div 
        className="relative cursor-ns-resize"
        onMouseDown={handleMouseDown}
        style={{ width: diameter, height: diameter }}
      >
        {/* Outer Ring / Plate */}
        <div className="absolute inset-[-4px] rounded-full bg-black/20 border border-white/10" />
        
        {/* Knob Cap */}
        <div 
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#888] via-[#e0e0e0] to-[#aaa] border border-[#666] shadow-[0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Indicator Line */}
          <div 
            className="absolute top-1 w-1 rounded-full"
            style={{ height: diameter / 4, backgroundColor: accentColor }}
          />
          
          {/* Center Cap Detail */}
          <div className="w-[70%] h-[70%] rounded-full bg-gradient-to-br from-[#ccc] to-[#888] border border-black/10 shadow-inner" />
        </div>
      </div>
      
      {label && <span className="text-[9px] font-bold text-gray-700 uppercase tracking-wider mt-2">{label}</span>}
      <div className="mt-1 text-[10px] font-mono text-gray-800 bg-white/10 px-1.5 py-0.5 rounded border border-black/5">
        {value.toFixed(1)}{unit}
      </div>
    </div>
  );
};

export default Knob;