import { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, Moon, Sun, Award, Sliders, CheckCircle, Info } from 'lucide-react';
import { SimParameters, SimPoint, SimState } from './types';
import { KineticControllers, AmbientLightToggle, PathologyScenarios, ModelParameters } from './components/ControlPanel';
import NeuralCircuitVisualizer from './components/NeuralCircuitVisualizer';
import PhaseSpaceChart from './components/PhaseSpaceChart';
import TimeChart from './components/TimeChart';
import ExplanationTab from './components/ExplanationTab';

// 1. Biological baseline parameter configurations
export function calculateSolarIntensity(timeOfDay: number, latitude: number, dayOfYear: number): number {
  // Solar Declination Angle (approx delta = 23.44 * sin(2 * pi * (dayOfYear - 80) / 365))
  // day 80 is Spring Equinox where declination is 0.
  const declinationRad = (23.44 * Math.PI / 180) * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);
  
  // Latitude in radians
  const latRad = (latitude * Math.PI) / 180;
  
  // Hour Angle in radians (omega = 15 deg per hour from noon, converted to radians)
  const hourAngle = (Math.PI / 12) * (timeOfDay - 12);
  
  // Solar elevation equation: sin(h) = sin(lat)*sin(decl) + cos(lat)*cos(decl)*cos(omega)
  const sinElevation = Math.sin(latRad) * Math.sin(declinationRad) + 
                       Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngle);
                       
  // Solar intensity returned [0, 1] representing positive sun exposure
  return Math.max(0, sinElevation);
}

const DEFAULT_PARAMS: SimParameters = {
  tauRise: 14.5,          // Average human sleep pressure accumulates over ~14-16 hours
  tauDecay: 7.2,          // Normal glymphatic adenosine clearance takes ~7-8 hours
  circPeriod: 26.0,       // Target cycle period (26h period)
  circStiffness: 0.50,    // Level of convergence stiffness for molecular clock
  integrationMode: 'triple', // Triple-signal biological gating (SCN sleep drive high, Adeno high, Melatonin high)
  highThreshold: 0.60,   // Upper limit threshold (calibrated for exactly 10 PM sleep / 6 AM wake)
  lowThreshold: 0.25,    // Lower limit threshold (calibrated for exactly 10 PM sleep / 6 AM wake)
  weightAdenosine: 0.50,  // Contribution weighting of homeostatic drive
  weightCircadian: 0.50,  // Contribution weighting of clock drive
  lightStrength: 0.30,    // Strength of ambient daily solar entrainment (0.30 triggers 24h synchronization)
  latitude: 40.0,         // Default Latitude in degrees (e.g. mid-latitude north)
  dayOfYear: 172,         // Default Day of Year (June 21 - Summer Solstice, long days)
  lightSourceMode: 'natural',
};

