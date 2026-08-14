import { AHAPFile, HapticEventType } from '../types';

export function createEmptyAhap(): AHAPFile {
  return { Version: 1.0, Pattern: [] };
}

export function addTapEvent(ahap: AHAPFile, time: number, intensity = 0.8, sharpness = 0.5): AHAPFile {
  return {
    ...ahap,
    Pattern: [
      ...ahap.Pattern,
      {
        Event: {
          EventType: HapticEventType.Transient,
          Time: Math.max(0, time),
          EventParameters: [
            { ParameterID: 'HapticIntensity', ParameterValue: intensity },
            { ParameterID: 'HapticSharpness', ParameterValue: sharpness },
          ],
        },
      },
    ],
  };
}

export function addHoldEvent(
  ahap: AHAPFile,
  time: number,
  duration = 0.3,
  intensity = 0.6,
  sharpness = 0.5
): AHAPFile {
  return {
    ...ahap,
    Pattern: [
      ...ahap.Pattern,
      {
        Event: {
          EventType: HapticEventType.Continuous,
          Time: Math.max(0, time),
          EventDuration: Math.max(0.01, duration),
          EventParameters: [
            { ParameterID: 'HapticIntensity', ParameterValue: intensity },
            { ParameterID: 'HapticSharpness', ParameterValue: sharpness },
          ],
        },
      },
    ],
  };
}

export function removeEvent(ahap: AHAPFile, index: number): AHAPFile {
  return { ...ahap, Pattern: ahap.Pattern.filter((_, i) => i !== index) };
}

export function updateEventField(
  ahap: AHAPFile,
  index: number,
  field: 'time' | 'duration' | 'intensity' | 'sharpness',
  value: number
): AHAPFile {
  const pattern = ahap.Pattern.map((p, i) => {
    if (i !== index) return p;
    const event = { ...p.Event, EventParameters: p.Event.EventParameters.map((param) => ({ ...param })) };
    if (field === 'time') event.Time = Math.max(0, value);
    if (field === 'duration') event.EventDuration = Math.max(0.01, value);
    if (field === 'intensity' || field === 'sharpness') {
      const paramId = field === 'intensity' ? 'HapticIntensity' : 'HapticSharpness';
      const param = event.EventParameters.find((p2) => p2.ParameterID === paramId);
      if (param) param.ParameterValue = Math.min(1, Math.max(0, value));
    }
    return { Event: event };
  });
  return { ...ahap, Pattern: pattern };
}

/** Total duration of the pattern in seconds, with a sane floor so the visualizer never shows a zero-width graph. */
export function ahapDuration(ahap: AHAPFile): number {
  const end = ahap.Pattern.reduce((max, { Event: e }) => {
    const eventEnd = e.Time + (e.EventType === HapticEventType.Continuous ? e.EventDuration ?? 0 : 0.05);
    return Math.max(max, eventEnd);
  }, 0);
  return Math.max(0.5, end + 0.15);
}

/**
 * Approximates an AHAP pattern as a Web Vibration API pattern: [vibrate, pause, vibrate, pause, ...].
 * Android Chrome only supports on/off durations, not intensity or sharpness, so this is a best-effort
 * feel, not a faithful reproduction of the AHAP - the real pattern is what the .AHAP export preserves.
 */
export function ahapToVibratePattern(ahap: AHAPFile): number[] {
  const events = [...ahap.Pattern].sort((a, b) => a.Event.Time - b.Event.Time);
  if (!events.length) return [0];

  const TRANSIENT_BUZZ_MS = 35;
  const pattern: number[] = [];
  let cursorMs = 0;

  events.forEach(({ Event: e }) => {
    const startMs = Math.max(0, Math.round(e.Time * 1000));
    const durMs =
      e.EventType === HapticEventType.Continuous
        ? Math.max(10, Math.round((e.EventDuration ?? 0.1) * 1000))
        : TRANSIENT_BUZZ_MS;
    const pauseMs = Math.max(0, startMs - cursorMs);

    if (pattern.length === 0) {
      pattern.push(0, pauseMs);
    } else {
      pattern.push(pauseMs);
    }
    pattern.push(durMs);
    cursorMs = startMs + durMs;
  });

  return pattern;
}

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function downloadAhap(ahap: AHAPFile, fileName: string): void {
  const blob = new Blob([JSON.stringify(ahap, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.ahap') ? fileName : `${fileName}.ahap`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
