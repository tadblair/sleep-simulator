import { BookOpen, CheckCircle, Info, ShieldAlert, Award } from 'lucide-react';

export default function ExplanationTab() {
  return (
    <div 
      id="explanation-tab-container" 
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-300 font-sans leading-relaxed"
    >
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3" id="explanation-header">
        <BookOpen className="h-5 w-5 text-indigo-400" />
        <h3 className="font-sans font-semibold text-slate-100 text-base tracking-wide uppercase">
          Neurobiological & Mathematical Analysis
        </h3>
      </div>

      <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-5 flex gap-3.5" id="critical-verdict-box">
        <Award className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-indigo-200 text-sm mb-1 uppercase tracking-wide">
            Our Recommendation: The Additive (Sum) Model is Biologically Accurate
          </h4>
          <p className="text-xs text-indigo-300">
            Based on clinical, behavioral, and neurophysiological literature, we have integrated the <strong>Weighted Additive Sum</strong> model as the biological standard. Below, we break down why this is mathematically superior and how we justified this choice over logical AND or Product thresholds, complete with clinical proofs.
          </p>
        </div>
      </div>

      {/* THREE COMPONENTS DESCRIPTION */}
      <section className="space-y-4">
        <h4 className="text-slate-100 font-semibold text-sm uppercase tracking-wider">
          The 3-Component Sleep System Explained
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="components-explanation-grid">
          
          {/* COMPONENT 1 */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 font-semibold">Component 1</span>
            <h5 className="font-semibold text-slate-100 text-xs">Process H (Homeostatic)</h5>
            <p className="text-[11px] text-slate-400">
              Adenosine builds up as a byproduct of ATP consumption during cellular metabolism while wakeful. It acts as a primary <strong>leaky integrator</strong>, accumulating slowly and decaying exponentially during sleep as glymphatic clearance flushes adenoneucleotides from extracellular matrices.
            </p>
          </div>

          {/* COMPONENT 2 */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-semibold">Component 2</span>
            <h5 className="font-semibold text-slate-100 text-xs">Process C (SCN Clock)</h5>
            <p className="text-[11px] text-slate-400">
              The cell-autonomous molecular clock inside Suprachiasmatic Nucleus (SCN) neurons is modeled as a <strong>stable limit-cycle oscillator</strong> (Poincaré/Stuart-Landau). It drives a periodic transcriptional feedback loop of PER/CRY proteins with a free-running cycle adjusted to 26.0 hours.
            </p>
          </div>

          {/* COMPONENT 3 */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold">Component 3</span>
            <h5 className="font-semibold text-slate-100 text-xs">VLPO-LH Bistable Switch</h5>
            <p className="text-[11px] text-slate-400">
              A mutual-inhibitory neural circuit where sleep-promoting GABAergic neurons in the VLPO nucleus inhibit wake-promoting Orexin/monoaminergic neurons in the Lateral Hypothalamus (LH), and vice versa. This mutual block sets up a <strong>bistable flip-flop switch</strong> with inherent hysteresis.
            </p>
          </div>

        </div>
      </section>

      {/* WHY ADDITIVE IS ACCURATE SECTION */}
      <section className="space-y-4 pt-2">
        <h4 className="text-slate-100 font-semibold text-sm uppercase tracking-wider">
          Critique of Integration Gating Mechanisms
        </h4>

        <div className="space-y-4 text-xs">
          
          {/* ANALYSIS 1: WEIGHTED SUM (ADDITIVE) */}
          <div className="border border-slate-800 rounded-xl p-4 space-y-2.5 bg-slate-950/20">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <h5 className="font-bold text-slate-100">Option A: Weighted Additive Sum [ D_sleep = w_A·A + w_C·C ] — [Biologically Best]</h5>
            </div>
            <p className="pl-6 text-slate-400">
              In this model, inputs enter neural populations additively. Adenosine bindings excite VLPO neurons via A2A adenosine receptors, while circadian alertness signals inhibit VLPO via SCN GABAergic projections. In the postsynaptic membrane, ionotropic and metabotropic currents represent <strong>linear summations</strong> of synaptic input.
            </p>
            <div className="pl-6 bg-slate-950/40 p-3 rounded-lg border border-slate-850 text-slate-300 font-mono text-[10.5px]">
              <strong className="text-indigo-400">The Clinical SCN-Lesion Proof:</strong> In animal studies where the Suprachiasmatic Nucleus is surgically ablated (lesioned), SCN output drops to zero/flat (C ≈ 0.5). Under a logical AND/Product gate, this animal would either never sleep, or sleep would fail entirely. In vivo trials show that <strong>SCN-lesioned animals sleep the exact same total amount of time</strong> over 48 hours; they simply lose the circadian grouping, fragmenting their sleep-wake switches across the day. This is definitive proof of an additive summation that operates independently of the SCN being dynamic!
            </div>
          </div>

          {/* ANALYSIS 2: AND GATE */}
          <div className="border border-slate-800 rounded-xl p-4 space-y-2 bg-slate-950/20">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="h-4 w-4" />
              <h5 className="font-bold text-slate-100">Option B: Logical AND Coincidence Detection — [Biologically Low Accuracy]</h5>
            </div>
            <p className="pl-6 text-slate-400">
              This approach states that the organism can sleep <em>only</em> when both Adenosine limits and Circadian limits are conjointly exceeded (A &gt; θ_high AND C &gt; θ_high). 
            </p>
            <p className="pl-6 text-slate-400">
              <strong>Why it fails:</strong> This model prohibits sleep if SCN alertness is high, but we know that after prolonged sleep deprivation (e.g., pulling an all-nighter), sleep pressure wins and forces sleep even at subjective midday. An AND valve completely prevents homeostatic rebound from taking place when circadian signals are in the active/wake phase.
            </p>
          </div>

          {/* ANALYSIS 3: PRODUCT */}
          <div className="border border-slate-800 rounded-xl p-4 space-y-2 bg-slate-950/20">
            <div className="flex items-center gap-2 text-amber-500">
              <Info className="h-4 w-4" />
              <h5 className="font-bold text-slate-100">Option C: Multiplicative Product [ D_sleep = A · C ] — [Moderate Biologically]</h5>
            </div>
            <p className="pl-6 text-slate-400">
              This models one variable scaling the sensitivity of the other. The SCN clock acts to modulate the baseline sensitivity to adenosine. 
            </p>
            <p className="pl-6 text-slate-400">
              <strong>Why it is inferior:</strong> While synergistic, it means if either value reaches zero, sleep is impossible. Under an SCN-lesion where circadian sleep signals can periodically fall flat, sleep drive becomes extremely fragile or vanishes. Thus, it lacks the independent safety margins of linear current summation.
            </p>
          </div>

        </div>
      </section>

      {/* CIRCADIAN DRIFT SECTION */}
      <section className="space-y-3 pt-2">
        <h4 className="text-slate-100 font-semibold text-sm uppercase tracking-wider">
          Understanding Photic Entrainment vs. Free-Running Circadian Drift
        </h4>
        <p className="text-xs text-slate-400">
          Normally, daylight (acting on blue-sensitive melanopsin retinal ganglion cells via the retinohypothalamic tract) entrains the molecular clock exactly to the solar 24.0-hour day night cycle. 
        </p>
        <p className="text-xs text-slate-400">
          In this model, the free-running SCN has an intrinsic molecular frequency of <strong>26.0 hours</strong>. We have implemented a photic resetting mechanism through continuous, natural daytime solar daylight:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wide">☀ Entrainment Active (Strength &gt;= 0.20)</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Natural daytime solar light provides a continuous entrainment force directly on the Stuart-Landau oscillator coordinates. This photic resetting force successfully phase-locks the intrinsic 26.0-hour cycle to exactly 24.0 hours, anchoring sleep events to a stable daily routine.
            </p>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wide">☾ Free-Running (Strength = 0)</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Without solar light reset, the clock precesses against time of day. Because the intrinsic 26h cycle is longer than standard 24h days, sleep peaks phase-delay, shifting later by 2.0 hours each solar cycle. This mimics the clinical pathology seen in completely blind individuals.
            </p>
          </div>
        </div>
      </section>

      {/* GEOGRAPHIC SOLAR MODEL SECTION */}
      <section className="space-y-3 pt-2">
        <h4 className="text-slate-100 font-semibold text-sm uppercase tracking-wider">
          Geographical Solar Daylight Cycle Modeling
        </h4>
        <p className="text-xs text-slate-400">
          We calculate the physical solar daylight profile in real-time based on the <strong>Earth Latitude (&phi;)</strong> and <strong>Day of Year (N)</strong>. This conforms to standard astronomical equations of solar elevation:
        </p>
        <ul className="list-disc pl-5 text-[11px] text-slate-400 space-y-1 font-mono">
          <li><strong>Solar Declination Angle (&delta;):</strong> 23.44&deg; &times; sin(2&pi;(N - 80) / 365) — cycles with seasons peaking on solstices.</li>
          <li><strong>Solar elevation equation:</strong> sin(h) = sin(&phi;) &times; sin(&delta;) + cos(&phi;) &times; cos(&delta;) &times; cos(&omega;), where &omega; is the solar hour angle.</li>
        </ul>
        <p className="text-xs text-slate-400">
          By adjusting sliders in the <em>Orbital & Daylight Environment</em> deck, you can witness <strong>polar midnight nights</strong>, <strong>extreme summer solstices</strong>, and <strong>equatorial twelve-hour days</strong>, illustrating how geographical position sculpts diurnal ambient illumination on Earth!
        </p>
      </section>
    </div>
  );
}
