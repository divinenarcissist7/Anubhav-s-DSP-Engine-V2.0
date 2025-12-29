import React from 'react';

interface LevelMeterProps {
  level: number; // 0 to 1
  color?: string;
}

const LevelMeter: React.FC<LevelMeterProps> = ({ level, color = "bg-[#c41e4d]" }) => {
  // Logarithmic scale for better perception
  const height = Math.min(100, Math.pow(level, 0.5) * 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-3.5 h-40 bg-[#111] border border-[#444] rounded shadow-inner flex flex-col-reverse p-[1.5px] overflow-hidden">
        {/* Level indicator */}
        <div 
          className={`w-full transition-all duration-75 ${color} shadow-[0_0_8px_rgba(196,30,77,0.6)]`}
          style={{ height: `${height}%` }}
        />
        {/* Graticule marks */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-1">
          {[...Array(11)].map((_, i) => (
            <div key={i} className="w-full h-[0.5px] bg-white/20" />
          ))}
        </div>
      </div>
      <span className="text-[7px] font-bold text-gray-600">dB</span>
    </div>
  );
};

export default LevelMeter;