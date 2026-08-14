export enum HapticEventType {
  Transient = 'HapticTransient',
  Continuous = 'HapticContinuous'
}

export interface HapticParameter {
  ParameterID: 'HapticIntensity' | 'HapticSharpness';
  ParameterValue: number;
}

export interface HapticEvent {
  Event: {
    EventType: HapticEventType;
    Time: number;
    EventDuration?: number;
    EventParameters: HapticParameter[];
  };
}

export interface AHAPFile {
  Version: number;
  Pattern: HapticEvent[];
}

export type HotspotType =
  | 'button'
  | 'menu'
  | 'screen-enter'
  | 'video'
  | 'popup'
  | 'error'
  | 'custom';

export interface HotspotSfx {
  url: string;
  fileName: string;
  durationSeconds: number;
}

export interface Hotspot {
  id: string;
  type: HotspotType;
  label: string;
  /** All geometry is stored as a percentage (0-100) of the screen image, so it stays correct at any render size. */
  x: number;
  y: number;
  width: number;
  height: number;
  sfx: HotspotSfx | null;
  hapticsEnabled: boolean;
  ahap: AHAPFile | null;
}

export interface Screen {
  id: string;
  name: string;
  imageUrl: string;
  hotspots: Hotspot[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  screens: Screen[];
}