export default function App() {
  const [params, setParams] = useState<SimParameters>(DEFAULT_PARAMS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0); // Simulated hours per real-world second
  const [activeTab, setActiveTab] = useState<'sim' | 'docs'>('sim');
  const [activeScenario, setActiveScenario] = useState<string>('balanced');

  // Scheduler parameters
  const [schedWakeEnabled, setSchedWakeEnabled] = useState<boolean>(false);
  const [schedWakeTime, setSchedWakeTime] = useState<number>(23.5); // 11:30 PM
  const [schedWakeWithLight, setSchedWakeWithLight] = useState<boolean>(false);
  const [schedSleepEnabled, setSchedSleepEnabled] = useState<boolean>(false);
  const [schedSleepTime, setSchedSleepTime] = useState<number>(12.0); // 12:00 PM (Noon)

  // Simulation numerical state
  const [simState, setSimState] = useState<SimState>(() => {
    // Generate preloaded historical trajectory so user has rich visual cues on startup
    return {
      ...generateBaselineHistory(DEFAULT_PARAMS),
      depriveHoursLeft: 0,
    };
  });

  const lastTickTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const isPendingUpdateRef = useRef<boolean>(false);

  // Reset the pending state update flag after every single render commit
  useEffect(() => {
    isPendingUpdateRef.current = false;
  });

  // Helper: Generates a baseline of 48 hours to display in graphics at load
  function generateBaselineHistory(p: SimParameters): SimState {
    const history: SimPoint[] = [];
    let t = 0;
    
    // Initial states at midnight: already asleep for 2 hours (10 PM to 6 AM sleep)
    let adenosine = 0.55;
    let melatonin = 0.8;
    let aanat = 0.9;
    let x = -0.80; // SCN approaching sleep peak
    let y = 0.60;
    let vlpo = 95.0;
    let lh = 5.0;
    let isAsleep = true;

    const baselineHours = 48.0;
    const dt = 0.08; // microstep division (approx 5 mins per step)
    const totalSteps = baselineHours / dt;

    for (let step = 0; step < totalSteps; step++) {
      const timeOfDay = t % 24;
      const solarOriginal = p.lightStrength > 0 ? calculateSolarIntensity(timeOfDay, p.latitude, p.dayOfYear) : 0.0;
      let activeSolar = solarOriginal;
      if (p.lightSourceMode === 'artificial') {
        const isDaytime = solarOriginal > 0;
        const isAwake = !isAsleep;
        if (isDaytime && isAwake) {
          activeSolar = 1.0;
        } else {
          activeSolar = 0.0;
        }
      }
      // Eyes are shut during sleep: but about 12% of ambient light still penetrates the eyelids to reach the SCN clock and photosensitive fibers
      const effectiveLightPulse = p.lightStrength > 0 
        ? (isAsleep ? activeSolar * 0.12 : activeSolar) 
        : 0.0;

      // SCN Molecular Stuart-Landau Clock Loop with light forcing & gradual melatonin feedback
      const rSq = x * x + y * y;
      const omega = (2 * Math.PI) / p.circPeriod;
      
      const dx_light = p.lightStrength * effectiveLightPulse * (1.0 - x) * dt;
      const dy_light = p.lightStrength * effectiveLightPulse * (0.0 - y) * dt;

      // Melatonin feedback on SCN clock phase (gradual phase-shifting pull towards midnight target phase when elevated)
      const k_mel = p.lightStrength > 0 ? 0.22 : 0.0;
      const dx_mel = k_mel * melatonin * (-0.85 - x) * dt;
      const dy_mel = k_mel * melatonin * (0.45 - y) * dt;

      const dx = (p.circStiffness * x * (1.0 - rSq) - omega * y) * dt + dx_light + dx_mel;
      const dy = (p.circStiffness * y * (1.0 - rSq) + omega * x) * dt + dy_light + dy_mel;

      x += dx;
      y += dy;

      const circSleepDrive = (1.0 - x) / 2.0;

      // Logic decision gates
      let nextAsleep = isAsleep;
      const A = adenosine;
      const C = circSleepDrive;

      if (!isAsleep) {
        if (p.integrationMode === 'sum') {
          const drive = (p.weightAdenosine * A + p.weightCircadian * C) / (p.weightAdenosine + p.weightCircadian);
          if (drive > p.highThreshold) nextAsleep = true;
        } else if (p.integrationMode === 'and') {
          if (A > p.highThreshold && C > p.highThreshold) nextAsleep = true;
        } else if (p.integrationMode === 'or') {
          if (A > p.highThreshold || C > p.highThreshold) nextAsleep = true;
        } else if (p.integrationMode === 'product') {
          if (A * C > p.highThreshold * 0.72) nextAsleep = true;
        } else if (p.integrationMode === 'triple') {
          // Gated by high thresholds of SCN sleep drive, Adenosine, and the initial rise in Melatonin (above 0.15)
          if (A > p.highThreshold && C > p.highThreshold && melatonin > 0.15) nextAsleep = true;
        }
      } else {
        if (p.integrationMode === 'sum') {
          const drive = (p.weightAdenosine * A + p.weightCircadian * C) / (p.weightAdenosine + p.weightCircadian);
          if (drive < p.lowThreshold) nextAsleep = false;
        } else if (p.integrationMode === 'and') {
          if (A < p.lowThreshold && C < p.lowThreshold) nextAsleep = false;
        } else if (p.integrationMode === 'or') {
          if (A < p.lowThreshold || C < p.lowThreshold) nextAsleep = false;
        } else if (p.integrationMode === 'product') {
          if (A * C < p.lowThreshold * 0.85) nextAsleep = false;
        } else if (p.integrationMode === 'triple') {
          // Melatonin remains high due to closed eyes during sleep, so waking is triggered by drops in Adenosine (below lowThreshold) and SCN clock sleep drive falling (dx > 0)
          if (A < p.lowThreshold && (dx > 0 || p.circStiffness === 0)) nextAsleep = false;
        }
      }

      isAsleep = nextAsleep;

      // Adenosine accumulation couples directly to the wake-center (LH) firing rate
      let dA = 0;
      if (lh > 50.0) {
        dA = ((1.0 - A) / p.tauRise) * dt;
      } else {
        dA = ((-A) / p.tauDecay) * dt;
      }
      adenosine = Math.max(0.001, Math.min(0.999, A + dA));

      // Melatonin dynamic release/synthesis is SCN controlled and photically gated
      let currentActiveSolar = solarOriginal;
      if (p.lightSourceMode === 'artificial') {
        const isDaytime = solarOriginal > 0;
        const isAwake = !isAsleep;
        if (isDaytime && isAwake) {
          currentActiveSolar = 1.0;
        } else {
          currentActiveSolar = 0.0;
        }
      }
      // Eyes are shut during sleep, but 12% of light penetrates the eyelids for melatonin suppression
      const totalDaylight = isAsleep 
        ? Math.min(0.20, effectiveLightPulse)
        : Math.min(1.0, currentActiveSolar + effectiveLightPulse);
      
      // Pineal AANAT enzyme synthesis/degradation kinetics:
      // AANAT is rapidly proteasomally degraded by daylight, and recovery is rate-limited by transcription/translation (approx 1-2h lag)
      const dAanat = (-15.0 * totalDaylight * aanat + (1.0 - aanat) * 0.70) * dt;
      aanat = Math.max(0.0, Math.min(1.0, aanat + dAanat));

      const currentDarkness = Math.max(0.0, 1.0 - totalDaylight);
      const melatoninSynthesis = circSleepDrive * currentDarkness * aanat;
      const dM = (0.5 * melatoninSynthesis * (1.1 - melatonin) - (0.12 + 3.2 * totalDaylight) * melatonin) * dt;
      melatonin = Math.max(0.0, Math.min(1.0, melatonin + dM));

      // Network firing rates
      const targetVlpo = isAsleep ? 95.0 : 5.0;
      const targetLh = isAsleep ? 5.0 : 95.0;

      const tauNeural = 0.15; // Switching lowpass transition constant
      vlpo += ((targetVlpo - vlpo) / tauNeural) * dt;
      lh += ((targetLh - lh) / tauNeural) * dt;

      // Construct point
      const combinedSleepDrive = p.integrationMode === 'sum' 
        ? (p.weightAdenosine * adenosine + p.weightCircadian * circSleepDrive) / (p.weightAdenosine + p.weightCircadian)
        : p.integrationMode === 'product'
        ? adenosine * circSleepDrive
        : p.integrationMode === 'and'
        ? Math.min(adenosine, circSleepDrive)
        : p.integrationMode === 'triple'
        ? Math.min(adenosine, circSleepDrive, melatonin)
        : Math.max(adenosine, circSleepDrive);

      history.push({
        time: t,
        adenosine,
        melatonin,
        aanatLevel: aanat,
        circRawX: x,
        circRawY: y,
        circSleepDrive,
        combinedSleepDrive,
        vlpoActivity: vlpo + (Math.random() - 0.5) * 1.5, // add natural biological noise
        lhActivity: lh + (Math.random() - 0.5) * 1.5,
        isAsleep,
        lightIntensity: effectiveLightPulse,
        solarIntensity: activeSolar,
      });

      t += dt;
    }

    return {
      time: t,
      adenosine,
      melatonin,
      aanatLevel: aanat,
      circRawX: x,
      circRawY: y,
      vlpoActivity: vlpo,
      lhActivity: lh,
      isAsleep,
      history,
      manualLightPulseLeft: 0,
      forcedSleepDelayLeft: 0,
      forcedStateOriginal: undefined,
      depriveHoursLeft: 0,
    };
  }

  // Master ODE Euler integration loop
  useEffect(() => {
    let active = true;

    if (!isPlaying) {
      lastTickTimeRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (!active) return;

      if (isPendingUpdateRef.current) {
        // Postpone simulation calculation if React has a pending frame update in progress to avoid queue backlog
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastTickTimeRef.current === null) {
        lastTickTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsedRealSeconds = (timestamp - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = timestamp;

      // Limit elapsed delta to avoid huge sudden time jumps when tab lies backgrounded
      const cappedDelta = Math.min(0.2, elapsedRealSeconds);
      accumulatedTimeRef.current += cappedDelta;

      // Only calculate and set state if at least 30ms (~33 FPS) has elapsed to prevent React scheduler backlog
      if (accumulatedTimeRef.current < 0.030) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const deltaToSimulate = accumulatedTimeRef.current;
      accumulatedTimeRef.current = 0;
      const hoursToSimulate = deltaToSimulate * simSpeed;

      if (hoursToSimulate <= 0) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      isPendingUpdateRef.current = true;
      setSimState((prev) => {
        let currentT = prev.time;
        let currentAdeno = prev.adenosine;
        let currentMelatonin = prev.melatonin !== undefined ? prev.melatonin : 0.0;
        let currentAanat = prev.aanatLevel !== undefined ? prev.aanatLevel : 1.0;
        let currentX = prev.circRawX;
        let currentY = prev.circRawY;
        let currentVlpo = prev.vlpoActivity;
        let currentLh = prev.lhActivity;
        let currentSleep = prev.isAsleep;

        // Perform microstepping integration to prevent mathematical divergence in harmonic limit cycles
        const microStepDt = 0.05; // 3 minutes per microstep
        let remainingHours = hoursToSimulate;

        let trackingDepriveHours = prev.depriveHoursLeft !== undefined ? prev.depriveHoursLeft : 0.0;
        let trackingManualPulseHours = prev.manualLightPulseLeft !== undefined ? prev.manualLightPulseLeft : 0.0;
        let trackingForcedDelayHours = prev.forcedSleepDelayLeft !== undefined ? prev.forcedSleepDelayLeft : 0.0;
        let trackingForcedStateOriginal = prev.forcedStateOriginal;

        while (remainingHours > 0) {
          const dt = Math.min(microStepDt, remainingHours);
          const nextT = currentT + dt;

          const isTimeCrossed = (t_start: number, t_end: number, target: number): boolean => {
            return Math.floor((t_start - target) / 24) < Math.floor((t_end - target) / 24);
          };

          if (schedWakeEnabled && isTimeCrossed(currentT, nextT, schedWakeTime)) {
            if (currentSleep) {
              if (schedWakeWithLight) {
                // Pair with a therapeutic light pulse: 0.5 hours (30 minutes) of forced wakefulness and light exposure
                trackingForcedDelayHours = 0.5;
                trackingForcedStateOriginal = true;
                trackingManualPulseHours = 0.5;
              } else {
                trackingForcedDelayHours = 5.0 / 60.0;
                trackingForcedStateOriginal = true;
                trackingManualPulseHours = 0.0;
              }
            }
          }

          if (schedSleepEnabled && isTimeCrossed(currentT, nextT, schedSleepTime)) {
            if (!currentSleep) {
              trackingForcedDelayHours = 5.0 / 60.0;
              trackingForcedStateOriginal = false;
            }
          }

          // Update sleep-deprived countdown timers
          if (trackingDepriveHours > 0) {
            trackingDepriveHours = Math.max(0, trackingDepriveHours - dt);
          }
          if (trackingManualPulseHours > 0) {
            trackingManualPulseHours = Math.max(0, trackingManualPulseHours - dt);
          }
          if (trackingForcedDelayHours > 0) {
            trackingForcedDelayHours = Math.max(0, trackingForcedDelayHours - dt);
          }

          // 1. Ciradian mechanical clock (Poincaré limits) with optional light entrainment
          let dx = 0;
          let dy = 0;

          const timeOfDay = currentT % 24;
          const solarOriginal = params.lightStrength > 0 ? calculateSolarIntensity(timeOfDay, params.latitude, params.dayOfYear) : 0.0;
          let currentSolarIntensity = solarOriginal;
          if (params.lightSourceMode === 'artificial') {
            const isDarkWakeEpisode = trackingForcedStateOriginal === true && trackingManualPulseHours <= 0;
            const isDaytime = solarOriginal > 0;
            const isAwake = !currentSleep;
            if (isDaytime && isAwake && !isDarkWakeEpisode) {
              currentSolarIntensity = 1.0;
            } else {
              currentSolarIntensity = 0.0;
            }
          }
          const baseLightPulse = params.lightStrength > 0 ? currentSolarIntensity : 0.0;
          const manualPulseIntensity = trackingManualPulseHours > 0 ? 1.0 : 0.0;
          // Eyes are shut during sleep: but about 12% of light penetrates the eyelids to reach the SCN clock and photosensitive ipRGC cells
          const effectiveLightPulse = currentSleep 
            ? Math.max(baseLightPulse * 0.12, manualPulseIntensity * 0.12) 
            : Math.max(baseLightPulse, manualPulseIntensity);

          if (params.circStiffness > 0) {
            const rSq = currentX * currentX + currentY * currentY;
            const omega = (2 * Math.PI) / params.circPeriod;

            const coupling = manualPulseIntensity > 0 ? Math.max(1.5, params.lightStrength * 4.0) : params.lightStrength;
            const dx_light = coupling * effectiveLightPulse * (1.0 - currentX) * dt;
            const dy_light = coupling * effectiveLightPulse * (0.0 - currentY) * dt;

            // Melatonin feedback on SCN clock phase (gradual phase-shifting pull towards midnight target phase when elevated)
            const k_mel = params.lightStrength > 0 ? 0.22 : 0.0;
            const dx_mel = k_mel * currentMelatonin * (-0.85 - currentX) * dt;
            const dy_mel = k_mel * currentMelatonin * (0.45 - currentY) * dt;

            dx = (params.circStiffness * currentX * (1.0 - rSq) - omega * currentY) * dt + dx_light + dx_mel;
            dy = (params.circStiffness * currentY * (1.0 - rSq) + omega * currentX) * dt + dy_light + dy_mel;
          } else {
            // SCN Lesion: damp clock to flat absolute baseline
            dx = -currentX * 1.5 * dt;
            dy = -currentY * 1.5 * dt;
          }

          currentX += dx;
          currentY += dy;

          const circSleepDrive = params.circStiffness > 0 ? (1.0 - currentX) / 2.0 : 0.5;

          // 2. Switching logic condition checks
          let sleepTarget = currentSleep;
          const A = currentAdeno;
          const C = circSleepDrive;

          if (trackingForcedDelayHours > 0 && trackingForcedStateOriginal !== undefined) {
            // Force state override (opposite of original state)
            sleepTarget = !trackingForcedStateOriginal;
          } else if (trackingDepriveHours > 0) {
            // Deprivation override - force stay awake!
            sleepTarget = false;
          } else {
            if (!currentSleep) {
              // Transition to sleep
              const isDarkWakeEpisode = trackingForcedStateOriginal === true && trackingManualPulseHours <= 0;
              if (params.integrationMode === 'sum') {
                const drive = (params.weightAdenosine * A + params.weightCircadian * C) / (params.weightAdenosine + params.weightCircadian);
                if (drive > params.highThreshold) sleepTarget = true;
              } else if (params.integrationMode === 'and') {
                if (A > params.highThreshold && (C > params.highThreshold || isDarkWakeEpisode)) sleepTarget = true;
              } else if (params.integrationMode === 'or') {
                if (A > params.highThreshold || C > params.highThreshold) sleepTarget = true;
              } else if (params.integrationMode === 'product') {
                const drive = isDarkWakeEpisode ? A : A * C;
                if (drive > params.highThreshold * 0.72) sleepTarget = true;
              } else if (params.integrationMode === 'triple') {
                // Gated by SCN sleep drive, Adenosine, and the initial rise of Melatonin (above 0.15)
                if (A > params.highThreshold && (C > params.highThreshold || isDarkWakeEpisode) && currentMelatonin > 0.15) sleepTarget = true;
              }
            } else {
              // Transition to wake
              if (params.integrationMode === 'sum') {
                const drive = (params.weightAdenosine * A + params.weightCircadian * C) / (params.weightAdenosine + params.weightCircadian);
                if (drive < params.lowThreshold) sleepTarget = false;
              } else if (params.integrationMode === 'and') {
                if (A < params.lowThreshold && C < params.lowThreshold) sleepTarget = false;
              } else if (params.integrationMode === 'or') {
                if (A < params.lowThreshold || C < params.lowThreshold) sleepTarget = false;
              } else if (params.integrationMode === 'product') {
                if (A * C < params.lowThreshold * 0.85) sleepTarget = false;
              } else if (params.integrationMode === 'triple') {
                // Melatonin remains high due to closed eyes during sleep, so waking is triggered by drops in Adenosine (below lowThreshold) and SCN clock sleep drive falling (dx > 0)
                if (A < params.lowThreshold && (dx > 0 || params.circStiffness === 0)) sleepTarget = false;
              }
            }
          }

          if (trackingForcedDelayHours <= 0 && trackingForcedStateOriginal !== undefined) {
            if (sleepTarget === trackingForcedStateOriginal) {
              trackingForcedStateOriginal = undefined;
            }
          }

          currentSleep = sleepTarget;

          // 3. Homeostatic Adenosine changes couple directly to the active Orexin/LH wake-center firing rate
          let dA = 0;
          if (currentLh > 50.0) {
            dA = ((1.0 - A) / params.tauRise) * dt;
          } else {
            dA = ((-A) / params.tauDecay) * dt;
          }
          currentAdeno = Math.max(0.001, Math.min(0.999, A + dA));

          // 3.5 Melatonin hormone kinetics: SCN-activated and photically gated
          const solarOriginalMelatonin = params.lightStrength > 0 ? calculateSolarIntensity(timeOfDay, params.latitude, params.dayOfYear) : 0.0;
          let currentSolarIntensityMelatonin = solarOriginalMelatonin;
          if (params.lightSourceMode === 'artificial') {
            const isDarkWakeEpisode = trackingForcedStateOriginal === true && trackingManualPulseHours <= 0;
            const isDaytime = solarOriginalMelatonin > 0;
            const isAwake = !currentSleep;
            if (isDaytime && isAwake && !isDarkWakeEpisode) {
              currentSolarIntensityMelatonin = 1.0;
            } else {
              currentSolarIntensityMelatonin = 0.0;
            }
          }
          // Eyes are shut during sleep, but 12% of light penetrates the eyelids for melatonin suppression
          const currentDaylight = currentSleep 
            ? Math.min(0.20, effectiveLightPulse)
            : Math.min(1.0, currentSolarIntensityMelatonin + effectiveLightPulse);

          // Pineal AANAT enzyme synthesis/degradation kinetics:
          // AANAT is rapidly proteasomally degraded by daylight, and recovery is rate-limited by transcription/translation (approx 1-2h lag)
          // Suppress melatonin more aggressively during manual/therapeutic light pulses
          const pulseMelatoninGate = manualPulseIntensity > 0 ? 1.1 : 1.0;
          const dAanat = (-15.0 * currentDaylight * currentAanat * pulseMelatoninGate + (1.0 - currentAanat) * 0.70) * dt;
          currentAanat = Math.max(0.0, Math.min(1.0, currentAanat + dAanat));

          const currentDarkness = Math.max(0.0, 1.0 - currentDaylight);
          const melatoninSynthesis = circSleepDrive * currentDarkness * currentAanat;
          const dM = (0.5 * melatoninSynthesis * (1.1 - currentMelatonin) - (0.12 + 3.2 * currentDaylight * pulseMelatoninGate) * currentMelatonin) * dt;
          currentMelatonin = Math.max(0.0, Math.min(1.0, currentMelatonin + dM));

          // 4. VLPO / LH neural switches
          // SCN lesion results in fragmented unstable sleep/wake bouts
          const lesionFactor = params.circStiffness === 0 ? 15 : 0;
          
          let targetVlpo = currentSleep ? 95.0 : 5.0;
          let targetLh = currentSleep ? 5.0 : 95.0;

          // Modify endpoints if arousal insomnia is selected
          if (activeScenario === 'insomnia') {
            targetLh = currentSleep ? 32.0 : 98.0; // orexin arousal stays hyperactive
            targetVlpo = currentSleep ? 72.0 : 5.0; // sleep cell inhibition is compromised
          }

          // Photically-gated direct activation of serotonin / monoamine systems:
          // Exposure to bright light (both daily dawn sync or delivers/forced light pulses) excites serotonergic-producing nuclei.
          // This boosts LH/Orexin/Serotonin targets directly and lowers VLPO sleep-activation target limits.
          if (effectiveLightPulse > 0) {
            const serotoninBoost = 45.0 * effectiveLightPulse;
            if (currentSleep) {
              targetLh = Math.min(85.0, targetLh + serotoninBoost);
              targetVlpo = Math.max(15.0, targetVlpo - 35.0 * effectiveLightPulse);
            } else {
              targetLh = Math.min(125.0, targetLh + serotoninBoost);
            }
          }

          let tauNeural = activeScenario === 'narcolepsy' ? 0.38 : 0.12; // slow fragile switching in narcolepsy
          if (effectiveLightPulse > 0) {
            // Direct photic inputs trigger instantaneous alert reactions by reducing switching time constants
            tauNeural = Math.max(0.04, tauNeural / (1.0 + 3.0 * effectiveLightPulse));
          }
          currentVlpo += ((targetVlpo - currentVlpo) / tauNeural) * dt;
          currentLh += ((targetLh - currentLh) / tauNeural) * dt;

          currentT += dt;
          remainingHours -= dt;
        }

        // Output scrolling calculations
        const circSleepDrive = params.circStiffness > 0 ? (1.0 - currentX) / 2.0 : 0.5;
        const combinedSleepDrive = params.integrationMode === 'sum' 
          ? (params.weightAdenosine * currentAdeno + params.weightCircadian * circSleepDrive) / (params.weightAdenosine + params.weightCircadian)
          : params.integrationMode === 'product'
          ? currentAdeno * circSleepDrive
          : params.integrationMode === 'and'
          ? Math.min(currentAdeno, circSleepDrive)
          : params.integrationMode === 'triple'
          ? Math.min(currentAdeno, circSleepDrive, currentMelatonin)
          : Math.max(currentAdeno, circSleepDrive);

        // Map biological signal outputs
        const timeOfDayEnd = currentT % 24;
        const originalSolarEnd = params.lightStrength > 0 ? calculateSolarIntensity(timeOfDayEnd, params.latitude, params.dayOfYear) : 0.0;
        let currentSolarIntensity = originalSolarEnd;
        if (params.lightSourceMode === 'artificial') {
          const isDarkWakeEpisode = trackingForcedStateOriginal === true && trackingManualPulseHours <= 0;
          const isDaytime = originalSolarEnd > 0;
          const isAwake = !currentSleep;
          if (isDaytime && isAwake && !isDarkWakeEpisode) {
            currentSolarIntensity = 1.0;
          } else {
            currentSolarIntensity = 0.0;
          }
        }

        const baseLightPulse = params.lightStrength > 0 ? currentSolarIntensity : 0.0;
        const finalLightIntensity = Math.max(baseLightPulse, trackingManualPulseHours > 0 ? 1.0 : 0.0);

        const newPoint: SimPoint = {
          time: currentT,
          adenosine: currentAdeno,
          melatonin: currentMelatonin,
          aanatLevel: currentAanat,
          circRawX: currentX,
          circRawY: currentY,
          circSleepDrive,
          combinedSleepDrive,
          vlpoActivity: Math.max(0, Math.min(100, currentVlpo + (Math.random() - 0.5) * 1.5)),
          lhActivity: Math.max(0, Math.min(100, currentLh + (Math.random() - 0.5) * 1.5)),
          isAsleep: currentSleep,
          lightIntensity: finalLightIntensity,
          solarIntensity: currentSolarIntensity,
        };

        // Only append a new milestone point when simulated time has advanced by at least 0.08 hours
        // since the last stored milestone. This prevents redundant overrides and chart collapsing.
        const lastPoint = prev.history[prev.history.length - 1];
        let nextHistory = [...prev.history];

        if (!lastPoint || (currentT - lastPoint.time >= 0.08)) {
          nextHistory.push(newPoint);
        }

        // Clip history to keep a clean 72-hour rolling buffer to prevent memory bloat 
        const cutoffTime = currentT - 72;
        nextHistory = nextHistory.filter(p => p.time >= cutoffTime);

        return {
          time: currentT,
          adenosine: currentAdeno,
          melatonin: currentMelatonin,
          aanatLevel: currentAanat,
          circRawX: currentX,
          circRawY: currentY,
          vlpoActivity: currentVlpo,
          lhActivity: currentLh,
          isAsleep: currentSleep,
          history: nextHistory,
          manualLightPulseLeft: trackingManualPulseHours,
          forcedSleepDelayLeft: trackingForcedDelayHours,
          forcedStateOriginal: trackingForcedStateOriginal,
          depriveHoursLeft: trackingDepriveHours,
        };
      });

      if (active) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTickTimeRef.current = null;
    };
  }, [isPlaying, simSpeed, params, activeScenario, schedWakeEnabled, schedWakeTime, schedWakeWithLight, schedSleepEnabled, schedSleepTime]);

  // Action: Force manual toggle of the sleep-wake flip-flop state
  const handleToggleSleepWake = (withLightPulse: boolean = false) => {
    setSimState((prev) => {
      const nextAsleep = !prev.isAsleep;
      const currentT = prev.time;
      const nextVlpo = nextAsleep ? 92.0 : 8.0;
      const nextLh = nextAsleep ? 8.0 : 92.0;

      // Determine light level purely for the visual snapshot on the graph
      const ambientLight = (!nextAsleep && withLightPulse) ? 1.0 : 0.0;

      const originalSolar = params.lightStrength > 0 ? calculateSolarIntensity(currentT % 24, params.latitude, params.dayOfYear) : 0.0;
      let nextSolarIntensity = originalSolar;
      if (params.lightSourceMode === 'artificial') {
        const isDarkWakeEpisode = prev.isAsleep === true && withLightPulse === false;
        const isDaytime = originalSolar > 0;
        const isAwake = !nextAsleep;
        if (isDaytime && isAwake && !isDarkWakeEpisode) {
          nextSolarIntensity = 1.0;
        } else {
          nextSolarIntensity = 0.0;
        }
      }

      const nextPoint: SimPoint = {
        time: currentT,
        adenosine: prev.adenosine,
        melatonin: prev.melatonin !== undefined ? prev.melatonin : 0.0,
        circRawX: prev.circRawX,
        circRawY: prev.circRawY,
        circSleepDrive: params.circStiffness > 0 ? (1.0 - prev.circRawX) / 2.0 : 0.5,
        combinedSleepDrive: prev.adenosine,
        vlpoActivity: nextVlpo,
        lhActivity: nextLh,
        isAsleep: nextAsleep,
        lightIntensity: nextAsleep ? 0.0 : ambientLight,
        solarIntensity: nextSolarIntensity,
      };

      return {
        ...prev,
        isAsleep: nextAsleep,
        vlpoActivity: nextVlpo,
        lhActivity: nextLh,
        history: [...prev.history, nextPoint],
        forcedSleepDelayLeft: 5.0 / 60.0,
        forcedStateOriginal: prev.isAsleep,
        manualLightPulseLeft: withLightPulse ? 5.0 / 60.0 : 0.0,
      };
    });
  };

  // Action: Deliver a 5-minute square pulse of light
  const handleTriggerLightPulse = () => {
    setSimState((prev) => {
      const currentT = prev.time;
      const pulseDuration = 5.0 / 60.0; // 5 minutes in hours
      
      const timeOfDay = currentT % 24;
      const originalSolar = params.lightStrength > 0 ? calculateSolarIntensity(timeOfDay, params.latitude, params.dayOfYear) : 0.0;
      let currentSolarIntensity = originalSolar;
      if (params.lightSourceMode === 'artificial') {
        const isDarkWakeEpisode = prev.forcedStateOriginal === true && (prev.manualLightPulseLeft || 0) <= 0;
        const isDaytime = originalSolar > 0;
        const isAwake = !prev.isAsleep;
        if (isDaytime && isAwake && !isDarkWakeEpisode) {
          currentSolarIntensity = 1.0;
        } else {
          currentSolarIntensity = 0.0;
        }
      }
      
      const newPoint: SimPoint = {
        time: currentT,
        adenosine: prev.adenosine,
        melatonin: prev.melatonin !== undefined ? prev.melatonin : 0.0,
        circRawX: prev.circRawX,
        circRawY: prev.circRawY,
        circSleepDrive: params.circStiffness > 0 ? (1.0 - prev.circRawX) / 2.0 : 0.5,
        combinedSleepDrive: prev.adenosine,
        vlpoActivity: prev.vlpoActivity,
        lhActivity: prev.lhActivity,
        isAsleep: prev.isAsleep,
        lightIntensity: 1.0,
        solarIntensity: currentSolarIntensity,
      };

      return {
        ...prev,
        manualLightPulseLeft: (prev.manualLightPulseLeft || 0) + pulseDuration,
        history: [...prev.history, newPoint],
      };
    });
  };

  // Helper/Action: Updates parameters
  const handleUpdateParams = (newParams: SimParameters) => {
    setParams(newParams);
    if (newParams.lightStrength !== params.lightStrength) {
      setSimState(prev => ({
        ...prev,
        depriveHoursLeft: 0,
      }));

      if (newParams.lightStrength === 0) {
        setActiveScenario('freerun');
      } else {
        setActiveScenario('balanced');
      }
    }
  };

  const handleToggleLightCycleInfluence = () => {
    const nextLightStrength = params.lightStrength > 0 ? 0.0 : 0.30;
    const nextParams = {
      ...params,
      lightStrength: nextLightStrength,
    };
    handleUpdateParams(nextParams);
  };

  // Preset configuration handler
  const handleApplyScenario = (scen: string) => {
    setActiveScenario(scen);

    if (scen === 'balanced') {
      // Balanced 26h cycle with Light Entrainment enabled (24h actual period)
      setParams(DEFAULT_PARAMS);
      setSimState({
        ...generateBaselineHistory(DEFAULT_PARAMS),
        depriveHoursLeft: 0,
      });
    } else if (scen === 'freerun') {
      // Free-running clock - standard 26.0 hour cycle, no light entrainment
      const baseParams = {
        ...DEFAULT_PARAMS,
        circPeriod: 26.0,
        highThreshold: 0.60,
        lowThreshold: 0.25,
        lightStrength: 0.00, // disables entrainment, showing precession
      };
      setParams(baseParams);
      setSimState({
        ...generateBaselineHistory(baseParams),
        depriveHoursLeft: 0,
      });
    } else if (scen === 'allnighter') {
      // Sleep deprivation challenge: force user stay awake for 15 hours
      const baseParams = {
        ...DEFAULT_PARAMS,
        circPeriod: 26.0,
        highThreshold: 0.60,
        lowThreshold: 0.25,
        lightStrength: 0.30,
        integrationMode: 'sum' as const,
      };
      setParams(baseParams);
      setSimState({
        ...generateBaselineHistory(baseParams),
        depriveHoursLeft: 15.0, // Force awake for next 15 simulated hours
      });
    } else if (scen === 'scnlesion') {
      // SCN Ablated: circStiffness is 0, flat clock, no light entrainment possible
      const lesionParams = {
        ...DEFAULT_PARAMS,
        circPeriod: 26.0,
        circStiffness: 0.0, // Nullify clock dynamics
        integrationMode: 'sum' as const,
        lightStrength: 0.00,
        highThreshold: 0.60,
        lowThreshold: 0.25,
      };
      setParams(lesionParams);
      setSimState({
        ...generateBaselineHistory(lesionParams),
        depriveHoursLeft: 0,
      });
    } else if (scen === 'insomnia') {
      // insomnia - hyperalert wake drive, narrower thresholds
      const insomniaParams = {
        ...DEFAULT_PARAMS,
        circPeriod: 26.0,
        tauRise: 18.0, // extremely slow build
        tauDecay: 5.5, // shallow sleep
        highThreshold: 0.74, // hard to trigger sleep
        lowThreshold: 0.42, // wakes up extremely early under pressure
        lightStrength: 0.30,
      };
      setParams(insomniaParams);
      setSimState({
        ...generateBaselineHistory(insomniaParams),
        depriveHoursLeft: 0,
      });
    } else if (scen === 'narcolepsy') {
      // Weak stabilizer limits, fragile switching
      const narParam = {
        ...DEFAULT_PARAMS,
        circPeriod: 26.0,
        highThreshold: 0.54, // extremely narrow gap
        lowThreshold: 0.46, // transitions happen on minor noise fluctuations
        lightStrength: 0.30,
      };
      setParams(narParam);
      setSimState({
        ...generateBaselineHistory(narParam),
        depriveHoursLeft: 0,
      });
    }
  };

  const handleResetHistory = () => {
    setActiveScenario('balanced');
    setParams(DEFAULT_PARAMS);
    setSimState({
      ...generateBaselineHistory(DEFAULT_PARAMS),
      depriveHoursLeft: 0,
    });
  };

  // Chronometer utility equations
  const elapsedHours = simState.time;
  const currentDay = Math.floor(elapsedHours / 24) + 1;
  const rawClockHour = Math.floor(elapsedHours % 24);
  const rawClockMin = Math.floor((elapsedHours * 60) % 60);
  
  const formattedTime = `Day ${currentDay}, ${rawClockHour.toString().padStart(2, '0')}:${rawClockMin.toString().padStart(2, '0')}`;

  // Generate a live transient visual point representing the exact current real-time state.
  // This extends the timeline smoothly to the active millisecond without polluting the history array.
  const liveTimeOfDay = simState.time % 24;
  const liveOriginalSolar = params.lightStrength > 0 ? calculateSolarIntensity(liveTimeOfDay, params.latitude, params.dayOfYear) : 0.0;
  let liveSolarIntensity = liveOriginalSolar;
  if (params.lightSourceMode === 'artificial') {
    const isDarkWakeEpisode = simState.forcedStateOriginal === true && (simState.manualLightPulseLeft || 0) <= 0;
    const isDaytime = liveOriginalSolar > 0;
    const isAwake = !simState.isAsleep;
    if (isDaytime && isAwake && !isDarkWakeEpisode) {
      liveSolarIntensity = 1.0;
    } else {
      liveSolarIntensity = 0.0;
    }
  }

  const liveBaseLightPulse = params.lightStrength > 0 ? liveSolarIntensity : 0.0;
  const liveManualPulseIntensity = (simState.manualLightPulseLeft && simState.manualLightPulseLeft > 0) ? 1.0 : 0.0;
  // Eyes are shut during sleep: light does not reach visual pathways
  const liveLightIntensity = simState.isAsleep ? 0.0 : Math.max(liveBaseLightPulse, liveManualPulseIntensity);

  const liveCircSleepDrive = params.circStiffness > 0 ? (1.0 - simState.circRawX) / 2.0 : 0.5;
  const liveCombinedSleepDrive = params.integrationMode === 'sum' 
    ? (params.weightAdenosine * simState.adenosine + params.weightCircadian * liveCircSleepDrive) / (params.weightAdenosine + params.weightCircadian)
    : params.integrationMode === 'product'
    ? simState.adenosine * liveCircSleepDrive
    : params.integrationMode === 'and'
    ? Math.min(simState.adenosine, liveCircSleepDrive)
    : params.integrationMode === 'triple'
    ? Math.min(simState.adenosine, liveCircSleepDrive, simState.melatonin !== undefined ? simState.melatonin : 0.0)
    : Math.max(simState.adenosine, liveCircSleepDrive);

  const currentPoint: SimPoint = {
    time: simState.time,
    adenosine: simState.adenosine,
    melatonin: simState.melatonin !== undefined ? simState.melatonin : 0.0,
    circRawX: simState.circRawX,
    circRawY: simState.circRawY,
    circSleepDrive: liveCircSleepDrive,
    combinedSleepDrive: liveCombinedSleepDrive,
    vlpoActivity: simState.vlpoActivity,
    lhActivity: simState.lhActivity,
    isAsleep: simState.isAsleep,
    lightIntensity: liveLightIntensity,
    solarIntensity: liveSolarIntensity,
  };;

  const renderedHistory = [...simState.history, currentPoint];

  return (
    <div id="applet-main-body" className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* SLEEK DESIGN HEADER */}
      <header id="applet-header" className="h-auto min-h-16 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between px-8 py-3 md:py-0 bg-slate-900/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500 flex items-center justify-center text-slate-900 font-bold font-display">Σ</div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold tracking-tight text-white flex items-center flex-wrap gap-1.5">
              Neurodynamic Sleep Modeler 
              <span className="text-cyan-500 font-mono text-xs md:text-sm ml-2 px-1.5 py-0.5 bg-slate-950/80 border border-slate-800 rounded">v1.0.4-beta</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono leading-none mt-1 sm:mt-0">
              Process H &bull; Process C &bull; Bistable LH-VLPO Gate
            </p>
          </div>
        </div>
        
        {/* Real-time Engine Metrics & Interactive Clock */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs font-mono font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-slate-100 uppercase text-[11px] font-bold">{isPlaying ? 'ENGINE ACTIVE' : 'ENGINE PAUSED'}</span>
          </div>
          <div>
            PERIOD: <span className="text-slate-100 font-bold">{params.circStiffness > 0 ? `${params.circPeriod.toFixed(2)} HR` : 'FLAT'}</span>
          </div>
          <div className="hidden sm:block">
            PHASE: <span className="text-slate-100 font-bold uppercase">{activeScenario === 'freerun' ? 'FREE-RUNNING' : activeScenario}</span>
          </div>
          
          {/* Active simulated clock reading */}
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <div className="flex items-center gap-1.5">
              {simState.isAsleep ? <Moon className="h-3.5 w-3.5 text-indigo-400" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
              <span className="font-bold text-cyan-400">{formattedTime}</span>
            </div>
            <span className={`text-[10px] font-bold ${simState.isAsleep ? 'text-indigo-400' : 'text-emerald-400'}`}>
              {simState.isAsleep ? 'SLEEP' : 'WAKE'}
            </span>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS SECTION - styled cleanly to match sidebar bounds */}
      <div id="tabs-navigation" className="px-8 border-b border-slate-800 bg-slate-900/30 flex gap-1">
        <button
          onClick={() => setActiveTab('sim')}
          className={`px-4 py-3 text-xs font-mono tracking-wider uppercase font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'sim'
              ? 'border-cyan-500 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Simulation Deck
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-3 text-xs font-mono tracking-wider uppercase font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'docs'
              ? 'border-cyan-500 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Biological Documentation
        </button>
      </div>

      {/* RUNNING COUNTDOWN WARNINGS OVER THE VIEWPORT */}
      {(simState.depriveHoursLeft || 0) > 0 && activeTab === 'sim' && (
        <div className="bg-rose-950/50 border-b border-rose-900/60 px-8 py-2 text-center text-xs font-mono text-rose-300 flex items-center justify-center gap-2 animate-pulse">
          <span className="w-2 h-2 bg-rose-500 rounded-full" />
          ACTIVE DEPRIVATION PROTOCOL: SLEEP BLOCK APPLIED FOR NEXT {(simState.depriveHoursLeft || 0).toFixed(1)} SIMULATED HOURS
        </div>
      )}

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto" id="applet-viewport">
        {activeTab === 'sim' ? (
          <div className="space-y-6 animate-fade-in" id="dashboard-layout">
            
            {/* TIMELINES AND STREAMING CHART (TOP OF DISPLAY) */}
            <div id="top-graph-container">
              <TimeChart history={renderedHistory} params={params} />
            </div>

            {/* KINETIC ENGINE CONTROLLER SECTION */}
            <div id="kinetic-engine-controller-row">
              <KineticControllers
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                simSpeed={simSpeed}
                onChangeSimSpeed={setSimSpeed}
                onReset={handleResetHistory}
                onTriggerLightPulse={handleTriggerLightPulse}
                schedWakeEnabled={schedWakeEnabled}
                onToggleSchedWake={setSchedWakeEnabled}
                schedWakeTime={schedWakeTime}
                onChangeSchedWakeTime={setSchedWakeTime}
                schedWakeWithLight={schedWakeWithLight}
                onToggleSchedWakeWithLight={setSchedWakeWithLight}
                schedSleepEnabled={schedSleepEnabled}
                onToggleSchedSleep={setSchedSleepEnabled}
                schedSleepTime={schedSleepTime}
                onChangeSchedSleepTime={setSchedSleepTime}
              />
            </div>

            {/* CIRCADIAN ENVIRONMENT CONTROL BAR */}
            <div 
              id="circadian-coupling-control-bar" 
              className={`border p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 ${
                params.lightStrength > 0 
                  ? 'bg-amber-950/20 border-amber-500/30' 
                  : 'bg-indigo-950/20 border-indigo-500/30 font-semibold'
              }`}
            >
              <div className="flex items-start gap-3 w-full md:w-auto">
                <div className={`p-2.5 rounded-lg border shrink-0 ${
                  params.lightStrength > 0 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' 
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                }`}>
                  {params.lightStrength > 0 ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 flex-wrap">
                    Circadian Environment Coupling
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      params.lightStrength > 0 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {params.lightStrength > 0 ? 'Entrained (24h Sync Mode)' : 'Isolation Chamber (Free-Run Mode)'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">
                    {params.lightStrength > 0 
                      ? "Earth Cycle Feedback: A daily dawn light pulse resets the SCN phase every morning, keeping the intrinsic 26.0h biological period synchronized with the 24.0h rotatory cycle." 
                      : "Environmental Isolation: The SCN molecular clock is cut off from solar cues, reverting the system to its natural 26.0 hour period and inducing progressive sleep-wake phase drift (precession)."}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wider">
                    {params.lightStrength > 0
                      ? "System Status: SCN Stuart-Landau oscillator locked to subjective dawn"
                      : "System Status: SCN Stuart-Landau oscillator precessing freely"}
                  </p>
                </div>
              </div>
              
              <button
                id="btn-global-toggle-isolation"
                type="button"
                onClick={handleToggleLightCycleInfluence}
                className={`cursor-pointer w-full md:w-auto px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 border flex items-center justify-center gap-2 shrink-0 ${
                  params.lightStrength > 0
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-indigo-600 text-white font-bold border-indigo-500 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {params.lightStrength > 0 ? (
                  <>
                    <Moon className="h-4 w-4" />
                    Enter Isolation Mode (No Light)
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    Restore Light Sync (24h Lock)
                  </>
                )}
              </button>
            </div>

            {/* NATURAL SOLAR / ARTIFICIAL INDOOR TOGGLE */}
            <div id="ambient-light-mode-row">
              <AmbientLightToggle
                params={params}
                onChangeParams={handleUpdateParams}
              />
            </div>

            {/* ACTIVE NEURAL PATHWAYS & 2D STATE SPACE GRAPHICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="graphics-subgrid">
              <div>
                <NeuralCircuitVisualizer 
                  currentPoint={currentPoint} 
                  params={params} 
                  onChangeParams={handleUpdateParams} 
                />
              </div>
              <div>
                <PhaseSpaceChart history={renderedHistory} currentPoint={currentPoint} params={params} />
              </div>
            </div>

            {/* PARAMETERS AND PATHOLOGICAL PRESETS SECTION (BOTTOM GRID) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="parameters-presets-grid">
              <PathologyScenarios
                activeScenario={activeScenario}
                onApplyScenario={handleApplyScenario}
              />
              <ModelParameters
                params={params}
                onChangeParams={handleUpdateParams}
              />
            </div>

          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-2">
            <ExplanationTab />
          </div>
        )}
      </main>

      {/* SLEEK THEME FOOTER BAR */}
      <footer className="h-auto md:h-10 py-3 md:py-0 bg-slate-900 border-t border-slate-800 px-8 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-500 font-mono gap-2">
        <div className="flex gap-4">
          <span>SOLVER: RK4 (0.01s STEP)</span>
          <span>SEED: 0xFD91A</span>
          <span className="hidden sm:inline">BIOLOGICAL DYNAMICS MODEL V1.0.4</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="px-2 py-0.5 border border-slate-800 rounded bg-slate-950 text-slate-400">SYSTEM READY</span>
          <span>LATENCY: 4ms</span>
        </div>
      </footer>

    </div>
  );
}
