import { NextResponse } from 'next/server';
import { analyzeFraud, rules } from '@/lib/fraud-engine';
import { combineAnalysis } from '@/lib/hybrid-score';
import { ANALYSIS_MODEL, analysisSchema, systemPrompt } from '@/lib/openai-config';
import type { FraudAnalysis, FraudSignal } from '@/lib/types';
export const runtime = 'nodejs';
export async function POST(request: Request) {
 let text: string;
 try {
  const raw = await request.text();
  if (raw.length > 64000) return NextResponse.json({error:'Conversation too long'},{status:413});
  const body = JSON.parse(raw);
  if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 24000) return NextResponse.json({error:'Invalid conversation'},{status:400});
  text = body.text;
 } catch { return NextResponse.json({error:'Invalid request'},{status:400}); }
 const local = analyzeFraud(text);
 const fallback = () => NextResponse.json({...local,source:'local'}, {headers:{'Cache-Control':'no-store'}});
 if (!process.env.OPENAI_API_KEY) return fallback();
 try {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
   method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({model:ANALYSIS_MODEL,store:false,temperature:0,max_completion_tokens:1600,messages:[{role:'system',content:systemPrompt},{role:'user',content:text}],response_format:{type:'json_schema',json_schema:{name:'fraud_analysis',strict:true,schema:analysisSchema}}})
  });
  if (!response.ok) return fallback();
  const result = await response.json();
  const ai = JSON.parse(result.choices?.[0]?.message?.content) as FraudAnalysis;
  if (!Number.isFinite(ai.riskScore) || ai.riskScore < 0 || ai.riskScore > 100 || typeof ai.isScam !== 'boolean' || typeof ai.category !== 'string' || typeof ai.explanation !== 'string' || !Array.isArray(ai.signals)) return fallback();
  ai.signals = ai.signals.filter((s: FraudSignal) => typeof s.type === 'string' && typeof s.label === 'string' && typeof s.evidence === 'string' && s.evidence.length > 0 && text.includes(s.evidence) && ['low','medium','high','critical'].includes(s.severity)).slice(0,16).map(s=>({...s,weight:rules.find(r=>r.type===s.type)?.weight??0}));
  return NextResponse.json({...combineAnalysis(local,ai),source:'hybrid'}, {headers:{'Cache-Control':'no-store'}});
 } catch { return fallback(); }
}
