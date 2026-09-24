import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'QALQAN AI — AI Scam Protection',description:'Защита от телефонного мошенничества в Казахстане. Анализ разговора на русском и казахском языках.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>;}
