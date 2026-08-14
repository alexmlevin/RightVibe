import React, { useRef, useState } from 'react';
import { Volume2, Vibrate } from 'lucide-react';
import { Screen, Hotspot } from '../types';
import { HOTSPOT_TYPE_META } from '../lib/hotspotTypes';

interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenCanvasProps {
  screen: Screen;
  mode: 'edit' | 'view';
  selectedHotspotId?: string | null;
  onCreateHotspot?: (rect: DrawRect) => void;
  onSelectHotspot?: (hotspot: Hotspot) => void;
}

const MIN_SIZE_PCT = 2;

const ScreenCanvas: React.FC<ScreenCanvasProps> = ({
  screen,
  mode,
  selectedHotspotId,
  onCreateHotspot,
  onSelectHotspot,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DrawRect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const pctFromEvent = (e: React.PointerEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode !== 'edit') return;
    const { x, y } = pctFromEvent(e);
    dragStart.current = { x, y };
    setDraft({ x, y, width: 0, height: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode !== 'edit' || !dragStart.current) return;
    const { x, y } = pctFromEvent(e);
    const start = dragStart.current;
    setDraft({
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
    });
  };

  const handlePointerUp = () => {
    if (mode !== 'edit' || !dragStart.current || !draft) {
      dragStart.current = null;
      setDraft(null);
      return;
    }
    dragStart.current = null;
    if (draft.width >= MIN_SIZE_PCT && draft.height >= MIN_SIZE_PCT) {
      onCreateHotspot?.(draft);
    }
    setDraft(null);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full select-none bg-[#0a0a0a] border border-white/10 overflow-hidden ${
        mode === 'edit' ? 'cursor-crosshair' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img src={screen.imageUrl} alt={screen.name} className="w-full h-auto block pointer-events-none" draggable={false} />

      {screen.hotspots.map((h) => {
        const meta = HOTSPOT_TYPE_META[h.type];
        const Icon = meta.icon;
        const isSelected = h.id === selectedHotspotId;
        return (
          <button
            key={h.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectHotspot?.(h);
            }}
            className="absolute group/hotspot"
            style={{
              left: `${h.x}%`,
              top: `${h.y}%`,
              width: `${h.width}%`,
              height: `${h.height}%`,
              border: `1.5px solid ${isSelected ? '#d4ff00' : meta.color}`,
              backgroundColor: isSelected ? 'rgba(212,255,0,0.12)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <span
              className="absolute -top-3 -left-px flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] whitespace-nowrap opacity-0 group-hover/hotspot:opacity-100 transition-opacity"
              style={{ backgroundColor: isSelected ? '#d4ff00' : meta.color, color: '#000' }}
            >
              <Icon className="w-3 h-3" />
              {h.label || meta.label}
            </span>
            <span className="absolute bottom-1 right-1 flex items-center gap-1">
              {h.sfx && (
                <span className="w-4 h-4 rounded-full bg-black/70 flex items-center justify-center">
                  <Volume2 className="w-2.5 h-2.5 text-[#d4ff00]" />
                </span>
              )}
              {h.hapticsEnabled && (
                <span className="w-4 h-4 rounded-full bg-black/70 flex items-center justify-center">
                  <Vibrate className="w-2.5 h-2.5 text-[#d4ff00]" />
                </span>
              )}
            </span>
          </button>
        );
      })}

      {draft && (
        <div
          className="absolute border-2 border-dashed border-[#d4ff00] bg-[#d4ff00]/10 pointer-events-none"
          style={{ left: `${draft.x}%`, top: `${draft.y}%`, width: `${draft.width}%`, height: `${draft.height}%` }}
        />
      )}
    </div>
  );
};

export default ScreenCanvas;
