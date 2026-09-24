import type { FraudAnalysis, FraudSignal } from './types';
export function criticalFloor(signals: FraudSignal[]): number {
  const types = new Set(signals.map(s => s.type));
  if (types.has('SAFE_ACCOUNT') && types.has('MONEY_TRANSFER')) return 95;
  if ((types.has('BANK_IMPERSONATION') && (types.has('SMS_CODE') || types.has('REMOTE_ACCESS'))) || (types.has('SECRECY') && types.has('SMS_CODE'))) return 90;
  return 0;
}
export function combineAnalysis(local: FraudAnalysis, ai?: FraudAnalysis): FraudAnalysis {
  if (!ai) return local;
  const signals = [...local.signals, ...ai.signals.filter(s => !local.signals.some(l => l.type === s.type))];
  const riskScore = Math.min(100, Math.max(criticalFloor(local.signals), Math.round(.55 * local.riskScore + .45 * ai.riskScore)));
  return {riskScore, isScam: riskScore >= 80, category: riskScore >= 80 ? 'social_engineering' : ai.category, signals, explanation: ai.explanation};
}
