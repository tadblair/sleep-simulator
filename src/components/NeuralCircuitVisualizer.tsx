import { Brain, Sun, Moon, Zap } from 'lucide-react';
import { SimPoint, SimParameters } from '../types';

interface NeuralCircuitVisualizerProps {
  currentPoint: SimPoint;
  params: SimParameters;
  onChangeParams?: (params: SimParameters) => void;
}

export default function NeuralCircuitVisualizer({ currentPoint, params, onChangeParams }: NeuralCircuitVisualizerProps) {
  const { 
    adenosine = 0.15, 
    melatonin = 0.0,
    circSleepDrive = 0.5, 
    vlpoActivity = 5.0, 
    lhActivity = 95.0, 
    isAsleep = false, 
    combinedSleepDrive = 0.5 
  } = currentPoint || {};

  // Normalization for visual outputs
  const sscDay = 1 - circSleepDrive; // High during SCN active wake drive

  const handleToggleLight = () => {
    if (!onChangeParams) return;
    onChangeParams({
      ...params,
      lightStrength: params.lightStrength > 0 ? 0.0 : 0.30,
    });
  };
  
  return (
    <div 
      id="neural-circuit-visualizer-card" 
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full"
    >
      {/* Accent gradients */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4.5 w-4.5 text-cyan-400" id="circuit-header-icon" />
            <h3 id="circuit-header-title" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Active Neural Pathways
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
            isAsleep 
              ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-900/40' 
              : 'bg-cyan-950/80 text-cyan-400 border border-cyan-900/40'
          }`}>
            {isAsleep ? '🛌 Sleep Stage' : '⚡ Alert Stage'}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mb-6 font-sans leading-relaxed">
          Mutual inhibition between VLPO (sleep promoter) and LH (wake center containing orexin/hypocretin neurons), modulated by SCN clock and Adenosine pressure.
        </p>

        {/* SVG Diagram with Sleek Custom Aesthetic */}
        <div className="relative w-full flex justify-center py-4 bg-slate-950/50 rounded border border-slate-800 p-4">
          <svg 
            id="neural-circuit-svg" 
            viewBox="0 0 600 320" 
            className="w-full max-w-xl h-auto font-sans text-xs select-none"
          >
            <defs>
              {/* Markers for excitatory synapses */}
              <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
              </marker>
              <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#06B6D4" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#3B82F6" />
              </marker>

              {/* Markers for inhibitory synapses */}
              <marker id="bar-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <rect x="3" y="1" width="3" height="8" fill="#EF4444" />
              </marker>

              {/* Glowing filters matching sleek design spectrum */}
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* CONNECTION LINES */}
            {/* SCN -> VLPO */}
            <path
              id="path-scn-to-vlpo"
              d="M 170 80 Q 230 110 320 125"
              fill="none"
              stroke={circSleepDrive > 0.5 ? '#6366F1' : '#1e293b'}
              strokeWidth={1.5 + circSleepDrive * 1.5}
              strokeDasharray={circSleepDrive > 0.5 ? '3,3' : 'none'}
              className={circSleepDrive > 0.5 ? 'animate-[dash_12s_linear_infinite]' : ''}
              markerEnd="url(#arrow-cyan)"
            />
            <text x="210" y="105" fill="#475569" className="font-mono text-[9px] font-bold">
              {circSleepDrive > 0.5 ? '+' : ''} SCN Sleep
            </text>

            {/* SCN -> LH */}
            <path
              id="path-scn-to-lh"
              d="M 170 80 Q 200 130 200 175"
              fill="none"
              stroke={sscDay > 0.5 ? '#10B981' : '#1e293b'}
              strokeWidth={1.5 + sscDay * 1.5}
              markerEnd="url(#arrow-green)"
            />
            <text x="145" y="145" fill="#475569" className="font-mono text-[9px] font-bold">
              + SCN Alert
            </text>

            {/* Adenosine -> VLPO */}
            <path
              id="path-adenosine-to-vlpo"
              d="M 430 80 Q 370 110 335 122"
              fill="none"
              stroke={adenosine > 0.5 ? '#3B82F6' : '#1e293b'}
              strokeWidth={1.5 + adenosine * 1.5}
              markerEnd="url(#arrow-blue)"
            />
            <text x="350" y="93" fill="#475569" className="font-mono text-[9px] font-bold">
              + Adenosine
            </text>

            {/* Adenosine -> LH */}
            <path
              id="path-adenosine-to-lh"
              d="M 430 80 Q 400 140 240 185"
              fill="none"
              stroke={adenosine > 0.5 ? '#EF4444' : '#1e293b'}
              strokeWidth={1.5 + adenosine * 1.5}
              markerEnd="url(#bar-red)"
            />
            <text x="320" y="171" fill="#ef4444" className="font-mono text-[9px] font-bold opacity-60">
              - Sleep Press.
            </text>

            {/* VLPO -> LH Reciprocal */}
            <path
              id="path-vlpo-to-lh"
              d="M 300 160 Q 250 165 215 185"
              fill="none"
              stroke={isAsleep ? '#EF4444' : '#1e293b'}
              strokeWidth={1 + (vlpoActivity / 50)}
              markerEnd="url(#bar-red)"
            />
            <text x="240" y="152" fill={isAsleep ? '#ef4444' : '#334155'} className="font-mono text-[10px] font-bold">
              GABA -
            </text>

            {/* LH -> VLPO Reciprocal */}
            <path
              id="path-lh-to-vlpo"
              d="M 215 210 Q 270 215 305 170"
              fill="none"
              stroke={!isAsleep ? '#EF4444' : '#1e293b'}
              strokeWidth={1 + (lhActivity / 50)}
              markerEnd="url(#bar-red)"
            />
            <text x="250" y="230" fill={!isAsleep ? '#ef4444' : '#334155'} className="font-mono text-[10px] font-bold">
              Orexin -
            </text>

            {/* NODES */}
            {/* NODE A: SCN CIRCADIAN */}
            <g id="node-scn" transform="translate(130, 60)">
              <circle 
                r="28" 
                fill="#020617" 
                stroke={circSleepDrive < 0.5 ? '#F59E0B' : '#6366F1'} 
                strokeWidth="2"
                filter={circSleepDrive < 0.5 ? 'url(#glow-cyan)' : 'none'}
              />
              <circle r="3" fill={circSleepDrive < 0.5 ? '#F59E0B' : '#6366F1'} cx={Math.cos(currentPoint.time * Math.PI * 2 / params.circPeriod) * 17} cy={Math.sin(currentPoint.time * Math.PI * 2 / params.circPeriod) * 17} />
              <foreignObject x="-12" y="-12" width="24" height="24">
                <div className="flex items-center justify-center w-full h-full">
                  {circSleepDrive < 0.5 ? <Sun className="h-3.5 w-3.5 text-amber-500 animate-spin-slow" /> : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
                </div>
              </foreignObject>
              <text y="40" textAnchor="middle" fill="#94a3b8" className="font-bold text-[10px]">SCN Clock</text>
            </g>

            {/* NODE B: ADENOSINE INTEGRATOR */}
            <g id="node-adenosine" transform="translate(470, 60)">
              <rect 
                x="-24" 
                y="-26" 
                width="48" 
                height="52" 
                rx="4" 
                fill="#020617" 
                stroke="#3B82F6" 
                strokeWidth="2" 
              />
              <rect 
                x="-20" 
                y={22 - (44 * adenosine)} 
                width="40" 
                height={44 * adenosine} 
                rx="2" 
                fill="#3B82F6" 
                fillOpacity="0.4" 
              />
              <text y="38" textAnchor="middle" fill="#94a3b8" className="font-bold text-[10px]">Adenosine H</text>
            </g>

            {/* NODE C: VLPO SLEEP POPULATION */}
            <g id="node-vlpo" transform="translate(340, 150)">
              <circle 
                r="32" 
                fill="#020617" 
                stroke={isAsleep ? '#22D3EE' : '#1e293b'} 
                strokeWidth={isAsleep ? '3' : '1.5'} 
                filter={isAsleep ? 'url(#glow-cyan)' : 'none'}
              />
              <text y="4" textAnchor="middle" fill="#e2e8f0" className="font-bold text-[10px]">VLPO</text>
              <text y="42" textAnchor="middle" fill="#94a3b8" className="font-semibold text-[10px]">Sleep nucleus</text>
              <text y="52" textAnchor="middle" fill="#22D3EE" className="font-mono text-[9px] font-bold">{vlpoActivity.toFixed(0)} Hz</text>
            </g>

            {/* NODE D: LH WAKE POPULATION */}
            <g id="node-lh" transform="translate(170, 200)">
              <circle 
                r="32" 
                fill="#020617" 
                stroke={!isAsleep ? '#10B981' : '#1e293b'} 
                strokeWidth={!isAsleep ? '3' : '1.5'} 
                filter={!isAsleep ? 'url(#glow-cyan)' : 'none'}
              />
              <text y="4" textAnchor="middle" fill="#e2e8f0" className="font-bold text-[10px]">LH/Orexin/Serotonin</text>
              <text y="42" textAnchor="middle" fill="#94a3b8" className="font-semibold text-[10px]">Arousal / 5-HT Center</text>
              <text y="52" textAnchor="middle" fill="#10B981" className="font-mono text-[9px] font-bold">{lhActivity.toFixed(0)} Hz</text>
            </g>

            {/* CENTER GATING BADGE */}
            <rect x="245" y="10" width="110" height="22" rx="4" fill="#020617" stroke="#1e293b" strokeWidth="1" />
            <text x="300" y="24" textAnchor="middle" fill="#22D3EE" className="font-mono text-[9px] font-bold uppercase tracking-wider">
               GATING: {params.integrationMode}
            </text>
          </svg>
        </div>

        {/* Isolation Chamber Environment Toggle */}
        <div id="isolation-chamber-toggle-container" className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-slate-300">
              Photoreceptor Sync Environment
            </span>
            <span className="text-[10.5px] leading-snug text-slate-400 mt-1 font-sans">
              {params.lightStrength > 0 
                ? 'Solar feedback active: Natural solar daylight locks intrinsic SCN clock to 24h.' 
                : 'Isolation chamber: clock runs blind (free-running clock) with precession.'}
            </span>
          </div>
          <button
            id="btn-toggle-isolation-chamber"
            onClick={handleToggleLight}
            className={`cursor-pointer px-3.5 py-2 rounded text-[10px] font-bold font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 border shrink-0 ${
              params.lightStrength > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}
          >
            {params.lightStrength > 0 ? (
              <>
                <Sun className="h-3 w-3 animate-spin-slow text-amber-400" />
                Normal Light
              </>
            ) : (
              <>
                <Moon className="h-3 w-3 text-indigo-400 animate-pulse" />
                Free-Run (No Light)
              </>
            )}
          </button>
        </div>
      </div>

      {/* METRIC ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 bg-slate-950/40 p-3 md:p-4 rounded border border-slate-800/80">
        <div>
          <span className="text-[10px] text-slate-500 tracking-wider uppercase font-mono block">SCN Input (C)</span>
          <span className="font-mono text-xs md:text-sm font-bold text-amber-500 whitespace-nowrap">
            {(circSleepDrive * 100).toFixed(1)}% <span className="text-[10px] font-normal text-slate-500">{circSleepDrive > 0.5 ? '🌙' : '☀️'}</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 tracking-wider uppercase font-mono block">Sleep Pressure (H)</span>
          <span className="font-mono text-xs md:text-sm font-bold text-cyan-400 whitespace-nowrap">
            {(adenosine * 100).toFixed(1)}% <span className="text-[10px] font-normal text-slate-500">PA</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 tracking-wider uppercase font-mono block">Melatonin (M)</span>
          <span className="font-mono text-xs md:text-sm font-bold text-fuchsia-400 whitespace-nowrap flex items-center gap-1">
            {(melatonin * 100).toFixed(1)}% <Zap className="h-2.5 w-2.5 text-fuchsia-300 animate-pulse" />
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 tracking-wider uppercase font-mono block">Integration Status</span>
          <span className={`font-mono text-[9px] font-bold uppercase rounded block mt-0.5 py-0.5 text-center px-1 border ${
            isAsleep 
              ? 'bg-indigo-950/50 text-indigo-400 border-indigo-900/30' 
              : 'bg-emerald-950/50 text-emerald-400 border-emerald-900/30'
          }`}>
            {isAsleep ? 'VLPO ACTIVE' : 'LH OREXIN ACTIVE'}
          </span>
        </div>
      </div>
    </div>
  );
}
