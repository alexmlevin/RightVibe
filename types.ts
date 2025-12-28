
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

export interface VideoFrameData {
  base64: string;
  timestamp: number;
}
