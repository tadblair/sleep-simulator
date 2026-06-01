/**
 * Types and parameters for the Sleep-Wake Cycle Simulation.
 */

export type IntegrationMode = 'sum' | 'and' | 'product' | 'or' | 'triple';

export interface SimParameters {
  tauRise: number;       // Adenosine buildup time constant (hours)
  tauDecay: number;      // Adenosine decay time constant (hours)
  circPeriod: number;    // Circadian molecular clock period (hours)
  circStiffness: number; // SCN oscillator convergence strength
  integrationMode: IntegrationMode;
  highThreshold: number; // Threshold for sleep onset (from 0 to 1)
  lowThreshold: number;  // Threshold for sleep offset (from 0 to 1)
  weightAdenosine: number; // Weight of adenosine in additive/sum mode
  weightCircadian: number; // Weight of SCN clock in additive/sum mode
  lightStrength: number;   // Strength of ambient daily solar entrainment (0 = free running)
  latitude: number;        // Adjustable latitude in degrees (-90 to +90)
  dayOfYear: number;       // Adjustable day of year (1 to 365)
  lightSourceMode?: 'natural' | 'artificial'; // switches between natural daylight and artificial daytime light
}

export interface SimPoint {
  time: number;             // Simulation time in hours
  adenosine: number;        // Sleep pressure, Process H [0, 1]
  melatonin: number;        // Melatonin hormone level [0, 1]
  aanatLevel?: number;       // Pineal AANAT enzyme activity level [0, 1]
  circRawX: number;         // SCN oscillator X coordinate
  circRawY: number;         // SCN oscillator Y coordinate
  circSleepDrive: number;   // Circadian sleep drive [0, 1] (high at subjective night)
  combinedSleepDrive: number; // Combined sleep drive value based on integrationMode [0, 1]
  vlpoActivity: number;     // VLPO firing rate rate [0, 100] %
  lhActivity: number;       // LH/Orexin firing rate rate [0, 100] %
  isAsleep: boolean;        // Sleep state S (true = sleeping, false = awake)
  lightIntensity: number;   // Strength of the active daily light pulse [0, 1]
  solarIntensity: number;   // Earth solar light intensity based on latitude and season [0, 1]
}

export interface SimState {
  time: number;
  adenosine: number;
  melatonin: number;
  aanatLevel?: number;
  circRawX: number;
  circRawY: number;
  vlpoActivity: number;
  lhActivity: number;
  isAsleep: boolean;
  history: SimPoint[];
  manualLightPulseLeft?: number;
  forcedSleepDelayLeft?: number;
  forcedStateOriginal?: boolean;
  depriveHoursLeft?: number;
}
