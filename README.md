# QALQAN AI

Real-time AI protection from scam calls in Kazakhstan. A working browser hackathon MVP with Russian/Kazakh rules, microphone transcription, contextual AI, and two reliable scripted demos.

## Problem

Phone scams use urgency, authority, secrecy and social engineering to convince victims to reveal credentials or transfer money.

## Solution

QALQAN AI analyzes the conversation in real time and warns the victim before the scam reaches the transaction stage. The displayed 0–100 score is a heuristic risk indicator, not a calibrated probability or guarantee.

## Installation and environment

Requires Node.js 24.x and npm (matching the Vercel runtime setting).

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Put `OPENAI_API_KEY=your-key` in `.env.local` and restart the server to enable transcription and contextual analysis. Never use a `NEXT_PUBLIC_` prefix for this key. Do not commit `.env.local`.

Without a key, both scripted demos, local detection, evidence highlighting, warnings and the timeline work. Microphone transcription needs the key; a failure leaves the session intact and offers demos.

```sh
npm run test       # deterministic detection and hybrid floor regression tests
npm run lint
npm run typecheck
npm run build
npm start          # serves the production build
```

## Demo instructions

1. Select **DEMO SCAM CALL**. Eight scripted transcript messages arrive at two-second intervals. Every message runs through the same rule engine as microphone transcripts; no message has a hardcoded score. Repeated categories can leave the score unchanged.
2. Watch independent signals accumulate, evidence become highlighted, and the warning appear at 80+.
3. Select **SAFE CALL** for the low-risk comparison. Explicit safety advice does not count as a request for secrets.
4. Select **Новый анализ**, then **НАЧАТЬ АНАЛИЗ** for microphone capture. Allow microphone permission. Speak near the microphone; the browser cannot intercept a cellular call. Speakerphone audio may be picked up acoustically.
5. **Завершить** stops analysis and releases the microphone. It does not end a phone call. Refresh the page to discard the session.

Scripted demos intentionally stay entirely local for stable, offline judging, even with a configured key.

## Architecture

```text
Microphone
    ↓
Speech-to-Text
    ↓
Transcript
    ↓
┌───────────────────┐
│ Local Scam Engine │
└───────────────────┘
          +
┌───────────────────┐
│ AI Context Engine │
└───────────────────┘
          ↓
     Hybrid Risk
          ↓
 Warning + Explanation
```

- Next.js App Router, TypeScript, Tailwind CSS, Lucide React; no database or charting library.
- `lib/fraud-engine.ts`: 12 weighted Russian/Kazakh categories, clause-local negation, one contribution per category, independent-signal bonus, 100-point cap.
- `lib/hybrid-score.ts`: 55% rules + 45% AI, with 90/95 minimum scores for critical deterministic combinations. AI failures use the full local score.
- `lib/openai-config.ts`: model constants and strict JSON schema. Classification uses `gpt-4.1-mini`; transcription uses `gpt-4o-mini-transcribe`.
- `app/api/analyze/route.ts`: validates input, sends at most 24,000 characters to OpenAI, validates returned evidence, and falls back locally on missing credentials, refusal, malformed output, timeout or upstream failure.
- `app/api/transcribe/route.ts`: bounded audio upload, MIME validation, correct container extension, timeout and friendly failures. API credentials only exist on the server.
- `components/CallAnalyzer.tsx`: in-memory session, stale-request protection, serialized transcription queue (bounded to three segments), cancellation and microphone cleanup.
- `lib/audio-features.ts`: experimental RMS-based sound activity and silence durations. No emotion or voice-pressure claims; these measurements never affect fraud scoring.
- Recording restarts every 4.5 seconds so each blob has an independently decodable container header. Supported browser formats are selected through `MediaRecorder.isTypeSupported`.

## Privacy

This application does not write audio or transcripts to disk, a database, browser storage, or application logs. Session content lives in React/browser memory; audio blobs are released after processing. Stopping retains the visible transcript until reset or refresh.

When a key is configured, microphone audio and transcript text are sent through server routes to OpenAI. `store:false` is used for classification, but this does **not** promise zero retention by the API provider: provider data policies and account configuration apply. Demos make no AI requests.

## Limitations

- A browser prototype, not native call interception, background phone monitoring, or a verified fraud classifier.
- False positives/negatives are possible; rules and simple negation cannot resolve every quote, hypothetical, dialect or nuanced context. Kazakh patterns need native-speaker evaluation and broader datasets.
- Chunk boundaries may lose words; transcription has network latency and may hallucinate on silence/noise. Mixed-language accuracy depends on the speech model.
- No speaker diarization. All entries represent captured conversation, not verified caller identity.
- Microphone access requires localhost or HTTPS and browser permission. Device/browser support varies.
- Slow transcription can drop segments after the bounded queue fills; the UI reports this. Stopping discards unfinished chunks/requests.
- This local MVP has no authentication, distributed rate limiting, or abuse controls. Add these and a reverse-proxy body limit before exposing paid API routes publicly. Per-route size checks are not a substitute for a transport-level limit on chunked uploads.
- End-to-end live OpenAI behavior requires a valid account/key and must be tested on the target microphone/browser. Automated checks can verify local and failure paths without credentials.

## Future roadmap

- Native Android/iOS integration and telecom integration
- Caller reputation and phone number intelligence
- Family protection mode
- Kazakhstan-specific scam dataset and fine-tuned fraud classifier
- Kazakh speech improvements and on-device inference
- Bank/telecom API integrations

## API references

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI speech transcription](https://developers.openai.com/api/docs/guides/speech-to-text)
- [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini)

## Verification in this workspace

- Installed Next.js 16.3.6 from the npm `latest` tag; exact dependency tree is recorded in `package-lock.json`.
- Production build, lint and TypeScript checks passed using Node.js 24.19.0.
- 11 automated rule/hybrid tests passed, including Russian/Kazakh critical combinations, negation, duplicate signals and the safe demo.
- Local HTTP checks passed for deterministic fallback, malformed analysis input and missing-key transcription.
- Browser verification: the eight-message scam demo reached 100 with a warning; the four-message safe demo stayed at 15. Desktop and mobile layouts inspected.
- No live API credentials were supplied; real OpenAI transcription/classification has not been verified end to end.

## Deploy to Vercel

Import this GitHub repository into Vercel. Use the Next.js preset, repository root as the root directory, and Node.js 24.x. The default build command is `npm run build`. The lockfile pins dependency versions.

Deploy without environment variables for the fully working demo. To enable live AI later, add `OPENAI_API_KEY` in Vercel Project Settings → Environment Variables for the required environments and redeploy. Keep the variable server-only and never commit its value.
