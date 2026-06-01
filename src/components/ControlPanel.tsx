import { Sliders, Play, Pause, RotateCcw, Zap, Sun, Moon } from 'lucide-react';
import { SimParameters, IntegrationMode } from '../types';

export function formatTimeOfDay(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60);
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minStr = minutes.toString().padStart(2, '0');
  const hourStr = hours24.toString().padStart(2, '0');
  return `${hours12}:${minStr} ${period} (${hourStr.padStart(2, '0')}:${minStr})`;
}

const formatLatitude = (lat: number) => {
  if (lat === 0) return '0° (Equator)';
  return lat > 0 ? `${lat.toFixed(0)}° N` : `${Math.abs(lat).toFixed(0)}° S`;
};

const getDayLabel = (doy: number) => {
  const monthDays = [
    { name: 'Jan', days: 31 },
    { name: 'Feb', days: 28 },
    { name: 'Mar', days: 31 },
    { name: 'Apr', days: 30 },
    { name: 'May', days: 31 },
    { name: 'Jun', days: 30 },
    { name: 'Jul', days: 31 },
    { name: 'Aug', days: 31 },
    { name: 'Sep', days: 30 },
    { name: 'Oct', days: 31 },
    { name: 'Nov', days: 30 },
    { name: 'Dec', days: 31 }
  ];
  let remaining = doy;
  for (const item of monthDays) {
    if (remaining <= item.days) {
      return `${item.name} ${remaining}`;
    }
    remaining -= item.days;
  }
  return `Dec 31`;
};

const getSeasonLabel = (doy: number, lat: number) => {
  const isNorthern = lat >= 0;
  if (doy >= 79 && doy < 172) {
    return isNorthern ? 'Spring' : 'Autumn';
  } else if (doy >= 172 && doy < 265) {
    return isNorthern ? 'Summer' : 'Winter';
  } else if (doy >= 265 && doy < 355) {
    return isNorthern ? 'Autumn' : 'Spring';
  } else {
    return isNorthern ? 'Winter' : 'Summer';
  }
};

