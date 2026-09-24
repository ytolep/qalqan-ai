'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Radio, Square, RotateCcw, Mic, Activity } from 'lucide-react';
import StartScreen from './StartScreen';
import LiveTranscript from './LiveTranscript';
import RiskGauge, { riskColor, riskLabel } from './RiskGauge';
import RiskTimeline from './RiskTimeline';
import DetectedSignals from './DetectedSignals';
import ScamAlert from './ScamAlert';
import StatusBar from './StatusBar';
import { analyzeFraud } from '@/lib/fraud-engine';
import { scamDemo, safeDemo } from '@/lib/demo-data';
import { monitorAudio, type AudioFeatures } from '@/lib/audio-features';
import type { FraudAnalysis, RiskPoint, TranscriptEntry } from '@/lib/types';
type Mode = 'idle'|'scam'|'safe'|'mic';
export default function CallAnalyzer(){
 const [mode,setMode]=useState<Mode>('idle'),[active,setActive]=useState(false),[busy,setBusy]=useState(false);
 const [entries,setEntries]=useState<TranscriptEntry[]>([]),[analysis,setAnalysis]=useState<FraudAnalysis>(()=>analyzeFraud(''));
 const [points,setPoints]=useState<RiskPoint[]>([]),[seconds,setSeconds]=useState(0),[notice,setNotice]=useState('');
 const [source,setSource]=useState<'local'|'hybrid'>('local'),[features,setFeatures]=useState<AudioFeatures|null>(null);
 const generation=useRef(0),transcript=useRef<TranscriptEntry[]>([]),cleanup=useRef<()=>void>(()=>{}),analysisRequest=useRef<AbortController|null>(null);
 useEffect(()=>()=>{generation.current++;cleanup.current();analysisRequest.current?.abort();},[]);
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(timer);},[active]);
 function stop(){generation.current++;cleanup.current();cleanup.current=()=>{};analysisRequest.current?.abort();setActive(false);setBusy(false);}
 function reset(next:Mode){stop();transcript.current=[];setEntries([]);setPoints([{timestamp:Date.now(),score:0}]);setAnalysis(analyzeFraud(''));setMode(next);setSeconds(0);setNotice('');setFeatures(null);setSource('local');return generation.current;}
 async function append(text:string,token:number,useAI:boolean){
  if(token!==generation.current||!text.trim())return;
  const entry={id:crypto.randomUUID(),timestamp:Date.now(),text};
  const current=[...transcript.current,entry];transcript.current=current;setEntries(current);
  const context=current.map(e=>e.text).join('\n').slice(-24000);const local=analyzeFraud(current.map(e=>e.text).join('\n'));
  setAnalysis(local);setSource('local');setPoints(p=>[...p,{timestamp:entry.timestamp,score:local.riskScore}]);
  if(!useAI)return;
  analysisRequest.current?.abort();const controller=new AbortController();analysisRequest.current=controller;
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:context}),signal:controller.signal});if(!response.ok)throw Error();const result=await response.json();if(token!==generation.current||transcript.current.at(-1)?.id!==entry.id)return;
   // Preserve deterministic protection from older context even if the AI window is shortened.
   if(result.riskScore<local.riskScore && current.map(e=>e.text).join('\n').length>24000)result.riskScore=local.riskScore;
   setAnalysis(result);setSource(result.source==='hybrid'?'hybrid':'local');setPoints(p=>p.map((v,i)=>i===p.length-1?{...v,score:result.riskScore}:v));
  }catch{if(token===generation.current)setSource('local');}finally{clearTimeout(timeout);}
 }
 function demo(safe:boolean){const token=reset(safe?'safe':'scam');setActive(true);const messages=safe?safeDemo:scamDemo;let i=0;
 const tick=()=>{if(token!==generation.current)return;void append(messages[i++],token,false);if(i===messages.length){clearInterval(timer);setActive(false);}};
 const timer=setInterval(tick,2000);cleanup.current=()=>clearInterval(timer);tick();
 }
 async function start(){const token=reset('mic');setBusy(true);
  let stream:MediaStream|undefined;
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Микрофон недоступен в этом браузере. Откройте демозвонок.');
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(token!==generation.current){stream.getTracks().forEach(t=>t.stop());return;}
   const liveStream=stream;let disposed=false,recorder:MediaRecorder|null=null,timer:ReturnType<typeof setTimeout>|undefined,queued=0;
   const requests=new Set<AbortController>();let queue=Promise.resolve();let stopMeter=()=>{};
   try{stopMeter=monitorAudio(liveStream,setFeatures);}catch{/* Recording remains usable without experimental metering. */}
   const preferred=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
   cleanup.current=()=>{disposed=true;clearTimeout(timer);if(recorder?.state==='recording')recorder.stop();liveStream.getTracks().forEach(t=>t.stop());stopMeter();requests.forEach(c=>c.abort());};
   const capture=()=>{
    if(disposed)return;
    // Restart the recorder per segment: each upload has its own container header.
    recorder=new MediaRecorder(liveStream,preferred?{mimeType:preferred}:undefined);const chunks:Blob[]=[];const mime=recorder.mimeType;
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{if(!disposed){setNotice('Ошибка микрофона. Попробуйте демозвонок.');stop();}};
    recorder.onstop=()=>{if(disposed||token!==generation.current)return;const blob=new Blob(chunks,{type:mime});capture();if(blob.size<500)return;
     if(queued>=3){setNotice('Соединение медленное: часть аудио пропущена.');return;}queued++;
     queue=queue.then(async()=>{if(disposed)return;const controller=new AbortController();requests.add(controller);const timeout=setTimeout(()=>controller.abort(),23000);
      try{const data=new FormData();data.append('audio',blob,'segment');const response=await fetch('/api/transcribe',{method:'POST',body:data,signal:controller.signal});if(!response.ok)throw Error();const result=await response.json();if(!disposed&&result.text){setNotice('');void append(result.text,token,true);}}
      catch{if(!disposed)setNotice('AI transcription unavailable · Расшифровка недоступна. Попробуйте DEMO SCAM CALL.');}
      finally{clearTimeout(timeout);requests.delete(controller);queued--;}
     });
    };recorder.start();timer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},4500);
   };
   capture();setActive(true);setBusy(false);
  }catch(error){stream?.getTracks().forEach(t=>t.stop());if(token===generation.current){cleanup.current();setBusy(false);setMode('idle');setNotice(error instanceof Error&&error.name==='NotAllowedError'?'Доступ к микрофону отклонён. Разрешите доступ или запустите демозвонок.':error instanceof Error?error.message:'Не удалось подключить микрофон.');}}
 }
 const score=analysis.riskScore;
 return <div className="app-shell"><header><Link onClick={()=>reset('idle')} className="brand" href="/" aria-label="QALQAN AI — главная"><div className="brand-icon"><ShieldCheck size={28}/></div><div><strong>QALQAN <span>AI</span></strong><small>AI SCAM PROTECTION</small></div></Link><div className="header-right"><span className="region">KAZAKHSTAN / RU + KZ</span><span className="live-badge"><Radio size={14}/>{active?'LIVE PROTECTION':'PROTECTION READY'}</span></div></header>
 <main>{notice&&<div className="notice" role="status">{notice}</div>}{mode==='idle'?<><StartScreen onStart={start} onDemo={demo} busy={busy}/><div className="standby-strip"><ShieldCheck size={18}/><span>Подмена личности. Давление. Запрос SMS-кода.</span><span className="muted">Замечаем признаки, которые легко пропустить.</span></div></>:<><div className="session-heading"><div><div className="eyebrow">ЦЕНТР ЗАЩИТЫ / {mode==='mic'?'МИКРОФОН':'ДЕМОНСТРАЦИЯ'}</div><h1>{mode==='safe'?'Безопасный звонок':mode==='scam'?'Подозрительный звонок':'Анализ разговора'}</h1></div><div className="session-controls"><span className="session-status"><span className={`activity-dot ${active?'active':''}`}/>{active?'АНАЛИЗ АКТИВЕН':'АНАЛИЗ ЗАВЕРШЁН'}<b>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</b></span>{active?<button className="secondary" onClick={stop}><Square size={14}/> Завершить</button>:<button className="secondary" onClick={()=>reset('idle')}><RotateCcw size={15}/> Новый анализ</button>}</div></div>
 {score>=80&&<ScamAlert active={active} onStop={stop}/>}
 <div className="workspace"><div className="conversation"><LiveTranscript entries={entries} signals={analysis.signals} active={active}/><RiskTimeline points={points}/></div><aside className="risk-panel"><div className="panel-heading"><span>ОЦЕНКА УГРОЗЫ</span><ShieldCheck size={16}/></div><RiskGauge score={score}/><div className="risk-level"><span>RISK LEVEL</span><strong style={{color:riskColor(score)}}>{riskLabel(score)}</strong></div><p className="risk-description">{analysis.explanation}</p><DetectedSignals signals={analysis.signals}/></aside></div>
 <div className="session-bottom"><span><Mic size={15}/>{mode==='mic'?'Микрофон браузера':'Сценарий демонстрации · аудио не записывается'}</span><div className="demo-switch"><button onClick={()=>demo(false)}>DEMO SCAM CALL</button><button onClick={()=>demo(true)}>SAFE CALL</button></div></div>
 {features&&<div className="audio-features"><Activity size={15}/> Активность звука · экспериментально <meter min="0" max="1" value={features.activity}/><span>Звук {features.speakingDuration.toFixed(0)} с / тишина {features.silenceDuration.toFixed(0)} с. Эмоции не анализируются.</span></div>}</>}
 </main><StatusBar source={source}/></div>;
}
