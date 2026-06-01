import { SimPoint, SimParameters } from '../types';

function calculateSolarIntensity(timeOfDay: number, latitude: number, dayOfYear: number): number {
  const declinationRad = (23.44 * Math.PI / 180) * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);
  const latRad = (latitude * Math.PI) / 180;
  const hourAngle = (Math.PI / 12) * (timeOfDay - 12);
  const cosZenith = Math.sin(latRad) * Math.sin(declinationRad) + 
                    Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngle);
  return cosZenith > 0 ? cosZenith : 0.0;
}

interface TimeChartProps {
  history: SimPoint[];
  params: SimParameters;
}

export default function TimeChart({ history, params }: TimeChartProps) {
  const { highThreshold, lowThreshold, integrationMode } = params;

  // Configuration settings for SVGs
  const width = 1000;
  const height = 195;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 38;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const totalHistoryLength = history.length;
  if (totalHistoryLength === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 font-mono text-sm bg-slate-950/25 rounded border border-slate-800">
        Waiting for simulation data...
      </div>
    );
  }

  const latestTime = history[totalHistoryLength - 1].time;
  const minTimeToShow = Math.max(0, latestTime - 48); // Show rolling 48-hour window
  const maxTimeToShow = Math.max(48, latestTime);

  // Filter history to fit the current time frame
  const visibleHistory = history.filter(p => p.time >= minTimeToShow && p.time <= maxTimeToShow);

  if (visibleHistory.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-cyan-400 font-mono text-xs animate-pulse bg-slate-950/25 rounded border border-slate-800">
        Simulating initial baseline matrix...
      </div>
    );
  }

  // Maps a simulation hour to graph pixel X coordinate
  const mapTimeToX = (h: number) => {
    const fraction = (h - minTimeToShow) / (maxTimeToShow - minTimeToShow);
    return paddingLeft + fraction * chartW;
  };

  // Maps vertical value [0, 1] to chart pixel Y coordinate
  const mapValueToY = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    return paddingTop + (1 - clamped) * chartH;
  };

  // Maps neural firing rates [0, 100] to chart pixel Y coordinate
  const mapFiringRateToY = (hz: number) => {
    const frac = hz / 100;
    return paddingTop + (1 - frac) * chartH;
  };

  // 1. Generate Shaded Background Rectangles for Sleep/Wake states
  const stateBands: { start: number; end: number; isAsleep: boolean }[] = [];
  let currentBand = {
    start: visibleHistory[0].time,
    end: visibleHistory[0].time,
    isAsleep: visibleHistory[0].isAsleep,
  };

  for (let i = 1; i < visibleHistory.length; i++) {
    const p = visibleHistory[i];
    if (p.isAsleep === currentBand.isAsleep) {
      currentBand.end = p.time;
    } else {
      stateBands.push({ ...currentBand });
      currentBand = {
        start: p.time,
        end: p.time,
        isAsleep: p.isAsleep,
      };
    }
  }
  stateBands.push(currentBand);

  // 2. Build paths for Process H, SCN Drive, combined drive, melatonin, active photic input, and seasonal solar daylight profile
  let adenosinePath = '';
  let circadianPath = '';
  let driveCombinationPath = '';
  let lightPath = '';
  let solarPath = '';
  let melatoninPath = '';

  visibleHistory.forEach((p, idx) => {
    const sx = mapTimeToX(p.time);
    const syAdeno = mapValueToY(p.adenosine);
    const syCirc = mapValueToY(p.circSleepDrive);
    const syComb = mapValueToY(p.combinedSleepDrive);
    const syMelatonin = mapValueToY(p.melatonin || 0.0);
    
    // Dynamically calculate solar profile for the timeline based on the parameters
    const timeOfDay = p.time % 24;
    const baseSolar = params.lightStrength > 0 ? calculateSolarIntensity(timeOfDay, params.latitude, params.dayOfYear) : 0.0;
    let activeSolar = baseSolar;
    if (params.lightSourceMode === 'artificial') {
      const isDaytime = baseSolar > 0;
      const isAwake = !p.isAsleep;
      if (isDaytime && isAwake) {
        activeSolar = 1.0;
      } else {
        activeSolar = 0.0;
      }
    }

    // Plot the active photic input (like manually triggered light pulse overrides) above the baseline solar daylight in orange, avoiding duplicate overlapping curves.
    const finalLight = Math.max(0.0, p.lightIntensity - (p.solarIntensity || 0.0));

    // Scale high-amplitude pulses for appropriate chart vertical profile (fits nicely in bottom 30%)
    const syLight = mapValueToY(finalLight * 0.32);
    
    // Scale daylight profile to fit elegantly in the bottom 45% of the chart (so it sits as a beautiful background landscape)
    const sySolar = mapValueToY(activeSolar * 0.45);

    adenosinePath += `${idx === 0 ? 'M' : 'L'} ${sx} ${syAdeno}`;
    circadianPath += `${idx === 0 ? 'M' : 'L'} ${sx} ${syCirc}`;
    driveCombinationPath += `${idx === 0 ? 'M' : 'L'} ${sx} ${syComb}`;
    lightPath += `${idx === 0 ? 'M' : 'L'} ${sx} ${syLight}`;
    solarPath += `${idx === 0 ? 'M' : 'L'} ${sx} ${sySolar}`;
    melatoninPath += `${idx === 0 ? 'M' : 'L'} ${sx} ${syMelatonin}`;
  });

  const firstX = mapTimeToX(visibleHistory[0].time);
  const lastX = mapTimeToX(visibleHistory[visibleHistory.length - 1].time);
  const bottomY = mapValueToY(0);
  const lightAreaPath = `${lightPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  const solarAreaPath = `${solarPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

  // 3. Build paths for Neural firing rates (VLPO and LH) and superimposed solar daylight
  let vlpoPath = '';
  let lhPath = '';
  let solarFiringPath = '';

  visibleHistory.forEach((p, idx) => {
    const sx = mapTimeToX(p.time);
    const syVlpo = mapFiringRateToY(p.vlpoActivity);
    const syLh = mapFiringRateToY(p.lhActivity);
    
    // Calculate matching dynamic daylight for the neural timeline
    const timeOfDay = p.time % 24;
    const baseSolar = params.lightStrength > 0 ? calculateSolarIntensity(timeOfDay, params.latitude, params.dayOfYear) : 0.0;
    let activeSolar = baseSolar;
    if (params.lightSourceMode === 'artificial') {
      const isDaytime = baseSolar > 0;
      const isAwake = !p.isAsleep;
      if (isDaytime && isAwake) {
        activeSolar = 1.0;
      } else {
        activeSolar = 0.0;
      }
    }

    // Scale solar cycle elegantly to fit in the bottom 45% background (0-45 Hz equivalent) of the neural chart
    const sySolarFiring = mapFiringRateToY(activeSolar * 45);

    vlpoPath += `${idx === 0 ? 'M' : 'L'} ${sx} ${syVlpo}`;
    lhPath += `${idx === 0 ? 'M' : 'L'} ${sx} ${syLh}`;
    solarFiringPath += `${idx === 0 ? 'M' : 'L'} ${sx} ${sySolarFiring}`;
  });

  const bottomFiringY = mapFiringRateToY(0);
  const solarFiringAreaPath = `${solarFiringPath} L ${lastX} ${bottomFiringY} L ${firstX} ${bottomFiringY} Z`;

  // Grid tick lines on 6-hour increments
  const gridTicks: number[] = [];
  const tickStart = Math.ceil(minTimeToShow / 6) * 6;
  for (let t = tickStart; t <= maxTimeToShow; t += 6) {
    gridTicks.push(t);
  }

  // Hourly minor ticks on the bottom x-axis (excluding major 6-hour grids)
  const hourlyTicks: number[] = [];
  const hourlyStart = Math.ceil(minTimeToShow);
  for (let t = hourlyStart; t <= maxTimeToShow; t += 1) {
    if (t % 6 !== 0) {
      hourlyTicks.push(t);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in" id="time-charts-group">
      
      {/* CHART 1: PROCESS H AND PROCESS C OVER TIME */}
      <div 
        id="time-processes-chart" 
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Upper Level: Homeostatic & Circadian Waves
            </h4>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Tracks molecular clock triggers (C) and accumulation of adenosine (H) over a rolling 48-hour epoch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
              <span className="text-slate-350 font-mono text-[10px] uppercase font-bold tracking-wider">Adenosine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" />
              <span className="text-slate-350 font-mono text-[10px] uppercase font-bold tracking-wider">SCN Clock</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-fuchsia-400 inline-block" />
              <span className="text-slate-350 font-mono text-[10px] uppercase font-bold tracking-wider">Melatonin</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded bg-amber-500/25 border border-amber-400/40 inline-block" />
              <span className="text-slate-350 font-mono text-[10px] uppercase font-bold tracking-wider">☀ Active Photic Input</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded bg-cyan-500/10 border border-cyan-400/30 inline-block" />
              <span className="text-slate-350 font-mono text-[10px] uppercase font-bold tracking-wider">☀ Solar Daylight Profile</span>
            </div>
          </div>
        </div>

        {/* SVG Area */}
        <div className="overflow-x-auto scrollbar-hide">
          <svg 
            id="processes-timeline-svg" 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full min-w-[700px] h-auto font-mono text-[10px]"
          >
            <defs>
              <linearGradient id="light-gold-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="light-inactive-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="daylight-solar-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                <stop offset="50%" stopColor="#eab308" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* 1. Draw state backgrounds */}
            {stateBands.map((band, idx) => {
              const xStart = mapTimeToX(band.start);
              const xEnd = mapTimeToX(band.end);
              return (
                <rect
                  id={`band-${idx}`}
                  key={idx}
                  x={xStart}
                  y={paddingTop}
                  width={Math.max(0.1, xEnd - xStart)}
                  height={chartH}
                  fill={band.isAsleep ? '#3b82f6' : '#f59e0b'}
                  fillOpacity={band.isAsleep ? '0.1' : '0.015'}
                />
              );
            })}

            {/* Ambient solar daylight wave (geographically simulated) */}
            <path
              id="ambient-solar-daylight-wave"
              d={solarAreaPath}
              fill="url(#daylight-solar-grad)"
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeOpacity="0.30"
            />

            {/* Shaded golden/gray wave for Active Photic Input */}
            <path
              id="light-pulse-wave-shape"
              d={lightAreaPath}
              fill="url(#light-gold-grad)"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeOpacity="0.45"
              strokeDasharray="none"
            />

            {/* Hourly minor tick marks */}
            {hourlyTicks.map((tick) => {
              const tx = mapTimeToX(tick);
              const by = paddingTop + chartH;
              return (
                <line
                  key={`minor-h-${tick}`}
                  id={`minor-tick-${tick}`}
                  x1={tx}
                  y1={by}
                  x2={tx}
                  y2={by + 5}
                  stroke="#334155"
                  strokeWidth="1.2"
                />
              );
            })}

            {/* 2. Grid lines */}
            {gridTicks.map((tick) => {
              const tx = mapTimeToX(tick);
              const clockMinutes = Math.round((tick % 24) * 60);
              const hh = (Math.floor(clockMinutes / 60) % 24).toString().padStart(2, '0');
              const mm = (clockMinutes % 60).toString().padStart(2, '0');
              const timeString = `${hh}:${mm}`;
              const currentDay = Math.floor(tick / 24) + 1;
              const subtext = `Day ${currentDay} (${tick}h)`;

              return (
                <g key={tick} id={`grid-h-${tick}`}>
                  <line
                    x1={tx}
                    y1={paddingTop}
                    x2={tx}
                    y2={paddingTop + chartH}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2,3"
                  />
                  <text
                    x={tx}
                    y={paddingTop + chartH + 15}
                    textAnchor="middle"
                    fill="#38bdf8"
                    className="text-[12px] font-mono font-black"
                  >
                    {timeString}
                  </text>
                  <text
                    x={tx}
                    y={paddingTop + chartH + 26}
                    textAnchor="middle"
                    fill="#64748b"
                    className="text-[9.5px] font-mono font-bold"
                  >
                    {subtext}
                  </text>
                </g>
              );
            })}

            {/* Y Axis grid ticks */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((val) => {
              const ty = mapValueToY(val);
              return (
                <g key={val} id={`grid-y-${val}`}>
                  <line
                    x1={paddingLeft}
                    y1={ty}
                    x2={width - paddingRight}
                    y2={ty}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={ty + 3}
                    textAnchor="end"
                    fill="#94a3b8"
                    className="text-[11px] font-bold"
                  >
                    {val.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* 3. Threshold lines */}
            <line
              id="high-threshold-line-h"
              x1={paddingLeft}
              y1={mapValueToY(highThreshold)}
              x2={width - paddingRight}
              y2={mapValueToY(highThreshold)}
              stroke="#F43F5E"
              strokeWidth="1"
              strokeDasharray="3,3"
              strokeOpacity="0.75"
            />
            <text
              x={width - paddingRight - 10}
              y={mapValueToY(highThreshold) - 5}
              textAnchor="end"
              fill="#F43F5E"
              className="text-[11px] font-extrabold tracking-wider uppercase"
            >
              Sleep Limit ({highThreshold.toFixed(2)})
            </text>

            <line
              id="low-threshold-line-h"
              x1={paddingLeft}
              y1={mapValueToY(lowThreshold)}
              x2={width - paddingRight}
              y2={mapValueToY(lowThreshold)}
              stroke="#10B981"
              strokeWidth="1"
              strokeDasharray="3,3"
              strokeOpacity="0.75"
            />
            <text
              x={width - paddingRight - 10}
              y={mapValueToY(lowThreshold) + 12}
              textAnchor="end"
              fill="#10B981"
              className="text-[11px] font-extrabold tracking-wider uppercase"
            >
              Wake Limit ({lowThreshold.toFixed(2)})
            </text>

            {/* 4. Draw Lines */}
            <path
              id="line-circadian"
              d={circadianPath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
            />
            <path
              id="line-adenosine"
              d={adenosinePath}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="2"
            />
            <path
              id="line-melatonin"
              d={melatoninPath}
              fill="none"
              stroke="#E879F9"
              strokeWidth="2.5"
            />

            <path
              id="line-combined-drive"
              d={driveCombinationPath}
              fill="none"
              stroke="#6366F1"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />

            {/* Current point vertical marker */}
            <line
              x1={mapTimeToX(latestTime)}
              y1={paddingTop}
              x2={mapTimeToX(latestTime)}
              y2={paddingTop + chartH}
              stroke="#EC4899"
              strokeWidth="1.5"
              strokeDasharray="1,2"
            />
          </svg>
        </div>
      </div>

      {/* CHART 2: RECIPIENT MOTOR FIRING RATES */}
      <div 
        id="time-firing-chart" 
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Lower Level: VLPO & LH Action Potentials
            </h4>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Tracks Mutual blocking and switching dynamics between sleep cells and alertness cells.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-indigo-500 inline-block" />
              <span className="text-slate-350 font-mono text-[10px] uppercase font-bold tracking-wider">VLPO Sleep (Hz)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              <span className="text-slate-350 font-mono text-[10px] uppercase font-bold tracking-wider">LH/Orexin/Serotonin (Hz)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded bg-cyan-500/10 border border-cyan-400/30 inline-block" />
              <span className="text-slate-350 font-mono text-[10px] uppercase font-bold tracking-wider">☀ Superimposed Daylight</span>
            </div>
          </div>
        </div>

        {/* SVG Area */}
        <div className="overflow-x-auto scrollbar-hide">
          <svg 
            id="neurons-timeline-svg" 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full min-w-[700px] h-auto font-mono text-[10px]"
          >
            <defs>
              <linearGradient id="daylight-solar-firing-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
                <stop offset="50%" stopColor="#eab308" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Draw state backgrounds */}
            {stateBands.map((band, idx) => {
              const xStart = mapTimeToX(band.start);
              const xEnd = mapTimeToX(band.end);
              return (
                <rect
                  id={`neuro-band-${idx}`}
                  key={idx}
                  x={xStart}
                  y={paddingTop}
                  width={Math.max(0.1, xEnd - xStart)}
                  height={chartH}
                  fill={band.isAsleep ? '#3b82f6' : '#f59e0b'}
                  fillOpacity={band.isAsleep ? '0.1' : '0.015'}
                />
              );
            })}

            {/* Ambient solar daylight wave superimposed (geographically simulated) */}
            <path
              id="ambient-solar-daylight-wave-firing"
              d={solarFiringAreaPath}
              fill="url(#daylight-solar-firing-grad)"
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />

            {/* Hourly minor tick marks */}
            {hourlyTicks.map((tick) => {
              const tx = mapTimeToX(tick);
              const by = paddingTop + chartH;
              return (
                <line
                  key={`minor-f-${tick}`}
                  id={`minor-firing-tick-${tick}`}
                  x1={tx}
                  y1={by}
                  x2={tx}
                  y2={by + 5}
                  stroke="#334155"
                  strokeWidth="1.2"
                />
              );
            })}

            {/* Grid lines */}
            {gridTicks.map((tick) => {
              const tx = mapTimeToX(tick);
              const clockMinutes = Math.round((tick % 24) * 60);
              const hh = (Math.floor(clockMinutes / 60) % 24).toString().padStart(2, '0');
              const mm = (clockMinutes % 60).toString().padStart(2, '0');
              const timeString = `${hh}:${mm}`;
              const currentDay = Math.floor(tick / 24) + 1;
              const subtext = `Day ${currentDay} (${tick}h)`;

              return (
                <g key={tick} id={`grid-f-${tick}`}>
                  <line
                    x1={tx}
                    y1={paddingTop}
                    x2={tx}
                    y2={paddingTop + chartH}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2,3"
                  />
                  <text
                    x={tx}
                    y={paddingTop + chartH + 15}
                    textAnchor="middle"
                    fill="#38bdf8"
                    className="text-[12px] font-mono font-black"
                  >
                    {timeString}
                  </text>
                  <text
                    x={tx}
                    y={paddingTop + chartH + 26}
                    textAnchor="middle"
                    fill="#64748b"
                    className="text-[9.5px] font-mono font-bold"
                  >
                    {subtext}
                  </text>
                </g>
              );
            })}

            {/* Y Axis Grid Tick Lines */}
            {[0, 25, 50, 75, 100].map((val) => {
              const ty = mapFiringRateToY(val);
              return (
                <g key={val} id={`grid-fr-${val}`}>
                  <line
                    x1={paddingLeft}
                    y1={ty}
                    x2={width - paddingRight}
                    y2={ty}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={ty + 3}
                    textAnchor="end"
                    fill="#94a3b8"
                    className="text-[11px] font-bold"
                  >
                    {val} HZ
                  </text>
                </g>
              );
            })}

            {/* Draw Lines */}
            <path
              id="line-lh"
              d={lhPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
            />
            <path
              id="line-vlpo"
              d={vlpoPath}
              fill="none"
              stroke="#6366F1"
              strokeWidth="2"
            />

            {/* Current point vertical marker */}
            <line
              x1={mapTimeToX(latestTime)}
              y1={paddingTop}
              x2={mapTimeToX(latestTime)}
              y2={paddingTop + chartH}
              stroke="#EC4899"
              strokeWidth="1.5"
              strokeDasharray="1,2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
