
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AHAPFile, HapticEventType } from '../types';

interface HapticVisualizerProps {
  ahap: AHAPFile;
  currentTime: number;
  duration: number;
  onAhapChange: (updatedAhap: AHAPFile) => void;
  onScrub: (time: number) => void;
}

const HapticVisualizer: React.FC<HapticVisualizerProps> = ({ 
  ahap, 
  currentTime, 
  duration, 
  onAhapChange,
  onScrub
}) => {
  const containerRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Constants for visualization
  const width = 1000;
  const height = 200;
  const padding = 10;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const timeToX = useCallback((time: number) => {
    return padding + (time / duration) * graphWidth;
  }, [duration, graphWidth]);

  const valueToY = useCallback((value: number) => {
    return padding + graphHeight - (value * graphHeight);
  }, [graphHeight]);

  const xToTime = useCallback((x: number) => {
    const relativeX = x - padding;
    return Math.max(0, Math.min(duration, (relativeX / graphWidth) * duration));
  }, [duration, graphWidth]);

  const yToValue = useCallback((y: number) => {
    const relativeY = y - padding;
    return Math.max(0, Math.min(1, 1 - (relativeY / graphHeight)));
  }, [graphHeight]);

  const handleMouseDown = (index: number) => {
    setDraggingIndex(index);
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (draggingIndex === null || !containerRef.current) return;

    const svg = containerRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const newValue = yToValue(svgP.y);

    const newAhap = { ...ahap };
    const event = newAhap.Pattern[draggingIndex].Event;
    
    // Find Intensity parameter
    const intensityParam = event.EventParameters.find(p => p.ParameterID === 'HapticIntensity');
    if (intensityParam) {
      intensityParam.ParameterValue = parseFloat(newValue.toFixed(3));
    }

    onAhapChange(newAhap);
  }, [draggingIndex, ahap, yToValue, onAhapChange]);

  const handleGlobalMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingIndex, handleGlobalMouseMove, handleGlobalMouseUp]);

  const handleBgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIndex !== null) return;
    const svg = containerRef.current;
    if (!svg) return;
    
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    onScrub(xToTime(svgP.x));
  };

  // Construct Waveform Path
  const generatePath = () => {
    if (!ahap.Pattern.length) return "";
    
    // Sort events by time
    const sorted = [...ahap.Pattern].sort((a, b) => a.Event.Time - b.Event.Time);
    let d = `M ${timeToX(0)} ${valueToY(0)}`;

    sorted.forEach((p, i) => {
      const e = p.Event;
      const x = timeToX(e.Time);
      const intensity = e.EventParameters.find(param => param.ParameterID === 'HapticIntensity')?.ParameterValue || 0;
      const y = valueToY(intensity);

      if (e.EventType === HapticEventType.Transient) {
        d += ` L ${x} ${valueToY(0)} L ${x} ${y} L ${x + 2} ${y} L ${x + 2} ${valueToY(0)}`;
      } else {
        const durationX = timeToX(e.Time + (e.EventDuration || 0));
        d += ` L ${x} ${valueToY(0)} L ${x} ${y} L ${durationX} ${y} L ${durationX} ${valueToY(0)}`;
      }
    });

    d += ` L ${timeToX(duration)} ${valueToY(0)} Z`;
    return d;
  };

  return (
    <div className="w-full bg-[#020202] border border-white/5 relative group/visualizer">
      {/* Time Rulers */}
      <div className="absolute top-0 left-0 right-0 flex justify-between px-2 pt-1 pointer-events-none opacity-20">
        <span className="text-[8px] mono">0.000s</span>
        <span className="text-[8px] mono">{(duration / 2).toFixed(3)}s</span>
        <span className="text-[8px] mono">{duration.toFixed(3)}s</span>
      </div>

      <svg 
        ref={containerRef}
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto cursor-crosshair select-none"
        onClick={handleBgClick}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <line 
            key={v}
            x1={padding} y1={valueToY(v)} 
            x2={width - padding} y2={valueToY(v)} 
            stroke="white" 
            strokeWidth="0.5" 
            strokeOpacity="0.03" 
          />
        ))}

        {/* Waveform Area */}
        <path 
          d={generatePath()} 
          fill="#d4ff00" 
          fillOpacity="0.08" 
          stroke="#d4ff00" 
          strokeWidth="1" 
          strokeOpacity="0.3"
          className="transition-all duration-300"
        />

        {/* Playhead */}
        <line 
          x1={timeToX(currentTime)} y1={padding} 
          x2={timeToX(currentTime)} y2={height - padding} 
          stroke="#d4ff00" 
          strokeWidth="1.5" 
          strokeDasharray="4 2"
        />

        {/* Interactive Handles */}
        {ahap.Pattern.map((p, i) => {
          const e = p.Event;
          const intensity = e.EventParameters.find(param => param.ParameterID === 'HapticIntensity')?.ParameterValue || 0;
          const x = timeToX(e.Time);
          const y = valueToY(intensity);
          const isDragging = draggingIndex === i;

          return (
            <g key={i} className="group/handle">
              {/* Event vertical marker */}
              <line 
                x1={x} y1={valueToY(0)} 
                x2={x} y2={y} 
                stroke={isDragging ? "#d4ff00" : "white"} 
                strokeWidth="1" 
                strokeOpacity={isDragging ? "1" : "0.2"} 
              />
              
              {/* The Handle */}
              <circle 
                cx={x} 
                cy={y} 
                r={isDragging ? 6 : 4} 
                fill={isDragging ? "#d4ff00" : "#d4ff00"} 
                fillOpacity={isDragging ? 1 : 0.6}
                stroke="white"
                strokeWidth={isDragging ? 2 : 1}
                strokeOpacity={isDragging ? 1 : 0.4}
                className="cursor-ns-resize transition-all hover:r-6 hover:fill-opacity-100"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown(i);
                }}
              />

              {/* Tooltip on Hover */}
              <g className="opacity-0 group-hover/handle:opacity-100 transition-opacity pointer-events-none">
                <rect 
                  x={x - 30} 
                  y={y - 35} 
                  width="60" 
                  height="20" 
                  fill="black" 
                  stroke="white" 
                  strokeOpacity="0.2" 
                />
                <text 
                  x={x} 
                  y={y - 21} 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize="9" 
                  className="mono"
                >
                  {intensity.toFixed(2)}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default HapticVisualizer;
