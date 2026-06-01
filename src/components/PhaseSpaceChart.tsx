import { Activity, Info } from 'lucide-react';
import { SimPoint, SimParameters } from '../types';

interface PhaseSpaceChartProps {
  history: SimPoint[];
  currentPoint: SimPoint;
  params: SimParameters;
}

export default function PhaseSpaceChart({ history, currentPoint, params }: PhaseSpaceChartProps) {
  const { integrationMode, highThreshold, lowThreshold, weightAdenosine, weightCircadian } = params;
  const safeCurrentPoint = currentPoint || { circSleepDrive: 0.5, adenosine: 0.15, isAsleep: false };
  const safeHistory = history || [];

  // Chart size configurations
  const width = 360;
  const height = 300;
  const padding = 45;

  // Scale functions (map mathematical space [0, 1] to SVG coordinates)
  const mapX = (c: number) => padding + c * (width - 2 * padding);
  const mapY = (a: number) => height - padding - a * (height - 2 * padding);

  // Generate the path for the simulation history trajectory
  let trajectoryPath = '';
  if (safeHistory.length > 1) {
    trajectoryPath = safeHistory
      .map((p, idx) => {
        const sx = mapX(p.circSleepDrive);
        const sy = mapY(p.adenosine);
        return `${idx === 0 ? 'M' : 'L'} ${sx} ${sy}`;
      })
      .join(' ');
  }

  // Draw the threshold curves based on the selected integration mode
  const getThresholdPoints = (threshold: number, mode: typeof integrationMode): string => {
    const steps = 40;
    const points: string[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const c = i / steps; // Circadian drive from 0 to 1
      let a = 0; // Adenosine to solve for

      if (mode === 'sum') {
        const sumW = weightAdenosine + weightCircadian;
        const nWA = weightAdenosine / sumW;
        const nWC = weightCircadian / sumW;
        a = (threshold - nWC * c) / nWA;
      } else if (mode === 'and') {
        a = threshold; 
      } else if (mode === 'or') {
        a = threshold; // simplified visualization
      } else if (mode === 'product') {
        const epsilon = 0.05;
        a = threshold / Math.max(c, epsilon);
      }

      // Clamp mathematical a to [0, 2] for drawing, but visually cap at 1.1 so it doesn't leave chart box
      const clampedA = Math.min(Math.max(a, 0), 1.1);
      const sx = mapX(c);
      const sy = mapY(clampedA);
      
      points.push(`${i === 0 ? 'M' : 'L'} ${sx} ${sy}`);
    }

    if (mode === 'and') {
      const xCorner = mapX(threshold);
      const yCorner = mapY(threshold);
      const xMax = mapX(1);
      const yTop = mapY(1.1);
      
      return `M ${xCorner} ${yTop} L ${xCorner} ${yCorner} L ${xMax} ${yCorner}`;
    }

    if (mode === 'or') {
      const xCorner = mapX(threshold);
      const yCorner = mapY(threshold);
      const xStart = mapX(0);
      const yStart = mapY(0);
      
      return `M ${xStart} ${yCorner} L ${xCorner} ${yCorner} L ${xCorner} ${yStart}`;
    }

    return points.join(' ');
  };

  const highThresholdPath = getThresholdPoints(highThreshold, integrationMode);
  const lowThresholdPath = getThresholdPoints(lowThreshold, integrationMode);

  return (
    <div 
      id="phase-space-chart-card" 
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-cyan-400" id="phase-header-icon" />
            <h3 id="phase-header-title" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              2D State Space Phase Portrait
            </h3>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mb-4 font-sans leading-relaxed">
          Graphs sleep pressure (H, vertical axle) against SCN clock sleep drive (C, horizontal axle). Perfect for viewing stable limit-cycle loops.
        </p>

        {/* SVG Container */}
        <div className="flex justify-center bg-slate-950/50 rounded border border-slate-800 p-2">
          <svg 
            id="phase-space-svg" 
            width={width} 
            height={height} 
            className="overflow-visible select-none font-mono"
          >
            {/* Shaded boundaries and interactive zones */}
            <g opacity="0.05">
              {integrationMode === 'sum' && (
                <polygon
                  points={`
                    ${mapX(0)},${mapY(1.1)}
                    ${mapX(1)},${mapY(1.1)}
                    ${mapX(1)},${mapY(0)}
                  `}
                  fill="#06B6D4"
                />
              )}
              {integrationMode === 'and' && (
                <rect
                  x={mapX(highThreshold)}
                  y={mapY(1.1)}
                  width={width - padding - mapX(highThreshold)}
                  height={mapY(highThreshold) - mapY(1.1)}
                  fill="#06B6D4"
                />
              )}
            </g>

            {/* Grid lines */}
            <line x1={mapX(0.5)} y1={mapY(0)} x2={mapX(0.5)} y2={mapY(1)} stroke="#1e293b" strokeWidth="1" strokeDasharray="2,3" />
            <line x1={mapX(0)} y1={mapY(0.5)} x2={mapX(1)} y2={mapY(0.5)} stroke="#1e293b" strokeWidth="1" strokeDasharray="2,3" />

            {/* Coordinates Axes */}
            <line x1={mapX(0)} y1={mapY(0)} x2={mapX(1.05)} y2={mapY(0)} stroke="#334155" strokeWidth="1.5" /> 
            <line x1={mapX(0)} y1={mapY(-0.05)} x2={mapX(0)} y2={mapY(1.05)} stroke="#334155" strokeWidth="1.5" /> 
            
            {/* Axis Labels */}
            <text x={mapX(0.70)} y={mapY(-0.11)} fill="#94a3b8" className="text-xs font-mono font-bold text-center" textAnchor="middle">Circadian (C)</text> 
            <text x={mapX(0.04)} y={mapY(1.08)} fill="#94a3b8" className="text-xs font-mono font-bold text-left">Adenosine (H)</text> 

            {/* Core Tick Marks */}
            <text x={mapX(0)} y={mapY(-0.06)} fill="#475569" className="text-[10px] font-bold" textAnchor="middle">DAY (0)</text>
            <text x={mapX(1)} y={mapY(-0.06)} fill="#475569" className="text-[10px] font-bold" textAnchor="middle">NIGHT (1)</text>
            <text x={mapX(-0.06)} y={mapY(0) + 3} fill="#475569" className="text-[10px] font-bold text-right" textAnchor="end">0.00</text>
            <text x={mapX(-0.06)} y={mapY(1) + 3} fill="#475569" className="text-[10px] font-bold text-right" textAnchor="end">1.00</text>

            {/* Threshold Contours */}
            {/* Sleep Onset Threshold Contour (High) */}
            <path
              id="phase-high-threshold-contour"
              d={highThresholdPath}
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
            <text 
              x={integrationMode === 'sum' ? mapX(0.8) : mapX(highThreshold) + 8} 
              y={integrationMode === 'sum' ? mapY(0.7) : mapY(highThreshold) - 10} 
              fill="#F43F5E" 
              className="text-[10px] font-bold uppercase tracking-wider"
            >
              LIMIT HI
            </text>

            {/* Wake Onset Threshold Contour (Low) */}
            <path
              id="phase-low-threshold-contour"
              d={lowThresholdPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
            <text 
              x={integrationMode === 'sum' ? mapX(0.12) : mapX(lowThreshold) + 8} 
              y={integrationMode === 'sum' ? mapY(0.18) : mapY(lowThreshold) + 14} 
              fill="#10B981" 
              className="text-[10px] font-bold uppercase tracking-wider"
            >
              LIMIT LO
            </text>

            {/* Historical trajectory trace orbit */}
            {trajectoryPath && (
              <path
                id="phase-trajectory-trail"
                d={trajectoryPath}
                fill="none"
                stroke="#22D3EE"
                strokeWidth="1.5"
                strokeOpacity="0.5"
              />
            )}

            {/* Current location pulsing marker */}
            <g id="phase-current-marker" transform={`translate(${mapX(safeCurrentPoint.circSleepDrive)}, ${mapY(safeCurrentPoint.adenosine)})`}>
              <circle r={6} fill={safeCurrentPoint.isAsleep ? '#6366F1' : '#10B981'} className="animate-pulse" fillOpacity="0.4" />
              <circle r={4} fill={safeCurrentPoint.isAsleep ? '#6366F1' : '#10B981'} stroke="#FFFFFF" strokeWidth="1" />
            </g>

            {/* Label inside chart box */}
            <text x={mapX(0.5)} y={mapY(0.48)} textAnchor="middle" fill="#1e293b" className="text-[10px] font-bold tracking-widest uppercase pointer-events-none">
              HYSTERESIS TRAJECTORY
            </text>
          </svg>
        </div>
      </div>

      {/* Footer descriptor info */}
      <div className="flex items-start gap-2 bg-slate-950/30 rounded border border-slate-800/80 p-2.5 mt-3">
        <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
        <span className="text-[10px] text-slate-400 leading-normal">
          {integrationMode === 'sum' 
            ? 'A linear postsynaptic summation operates via diagonal threshold contours. Dynamic curves shift cleanly.' 
            : 'Coincidence logic constructs rigid orthogonal bounds. Requires both H & C bounds met.'}
        </span>
      </div>
    </div>
  );
}
