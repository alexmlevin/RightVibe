import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Music, ArrowRight, MousePointerClick, Vibrate, Volume2 } from 'lucide-react';
import Layout from '../components/Layout';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('');
  const [openError, setOpenError] = useState<string | null>(null);

  const handleOpenProject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = projectId.trim();
    if (!trimmed) {
      setOpenError('Paste a project link or ID first.');
      return;
    }
    const match = trimmed.match(/([0-9a-fA-F-]{36})/);
    const id = match ? match[1] : trimmed;
    navigate(`/project/${id}`);
  };

  return (
    <Layout>
      <section className="px-8 lg:px-16 pt-20 pb-16 max-w-7xl mx-auto w-full">
        <div className="max-w-4xl">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.6em] text-[#d4ff00] mb-8">Introduction</h2>
          <p className="text-3xl lg:text-4xl font-light tracking-tight text-white leading-[1.15] lg:leading-[1.1]">
            RightVibe is where app developers and music producers build UI sound effects and haptic
            feedback together. Mark up your app's screens, hand the link to a producer, and they can
            drop in SFX, craft or AI-generate a haptic pattern, and feel it on a real phone.
          </p>
        </div>

        <div className="mt-16 flex flex-wrap gap-8 text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">
          <span className="flex items-center gap-3">
            <MousePointerClick className="w-4 h-4 text-[#d4ff00]" /> Click hotspots on screenshots
          </span>
          <span className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-[#d4ff00]" /> Upload &amp; audition SFX
          </span>
          <span className="flex items-center gap-3">
            <Vibrate className="w-4 h-4 text-[#d4ff00]" /> Build or AI-generate haptics
          </span>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 lg:p-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-zinc-950/50 border border-white/5 p-10 lg:p-12 flex flex-col gap-8">
          <div className="w-14 h-14 border border-white/20 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.5em] text-white border-l-2 border-[#d4ff00] pl-4 mb-4">
              App Developer
            </h3>
            <p className="text-[14px] text-white/70 font-light leading-relaxed">
              Upload screenshots of your app's screens, draw hotspots over buttons, menus, screen
              transitions, in-app video, popups, and error states. Get a shareable link for your
              producer &mdash; no source code or app functionality required.
            </p>
          </div>
          <button
            onClick={() => navigate('/new')}
            className="mt-auto w-full py-6 bg-[#d4ff00] text-black font-bold uppercase tracking-[0.4em] text-[11px] hover:bg-white transition-colors flex items-center justify-center gap-3"
          >
            Start a New Project <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        <section className="bg-zinc-950/50 border border-white/5 p-10 lg:p-12 flex flex-col gap-8">
          <div className="w-14 h-14 border border-white/20 flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.5em] text-white border-l-2 border-[#d4ff00] pl-4 mb-4">
              Music Producer
            </h3>
            <p className="text-[14px] text-white/70 font-light leading-relaxed">
              Open the project link a developer shared with you, click a hotspot, and upload your
              SFX. Add haptic feedback too &mdash; with sound, without it, or haptics-only &mdash;
              then test it live on your phone.
            </p>
          </div>
          <form onSubmit={handleOpenProject} className="mt-auto flex flex-col gap-4">
            <input
              type="text"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setOpenError(null);
              }}
              placeholder="Paste project link or ID"
              className="w-full bg-transparent border-b border-white/20 py-4 text-[15px] font-light text-white focus:outline-none focus:border-[#d4ff00] transition-all placeholder:text-white/20"
            />
            {openError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-[0.3em]">{openError}</p>}
            <button
              type="submit"
              className="w-full py-6 border border-white/20 text-white font-bold uppercase tracking-[0.4em] text-[11px] hover:border-[#d4ff00] hover:text-[#d4ff00] transition-colors flex items-center justify-center gap-3"
            >
              Open Project <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </section>
      </main>
    </Layout>
  );
};

export default Landing;
