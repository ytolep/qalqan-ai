import type { RiskPoint } from '@/lib/types';
import { riskColor } from './RiskGauge';
export default function RiskTimeline({points}:{points:RiskPoint[]}) {
 const data=points.length?points:[{timestamp:0,score:0}];const max=Math.max(data.length-1,7);
 const coords=data.map((p,i)=>`${20+i/max*940},${112-p.score*.9}`);const color=riskColor(data.at(-1)!.score);
 return <section className="timeline"><div className="panel-heading"><span>ДИНАМИКА РИСКА</span><span className="muted">ТЕКУЩАЯ СЕССИЯ</span></div><svg viewBox="0 0 1000 135" role="img" aria-label={`Динамика риска: ${data.map(p=>p.score).join(', ')}`} preserveAspectRatio="none">{[22,67,112].map((y,i)=><g key={y}><line x1="20" x2="960" y1={y} y2={y} stroke="#29312d" strokeDasharray="3 5"/><text x="975" y={y+4} fill="#77877e" fontSize="11">{100-i*50}</text></g>)}<polygon points={`20,112 ${coords.join(' ')} ${20+(data.length-1)/max*940},112`} fill={color} opacity=".07"/><polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2.5"/>{data.map((p,i)=><circle key={i} cx={20+i/max*940} cy={112-p.score*.9} r="4" fill={riskColor(p.score)}/>)}</svg><div className="timeline-labels"><span>НАЧАЛО ЗВОНКА</span><span>СЕЙЧАС</span></div></section>;
}
