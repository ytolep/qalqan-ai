import { AudioLines } from 'lucide-react';
import type { TranscriptEntry, FraudSignal } from '@/lib/types';
import { useEffect, useRef } from 'react';
function highlight(text:string,signals:FraudSignal[]) {
 const ranges = signals.flatMap(s=>{const i=text.toLowerCase().indexOf(s.evidence.toLowerCase());return i<0?[]:[{start:i,end:i+s.evidence.length}];}).sort((a,b)=>a.start-b.start);
 const output:React.ReactNode[]=[];let cursor=0;
 for(const r of ranges){if(r.start<cursor)continue;output.push(text.slice(cursor,r.start),<mark key={r.start}>{text.slice(r.start,r.end)}</mark>);cursor=r.end;}output.push(text.slice(cursor));return output;
}
export default function LiveTranscript({entries,signals,active}:{entries:TranscriptEntry[];signals:FraudSignal[];active:boolean}) {
 const bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[entries]);
 return <section className="transcript-panel"><div className="panel-heading"><span><AudioLines size={16}/> LIVE TRANSCRIPT</span><span className="muted">RU / KZ</span></div>
 <div className="transcript-scroll" aria-live="polite" aria-relevant="additions">{!entries.length?<div className="empty-transcript"><AudioLines size={38}/><h3>{active?'Слушаем разговор…':'Здесь появится ваш разговор'}</h3><p>{active?'Говорите рядом с микрофоном.':'Начните анализ или выберите демозвонок.'}</p></div>:entries.map((e,i)=><article className="transcript-entry" key={e.id}><div className="entry-meta"><span>СОБЕСЕДНИК</span><time>{new Date(e.timestamp).toLocaleTimeString('ru-RU')}</time><span className="entry-count">{String(i+1).padStart(2,'0')}</span></div><p>{highlight(e.text,signals)}</p></article>)}<div ref={bottom}/></div>
 <div className="transcript-foot"><span className={active?'activity-dot active':'activity-dot'}/>{active?'Ожидаем следующую фразу':'Разговор хранится только в этой вкладке'}</div></section>;
}
