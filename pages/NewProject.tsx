import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  Copy,
  ArrowRight,
  ImagePlus,
} from 'lucide-react';
import Layout from '../components/Layout';
import ScreenCanvas from '../components/ScreenCanvas';
import { HOTSPOT_TYPES, HOTSPOT_TYPE_META } from '../lib/hotspotTypes';
import { uploadScreenshot } from '../lib/blobUpload';
import { createProject } from '../lib/api';
import { Screen, Hotspot, HotspotType, Project } from '../types';

interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const NewProject: React.FC = () => {
  const draftId = useRef(crypto.randomUUID()).current;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectName, setProjectName] = useState('');
  const [screens, setScreens] = useState<Screen[]>([]);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null);
  const [pendingRect, setPendingRect] = useState<{ screenId: string; rect: DraftRect } | null>(null);
  const [draftType, setDraftType] = useState<HotspotType>('button');
  const [draftLabel, setDraftLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [copied, setCopied] = useState(false);

  const activeScreen = screens.find((s) => s.id === activeScreenId) || null;

  const handleAddScreens = async (files: FileList | null) => {
    if (!files || !files.length) return;

    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const localUrl = URL.createObjectURL(file);
      const newScreen: Screen = {
        id,
        name: file.name.replace(/\.[^/.]+$/, ''),
        imageUrl: localUrl,
        hotspots: [],
      };
      setScreens((prev) => [...prev, newScreen]);
      setActiveScreenId((prev) => prev ?? id);
      setUploadingIds((prev) => new Set(prev).add(id));

      try {
        const uploadedUrl = await uploadScreenshot(file, draftId);
        setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, imageUrl: uploadedUrl } : s)));
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to upload screenshot.');
        setScreens((prev) => prev.filter((s) => s.id !== id));
      } finally {
        setUploadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  const handleCreateHotspot = (screenId: string, rect: DraftRect) => {
    setPendingRect({ screenId, rect });
    setDraftType('button');
    setDraftLabel('');
  };

  const confirmHotspot = () => {
    if (!pendingRect) return;
    const hotspot: Hotspot = {
      id: crypto.randomUUID(),
      type: draftType,
      label: draftLabel.trim() || HOTSPOT_TYPE_META[draftType].label,
      x: pendingRect.rect.x,
      y: pendingRect.rect.y,
      width: pendingRect.rect.width,
      height: pendingRect.rect.height,
      sfx: null,
      hapticsEnabled: false,
      ahap: null,
    };
    setScreens((prev) =>
      prev.map((s) => (s.id === pendingRect.screenId ? { ...s, hotspots: [...s.hotspots, hotspot] } : s))
    );
    setPendingRect(null);
  };

  const deleteHotspot = (screenId: string, hotspotId: string) => {
    setScreens((prev) =>
      prev.map((s) => (s.id === screenId ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotId) } : s))
    );
  };

  const deleteScreen = (screenId: string) => {
    setScreens((prev) => prev.filter((s) => s.id !== screenId));
    setActiveScreenId((prev) => (prev === screenId ? null : prev));
  };

  const renameScreen = (screenId: string, name: string) => {
    setScreens((prev) => prev.map((s) => (s.id === screenId ? { ...s, name } : s)));
  };

  const isUploading = uploadingIds.size > 0;
  const canSave = projectName.trim().length > 0 && screens.length > 0 && !isUploading && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const project = await createProject(projectName.trim(), screens);
      setCreatedProject(project);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setIsSaving(false);
    }
  };

  const shareUrl = createdProject ? `${window.location.origin}/project/${createdProject.id}` : '';

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdProject) {
    return (
      <Layout eyebrow="Project Created">
        <main className="flex-1 flex items-center justify-center px-8 py-24">
          <div className="max-w-xl w-full text-center">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.6em] text-[#d4ff00] mb-8">Ready to share</h2>
            <p className="text-3xl font-light tracking-tight text-white mb-12">
              &ldquo;{createdProject.name}&rdquo; is live. Send this link to your producer.
            </p>
            <div className="flex items-center border border-white/20 mb-8">
              <span className="flex-1 truncate text-left px-6 py-5 text-[13px] font-mono text-white/80">{shareUrl}</span>
              <button onClick={copyLink} className="px-6 py-5 border-l border-white/20 hover:bg-white/5 transition-colors">
                {copied ? <Check className="w-4 h-4 text-[#d4ff00]" /> : <Copy className="w-4 h-4 text-white/60" />}
              </button>
            </div>
            <Link
              to={`/project/${createdProject.id}`}
              className="inline-flex items-center gap-3 py-6 px-10 bg-[#d4ff00] text-black font-bold uppercase tracking-[0.4em] text-[11px] hover:bg-white transition-colors"
            >
              Open Producer View <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout eyebrow="Dev / Mark Up Screens">
      <section className="px-8 lg:px-16 pt-16 pb-8 max-w-7xl mx-auto w-full">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.6em] text-[#d4ff00] mb-6">New Project</h2>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Name this project (e.g. Checkout Flow v2)"
          className="w-full max-w-2xl bg-transparent border-b border-white/20 py-4 text-2xl font-light text-white focus:outline-none focus:border-[#d4ff00] transition-all placeholder:text-white/20"
        />
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-8 lg:px-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/50 mb-2">Screens</h3>
          {screens.map((s) => (
            <div
              key={s.id}
              className={`border p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                activeScreenId === s.id ? 'border-[#d4ff00]' : 'border-white/10 hover:border-white/30'
              }`}
              onClick={() => setActiveScreenId(s.id)}
            >
              <div className="w-12 h-12 bg-black flex-shrink-0 overflow-hidden">
                <img src={s.imageUrl} className="w-full h-full object-cover" alt={s.name} />
              </div>
              <input
                value={s.name}
                onChange={(e) => renameScreen(s.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-transparent text-[12px] text-white focus:outline-none truncate"
              />
              {uploadingIds.has(s.id) && <Loader2 className="w-4 h-4 text-[#d4ff00] animate-spin flex-shrink-0" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteScreen(s.id);
                }}
                className="text-white/30 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <label className="border border-dashed border-white/20 hover:border-[#d4ff00]/60 p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors text-center">
            <ImagePlus className="w-5 h-5 text-white/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Add Screen(s)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddScreens(e.target.files)}
            />
          </label>
        </aside>

        <section className="lg:col-span-9 flex flex-col gap-6">
          {!activeScreen ? (
            <div className="flex-1 min-h-[400px] border border-dashed border-white/15 flex items-center justify-center text-center p-16">
              <p className="text-[12px] uppercase font-bold tracking-[0.4em] text-white/40 max-w-sm leading-loose">
                Add a screenshot to start placing hotspots for buttons, menus, screen transitions,
                video, popups and errors.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                Drag on the screenshot below to draw a hotspot
              </p>
              <ScreenCanvas
                screen={activeScreen}
                mode="edit"
                onCreateHotspot={(rect) => handleCreateHotspot(activeScreen.id, rect)}
              />

              {activeScreen.hotspots.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeScreen.hotspots.map((h) => {
                    const meta = HOTSPOT_TYPE_META[h.type];
                    const Icon = meta.icon;
                    return (
                      <div key={h.id} className="flex items-center gap-3 border border-white/10 px-4 py-3">
                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: meta.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] text-white truncate">{h.label}</p>
                          <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">{meta.label}</p>
                        </div>
                        <button
                          onClick={() => deleteHotspot(activeScreen.id, h.id)}
                          className="text-white/30 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {pendingRect && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="bg-[#0a0a0a] border border-white/10 p-10 max-w-md w-full space-y-8">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-white border-l-2 border-[#d4ff00] pl-4">
              New Hotspot
            </h3>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {HOTSPOT_TYPES.map((t) => {
                  const meta = HOTSPOT_TYPE_META[t];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setDraftType(t)}
                      className={`flex items-center gap-2 px-3 py-3 border text-[11px] transition-colors ${
                        draftType === t ? 'border-[#d4ff00] text-[#d4ff00]' : 'border-white/10 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Label</label>
              <input
                autoFocus
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder={HOTSPOT_TYPE_META[draftType].label}
                className="w-full bg-transparent border-b border-white/20 py-3 text-[15px] text-white focus:outline-none focus:border-[#d4ff00] placeholder:text-white/20"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setPendingRect(null)}
                className="flex-1 py-4 border border-white/20 text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmHotspot}
                className="flex-1 py-4 bg-[#d4ff00] text-black text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add Hotspot
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 border-t border-white/10 bg-black/95 backdrop-blur-xl px-8 lg:px-16 py-6 flex items-center justify-between gap-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
          {screens.length} screen{screens.length === 1 ? '' : 's'} &middot;{' '}
          {screens.reduce((sum, s) => sum + s.hotspots.length, 0)} hotspot
          {screens.reduce((sum, s) => sum + s.hotspots.length, 0) === 1 ? '' : 's'}
          {saveError && <span className="text-red-500 ml-4">{saveError}</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`py-4 px-10 font-bold uppercase tracking-[0.4em] text-[11px] transition-colors flex items-center gap-3 ${
            canSave ? 'bg-[#d4ff00] text-black hover:bg-white' : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving
            </>
          ) : (
            <>
              Create Project &amp; Get Link <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </Layout>
  );
};

export default NewProject;
