import { Bot, Check, GraduationCap, MoveRight } from "lucide-react";

const formatCost = (value) => value == null ? "$0" : value < .001 ? `$${value.toFixed(5)}` : `$${value.toFixed(4)}`;
const formatCompute = (value) => value == null ? "0ms" : value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;

export default function ReasoningDiff({ drawer }) {
  const general = drawer?.general;
  const specialist = drawer?.specialist;
  const teacherTokens = general?.tokens || 1800;
  const specialistTokens = specialist?.tokens || 125;
  const tokenRatio = Math.max(1, Math.round(teacherTokens / Math.max(specialistTokens, 1)));
  const costRatio = Math.max(1, Math.round((general?.cost || .006) / Math.max(specialist?.cost || .00012, .000001)));
  return <section className="reasoning-card card" aria-labelledby="reasoning-title">
    <div className="reasoning-heading"><div><p className="label">Reasoning comparison</p><h2 id="reasoning-title" className="h2">What gets paid once vs reused forever</h2></div><span className="comparison-ratio mono">{costRatio}x cheaper / {tokenRatio}x fewer tokens</span></div>
    <div className="reasoning-grid">
      <article className="reasoning-agent reasoning-agent--teacher"><div className="reasoning-agent-title"><span className="reasoning-avatar"><GraduationCap size={18} /></span><div><span>Teacher / general agent</span><small>Explores the full policy space</small></div></div><ol><li>Reads raw submission and vendor history</li><li>Searches GL and state policy tables</li><li>Compares routine treatment with exceptions</li><li>Forms a novel-case rule and emits an answer</li></ol><p className="reasoning-summary">{general?.summary || "Waiting for the first novel submission to expose the teacher trace."}</p><div className="reason-meter"><span style={{width:"100%"}} /><label className="mono">{teacherTokens.toLocaleString()} tokens / {formatCompute(general?.compute_ms)} / {formatCost(general?.cost)}</label></div></article>
      <div className="reasoning-transfer"><MoveRight size={21} /><span>keep rule + references</span><small>discard exploration</small></div>
      <article className="reasoning-agent reasoning-agent--specialist"><div className="reasoning-agent-title"><span className="reasoning-avatar reasoning-avatar--active"><Bot size={18} /></span><div><span>Specialized agent</span><small>Executes one compiled procedure</small></div></div><ol className="specialist-steps"><li><Check size={12} />Match exact case signature</li><li><Check size={12} />Resolve referenced codes live</li><li><Check size={12} />Return schema-only answer</li></ol><p className="reasoning-summary">{specialist?.summary || "A tight procedure will appear here after distillation."}</p><div className="reason-meter reason-meter--specialist"><span style={{width:`${Math.max(8,100/tokenRatio)}%`}} /><label className="mono">{specialistTokens.toLocaleString()} tokens / {formatCompute(specialist?.compute_ms)} / {formatCost(specialist?.cost)}</label></div></article>
    </div>
    <p className="reasoning-caption">Same live references and answer schema. Exploration is amortized at distillation, not repeated on every submission.</p>
  </section>;
}
