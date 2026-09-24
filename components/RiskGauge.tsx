export function riskColor(score: number) { return score>=80?'#ff655d':score>=60?'#ffab58':score>=30?'#edcd66':'#b5ec83'; }
export function riskLabel(score: number) { return score>=80?'CRITICAL':score>=60?'HIGH':score>=30?'MODERATE':'LOW'; }
export default function RiskGauge({score}:{score:number}) {
 const color=riskColor(score);
 return <div className={`gauge ${score>=80?'critical':''}`} style={{'--risk':color} as React.CSSProperties}>
 <svg viewBox="0 0 240 240" aria-hidden="true"><circle className="gauge-track" cx="120" cy="120" r="102"/><circle className="gauge-value" cx="120" cy="120" r="102" stroke={color} strokeDasharray={`${score*6.409} 640.9`} transform="rotate(-90 120 120)"/></svg>
 <div className="gauge-number"><strong data-testid="risk-score">{score}</strong><span>SCAM RISK / 100</span></div>
 </div>;
}
