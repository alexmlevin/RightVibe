
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Zap, 
  Play, 
  Pause, 
  RefreshCw,
  Cpu,
  Smartphone,
  ExternalLink,
  Info
} from 'lucide-react';
import { AHAPFile } from './types';
import { generateHapticsFromVideo } from './geminiService';
import HapticVisualizer from './components/HapticVisualizer';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ahapResult, setAhapResult] = useState<AHAPFile | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setAhapResult(null);
      setError(null);
    }
  };

  const extractFrames = async (): Promise<{ base64: string; timestamp: number }[]> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve([]);

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve([]);

      const frames: { base64: string; timestamp: number }[] = [];
      const frameCount = 10;
      const step = video.duration / frameCount;

      let currentStep = 0;

      const captureFrame = () => {
        if (currentStep < frameCount) {
          video.currentTime = currentStep * step;
          currentStep++;
        } else {
          resolve(frames);
        }
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push({
          base64: canvas.toDataURL('image/jpeg', 0.6).split(',')[1],
          timestamp: video.currentTime
        });
        captureFrame();
      };

      captureFrame();
    });
  };

  const handleGenerate = async () => {
    if (!videoFile) return;
    setIsProcessing(true);
    setError(null);

    try {
      const frames = await extractFrames();
      const ahap = await generateHapticsFromVideo(frames, description);
      setAhapResult(ahap);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate haptics. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAhap = () => {
    if (!ahapResult) return;
    const blob = new Blob([JSON.stringify(ahapResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFile?.name.split('.')[0] || 'track'}.ahap`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-[#d4ff00]/30 font-inter">
      <header className="px-8 py-10 border-b border-white/10 bg-black sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <div className="h-8 w-auto flex items-center">
              <svg viewBox="0 0 105 26" className="h-full w-auto fill-current text-white" xmlns="http://www.w3.org/2000/svg" style={{ fillRule: 'evenodd', clipRule: 'evenodd', strokeLinejoin: 'round', strokeMiterlimit: 2 }}>
                <path d="M0,0l4.331,0l0,21.571l9.143,0l0,4.429l-13.474,0l0,-26Zm20.8,10.743l5.028,0l0,3.028l-5.028,0l0,5.029l-3.029,0l0,-5.029l-5.028,0l0,-3.028l5.028,0l0,-5.029l3.029,0l0,5.029Zm18.515,-10.743c5.2,0 8.086,2.943 8.086,7.457c0,3.229 -1.6,5.457 -4.286,6.543l4.972,13.257l-4.714,0l-4.457,-12.343l-6.286,0l0,12.343l-4.285,0l0,-27.257l11.6,0Zm-7.315,10.657l6.972,0c2.657,0 4.143,-1.457 4.143,-3.371c0,-2.029 -1.457,-3.315 -4.143,-3.315l-6.972,0l0,6.686Z" />
              </svg>
            </div>
            <span className="text-[11px] tracking-[0.6em] uppercase font-black text-white/40 mt-3">RightVibe</span>
          </div>
          <div className="h-12 w-px bg-white/10 hidden lg:block" />
          <div className="hidden lg:block">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] leading-tight max-w-[120px]">
              Intelligent Haptic Synthesis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <a href="https://levinriegner.com" target="_blank" rel="noreferrer" className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-[#d4ff00] transition-colors flex items-center gap-2">
            Explore L+R <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      <section className="px-8 lg:px-16 pt-12 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl">
          <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#d4ff00] mb-6">Introduction</h2>
          <p className="text-2xl lg:text-3xl font-light tracking-tight text-white leading-snug">
            RightVibe is a proprietary tactile engineering tool that translates visual kinetics into high-fidelity haptic tracks for iOS devices. By analyzing motion vectors and temporal events, it generates native .AHAP manifests for seamless taptic integration.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
        {/* Step 1 */}
        <div className="lg:col-span-5 flex flex-col gap-12">
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">01 / Source Analysis</h2>
              <div className="group relative">
                <Info className="w-4 h-4 text-white/30 cursor-help" />
                <div className="absolute right-0 bottom-full mb-4 w-64 p-4 bg-zinc-900 border border-white/10 text-[11px] text-white/70 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                  <span className="font-black text-[#d4ff00] block mb-2 uppercase tracking-widest">How it works</span>
                  The engine extracts key frames from the video timeline, analyzing kinetic patterns, velocity, and impact events to identify tactile triggers and vibrational textures.
                </div>
              </div>
            </div>
            
            <div 
              className={`relative border border-white/10 rounded-none bg-[#0a0a0a] transition-all duration-700 overflow-hidden ${!videoUrl ? 'hover:border-[#d4ff00]/40' : 'border-white/20'}`} 
              style={{ minHeight: '380px' }}
            >
              {!videoUrl ? (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-12 text-center group">
                  <div className="w-20 h-20 border border-white/10 rounded-full flex items-center justify-center mb-10 group-hover:border-[#d4ff00]/50 group-hover:bg-[#d4ff00]/5 transition-all duration-700">
                    <Upload className="w-6 h-6 text-white group-hover:text-[#d4ff00] transition-colors" />
                  </div>
                  <span className="text-2xl font-light tracking-tight text-white/70 group-hover:text-white transition-colors">Ingest Video Component</span>
                  <span className="text-[#d4ff00] text-[9px] uppercase font-black tracking-[0.3em] mt-6 opacity-60 group-hover:opacity-100 transition-opacity">Launch File Explorer</span>
                  <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="relative bg-black aspect-video h-full flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    src={videoUrl} 
                    className="w-full h-full object-contain grayscale hover:grayscale-0 transition-all duration-1000" 
                    onTimeUpdate={onTimeUpdate} 
                    onLoadedMetadata={onLoadedMetadata} 
                    onClick={togglePlayback} 
                  />
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-20 h-20 border border-white/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-8 h-8 text-white ml-1.5" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {videoUrl && (
              <button 
                onClick={() => { setVideoUrl(null); setVideoFile(null); }} 
                className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#d4ff00] flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Environment
              </button>
            )}

            <div className="space-y-4 pt-6">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Tactile Context</label>
              <textarea 
                placeholder="Direct the AI on specific kinetic requirements..." 
                className="w-full bg-transparent border-b border-white/10 rounded-none p-0 pb-6 text-xl font-light tracking-tight focus:outline-none focus:border-[#d4ff00] transition-all min-h-[80px] resize-none placeholder:text-white/10" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={!videoFile || isProcessing} 
              className={`w-full py-7 rounded-none font-black uppercase tracking-[0.4em] text-[11px] transition-all duration-500 shadow-2xl ${
                !videoFile || isProcessing 
                ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                : 'bg-[#d4ff00] hover:bg-[#cbf400] text-black hover:tracking-[0.5em] active:scale-[0.99]'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Deconstructing Frames
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Zap className="w-4 h-4 fill-current" />
                  Synthesize Track
                </span>
              )}
            </button>
            {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em] text-center bg-red-500/10 py-3">{error}</p>}
          </section>

          <section className="border-t border-white/10 pt-12 flex items-start gap-8 opacity-60 hover:opacity-100 transition-opacity duration-700">
            <div className="w-14 h-14 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white mb-3">Core Haptics Engine</h3>
              <p className="text-[12px] text-white/70 leading-relaxed font-light">
                Utilizing advanced temporal reasoning to map complex motion profiles directly to the .AHAP schema for iOS native integration.
              </p>
            </div>
          </section>
        </div>

        {/* Step 2 */}
        <div className="lg:col-span-7 flex flex-col gap-12">
          <section className="bg-white/[0.01] border border-white/10 rounded-none p-10 lg:p-14 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4ff00]/5 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-16 relative z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">02 / Output Payload</h2>
                <div className="group relative">
                  <Info className="w-4 h-4 text-white/30 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-4 w-64 p-4 bg-zinc-900 border border-white/10 text-[11px] text-white/70 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                    <span className="font-black text-[#d4ff00] block mb-2 uppercase tracking-widest">How it works</span>
                    Motion vectors are translated into Apple's Core Haptics schema, creating a temporal manifest of intensity and sharpness parameters ready for deployment.
                  </div>
                </div>
              </div>
              {ahapResult && (
                <button 
                  onClick={downloadAhap} 
                  className="group flex items-center gap-4"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4ff00] group-hover:tracking-[0.4em] transition-all">Download AHAP</span>
                  <div className="w-10 h-10 bg-[#d4ff00] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Download className="w-4 h-4 text-black" />
                  </div>
                </button>
              )}
            </div>

            {ahapResult ? (
              <div className="flex-1 flex flex-col gap-16 relative z-10">
                <div className="space-y-6">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                    <span>Tactile Waveform Visualization</span>
                    <span className="text-white mono bg-white/10 px-2 py-0.5">{currentTime.toFixed(3)}s</span>
                  </div>
                  <HapticVisualizer ahap={ahapResult} currentTime={currentTime} duration={duration} />
                  <div className="p-4 bg-[#d4ff00]/5 border border-[#d4ff00]/20 rounded-none">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4ff00] flex items-center gap-2">
                      <Smartphone className="w-3 h-3" /> Testing Protocol
                    </p>
                    <p className="text-[11px] text-white/60 mt-2 font-light leading-relaxed">
                      To experience this track, download the .AHAP file and AirDrop it to your iPhone. Open the file directly to trigger the system haptic preview.
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-6 min-h-0">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">JSON Manifest</h3>
                  <div className="flex-1 bg-black/80 border border-white/5 p-8 font-mono text-[11px] overflow-auto scrollbar-thin">
                    <pre className="text-white/60 leading-relaxed selection:bg-[#d4ff00] selection:text-black">
                      {JSON.stringify(ahapResult, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-white/10 bg-black/20">
                <div className="w-24 h-24 border border-white/10 rounded-full flex items-center justify-center mb-10 opacity-20">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-light tracking-tight text-white/50 mb-4 uppercase tracking-[0.2em]">Synthesis Required</h3>
                <p className="text-[11px] uppercase font-black tracking-[0.3em] text-white/20 max-w-xs leading-loose">
                  Awaiting analysis of the input asset to generate tactile metadata.
                </p>
                <div className="mt-8 pt-8 border-t border-white/5 max-w-xs opacity-40">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-2">Ready for deployment?</p>
                   <p className="text-[10px] font-medium text-white/80 leading-relaxed">
                     Once generated, AirDrop the exported .AHAP file to your iPhone and open it to experience the tactile track in real-time.
                   </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="px-10 py-16 border-t border-white/10 flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className="flex items-center gap-6">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">RightVibe &copy; 2025</span>
          <div className="w-1 h-1 bg-white/20 rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">Alex Levin</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 text-center lg:text-right">
          Copyright Levin & Riegner, LLC. Engineered at <a href="https://levinriegner.com" className="text-white/50 hover:text-[#d4ff00] transition-colors border-b border-white/10 hover:border-[#d4ff00]">Levin Riegner</a>
        </p>
      </footer>
      <canvas ref={canvasRef} width={640} height={360} className="hidden" />
    </div>
  );
};

export default App;
