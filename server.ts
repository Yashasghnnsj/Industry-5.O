import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ErgoVision AI Engine',
    timestamp: new Date().toISOString(),
  });
});

// SQLite Telemetry & Persistence endpoints
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

const PYTHON_BRIDGE = path.join(__dirname, 'python_engine', 'api_bridge.py');

app.get('/api/db/stats', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync('python3', [PYTHON_BRIDGE, 'stats'], { timeout: 4000 });
    res.json(JSON.parse(stdout.trim()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to query SQLite stats', details: String(err) });
  }
});

app.get('/api/db/logs', async (req, res) => {
  try {
    const limit = String(req.query.limit || 50);
    const { stdout } = await execFileAsync('python3', [PYTHON_BRIDGE, 'logs', limit], { timeout: 4000 });
    res.json(JSON.parse(stdout.trim()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SQLite logs', details: String(err) });
  }
});

app.post('/api/db/log', async (req, res) => {
  try {
    const payloadStr = JSON.stringify(req.body);
    const { stdout } = await execFileAsync('python3', [PYTHON_BRIDGE, 'log', payloadStr], { timeout: 4000 });
    res.json(JSON.parse(stdout.trim()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to insert SQLite telemetry', details: String(err) });
  }
});

app.post('/api/db/clear', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync('python3', [PYTHON_BRIDGE, 'clear'], { timeout: 4000 });
    res.json(JSON.parse(stdout.trim()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear SQLite tables', details: String(err) });
  }
});

// Ergonomics AI Audit & OSHA/ISO Assessment endpoint
app.post('/api/ergonomics-audit', async (req, res) => {
  try {
    const {
      sessionDurationSec = 0,
      avgRula = 1,
      peakRula = 1,
      avgReba = 1,
      peakReba = 1,
      sustainedStrainCount = 0,
      totalRepCycles = 0,
      repFrequencyPerMin = 0,
      safetyBreaches = 0,
      highRiskJoints = [],
      postureDistribution = {},
      jobRole = 'Warehouse Logistics / Assembly Line Operator',
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback structured audit if API key is not yet configured
      return res.json({
        summary: `Ergonomic assessment for ${jobRole} over ${Math.round(sessionDurationSec / 60)} minutes indicates significant postural load (Peak RULA: ${peakRula}, Peak REBA: ${peakReba}).`,
        riskLevel: peakRula >= 5 ? 'High Risk - Action Required Soon' : peakRula >= 3 ? 'Medium Risk - Investigate' : 'Low Risk - Acceptable',
        biomechanicalAnalysis: [
          `Primary strain localized in: ${highRiskJoints.join(', ') || 'Lumbar trunk & Cervical neck'}.`,
          `Repetitive movement cadence measured at ${repFrequencyPerMin} cycles/min with ${totalRepCycles} total cycle repetitions.`,
          `Sustained awkward postures held for >5s observed ${sustainedStrainCount} times, contributing to accelerated musculoskeletal fatigue.`,
          `Virtual hazard zone boundaries breached ${safetyBreaches} times during the shift.`,
        ],
        oshaCompliance: {
          standard: 'OSHA 29 CFR 1910 Section 5(a)(1) General Duty Clause & ISO 11228-1 Manual Handling',
          rating: peakRula >= 6 ? 'Non-Compliant - Severe Ergonomic Hazard' : peakRula >= 4 ? 'Borderline - Ergonomic Intervention Needed' : 'Compliant',
          recommendation: 'Adjust workstation height to power zone (knuckle to elbow height) and implement job rotation.',
        },
        actionPlan: [
          'Immediate: Provide adjustable scissor lift tables to eliminate lumbar flexion past 45 degrees.',
          'Administrative: Implement mandatory 5-minute micro-breaks every 45 minutes of sustained repetitive picking.',
          'Engineering: Relocate heavy parts within worker reach envelope (maximum 40cm reach depth).',
          'Safety perimeter: Reposition hazard boundary warning beacons 0.5m farther from active conveyor gears.',
        ],
        breakSchedule: {
          recommendedBreakMinutes: Math.min(15, Math.max(5, Math.round(peakRula * 1.5))),
          microBreakFrequency: 'Every 35-40 minutes',
          targetedStretches: [
            'Thoracolumbar Extension (Standing backward bend - 3 reps x 10s)',
            'Cervical Retraction (Chin tucks - 5 reps x 5s)',
            'Forearm Flexor & Extensor Stretch (15s each arm)',
          ],
        },
      });
    }

    const ai = new GoogleGenAI();
    const prompt = `You are a certified professional ergonomist (CPE) and industrial safety engineer specializing in Industry 5.0 human-centric manufacturing.
Analyze the following real-time computer vision ergonomic tracking data for a worker:

- Job Role: ${jobRole}
- Session Duration: ${Math.round(sessionDurationSec)} seconds (${(sessionDurationSec / 60).toFixed(1)} mins)
- Average RULA Score: ${avgRula} / 7 (Peak RULA: ${peakRula} / 7)
- Average REBA Score: ${avgReba} / 15 (Peak REBA: ${peakReba} / 15)
- Sustained Awkward Postures (>5s hold): ${sustainedStrainCount} instances
- Repetitive Cycles (Lifts/Bends): ${totalRepCycles} cycles
- Repetition Frequency: ${repFrequencyPerMin} cycles/min
- Safety Exclusion Zone Breaches: ${safetyBreaches} incidents
- Most Strained Joints: ${highRiskJoints.join(', ') || 'Trunk Flexion, Neck Extension, Shoulder Abduction'}
- Posture Breakdown: ${JSON.stringify(postureDistribution)}

Generate a comprehensive, actionable ergonomics audit formatted as strictly valid JSON with this schema:
{
  "summary": "2-3 sentence executive summary of postural findings and health impact",
  "riskLevel": "Low Risk" | "Medium Risk" | "High Risk" | "Severe Immediate Action Required",
  "biomechanicalAnalysis": ["3-4 bullet points detailing specific joint moment arms, disc compression risks, or tendon shear"],
  "oshaCompliance": {
    "standard": "OSHA 1910.900 / ISO 11228 / NIOSH Lifting Equation compliance context",
    "rating": "Compliant" | "Borderline" | "Non-Compliant",
    "recommendation": "1-2 sentence regulatory compliance recommendation"
  },
  "actionPlan": ["3-4 concrete engineering and administrative controls"],
  "breakSchedule": {
    "recommendedBreakMinutes": number,
    "microBreakFrequency": "e.g. Every 40 minutes",
    "targetedStretches": ["3 targeted physical therapy stretches for the identified high-risk joints"]
  }
}
Return ONLY the raw JSON object without markdown code fences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '{}';
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const result = JSON.parse(cleanJson);
    res.json(result);
  } catch (error) {
    console.error('Ergonomics AI Audit Error:', error);
    res.status(500).json({ error: 'Failed to generate AI audit', details: String(error) });
  }
});

// Configure Vite or Static server
async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`ErgoVision AI server running at http://localhost:${port}`);
  });
}

setupServer();
