import { useRef, useEffect } from 'react';
import { useTranscribeStore } from '../store/useTranscribeStore';
import { Play, Pause, Music, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Deterministic pseudo-random helper for wave bar animation durations to keep render pure
const getDeterministicDuration = (index) => {
  const x = Math.sin(index + 1) * 10000;
  return 0.5 + (x - Math.floor(x)) * 0.8;
};

export default function MediaPlayer() {
  const { t } = useTranslation();
  const fileUrl = useTranscribeStore((state) => state.fileUrl);
  const fileType = useTranscribeStore((state) => state.fileType);
  const fileName = useTranscribeStore((state) => state.fileName);
  const fileSize = useTranscribeStore((state) => state.fileSize);
  const reset = useTranscribeStore((state) => state.reset);
  
  const isPlaying = useTranscribeStore((state) => state.isPlaying);
  const setIsPlaying = useTranscribeStore((state) => state.setIsPlaying);
  const setCurrentTime = useTranscribeStore((state) => state.setCurrentTime);
  const setPlayerRef = useTranscribeStore((state) => state.setPlayerRef);

  const mediaRef = useRef(null);

  useEffect(() => {
    if (mediaRef.current) {
      setPlayerRef(mediaRef.current);
    }
    return () => setPlayerRef(null);
  }, [fileUrl, setPlayerRef]);

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handlePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
    }
  };

  if (!fileUrl) return null;

  return (
    <div className="w-full glass-card rounded-2xl border border-white/5 p-4 flex flex-col gap-4 relative overflow-hidden group">
      {/* Remove file button */}
      <button
        onClick={reset}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 text-slate-400 transition-all z-10"
        title={t('player.changeFile')}
      >
        <X className="w-4 h-4" />
      </button>

      {/* File Info */}
      <div className="pr-10">
        <h3 className="text-sm font-semibold text-slate-200 truncate" title={fileName}>
          {fileName}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">{fileSize}</p>
      </div>

      {/* Player Viewport */}
      <div className="w-full bg-black/40 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-white/5 relative shadow-inner">
        {fileType === 'video' ? (
          <video
            ref={mediaRef}
            src={fileUrl}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
            controls
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-4 relative">
            <audio
              ref={mediaRef}
              src={fileUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="hidden"
            />

            {/* Glowing audio visualizer animation placeholder */}
            <div className="relative flex items-center justify-center">
              {/* Spinning glow circle */}
              <div className={`absolute w-24 h-24 rounded-full bg-gradient-to-tr from-brand-primary/20 to-brand-accent/20 blur-xl transition-all duration-1000 ${
                isPlaying ? 'animate-spin scale-125 opacity-100' : 'scale-100 opacity-50'
              }`} />
              
              <div className={`w-16 h-16 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-brand-primary-hover relative z-10 transition-transform ${
                isPlaying ? 'scale-105 shadow-lg shadow-brand-primary-glow' : ''
              }`}>
                <Music className={`w-8 h-8 ${isPlaying ? 'animate-pulse' : ''}`} />
              </div>
            </div>

            {/* Simulated wave bars */}
            <div className="flex items-end gap-1.5 h-12">
              {[...Array(20)].map((_, i) => {
                const duration = getDeterministicDuration(i);
                return (
                  <span
                    key={i}
                    className="w-1 bg-gradient-to-t from-brand-primary to-brand-accent-hover rounded-full transition-all duration-300"
                    style={{
                      height: isPlaying ? '100%' : '15%',
                      animation: isPlaying ? `wave 1s ease-in-out infinite alternate` : 'none',
                      animationDelay: `${i * 0.05}s`,
                      animationDuration: `${duration}s`
                    }}
                  />
                );
              })}
            </div>

            {/* Play/Pause overlay buttons */}
            <button
              onClick={handlePlayPause}
              className="px-5 py-2 rounded-full bg-brand-primary hover:bg-brand-primary-hover text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-brand-primary-glow hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-white" /> {t('player.pause')}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" /> {t('player.play')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes wave {
          0% { height: 15%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  );
}
