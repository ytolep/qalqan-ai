import { NextResponse } from 'next/server';
import { TRANSCRIPTION_MODEL } from '@/lib/openai-config';
export const runtime = 'nodejs';
export async function POST(request: Request) {
 if (!process.env.OPENAI_API_KEY) return NextResponse.json({error:'AI transcription unavailable',reason:'missing_key'},{status:503});
 try {
  if (Number(request.headers.get('content-length')) > 5_500_000) return NextResponse.json({error:'Audio too large'},{status:413});
  const data = await request.formData(); const file = data.get('audio');
  if (!(file instanceof File) || !file.size || file.size > 5_000_000) return NextResponse.json({error:'Invalid audio'},{status:400});
  const type = file.type.split(';')[0];
  const extensions: Record<string,string> = {'audio/webm':'webm','video/webm':'webm','audio/mp4':'mp4','video/mp4':'mp4','audio/ogg':'ogg','audio/wav':'wav','audio/mpeg':'mp3','audio/x-m4a':'m4a'};
  if (!extensions[type]) return NextResponse.json({error:'Unsupported audio format'},{status:415});
  const upstream = new FormData(); upstream.append('file',file,`speech.${extensions[type]}`); upstream.append('model',TRANSCRIPTION_MODEL);
  upstream.append('prompt','Разговор на русском и казахском языках в Казахстане. Сәлеметсіз бе. Банк. SMS.');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:upstream,signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('Unavailable');
  const result = await response.json();
  return NextResponse.json({text:typeof result.text==='string'?result.text:''},{headers:{'Cache-Control':'no-store'}});
 } catch { return NextResponse.json({error:'AI transcription unavailable'},{status:503}); }
}
