// RMS activity is approximate sound activity, not emotion, intent, or speaker identity.
export interface AudioFeatures { speakingDuration: number; silenceDuration: number; activity: number }
export function monitorAudio(stream: MediaStream, onUpdate: (features: AudioFeatures)=>void) {
 const context = new AudioContext(); const analyser = context.createAnalyser(); analyser.fftSize = 1024;
 const source = context.createMediaStreamSource(stream); source.connect(analyser);
 const samples = new Float32Array(analyser.fftSize); let speaking = 0, silence = 0;
 const timer = setInterval(()=>{analyser.getFloatTimeDomainData(samples); const rms = Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length); if(rms>.015) speaking+=.1; else silence+=.1; onUpdate({speakingDuration:speaking,silenceDuration:silence,activity:Math.min(1,rms*12)});},100);
 return ()=>{clearInterval(timer); source.disconnect(); void context.close();};
}
