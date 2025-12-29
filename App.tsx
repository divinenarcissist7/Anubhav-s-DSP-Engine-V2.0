import React, { useState, useEffect, useRef } from 'react';
import { TransmuteMode, AudioState } from './types';
import { audioEngine } from './services/audioEngine';
import Knob from './components/Knob';
import LevelMeter from './components/LevelMeter';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const [state, setState] = useState<AudioState>({
    mix: 0.5,
    dryWet: 1.0,
    gainA: 0.0,
    gainB: 0.0,
    gainOut: 0.00,
    invert: false,
    mode: TransmuteMode.LIQUID,
    isPlaying: false
  });

  const [trackAName, setTrackAName] = useState<string>('Empty_Slot_A');
  const [trackBName, setTrackBName] = useState<string>('Empty_Slot_B');
  const [isPlayingA, setIsPlayingA] = useState(true);
  const [isPlayingB, setIsPlayingB] = useState(true);
  const [isDecodingA, setIsDecodingA] = useState(false);
  const [isDecodingB, setIsDecodingB] = useState(false);
  const [meters, setMeters] = useState({ levelA: 0, levelB: 0 });
  const [vizData, setVizData] = useState<{ 
    dataA: Uint8Array | null, 
    dataB: Uint8Array | null, 
    dataOut: Uint8Array | null 
  }>({ dataA: null, dataB: null, dataOut: null });
  
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, track: 'A' | 'B') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const setDecoding = track === 'A' ? setIsDecodingA : setIsDecodingB;
    setDecoding(true);

    try {
      await audioEngine.init();
      const buffer = await audioEngine.decodeFile(file);
      if (track === 'A') {
        await audioEngine.setTrackA(buffer);
        setTrackAName(file.name);
        setIsPlayingA(true);
      } else {
        await audioEngine.setTrackB(buffer);
        setTrackBName(file.name);
        setIsPlayingB(true);
      }
      
      if (!state.isPlaying) {
        audioEngine.resume();
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    } catch (err) {
      console.error(`Error loading track ${track}:`, err);
      alert(`Error: Audio file could not be loaded.`);
    } finally {
      setDecoding(false);
    }
  };

  const toggleTrackA = () => {
    if (isPlayingA) {
      audioEngine.stopTrackA();
    } else {
      audioEngine.startTrackA();
    }
    setIsPlayingA(!isPlayingA);
  };

  const toggleTrackB = () => {
    if (isPlayingB) {
      audioEngine.stopTrackB();
    } else {
      audioEngine.startTrackB();
    }
    setIsPlayingB(!isPlayingB);
  };

  const togglePlayback = async () => {
    try {
      if (!state.isPlaying) {
        await audioEngine.init();
        await audioEngine.loadDefaultSamples();
        audioEngine.resume();
        setIsPlayingA(true);
        setIsPlayingB(true);
        setState(prev => ({ ...prev, isPlaying: true }));
      } else {
        audioEngine.suspend();
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    } catch (err) {
      console.error("DSP Init Error:", err);
    }
  };

  useEffect(() => {
    audioEngine.updateParams(state);
  }, [state]);

  useEffect(() => {
    const update = () => {
      if (state.isPlaying) {
        setMeters(audioEngine.getMeterData());
        setVizData(audioEngine.getFrequencyData());
      }
      rafRef.current = requestAnimationFrame(update);
    };

    if (state.isPlaying) {
      rafRef.current = requestAnimationFrame(update);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setMeters({ levelA: 0, levelB: 0 });
      setVizData({ dataA: null, dataB: null, dataOut: null });
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.isPlaying]);

  const modes = Object.values(TransmuteMode);
  const nextMode = () => {
    const idx = modes.indexOf(state.mode);
    const nextIdx = (idx + 1) % modes.length;
    setState(prev => ({ ...prev, mode: modes[nextIdx] }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      
      <input type="file" ref={fileInputARef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'A')} />
      <input type="file" ref={fileInputBRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'B')} />

      {/* Main Plugin Interface */}
      <div className="relative w-[850px] bg-[#d1d1d1] rounded-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border border-white/40 overflow-hidden flex flex-col">
        
        {/* Top Header Section (Pink Metallic) */}
        <div className="h-24 brushed-pink flex items-center justify-between px-8 border-b-2 border-black/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full text-white/80 opacity-80">
                <path fill="currentColor" d="M50 0C55 20 75 25 100 25C80 30 75 50 75 75C70 55 50 50 25 50C45 45 50 25 50 0Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white/90 tracking-tighter" style={{ fontFamily: 'Orbitron' }}>TRANSMUTATOR</h1>
              <span className="text-[10px] text-white/50 uppercase tracking-[0.3em] font-bold">ANUBHAV'S DSP ENGINE V2.0</span>
            </div>
          </div>

          {/* Center LCD Display */}
          <div className="flex flex-col items-center gap-1">
             <div 
               className="lcd-screen w-48 h-10 flex items-center justify-center cursor-pointer group hover:border-[#c41e4d] transition-all"
               onClick={nextMode}
             >
                <span className="text-[#00ffcc] font-mono text-lg tracking-widest uppercase animate-pulse">
                  {state.mode}
                </span>
             </div>
             <span className="text-[8px] text-white/40 uppercase font-black">Mode Selector</span>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex flex-col items-center">
               <Knob size="sm" min={0} max={1} value={state.mix} onChange={(v) => setState(s => ({...s, mix: v}))} accentColor="#fff" />
               <span className="text-[9px] text-white/60 font-bold mt-1">MIX</span>
             </div>
             {/* Analog VU Meter Lookalike */}
             <div className="w-24 h-16 bg-[#1a1a1a] border-2 border-white/20 rounded flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-1 text-[8px] text-white/30 uppercase font-bold">Output Level</div>
                <div 
                  className="w-1 h-12 bg-red-500 absolute bottom-[-4px] transition-transform duration-75 origin-bottom"
                  style={{ transform: `rotate(${(meters.levelA + meters.levelB) * 90 - 45}deg)` }}
                />
                <div className="absolute bottom-1 w-full flex justify-between px-4 text-[7px] text-white/20 font-mono">
                  <span>-INF</span><span>0</span><span>+6</span>
                </div>
             </div>
          </div>
        </div>

        {/* Main Content Area (Silver/Grey Metallic) */}
        <div className="flex-1 flex p-6 gap-6 brushed-metal">
          
          {/* Left Panel: Track A */}
          <div className="w-56 bg-white/10 rounded-lg p-4 border border-black/5 shadow-inner flex flex-col gap-4">
            <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest border-b border-black/10 pb-2">Primary Input A</h2>
            
            <div className="flex justify-between gap-4 h-48">
              <LevelMeter level={meters.levelA} />
              <div className="flex flex-col justify-around py-2 gap-2">
                <Knob label="Input Gain" value={state.gainA} min={-24} max={24} unit="dB" onChange={(v) => setState(s => ({...s, gainA: v}))} />
                
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={toggleTrackA}
                    className={`h-8 border-2 rounded text-[9px] font-black transition-all uppercase tracking-tighter flex items-center justify-center gap-2 ${
                      isPlayingA 
                        ? 'bg-[#c41e4d] border-[#8b1336] text-white shadow-[0_0_10px_rgba(196,30,77,0.4)]' 
                        : 'bg-black/20 border-black/20 text-gray-600'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isPlayingA ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                    {isPlayingA ? 'PAUSE' : 'PLAY'}
                  </button>
                  <button 
                    onClick={() => fileInputARef.current?.click()}
                    className="h-8 bg-black/10 hover:bg-black/20 border border-black/20 rounded text-[9px] font-black text-gray-700 transition-all uppercase tracking-tighter"
                  >
                    LOAD TRACK A
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <Visualizer data={vizData.dataA} color="#c41e4d" width={190} height={50} />
              <div className="mt-1 text-[8px] text-gray-500 font-mono truncate">{trackAName}</div>
            </div>
          </div>

          {/* Center Panel: Large Sliders */}
          <div className="flex-1 bg-white/20 rounded-lg border-2 border-black/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] flex flex-col p-6 items-center">
            <div className="w-full flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Spectral Morphology</span>
              <div className="flex items-center gap-3">
                 <span className="text-[9px] font-black text-gray-500">PHASE INV</span>
                 <button 
                  onClick={() => setState(s => ({ ...s, invert: !s.invert }))}
                  className={`w-10 h-5 rounded-full p-1 border border-black/20 transition-all ${state.invert ? 'bg-[#c41e4d]' : 'bg-[#aaa]'}`}
                 >
                   <div className={`w-3 h-3 bg-white rounded-full transition-transform ${state.invert ? 'translate-x-5' : 'translate-x-0'}`} />
                 </button>
              </div>
            </div>

            {/* Large Morph Slider */}
            <div className="relative w-full h-24 bg-black/5 border-y-2 border-black/5 flex items-center justify-center mb-8">
               {/* Rails */}
               <div className="absolute w-[90%] h-1 bg-black/20 rounded-full" />
               <div className="absolute w-[90%] h-1 bg-white/20 rounded-full translate-y-1" />
               
               {/* The Sider Handle */}
               <div 
                 className="absolute w-24 h-16 brushed-metal border-2 border-black/20 rounded-md shadow-2xl cursor-pointer flex items-center justify-center active:scale-95 transition-transform"
                 style={{ left: `calc(${state.mix * 90}% + 5%)`, transform: 'translateX(-50%)' }}
                 onMouseDown={(e) => {
                    const slider = e.currentTarget.parentElement!;
                    const onMouseMove = (moveE: MouseEvent) => {
                        const rect = slider.getBoundingClientRect();
                        const val = Math.max(0, Math.min(1, (moveE.clientX - rect.left) / rect.width));
                        setState(s => ({ ...s, mix: val }));
                    };
                    const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                    };
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                 }}
               >
                 <div className="w-1 h-10 bg-black/40 rounded-full" />
                 <div className="absolute -top-6 text-[9px] font-black text-[#c41e4d] bg-white/50 px-2 rounded">{(state.mix * 100).toFixed(0)}%</div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 w-full">
              <div className="flex flex-col items-center">
                 <Knob label="DRY / WET" value={state.dryWet} min={0} max={1} unit="" onChange={(v) => setState(s => ({...s, dryWet: v}))} size="lg" />
              </div>
              <div className="flex flex-col items-center">
                 <Knob label="MASTER OUT" value={state.gainOut} min={-24} max={24} unit="dB" onChange={(v) => setState(s => ({...s, gainOut: v}))} size="lg" />
              </div>
            </div>
          </div>

          {/* Right Panel: Track B */}
          <div className="w-56 bg-white/10 rounded-lg p-4 border border-black/5 shadow-inner flex flex-col gap-4">
            <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest border-b border-black/10 pb-2">Sidechain Input B</h2>
            
            <div className="flex justify-between gap-4 h-48 flex-row-reverse">
              <LevelMeter level={meters.levelB} color="bg-[#ea580c]" />
              <div className="flex flex-col justify-around py-2 gap-2">
                <Knob label="Input Gain" value={state.gainB} min={-24} max={24} unit="dB" onChange={(v) => setState(s => ({...s, gainB: v}))} accentColor="#ea580c" />
                
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={toggleTrackB}
                    className={`h-8 border-2 rounded text-[9px] font-black transition-all uppercase tracking-tighter flex items-center justify-center gap-2 ${
                      isPlayingB 
                        ? 'bg-[#ea580c] border-[#9a3412] text-white shadow-[0_0_10px_rgba(234,88,12,0.4)]' 
                        : 'bg-black/20 border-black/20 text-gray-600'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isPlayingB ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                    {isPlayingB ? 'PAUSE' : 'PLAY'}
                  </button>
                  <button 
                    onClick={() => fileInputBRef.current?.click()}
                    className="h-8 bg-black/10 hover:bg-black/20 border border-black/20 rounded text-[9px] font-black text-gray-700 transition-all uppercase tracking-tighter"
                  >
                    LOAD TRACK B
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <Visualizer data={vizData.dataB} color="#ea580c" width={190} height={50} />
              <div className="mt-1 text-[8px] text-gray-500 font-mono truncate text-right">{trackBName}</div>
            </div>
          </div>
        </div>

        {/* Footer Area (Pink Metallic) */}
        <div className="h-20 brushed-pink border-t-2 border-white/20 flex items-center px-10 gap-12">
           <div className="flex flex-col">
              <span className="text-[10px] text-white/50 font-black tracking-widest uppercase">Global Control</span>
              <div className="flex gap-4 mt-1">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] border border-white/20" />
                <span className="text-[9px] text-white font-bold">DSP SYSTEM ACTIVE</span>
              </div>
           </div>

           <div className="flex gap-6 items-center flex-1">
              <div className="w-1/4 h-[2px] bg-white/10 rounded-full" />
              <div className="flex items-center gap-4 text-white/80">
                 <span className="text-[9px] font-black uppercase tracking-[0.2em]">Morph Resultant Visualization</span>
                 <Visualizer data={vizData.dataOut} color="#00ffcc" width={250} height={30} mode="line" />
              </div>
              <div className="w-1/4 h-[2px] bg-white/10 rounded-full" />
           </div>

           <div className="text-right">
              <div className="text-[12px] font-bold text-white/90">TRANSMUTATOR PRO</div>
              <div className="text-[8px] text-white/40 tracking-widest font-black uppercase">Built for Professionals</div>
           </div>
        </div>

        {/* Startup Overlay */}
        {!state.isPlaying && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all">
                <div className="flex flex-col items-center gap-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 brushed-pink rounded-full flex items-center justify-center border-2 border-white/40 shadow-[0_0_30px_rgba(196,30,77,0.5)]">
                       <svg viewBox="0 0 100 100" className="w-10 h-10 text-white">
                         <path fill="currentColor" d="M50 0C55 20 75 25 100 25C80 30 75 50 75 75C70 55 50 50 25 50C45 45 50 25 50 0Z" />
                       </svg>
                    </div>
                    <h1 className="text-5xl font-bold text-white tracking-widest" style={{ fontFamily: 'Orbitron' }}>SAKURA <span className="text-red-500 font-light">DSP</span></h1>
                  </div>
                  
                  <button 
                    onClick={togglePlayback}
                    className="px-16 py-6 bg-white/5 hover:bg-white/10 text-white font-black rounded border border-white/20 transition-all transform active:scale-95 group relative overflow-hidden"
                  >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                      <span className="text-lg uppercase tracking-[0.5em]">INITIALIZE INTERFACE</span>
                  </button>
                  <p className="text-gray-500 text-[9px] uppercase tracking-[0.4em] font-bold">Ensure audio hardware is properly connected</p>
                </div>
            </div>
        )}
      </div>

      <div className="mt-8 flex gap-8">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-red-600" />
           <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Spectral Mode</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-yellow-500" />
           <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Phase Locking</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-cyan-500" />
           <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Resonant Filter</span>
        </div>
      </div>
    </div>
  );
};

export default App;