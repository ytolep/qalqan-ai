import { LockKeyhole } from 'lucide-react';
export default function StatusBar({source}:{source:'local'|'hybrid'}){return <footer><span><LockKeyhole size={14}/> Аудио не сохраняется приложением</span><span>{source==='hybrid'?'AI + LOCAL PROTECTION':'LOCAL PROTECTION ACTIVE'}</span><span>СОЗДАНО ДЛЯ КАЗАХСТАНА <span className="kz-mark">KZ</span></span></footer>;}
