import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  eyebrow?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, eyebrow }) => {
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
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.4em] leading-tight max-w-[160px]">
              {eyebrow || 'SFX + Haptics Collaboration'}
            </p>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <Link to="/" className="text-[20px] lg:text-[24px] tracking-[-0.03em] font-medium text-white pointer-events-auto">
            RightVibe
          </Link>
        </div>

        <div className="flex-1 flex justify-end items-center">
          <a
            href="https://levinriegner.com"
            target="_blank"
            rel="noreferrer"
            className="group text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 hover:text-white transition-all flex items-center gap-3"
          >
            Explore L+R
            <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="px-8 lg:px-16 py-16 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-8 bg-[#020202]">
        <div className="flex items-center gap-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.6em] text-white/60">RightVibe &copy; 2026</span>
          <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-[0.6em] text-white/60">Alex Levin</span>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/60 text-center lg:text-right leading-loose">
          Copyright Levin & Riegner, LLC. Engineered at{' '}
          <a
            href="https://levinriegner.com"
            className="text-white/80 hover:text-[#d4ff00] transition-colors border-b border-white/10 hover:border-[#d4ff00]"
          >
            Levin Riegner
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Layout;
