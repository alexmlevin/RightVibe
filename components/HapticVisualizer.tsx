
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { AHAPFile, HapticEventType } from '../types';

interface HapticVisualizerProps {
  ahap: AHAPFile;
  currentTime: number;
  duration: number;
}

const HapticVisualizer: React.FC<HapticVisualizerProps> = ({ ahap, currentTime, duration }) => {
  const steps = 150; // Increased resolution for agency look
  const data = Array.from({ length: steps + 1 }, (_, i) => {
    const time = (i / steps) * duration;
    let intensity = 0;
    let sharpness = 0;

    ahap.Pattern.forEach(p => {
      const event = p.Event;
      if (event.EventType === HapticEventType.Transient) {
        if (Math.abs(time - event.Time) < 0.04) {
          const param = event.EventParameters.find(ep => ep.ParameterID === 'HapticIntensity');
          const sharp = event.EventParameters.find(ep => ep.ParameterID === 'HapticSharpness');
          intensity = Math.max(intensity, param?.ParameterValue || 0);
          sharpness = Math.max(sharpness, sharp?.ParameterValue || 0);
        }
      } else if (event.EventType === HapticEventType.Continuous) {
        if (time >= event.Time && time <= (event.Time + (event.EventDuration || 0))) {
          const param = event.EventParameters.find(ep => ep.ParameterID === 'HapticIntensity');
          const sharp = event.EventParameters.find(ep => ep.ParameterID === 'HapticSharpness');
          intensity = Math.max(intensity, param?.ParameterValue || 0);
          sharpness = Math.max(sharpness, sharp?.ParameterValue || 0);
        }
      }
    });

    return { time, intensity, sharpness };
  });

  return (
    <div className="w-full h-56 bg-black rounded-none border border-white/10 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d4ff00" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#d4ff00" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSharpness" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
          <XAxis 
            dataKey="time" 
            hide 
            domain={[0, duration]} 
          />
          <YAxis hide domain={[0, 1.2]} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-black border border-white/10 p-3 rounded-none shadow-2xl backdrop-blur-xl">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">t: {payload[0].payload.time.toFixed(3)}s</p>
                    <p className="text-[#d4ff00] text-[10px] font-bold uppercase tracking-widest">Intensity: {payload[0].value?.toString().slice(0,5)}</p>
                    <p className="text-white text-[10px] font-bold uppercase tracking-widest">Sharpness: {payload[1].value?.toString().slice(0,5)}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="intensity" 
            stroke="#d4ff00" 
            strokeWidth={1.5}
            fillOpacity={1} 
            fill="url(#colorIntensity)" 
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            dataKey="sharpness" 
            stroke="#ffffff" 
            strokeWidth={1}
            strokeDasharray="4 4"
            fillOpacity={1} 
            fill="url(#colorSharpness)" 
            isAnimationActive={false}
          />
          <ReferenceLine x={currentTime} stroke="#d4ff00" strokeWidth={1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HapticVisualizer;