export function KineticControllers({
  isPlaying,
  onTogglePlay,
  simSpeed,
  onChangeSimSpeed,
  onReset,
  onTriggerLightPulse,
  schedWakeEnabled,
  onToggleSchedWake,
  schedWakeTime,
  onChangeSchedWakeTime,
  schedWakeWithLight,
  onToggleSchedWakeWithLight,
  schedSleepEnabled,
  onToggleSchedSleep,
  schedSleepTime,
  onChangeSchedSleepTime,
}: {
  isPlaying: boolean;
  onTogglePlay: () => void;
  simSpeed: number;
  onChangeSimSpeed: (speed: number) => void;
  onReset: () => void;
  onTriggerLightPulse: () => void;
  schedWakeEnabled: boolean;
  onToggleSchedWake: (enabled: boolean) => void;
  schedWakeTime: number;
  onChangeSchedWakeTime: (time: number) => void;
  schedWakeWithLight: boolean;
  onToggleSchedWakeWithLight: (enabled: boolean) => void;
  schedSleepEnabled: boolean;
  onToggleSchedSleep: (enabled: boolean) => void;
  schedSleepTime: number;
  onChangeSchedSleepTime: (time: number) => void;
}) {
  return (
    <div id="kinetic-controllers-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            1. Kinetic Engine Controllers
          </h3>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">
            Direct real-time simulation controls for the sleep/wake differential and photic gating matrix.
          </p>
        </div>

        {/* Speed Adjustment */}
        <div className="flex items-center gap-3 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Warp Factor:</span>
          <div className="flex gap-1" id="speed-selectors">
            {[
              { label: '0.2x', val: 0.2, title: 'Slow-motion step analysis' },
              { label: '1.0x', val: 1.0, title: 'Normal velocity (Default)' },
              { label: '5.0x', val: 5.0, title: 'Warp speed' },
              { label: '24.0x', val: 24.0, title: 'Full 24h orbital rotation' },
            ].map((speed) => (
              <button
                key={speed.val}
                type="button"
                onClick={() => onChangeSimSpeed(speed.val)}
                className={`px-2 py-1 rounded text-[9.5px] font-mono font-bold transition-all uppercase cursor-pointer ${
                  simSpeed === speed.val
                    ? 'bg-cyan-500 text-slate-950 shadow-inner font-black'
                    : 'text-slate-400 hover:text-slate-200 bg-transparent'
                }`}
                title={speed.title}
              >
                {speed.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          id="play-pause-btn"
          type="button"
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
              : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black'
          }`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? 'Pause ODE' : 'Resume ODE'}
        </button>

        <button
          id="reset-simulation-btn"
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg font-sans text-xs font-bold uppercase tracking-wider bg-slate-950 hover:bg-slate-850 text-slate-350 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
          title="Reset parameters to clinical human baseline"
        >
          <RotateCcw className="h-4 w-4" />
          Reset State
        </button>

        <button
          id="trigger-light-pulse-btn"
          type="button"
          onClick={onTriggerLightPulse}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg font-sans text-xs font-bold uppercase tracking-wider bg-amber-950/80 hover:bg-amber-900/40 text-amber-300 border border-amber-500/35 transition-all cursor-pointer"
          title="Deliver a 5-minute square pulse of bright light to the circadian SCN matrix"
        >
          <Sun className="h-4 w-4 text-amber-100 animate-pulse" />
          Pulse Light (5m)
        </button>
      </div>

      {/* Sleep-Wake Event Scheduler Section */}
      <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-3">
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-cyan-400" />
            Clinical Sleep-Wake Event Scheduler
          </h4>
          <p className="text-[10px] text-slate-500 font-sans">
            Specify times of day to trigger threshold overrides. Activating triggers will be ignored if the node is already in the target state.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Wake Event */}
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={schedWakeEnabled}
                  onChange={(e) => onToggleSchedWake(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/20 h-3.5 w-3.5 cursor-pointer accent-cyan-500"
                />
                <span className="text-[11px] font-bold text-slate-300 font-sans">Scheduled Force Wake</span>
              </label>
              <span className={`text-[9px] font-mono tracking-wider font-bold uppercase px-1.5 py-0.5 rounded border ${
                schedWakeEnabled 
                  ? 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20' 
                  : 'text-slate-500 border-slate-800 bg-slate-905/30'
              }`}>
                {schedWakeEnabled ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            {schedWakeEnabled && (
              <div className="flex items-center gap-2 pl-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={schedWakeWithLight}
                    onChange={(e) => onToggleSchedWakeWithLight(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500/20 h-3 w-3 cursor-pointer accent-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                    <Sun className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    Trigger with therapeutic light pulse (30m)
                  </span>
                </label>
              </div>
            )}
            
            <div className="space-y-1 font-sans">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Trigger Time:</span>
                <span className={`font-bold ${schedWakeEnabled ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {formatTimeOfDay(schedWakeTime)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.25"
                disabled={!schedWakeEnabled}
                value={schedWakeTime}
                onChange={(e) => onChangeSchedWakeTime(parseFloat(e.target.value))}
                className={`w-full h-1 rounded-full appearance-none cursor-pointer transition-colors ${
                  schedWakeEnabled ? 'accent-cyan-500 bg-slate-800' : 'accent-slate-600 bg-slate-950/80'
                }`}
              />
            </div>
          </div>

          {/* Scheduled Sleep Event */}
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={schedSleepEnabled}
                  onChange={(e) => onToggleSchedSleep(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500/20 h-3.5 w-3.5 cursor-pointer accent-indigo-500"
                />
                <span className="text-[11px] font-bold text-slate-300 font-sans">Scheduled Force Sleep</span>
              </label>
              <span className={`text-[9px] font-mono tracking-wider font-bold uppercase px-1.5 py-0.5 rounded border ${
                schedSleepEnabled 
                  ? 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20' 
                  : 'text-slate-500 border-slate-800 bg-slate-905/30'
              }`}>
                {schedSleepEnabled ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            
            <div className="space-y-1 font-sans">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Trigger Time:</span>
                <span className={`font-bold ${schedSleepEnabled ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {formatTimeOfDay(schedSleepTime)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.25"
                disabled={!schedSleepEnabled}
                value={schedSleepTime}
                onChange={(e) => onChangeSchedSleepTime(parseFloat(e.target.value))}
                className={`w-full h-1 rounded-full appearance-none cursor-pointer transition-colors ${
                  schedSleepEnabled ? 'accent-indigo-500 bg-slate-800' : 'accent-slate-600 bg-slate-950/80'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PathologyScenarios({
  activeScenario,
  onApplyScenario,
}: {
  activeScenario: string;
  onApplyScenario: (scenarioName: string) => void;
}) {
  return (
    <div id="pathology-scenarios-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block font-mono flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          Molecular Pathologies & Clinical Presets
        </h3>
        <p className="text-[11px] text-slate-400 font-sans mb-3 leading-relaxed">
          Select or inject an experimental biological clinical scenario of the biological clock:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="scenarios-grid">
          {[
            { id: 'balanced', name: 'Entrained 24h Cycle', desc: 'Daily light pulse locks molecular clock to 24.0h cycle.' },
            { id: 'freerun', name: 'Free-Running Blind', desc: 'Clock is blind; sleep phase slides against solar dawn.' },
            { id: 'allnighter', name: 'All-Nighter Deprivation', desc: 'Sleep blocked for next 15 simulated hours.' },
            { id: 'scnlesion', name: 'SCN Lesion (Clock Flat)', desc: 'SCN ablated. Transitions fall into arhythmic fragments.' },
            { id: 'insomnia', name: 'Arousal Insomnia', desc: 'Orexin hypersensitivity triggers truncated sleep epochs.' },
            { id: 'narcolepsy', name: 'Orexin Narcolepsy', desc: 'Fragile bistable switch stability; volatile sleep bouts.' },
          ].map((scen) => (
            <button
              key={scen.id}
              type="button"
              onClick={() => onApplyScenario(scen.id)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                activeScenario === scen.id
                  ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md font-medium'
                  : 'bg-slate-950/40 hover:bg-slate-950/70 border-slate-800/80 hover:border-slate-700/80'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-200 flex items-center justify-between w-full">
                <span>{scen.name}</span>
                {activeScenario === scen.id && (
                  <span className="text-[9px] font-mono tracking-widest text-cyan-400 uppercase bg-cyan-950/60 border border-cyan-500/30 px-1 rounded font-black">ACTIVE</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 leading-snug">{scen.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AmbientLightToggle({
  params,
  onChangeParams,
}: {
  params: SimParameters;
  onChangeParams: (newParams: SimParameters) => void;
}) {
  const handleSliderChange = (key: keyof SimParameters, val: any) => {
    onChangeParams({
      ...params,
      [key]: val,
    });
  };

  return (
    <div id="ambient-light-mode-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="space-y-3 font-sans">
        <span className="text-xs font-bold text-slate-400 block uppercase tracking-widest font-mono flex items-center gap-1.5">
          <Sun className="h-4 w-4 text-cyan-400 animate-pulse" />
          Ambient Photic Environment Selection
        </span>
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800" id="light-source-mode-buttons">
          <button
            id="light-mode-natural"
            type="button"
            onClick={() => handleSliderChange('lightSourceMode', 'natural')}
            className={`py-2 px-4 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              (params.lightSourceMode || 'natural') === 'natural'
                ? 'bg-cyan-500 text-slate-950 shadow-inner font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-medium'
            }`}
          >
            <Sun className="h-4 w-4" />
            Natural Solar
          </button>
          <button
            id="light-mode-artificial"
            type="button"
            onClick={() => handleSliderChange('lightSourceMode', 'artificial')}
            className={`py-2 px-4 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              params.lightSourceMode === 'artificial'
                ? 'bg-amber-500 text-slate-950 shadow-inner font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-medium'
            }`}
          >
            <Zap className="h-4 w-4" />
            Artificial Indoor
          </button>
        </div>
        <p className="text-[11px] text-slate-400 block leading-relaxed bg-slate-950/45 p-3 rounded-lg border border-slate-800/80">
          {(params.lightSourceMode || 'natural') === 'natural'
            ? '✓ Simulated outdoor astronomical environment: Solar irradiance dynamically waxes/wanes, tracking geographical curves and sunset events calculated using Earth Latitude and Day of Year.'
            : '✓ Synthetic indoor photic gating: Daylight remains at full 100% intensity when awake and active. During experimental "Force Wake (Dark)" sleep deprivation protocols, the photic sensor is custom blocked (0%).'}
        </p>
      </div>
    </div>
  );
}

export function ModelParameters({
  params,
  onChangeParams,
}: {
  params: SimParameters;
  onChangeParams: (newParams: SimParameters) => void;
}) {
  const handleSliderChange = (key: keyof SimParameters, val: any) => {
    onChangeParams({
      ...params,
      [key]: val,
    });
  };

  const handleModeChange = (mode: IntegrationMode) => {
    onChangeParams({
      ...params,
      integrationMode: mode,
    });
  };

  return (
    <div id="model-parameters-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-mono flex items-center gap-1.5">
        <Sliders className="h-3.5 w-3.5 text-cyan-400" />
        Molecular Constants & Gating Logic
      </h3>

      {/* Integration Mode Switcher */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">
          VLPO Postsynaptic Receptors
        </label>
        <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800" id="integration-mode-buttons">
          {(['sum', 'and', 'triple', 'product', 'or'] as IntegrationMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleModeChange(mode)}
              className={`py-1 rounded text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                params.integrationMode === mode
                  ? 'bg-cyan-505 bg-cyan-500 text-slate-950 shadow-inner font-black'
                  : 'text-slate-500 hover:text-slate-350 hover:bg-slate-900/60'
              }`}
              title={`Integrate Processes via ${mode.toUpperCase()} operations`}
            >
              {mode}
            </button>
          ))}
        </div>
        <span className="text-[10.5px] text-slate-400 leading-normal block font-sans">
          {params.integrationMode === 'sum' && '✓ Biologically Accurate: Membrane currents sum additively.'}
          {params.integrationMode === 'and' && '⚠ Gate lockout: Highly restrictive dual coincident thresholds.'}
          {params.integrationMode === 'triple' && '✓ Triple Gating: SCN Sleep Drive + Adenosine + Melatonin.'}
          {params.integrationMode === 'product' && '✓ Synergistic contours: High C compensates for H pressure.'}
          {params.integrationMode === 'or' && '⚠ High fragility: Either threshold triggers flip.'}
        </span>
      </div>

      <div className="border-t border-slate-800/80 pt-3.5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Circadian Period slider */}
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">SCN Cycle Period (tau_C)</span>
            <span className="text-amber-400 font-bold">{params.circPeriod.toFixed(1)}h</span>
          </div>
          <input
            id="slider-circPeriod"
            type="range"
            min="18"
            max="30"
            step="0.5"
            value={params.circPeriod}
            onChange={(e) => handleSliderChange('circPeriod', parseFloat(e.target.value))}
            className="w-full accent-amber-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Adenosine Rise slider */}
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Adenosine Buildup (tau_rise)</span>
            <span className="text-cyan-400 font-bold">{params.tauRise.toFixed(1)}h</span>
          </div>
          <input
            id="slider-tauRise"
            type="range"
            min="8"
            max="28"
            step="0.5"
            value={params.tauRise}
            onChange={(e) => handleSliderChange('tauRise', parseFloat(e.target.value))}
            className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Adenosine Decay slider */}
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-450 text-slate-400">Glymphatic Decay (tau_decay)</span>
            <span className="text-blue-400 font-bold">{params.tauDecay.toFixed(1)}h</span>
          </div>
          <input
            id="slider-tauDecay"
            type="range"
            min="3"
            max="18"
            step="0.5"
            value={params.tauDecay}
            onChange={(e) => handleSliderChange('tauDecay', parseFloat(e.target.value))}
            className="w-full accent-blue-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* High threshold slider */}
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Sleep Onset Threshold (Hi)</span>
            <span className="text-rose-400 font-bold">{params.highThreshold.toFixed(2)}</span>
          </div>
          <input
            id="slider-highThreshold"
            type="range"
            min="0.5"
            max="0.85"
            step="0.01"
            value={params.highThreshold}
            onChange={(e) => handleSliderChange('highThreshold', parseFloat(e.target.value))}
            className="w-full accent-rose-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Low threshold slider */}
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Wake Onset Threshold (Lo)</span>
            <span className="text-emerald-400 font-bold">{params.lowThreshold.toFixed(2)}</span>
          </div>
          <input
            id="slider-lowThreshold"
            type="range"
            min="0.15"
            max="0.45"
            step="0.01"
            value={params.lowThreshold}
            onChange={(e) => handleSliderChange('lowThreshold', parseFloat(e.target.value))}
            className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Light Strength */}
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Ambient Light Strength</span>
            <span className="text-amber-400 font-bold">{params.lightStrength.toFixed(2)}</span>
          </div>
          <input
            id="slider-lightStrength"
            type="range"
            min="0.00"
            max="1.00"
            step="0.05"
            value={params.lightStrength}
            onChange={(e) => handleSliderChange('lightStrength', parseFloat(e.target.value))}
            className="w-full accent-amber-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Latitude Slider */}
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Earth Latitude</span>
            <span className="text-cyan-400 font-bold">{formatLatitude(params.latitude ?? 40.0)}</span>
          </div>
          <input
            id="slider-latitude"
            type="range"
            min="-90"
            max="90"
            step="2"
            value={params.latitude ?? 40.0}
            onChange={(e) => handleSliderChange('latitude', parseFloat(e.target.value))}
            className="w-full accent-cyan-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Time of Year Selector */}
        <div className="space-y-1.5 font-sans">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Solar Season / Day</span>
            <span className="text-emerald-400 font-bold">
              {getDayLabel(params.dayOfYear ?? 172)} ({getSeasonLabel(params.dayOfYear ?? 172, params.latitude ?? 40.0)})
            </span>
          </div>
          <input
            id="slider-dayOfYear"
            type="range"
            min="1"
            max="365"
            step="5"
            value={params.dayOfYear ?? 172}
            onChange={(e) => handleSliderChange('dayOfYear', parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

// Keep a default export that wraps all modular sub-sections in a clean standard layout for backward compatibility
export default function ControlPanel({
  params,
  onChangeParams,
  isPlaying,
  onTogglePlay,
  simSpeed,
  onChangeSimSpeed,
  onReset,
  onApplyScenario,
  activeScenario,
  onTriggerLightPulse,
  schedWakeEnabled,
  onToggleSchedWake,
  schedWakeTime,
  onChangeSchedWakeTime,
  schedWakeWithLight,
  onToggleSchedWakeWithLight,
  schedSleepEnabled,
  onToggleSchedSleep,
  schedSleepTime,
  onChangeSchedSleepTime,
}: any) {
  return (
    <div id="control-panel-fallback" className="space-y-6">
      <KineticControllers
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        simSpeed={simSpeed}
        onChangeSimSpeed={onChangeSimSpeed}
        onReset={onReset}
        onTriggerLightPulse={onTriggerLightPulse}
        schedWakeEnabled={schedWakeEnabled}
        onToggleSchedWake={onToggleSchedWake}
        schedWakeTime={schedWakeTime}
        onChangeSchedWakeTime={onChangeSchedWakeTime}
        schedWakeWithLight={schedWakeWithLight}
        onToggleSchedWakeWithLight={onToggleSchedWakeWithLight}
        schedSleepEnabled={schedSleepEnabled}
        onToggleSchedSleep={onToggleSchedSleep}
        schedSleepTime={schedSleepTime}
        onChangeSchedSleepTime={onChangeSchedSleepTime}
      />
      <AmbientLightToggle
        params={params}
        onChangeParams={onChangeParams}
      />
      <PathologyScenarios
        activeScenario={activeScenario}
        onApplyScenario={onApplyScenario}
      />
      <ModelParameters
        params={params}
        onChangeParams={onChangeParams}
      />
    </div>
  );
}
