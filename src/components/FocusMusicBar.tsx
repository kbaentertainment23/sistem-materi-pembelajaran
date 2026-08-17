import React, { useState } from 'react';
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  CloudRain,
  Radio,
  Headphones,
} from 'lucide-react';
import { focusAudioEngine, playPopSound } from '../utils/audioSynth';

export const FocusMusicBar: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(focusAudioEngine.getIsPlaying());
  const [volume, setVolume] = useState(0.3);
  const [currentMode, setCurrentMode] = useState<'lofi' | 'ambient' | 'rain'>('lofi');
  const [isMuted, setIsMuted] = useState(false);

  const handleTogglePlay = () => {
    playPopSound();
    const playing = focusAudioEngine.togglePlay();
    setIsPlaying(playing);
  };

  const handleChangeMode = (mode: 'lofi' | 'ambient' | 'rain') => {
    playPopSound();
    setCurrentMode(mode);
    focusAudioEngine.setMode(mode);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
    focusAudioEngine.setVolume(val);
  };

  const handleToggleMute = () => {
    playPopSound();
    if (isMuted) {
      setIsMuted(false);
      focusAudioEngine.setVolume(volume || 0.3);
    } else {
      setIsMuted(true);
      focusAudioEngine.setVolume(0);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-2.5 sm:p-4 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      
      {/* Title & Status */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleTogglePlay}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
            isPlaying
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 ring-2 ring-amber-400/30 animate-pulse'
              : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
          title={isPlaying ? 'Pause Musik Fokus' : 'Putar Musik Fokus'}
        >
          {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />}
        </button>

        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-xs text-white tracking-wide flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5 text-indigo-400" />
              <span>Musik Fokus Belajar</span>
            </span>
            {isPlaying && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-300/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Memutar
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
            Instrumen lo-fi santai membantu konsentrasi saat membaca slide
          </p>
        </div>
      </div>

      {/* Mode Selector & Volume Slider */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
        
        {/* Mode Chips */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-[10px] sm:text-[11px] overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => handleChangeMode('lofi')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              currentMode === 'lofi'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Lo-Fi</span>
          </button>

          <button
            onClick={() => handleChangeMode('ambient')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              currentMode === 'ambient'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Ambient</span>
          </button>

          <button
            onClick={() => handleChangeMode('rain')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              currentMode === 'rain'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3 h-3 text-sky-300" />
            <span>Hujan</span>
          </button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>

      </div>

    </div>
  );
};
