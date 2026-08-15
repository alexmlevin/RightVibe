import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  X,
  Upload,
  Trash2,
  Loader2,
  Play,
  Download,
  Sparkles,
  Plus,
  Smartphone,
  AlertCircle,
  Check,
  Copy,
} from 'lucide-react';
import Layout from '../components/Layout';
import ScreenCanvas from '../components/ScreenCanvas';
import HapticVisualizer from '../components/HapticVisualizer';
import { HOTSPOT_TYPE_META } from '../lib/hotspotTypes';
import { getProject, saveProject } from '../lib/api';
import { uploadSfx, getAudioDurationSeconds } from '../lib/blobUpload';
import { generateHapticsFromSfxUrl } from '../lib/generateHaptics';
import {
  createEmptyAhap,
  addTapEvent,
  addHoldEvent,
  removeEvent,
  updateEventField,
  ahapDuration,
  ahapToVibratePattern,
  canVibrate,
  downloadAhap,
} from '../lib/haptics';
import { Project, Hotspot, AHAPFile, HapticEventType } from '../types';

const ProducerView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [uploadingSfx, setUploadingSfx] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [visualizerTime, setVisualizerTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const isFirstRender = useRef(true);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getProject(id)
      .then((p) => {
        setProject(p);
        setActiveScreenId(p.screens[0]?.id ?? null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load project.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Debounced autosave whenever the project's screens/hotspots change.
  useEffect(() => {
    if (!project) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveProject(project.id, { screens: project.screens })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.screens]);

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  const activeScreen = project?.screens.find((s) => s.id === activeScreenId) || null;
  const selectedHotspot = activeScreen?.hotspots.find((h) => h.id === selectedHotspotId) || null;

  const updateHotspot = (screenId: string, hotspotId: string, updater: (h: Hotspot) => Hotspot) => {
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        screens: prev.screens.map((s) =>
          s.id === screenId
            ? { ...s, hotspots: s.hotspots.map((h) => (h.id === hotspotId ? updater(h) : h)) }
            : s
        ),
      };
    });
  };

  const updateAhap = (updater: (ahap: AHAPFile) => AHAPFile) => {
    if (!activeScreen || !selectedHotspot) return;
    updateHotspot(activeScreen.id, selectedHotspot.id, (h) => ({ ...h, ahap: updater(h.ahap ?? createEmptyAhap()) }));
  };

  const handleUploadSfx = async (file: File) => {
    if (!activeScreen || !selectedHotspot || !project) return;
    setUploadingSfx(true);
    setActionError(null);
    try {
      const [url, durationSeconds] = await Promise.all([
        uploadSfx(file, project.id, selectedHotspot.id),
        getAudioDurationSeconds(file),
      ]);
      updateHotspot(activeScreen.id, selectedHotspot.id, (h) => ({
        ...h,
        sfx: { url, fileName: file.name, durationSeconds },
      }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to upload SFX.');
    } finally {
      setUploadingSfx(false);
    }
  };

  const removeSfx = () => {
    if (!activeScreen || !selectedHotspot) return;
    updateHotspot(activeScreen.id, selectedHotspot.id, (h) => ({ ...h, sfx: null }));
  };

  const toggleHaptics = () => {
    if (!activeScreen || !selectedHotspot) return;
    updateHotspot(activeScreen.id, selectedHotspot.id, (h) => {
      const turningOn = !h.hapticsEnabled;
      const hasEvents = (h.ahap?.Pattern.length ?? 0) > 0;
      // Seed a single tap so producers land on a working starting point instead of a blank
      // visualizer the first time they turn haptics on.
      const ahap = turningOn && !hasEvents ? addTapEvent(createEmptyAhap(), 0) : h.ahap ?? createEmptyAhap();
      return { ...h, hapticsEnabled: turningOn, ahap };
    });
  };

  const handleGenerate = async () => {
    if (!activeScreen || !selectedHotspot?.sfx) return;
    setGenerating(true);
    setActionError(null);
    try {
      const ahap = await generateHapticsFromSfxUrl(
        selectedHotspot.sfx.url,
        selectedHotspot.type,
        selectedHotspot.label,
        selectedHotspot.sfx.durationSeconds
      );
      updateHotspot(activeScreen.id, selectedHotspot.id, (h) => ({ ...h, ahap, hapticsEnabled: true }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to generate haptic pattern.');
    } finally {
      setGenerating(false);
    }
  };

  const runVisualizerPlayhead = (duration: number) => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      if (elapsed >= duration) {
        setVisualizerTime(duration);
        return;
      }
      setVisualizerTime(elapsed);
      animationRef.current = requestAnimationFrame(tick);
    };
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setVisualizerTime(0);
    animationRef.current = requestAnimationFrame(tick);
  };

  const handleTest = () => {
    if (!selectedHotspot) return;
    if (selectedHotspot.sfx && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    if (selectedHotspot.hapticsEnabled && selectedHotspot.ahap) {
      if (canVibrate()) {
        navigator.vibrate(ahapToVibratePattern(selectedHotspot.ahap));
      }
      runVisualizerPlayhead(ahapDuration(selectedHotspot.ahap));
    }
  };

  const closeDrawer = () => setSelectedHotspotId(null);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#d4ff00] animate-spin" />
        </div>
      </Layout>
    );
  }

  if (loadError || !project) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-16 gap-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-white/70 text-[13px] max-w-sm">{loadError || 'Project not found.'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout eyebrow="Producer / SFX + Haptics">
      <section className="px-8 lg:px-16 pt-16 pb-8 max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.6em] text-[#d4ff00] mb-4">Project</h2>
          <p className="text-3xl font-light tracking-tight text-white">{project.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && <span className="text-red-500">Save failed</span>}
          </span>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-3 border border-white/15 text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 hover:border-[#d4ff00] hover:text-[#d4ff00] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-8 lg:px-16 pb-24 flex flex-col gap-6">
        {project.screens.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {project.screens.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScreenId(s.id)}
                className={`px-5 py-3 text-[10px] font-bold uppercase tracking-[0.3em] whitespace-nowrap border transition-colors ${
                  activeScreenId === s.id ? 'border-[#d4ff00] text-[#d4ff00]' : 'border-white/10 text-white/50 hover:border-white/30'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {activeScreen && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
              Click a hotspot to add SFX and haptic feedback
            </p>
            <ScreenCanvas
              screen={activeScreen}
              mode="view"
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={(h) => setSelectedHotspotId(h.id)}
            />
            {activeScreen.hotspots.length === 0 && (
              <p className="text-[12px] text-white/40 text-center py-12">
                This screen has no hotspots yet. Ask the developer to add some.
              </p>
            )}
          </>
        )}
      </main>

      {selectedHotspot && activeScreen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border-l border-white/10 h-full overflow-y-auto">
            <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/10 px-8 py-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {React.createElement(HOTSPOT_TYPE_META[selectedHotspot.type].icon, {
                  className: 'w-4 h-4',
                  style: { color: HOTSPOT_TYPE_META[selectedHotspot.type].color },
                })}
                <div>
                  <p className="text-[14px] text-white">{selectedHotspot.label}</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                    {HOTSPOT_TYPE_META[selectedHotspot.type].label}
                  </p>
                </div>
              </div>
              <button onClick={closeDrawer} className="text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 flex flex-col gap-10">
              {actionError && (
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-[0.3em] bg-red-500/10 border border-red-500/20 px-4 py-3">
                  {actionError}
                </p>
              )}

              {/* SFX */}
              <section className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-white border-l-2 border-[#d4ff00] pl-4">
                  Sound Effect
                </h3>
                {selectedHotspot.sfx ? (
                  <div className="space-y-3">
                    <audio ref={audioRef} controls src={selectedHotspot.sfx.url} className="w-full" />
                    <div className="flex items-center justify-between text-[11px] text-white/50">
                      <span className="truncate">{selectedHotspot.sfx.fileName}</span>
                      <button onClick={removeSfx} className="text-white/40 hover:text-red-500 transition-colors flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-white/20 hover:border-[#d4ff00]/60 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center">
                    {uploadingSfx ? (
                      <Loader2 className="w-5 h-5 text-[#d4ff00] animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-white/60" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">
                      {uploadingSfx ? 'Uploading…' : 'Upload SFX (optional)'}
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      disabled={uploadingSfx}
                      onChange={(e) => e.target.files?.[0] && handleUploadSfx(e.target.files[0])}
                    />
                  </label>
                )}
              </section>

              {/* Haptics */}
              <section className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-white border-l-2 border-[#d4ff00] pl-4">
                    Haptic Feedback
                  </h3>
                  <button
                    onClick={toggleHaptics}
                    className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                      selectedHotspot.hapticsEnabled ? 'bg-[#d4ff00]' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-black transition-transform ${
                        selectedHotspot.hapticsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {selectedHotspot.hapticsEnabled && selectedHotspot.ahap && (
                  <div className="space-y-5">
                    <button
                      onClick={handleGenerate}
                      disabled={!selectedHotspot.sfx || generating}
                      className={`w-full py-4 border text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-colors ${
                        !selectedHotspot.sfx || generating
                          ? 'border-white/10 text-white/20 cursor-not-allowed'
                          : 'border-[#d4ff00]/40 text-[#d4ff00] hover:bg-[#d4ff00] hover:text-black'
                      }`}
                      title={!selectedHotspot.sfx ? 'Upload an SFX first' : ''}
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {generating ? 'Generating…' : 'Generate from SFX with AI'}
                    </button>

                    <HapticVisualizer
                      ahap={selectedHotspot.ahap}
                      currentTime={visualizerTime}
                      duration={ahapDuration(selectedHotspot.ahap)}
                      onAhapChange={(updated) => updateAhap(() => updated)}
                      onScrub={setVisualizerTime}
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={() => updateAhap((a) => addTapEvent(a, visualizerTime))}
                        className="flex-1 py-3 border border-white/15 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 hover:border-white/40 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tap
                      </button>
                      <button
                        onClick={() => updateAhap((a) => addHoldEvent(a, visualizerTime))}
                        className="flex-1 py-3 border border-white/15 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 hover:border-white/40 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" /> Hold
                      </button>
                    </div>

                    {selectedHotspot.ahap.Pattern.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {selectedHotspot.ahap.Pattern.map((p, i) => {
                          const intensity = p.Event.EventParameters.find((pp) => pp.ParameterID === 'HapticIntensity')?.ParameterValue ?? 0;
                          const sharpness = p.Event.EventParameters.find((pp) => pp.ParameterID === 'HapticSharpness')?.ParameterValue ?? 0;
                          const isContinuous = p.Event.EventType === HapticEventType.Continuous;
                          return (
                            <div key={i} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 px-3 py-2 text-[10px]">
                              <span className="w-14 uppercase tracking-[0.1em] text-white/40 flex-shrink-0">
                                {isContinuous ? 'Hold' : 'Tap'}
                              </span>
                              <input
                                type="number"
                                step={0.01}
                                value={p.Event.Time.toFixed(2)}
                                onChange={(e) => updateAhap((a) => updateEventField(a, i, 'time', parseFloat(e.target.value) || 0))}
                                className="w-16 bg-black border border-white/10 px-2 py-1 text-white"
                                title="Time (s)"
                              />
                              {isContinuous && (
                                <input
                                  type="number"
                                  step={0.01}
                                  value={(p.Event.EventDuration ?? 0.1).toFixed(2)}
                                  onChange={(e) => updateAhap((a) => updateEventField(a, i, 'duration', parseFloat(e.target.value) || 0.01))}
                                  className="w-16 bg-black border border-white/10 px-2 py-1 text-white"
                                  title="Duration (s)"
                                />
                              )}
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={intensity}
                                onChange={(e) => updateAhap((a) => updateEventField(a, i, 'intensity', parseFloat(e.target.value)))}
                                className="flex-1"
                                title="Intensity"
                              />
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={sharpness}
                                onChange={(e) => updateAhap((a) => updateEventField(a, i, 'sharpness', parseFloat(e.target.value)))}
                                className="flex-1"
                                title="Sharpness"
                              />
                              <button
                                onClick={() => updateAhap((a) => removeEvent(a, i))}
                                className="text-white/30 hover:text-red-500 transition-colors flex-shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Test / export */}
              <section className="space-y-4 pt-2 border-t border-white/10">
                <button
                  onClick={handleTest}
                  disabled={!selectedHotspot.sfx && !selectedHotspot.hapticsEnabled}
                  className={`w-full py-5 font-bold uppercase tracking-[0.4em] text-[11px] flex items-center justify-center gap-3 transition-colors ${
                    !selectedHotspot.sfx && !selectedHotspot.hapticsEnabled
                      ? 'bg-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-[#d4ff00] text-black hover:bg-white'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" /> Test This Interaction
                </button>

                {selectedHotspot.hapticsEnabled && (
                  <div className="flex items-start gap-3 text-[11px] text-white/50 leading-relaxed">
                    <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {canVibrate() ? (
                      <span>Live vibration will fire on this device when you press Test.</span>
                    ) : (
                      <span>
                        This browser can&apos;t trigger real vibration (iPhones have no Vibration API at
                        all &mdash; only Android Chrome supports it). Open this link on Android for a live
                        feel, or download the .AHAP below to test on iPhone.
                      </span>
                    )}
                  </div>
                )}

                {selectedHotspot.hapticsEnabled && selectedHotspot.ahap && (
                  <button
                    onClick={() => downloadAhap(selectedHotspot.ahap!, selectedHotspot.label)}
                    className="w-full py-4 border border-white/15 text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 hover:border-white/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Download .AHAP (iOS)
                  </button>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProducerView;
