export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface TranscriptEntry { id: string; timestamp: number; text: string }
export interface FraudSignal { type: string; label: string; evidence: string; severity: RiskSeverity; weight: number }
export interface FraudAnalysis { riskScore: number; isScam: boolean; category: string; signals: FraudSignal[]; explanation: string }
export interface RiskPoint { timestamp: number; score: number }
