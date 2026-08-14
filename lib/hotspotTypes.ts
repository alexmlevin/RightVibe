import { MousePointerClick, Menu, LogIn, Film, AlertTriangle, Square, Sparkles, LucideIcon } from 'lucide-react';
import { HotspotType } from '../types';

interface HotspotTypeMeta {
  label: string;
  icon: LucideIcon;
  color: string;
}

export const HOTSPOT_TYPES: HotspotType[] = [
  'button',
  'menu',
  'screen-enter',
  'video',
  'popup',
  'error',
  'custom',
];

export const HOTSPOT_TYPE_META: Record<HotspotType, HotspotTypeMeta> = {
  button: { label: 'Button / Tap', icon: MousePointerClick, color: '#d4ff00' },
  menu: { label: 'Menu / Nav', icon: Menu, color: '#5ce1ff' },
  'screen-enter': { label: 'Screen Enter', icon: LogIn, color: '#ff8a5c' },
  video: { label: 'In-App Video', icon: Film, color: '#c46bff' },
  popup: { label: 'Popup / Modal', icon: Square, color: '#5cff9d' },
  error: { label: 'Error / Alert', icon: AlertTriangle, color: '#ff5c5c' },
  custom: { label: 'Custom', icon: Sparkles, color: '#ffffff' },
};
