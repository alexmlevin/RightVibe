
import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Info,
  Copy,
  Check,
  Key,
  BookOpen
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
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');
  const [hasKey, setHasKey] = useState<boolean>(false);
  
  // Feedback states for copying
  const [copiediOS, setCopiediOS] = useState(false);
  const [copiedAndroid, setCopiedAndroid] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setAhapResult(null);
      setError(null);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
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
      if (err.message && err.message.includes("Requested entity was not found")) {
        setError("API Key Error: Please re-select your key.");
        setHasKey(false);
      } else {
        setError(err.message || 'Failed to generate haptics. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAhapChange = (updatedAhap: AHAPFile) => {
    setAhapResult(updatedAhap);
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

  const androidPayload = useMemo(() => {
    if (!ahapResult) return null;
    return ahapResult.Pattern.map(p => {
      const e = p.Event;
      const intensity = e.EventParameters.find(param => param.ParameterID === 'HapticIntensity')?.ParameterValue || 0;
      return {
        type: e.EventType === 'HapticTransient' ? 'impact' : 'vibration',
        startTimeMs: Math.round(e.Time * 1000),
        durationMs: e.EventDuration ? Math.round(e.EventDuration * 1000) : 50,
        amplitude: Math.round(intensity * 255)
      };
    });
  }, [ahapResult]);

  const downloadAndroid = () => {
    if (!androidPayload) return;
    const blob = new Blob([JSON.stringify(androidPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFile?.name.split('.')[0] || 'track'}-android.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (content: string, type: 'ios' | 'android') => {
    try {
      await navigator.clipboard.writeText(content);
      if (type === 'ios') {
        setCopiediOS(true);
        setTimeout(() => setCopiediOS(false), 2000);
      } else {
        setCopiedAndroid(true);
        setTimeout(() => setCopiedAndroid(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy!', err);
    }
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

  const handleScrub = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-[#d4ff00]/30 font-inter">
      <header className="px-8 lg:px-16 py-10 border-b border-white/5 bg-black/90 backdrop-blur-xl sticky top-0 z-50 flex items-center relative">
        <div className="flex-1 flex items-center">
          <div className="h-6 lg:h-7 w-auto flex items-center flex-shrink-0">
            <img 
              src="https://web-cdn-prod.levinriegner.com/img/landing/LR_White.png" 
              alt="Levin Riegner" 
              className="h-full w-auto object-contain"
            />
          </div>
          <div className="h-8 w-px bg-white/10 mx-10 hidden lg:block" />
          <div className="hidden lg:block">
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.4em] leading-tight max-w-[140px]">
              Intelligent Haptic Synthesis
            </p>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[20px] lg:text-[24px] tracking-[-0.03em] font-medium text-white pointer-events-auto">RightVibe</span>
        </div>

        <div className="flex-1 flex justify-end items-center">
          <a href="https://levinriegner.com" target="_blank" rel="noreferrer" className="group text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 hover:text-white transition-all flex items-center gap-3">
            Explore L+R 
            <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </header>

      <section className="px-8 lg:px-16 pt-20 pb-10 max-w-7xl mx-auto w-full">
        <div className="max-w-4xl">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.6em] text-[#d4ff00] mb-8">Introduction</h2>
          <p className="text-3xl lg:text-4xl font-light tracking-tight text-white leading-[1.15] lg:leading-[1.1]">
            RightVibe is an open source tactile engineering tool that translates visual kinetics into high-fidelity haptic tracks for iOS and Android devices. By analyzing motion vectors and temporal events, it generates native .AHAP manifests and Android-compatible haptic payloads for seamless cross-platform integration.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
        {/* Step 1 */}
        <div className="lg:col-span-5 flex flex-col gap-12">
          {/* API Configuration Section */}
          <section className="space-y-6 bg-zinc-950/50 p-8 border border-white/5 rounded-none">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.5em] text-white border-l-2 border-[#d4ff00] pl-4">System / API Key</h2>
              <div className="group relative">
                <Info className="w-4 h-4 text-[#d4ff00] cursor-help transition-colors hover:text-white" />
                <div className="absolute right-0 bottom-full mb-4 w-72 p-6 bg-black border border-[#d4ff00]/30 text-[12px] text-white leading-relaxed opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] translate-y-2 group-hover:translate-y-0 backdrop-blur-xl">
                  <span className="font-bold text-[#d4ff00] block mb-3 uppercase tracking-[0.2em] text-[10px]">Secure Synthesis</span>
                  To access high-fidelity multimodal synthesis models, you must select an API key from a paid GCP project with billing enabled.
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="block mt-4 text-[#d4ff00] hover:underline flex items-center gap-2">
                    Billing Docs <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleSelectKey}
              className={`w-full py-4 border flex items-center justify-center gap-3 transition-all font-bold uppercase tracking-[0.3em] text-[10px] ${hasKey ? 'bg-zinc-900 border-white/10 text-white/40' : 'bg-[#d4ff00]/5 border-[#d4ff00]/30 text-[#d4ff00] hover:bg-[#d4ff00] hover:text-black'}`}
            >
              {hasKey ? (
                <>
                  <Check className="w-3 h-3" /> API Key Active
                </>
              ) : (
                <>
                  <Key className="w-3 h-3" /> Select Project Key
                </>
              )}
            </button>
          </section>

          <section className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.5em] text-white border-l-2 border-[#d4ff00] pl-4">01 / Source Analysis</h2>
              <div className="group relative">
                <Info className="w-4 h-4 text-white/50 cursor-help transition-colors hover:text-white" />
                <div className="absolute right-0 bottom-full mb-4 w-72 p-6 bg-zinc-950 border border-white/10 text-[12px] text-white leading-relaxed opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] translate-y-2 group-hover:translate-y-0">
                  <span className="font-bold text-[#d4ff00] block mb-3 uppercase tracking-[0.2em] text-[10px]">How it works</span>
                  The engine extracts key frames from the video timeline, analyzing kinetic patterns, velocity, and impact events to identify tactile triggers and vibrational textures.
                </div>
              </div>
            </div>
            
            <div 
              className={`relative border border-white/20 rounded-none bg-[#0a0a0a] transition-all duration-1000 overflow-hidden ${!videoUrl ? 'hover:border-[#d4ff00]/60 min-h-[420px]' : 'border-white/40'}`} 
            >
              {!videoUrl ? (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-12 text-center group">
                  <div className="w-24 h-24 border border-white/20 rounded-full flex items-center justify-center mb-10 group-hover:border-[#d4ff00]/40 group-hover:bg-[#d4ff00]/5 transition-all duration-1000 ease-out">
                    <Upload className="w-6 h-6 text-white group-hover:text-[#d4ff00] transition-colors" />
                  </div>
                  <span className="text-2xl font-light tracking-tight text-white group-hover:text-white transition-colors duration-700">Ingest Video Component</span>
                  <span className="text-[#d4ff00] text-[10px] uppercase font-bold tracking-[0.4em] mt-8 opacity-80 group-hover:opacity-100 transition-all group-hover:tracking-[0.5em]">Launch File Explorer</span>
                  <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="relative bg-black w-full flex items-center justify-center group/video">
                  <video 
                    ref={videoRef} 
                    src={videoUrl} 
                    className="w-full h-auto block grayscale hover:grayscale-0 transition-all duration-1000" 
                    onTimeUpdate={onTimeUpdate} 
                    onLoadedMetadata={onLoadedMetadata} 
                    onClick={togglePlayback} 
                  />
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-24 h-24 border border-white/30 rounded-full flex items-center justify-center backdrop-blur-md transition-transform duration-500 group-hover/video:scale-110">
                        <Play className="w-10 h-10 text-white ml-2" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {videoUrl && (
              <button 
                onClick={() => { setVideoUrl(null); setVideoFile(null); }} 
                className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/60 hover:text-[#d4ff00] flex items-center gap-3 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Reset Environment
              </button>
            )}

            <div className="space-y-6 pt-10">
              <label className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60">Tactile Context</label>
              <textarea 
                placeholder="Direct the AI on specific kinetic requirements..." 
                className="w-full bg-transparent border-b border-white/20 rounded-none p-0 pb-8 text-2xl font-light tracking-tight text-white focus:outline-none focus:border-[#d4ff00] transition-all min-h-[100px] resize-none placeholder:text-white/20" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={!videoFile || isProcessing || !hasKey} 
              className={`w-full py-8 rounded-none font-bold uppercase tracking-[0.5em] text-[11px] transition-all duration-700 shadow-2xl relative overflow-hidden group/btn ${
                !videoFile || isProcessing || !hasKey
                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
                : 'bg-[#d4ff00] text-black hover:bg-white active:scale-[0.99]'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Deconstructing Frames
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Zap className="w-4 h-4 fill-current transition-transform group-hover/btn:scale-110" />
                  Synthesize Track
                </span>
              )}
            </button>
            {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-[0.4em] text-center bg-red-500/10 py-4 border border-red-500/20">{error}</p>}
            {!hasKey && videoFile && !isProcessing && (
              <p className="text-[10px] text-[#d4ff00]/60 uppercase tracking-[0.2em] text-center">Please select an API key to enable synthesis</p>
            )}
          </section>

          <section className="border-t border-white/10 pt-16 flex items-start gap-10 opacity-90 hover:opacity-100 transition-opacity duration-1000">
            <div className="w-16 h-16 border border-white/20 flex items-center justify-center flex-shrink-0 transition-colors hover:border-[#d4ff00]/40">
              <Cpu className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.5em] text-white mb-4">Core Haptics Engine</h3>
              <p className="text-[14px] text-white leading-relaxed font-light">
                Utilizing advanced temporal reasoning to map complex motion profiles directly to the .AHAP schema for iOS and Android native integration.
              </p>
            </div>
          </section>
        </div>

        {/* Step 2 */}
        <div className="lg:col-span-7 flex flex-col gap-12">
          <section className="bg-[#050505] border border-white/10 rounded-none p-12 lg:p-16 h-full flex flex-col relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4ff00]/5 rounded-full blur-[150px] -mr-64 -mt-64 pointer-events-none opacity-50" />
            
            <div className="flex items-center justify-between mb-20 relative z-10">
              <div className="flex items-center gap-6">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.5em] text-white border-l-2 border-[#d4ff00] pl-4">02 / Output Payload</h2>
                <div className="group relative">
                  <Info className="w-4 h-4 text-white/50 cursor-help transition-colors hover:text-white" />
                  <div className="absolute left-0 bottom-full mb-4 w-72 p-6 bg-zinc-950 border border-white/10 text-[12px] text-white leading-relaxed opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] translate-y-2 group-hover:translate-y-0">
                    <span className="font-bold text-[#d4ff00] block mb-3 uppercase tracking-[0.2em] text-[10px]">How it works</span>
                    Motion vectors are translated into Apple's Core Haptics schema and Android vibration arrays, creating temporal manifests ready for deployment.
                  </div>
                </div>
              </div>
              {ahapResult && (
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* iOS Group */}
                  <div className="flex items-center">
                    <button 
                      onClick={downloadAhap} 
                      className="group flex items-center gap-4 transition-all"
                      title="Download iOS AHAP"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#d4ff00] group-hover:tracking-[0.5em] transition-all">iOS .AHAP</span>
                      <div className="w-10 h-10 bg-[#d4ff00] flex items-center justify-center group-hover:bg-white transition-colors duration-500">
                        <Download className="w-4 h-4 text-black" />
                      </div>
                    </button>
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(ahapResult, null, 2), 'ios')}
                      className="w-10 h-10 border border-white/10 ml-2 flex items-center justify-center hover:bg-white/5 transition-colors"
                      title="Copy AHAP JSON"
                    >
                      {copiediOS ? <Check className="w-4 h-4 text-[#d4ff00]" /> : <Copy className="w-4 h-4 text-white/50" />}
                    </button>
                  </div>
                  
                  {/* Android Group */}
                  <div className="flex items-center">
                    <button 
                      onClick={downloadAndroid} 
                      className="group flex items-center gap-4 transition-all"
                      title="Download Android JSON"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/70 group-hover:tracking-[0.5em] transition-all">Android JSON</span>
                      <div className="w-10 h-10 bg-white/10 flex items-center justify-center group-hover:bg-[#d4ff00] transition-colors duration-500">
                        <Download className="w-4 h-4 text-white group-hover:text-black" />
                      </div>
                    </button>
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(androidPayload, null, 2), 'android')}
                      className="w-10 h-10 border border-white/10 ml-2 flex items-center justify-center hover:bg-white/5 transition-colors"
                      title="Copy Android JSON"
                    >
                      {copiedAndroid ? <Check className="w-4 h-4 text-[#d4ff00]" /> : <Copy className="w-4 h-4 text-white/50" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {ahapResult ? (
              <div className="flex-1 flex flex-col gap-12 relative z-10 overflow-y-auto pr-4 scrollbar-thin">
                <div className="space-y-8">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.5em] text-white">
                    <span className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] animate-pulse" />
                      Tactile Track Refinement
                    </span>
                    <span className="text-white mono bg-white/10 px-3 py-1 font-bold">{currentTime.toFixed(3)}s</span>
                  </div>
                  <HapticVisualizer 
                    ahap={ahapResult} 
                    currentTime={currentTime} 
                    duration={duration} 
                    onAhapChange={handleAhapChange}
                    onScrub={handleScrub}
                  />
                  <div className="p-8 bg-zinc-900/50 border border-white/5 rounded-none group/protocol transition-colors hover:border-[#d4ff00]/20">
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#d4ff00] flex items-center gap-3">
                      <Smartphone className="w-4 h-4" /> Professional Tuning
                    </p>
                    <p className="text-[13px] text-white mt-4 font-light leading-relaxed">
                      Drag the intensity handles above to refine the response. The manifests update in real-time, providing native parameters for both iOS and Android SDKs.
                    </p>
                  </div>
                </div>

                {/* Implementation Guide */}
                <div className="space-y-12 py-12 border-y border-white/5">
                  <div className="flex items-center gap-4">
                    <BookOpen className="w-4 h-4 text-[#d4ff00]" />
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.5em] text-white">Adding haptic output to your project</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-16">
                    {/* iOS Instructions */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d4ff00]">iOS (Swift / Core Haptics)</h4>
                      <p className="text-[13px] text-white/70 font-light leading-relaxed">
                        RightVibe outputs AHAP files supported on iOS 13+ (iPhone 8+).
                      </p>
                      <ol className="text-[12px] space-y-4 text-white/50 list-decimal pl-4">
                        <li>Add the <code className="text-white">.ahap</code> file to your Xcode project assets.</li>
                        <li>Initialize <code className="text-white">CHHapticEngine</code> and play the pattern from your bundle:</li>
                      </ol>
                      <div className="bg-black border border-white/5 p-6 font-mono text-[11px] overflow-x-auto text-white/80">
                        <pre>{`let engine = try CHHapticEngine()
try engine.start()
let url = Bundle.main.url(forResource: "Track", withExtension: "ahap")!
try engine.playPattern(from: url)`}</pre>
                      </div>
                    </div>

                    {/* Android Instructions */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/90">Android (Kotlin / VibrationEffect)</h4>
                      <p className="text-[13px] text-white/70 font-light leading-relaxed">
                        Use the JSON payload to construct native VibrationEffect wavefroms.
                      </p>
                      <ol className="text-[12px] space-y-4 text-white/50 list-decimal pl-4">
                        <li>Store JSON in <code className="text-white">res/raw/</code>.</li>
                        <li>Parse event timings and amplitudes (0-255 scale provided).</li>
                        <li>Build and play:</li>
                      </ol>
                      <div className="bg-black border border-white/5 p-6 font-mono text-[11px] overflow-x-auto text-white/80">
                        <pre>{`val effect = VibrationEffect.createWaveform(timings, amplitudes, -1)
vibrator.vibrate(effect)`}</pre>
                      </div>
                    </div>

                    {/* Flutter Instructions */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">Flutter (Cross-Platform)</h4>
                      <p className="text-[13px] text-white/70 font-light leading-relaxed">
                        Use the <code className="text-white">core_haptics</code> package for full native AHAP support on iOS.
                      </p>
                      <div className="bg-black border border-white/5 p-6 font-mono text-[11px] overflow-x-auto text-white/80">
                        <pre>{`final engine = HapticEngine();
await engine.playFromAsset('assets/track.ahap');`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-8 min-h-0 pt-8 pb-12">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex gap-10">
                      <button 
                        onClick={() => setActiveTab('ios')}
                        className={`text-[11px] font-bold uppercase tracking-[0.5em] transition-all pb-4 -mb-4.5 border-b-2 ${activeTab === 'ios' ? 'text-[#d4ff00] border-[#d4ff00]' : 'text-white/40 border-transparent hover:text-white/60'}`}
                      >
                        iOS AHAP
                      </button>
                      <button 
                        onClick={() => setActiveTab('android')}
                        className={`text-[11px] font-bold uppercase tracking-[0.5em] transition-all pb-4 -mb-4.5 border-b-2 ${activeTab === 'android' ? 'text-[#d4ff00] border-[#d4ff00]' : 'text-white/40 border-transparent hover:text-white/60'}`}
                      >
                        Android JSON
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">MANIFEST OUTPUT</span>
                  </div>
                  <div className="bg-black p-10 font-mono text-[13px] overflow-auto scrollbar-thin border border-white/10 selection:bg-[#d4ff00] selection:text-black">
                    <pre className="text-white leading-[1.8]">
                      {activeTab === 'ios' 
                        ? JSON.stringify(ahapResult, null, 2) 
                        : JSON.stringify(androidPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-16 border border-dashed border-white/20 bg-black/40">
                <div className="w-28 h-28 border border-white/10 rounded-full flex items-center justify-center mb-12 opacity-80 transition-transform duration-1000 hover:rotate-12">
                  <Smartphone className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-light tracking-tight text-white mb-6 uppercase tracking-[0.3em]">Synthesis Required</h3>
                <p className="text-[12px] uppercase font-bold tracking-[0.5em] text-white/50 max-w-sm leading-[2]">
                  Awaiting analysis of the input asset to generate cross-platform tactile metadata.
                </p>
                <div className="mt-12 pt-12 border-t border-white/10 max-w-sm opacity-90">
                   <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#d4ff00] mb-4">Ready for deployment?</p>
                   <p className="text-[12px] font-light text-white leading-relaxed">
                     Export to iOS (.AHAP) or Android (JSON) to integrate high-fidelity taptic feedback into your mobile applications.
                   </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="px-8 lg:px-16 py-20 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-12 bg-[#020202]">
        <div className="flex items-center gap-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.6em] text-white/60">RightVibe &copy; 2025</span>
          <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-[0.6em] text-white/60">Alex Levin</span>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/60 text-center lg:text-right leading-loose">
          Copyright Levin & Riegner, LLC. Engineered at <a href="https://levinriegner.com" className="text-white/80 hover:text-[#d4ff00] transition-colors border-b border-white/10 hover:border-[#d4ff00]">Levin Riegner</a>
        </p>
      </footer>
      <canvas ref={canvasRef} width={640} height={360} className="hidden" />
    </div>
  );
};

export default App;
