import type { FraudAnalysis, FraudSignal, RiskSeverity } from './types';
import { criticalFloor } from './hybrid-score';
type Rule = { type: string; label: string; weight: number; severity: RiskSeverity; pattern: RegExp };
export const rules: Rule[] = [
 {type:'BANK_IMPERSONATION',label:'Представляется сотрудником банка',weight:15,severity:'medium',pattern:/служба безопасности(?: банка)?|сотрудник банка|банк(?:тің|тың)? (?:қауіпсіздік қызметі|қызметкері)/iu},
 {type:'SMS_CODE',label:'Запрос SMS-кода',weight:40,severity:'critical',pattern:/(?:назовите|сообщите|продиктуйте|скажите|отправьте).{0,35}код|код(?:ты|ын|ыңызды).{0,20}(?:айтыңыз|жіберіңіз|хабарлаңыз)|(?:sms|смс).{0,20}код.{0,20}(?:айтыңыз|жіберіңіз)/iu},
 {type:'SAFE_ACCOUNT',label:'«Безопасный» счёт',weight:45,severity:'critical',pattern:/(?:безопасн|резервн)ый сч[её]т|қауіпсіз (?:шот|есепшот)/iu},
 {type:'URGENCY',label:'Давление и срочность',weight:15,severity:'high',pattern:/не кладите трубку|срочно|прямо сейчас|немедленно|трубканы қоймаңыз|шұғыл|дәл қазір|тез арада/iu},
 {type:'SECRECY',label:'Требование секретности',weight:25,severity:'high',pattern:/никому не (?:говорите|сообщайте|рассказывайте)|ешкімге (?:айтпаңыз|хабарламаңыз)/iu},
 {type:'LOAN_SCAM',label:'Угроза кредита или блокировки',weight:20,severity:'high',pattern:/на (?:вас|ваше имя).{0,45}(?:кредит|за[её]м)|подозрительн[а-я]+ операци[а-я]+|ваша карта заблокирована|сіздің атыңызға.{0,30}(?:несие|кредит)|күдікті (?:операция|аударым)/iu},
 {type:'POLICE_IMPERSONATION',label:'Представляется полицией',weight:20,severity:'high',pattern:/сотрудник полиции|из полиции|следователь|полиция қызметкері|тергеуші/iu},
 {type:'MONEY_TRANSFER',label:'Просьба перевести деньги',weight:35,severity:'critical',pattern:/перев(?:едите|ести|одите).{0,20}(?:деньги|средства)|ақша.{0,20}(?:аударыңыз|жіберіңіз)/iu},
 {type:'CARD_DETAILS',label:'Запрос данных карты',weight:35,severity:'critical',pattern:/(?:сообщите|назовите|продиктуйте).{0,25}(?:номер карты|cvv|cvc|пин)|(?:cvv|cvc).{0,15}(?:код|айтыңыз)|карта.{0,20}(?:нөмірін|деректерін).{0,20}(?:айтыңыз|жіберіңіз)/iu},
 {type:'REMOTE_ACCESS',label:'Установка / удалённый доступ',weight:40,severity:'critical',pattern:/установите приложение|anydesk|teamviewer|қосымшаны орнатыңыз/iu},
 {type:'PRIZE_SCAM',label:'Неожиданный выигрыш',weight:20,severity:'medium',pattern:/вы выиграли|сіз ұтып алдыңыз|сіз жеңдіңіз/iu},
 {type:'RELATIVE_EMERGENCY',label:'Беда с родственником',weight:30,severity:'high',pattern:/ваш.{0,20}(?:родственник|сын|дочь).{0,25}(?:дтп|авари|беду)|туысыңыз.{0,25}(?:апат|жол оқиғасы)/iu},
];
// Negation is clause-local: safe advice must not erase a later malicious request.
function negated(clause: string, matchIndex: number, type: string): boolean {
 if (type === 'SECRECY' || type === 'URGENCY') return false;
 const prefix = clause.slice(Math.max(0, matchIndex - 65), matchIndex).toLowerCase();
 return /(?:не|никогда не)\s*$/u.test(prefix) || /(?:не|никогда не) (?:просим|запрашиваем|требуем|нужно|следует)\s*$/u.test(prefix) || /(?:не сообщайте|не называйте|не устанавливайте|не переводите|не используйте).{0,45}$/u.test(prefix) || /(?:айтпаңыз|жібермеңіз|аудармаңыз|орнатпаңыз)/iu.test(clause);
}
export function analyzeFraud(text: string): FraudAnalysis {
 const clauses = text.split(/[.!?\n;]+|,\s*(?:но|а затем|бірақ)\s*/iu);
 const signals: FraudSignal[] = [];
 for (const rule of rules) {
  for (const clause of clauses) {
   const match = rule.pattern.exec(clause);
   if (match && !negated(clause, match.index, rule.type)) {
    signals.push({type:rule.type,label:rule.label,weight:rule.weight,severity:rule.severity,evidence:match[0]}); break;
   }
  }
 }
 // One contribution per category; independent behaviors add a small confidence bonus.
 const total = signals.reduce((sum,s) => sum+s.weight,0) + Math.max(0,signals.length-1)*3;
 const riskScore = Math.min(100,Math.max(total,criticalFloor(signals)));
 return {riskScore,isScam:riskScore>=80,category:riskScore>=80?'social_engineering':signals.length?'suspicious':'unknown',signals,explanation:signals.length?'Оценка основана на сочетании обнаруженных признаков.':'Опасные признаки пока не обнаружены. Это не гарантия безопасности.'};
}
