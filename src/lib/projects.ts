/** Presentation details for each case study, shared by /projects/ and the project pages. */
export type Tone = 'mint' | 'indigo' | 'lilac';
export interface ProjectLook {
  eyebrow: string;
  headline: string;
  tone: Tone;
  icon: 'githubactions' | 'report' | 'portrait';
  mock: 'flexorder' | 'traffic' | 'face';
  category: string;
  /** The product's own icon, when the project tests a real product. */
  image?: string;
}

export const projectLook: Record<string, ProjectLook> = {
  'flexorder-e2e': { eyebrow: 'At WPPOOL · 2024 – now', headline: '38 tests guard every plugin release', tone: 'mint', icon: 'githubactions', mock: 'flexorder', category: 'Test automation', image: '/projects/flexorder-e2e.webp' },
  'traffic-flow-prediction': { eyebrow: 'Capstone · BUBT 2022', headline: 'Which model predicts traffic best?', tone: 'indigo', icon: 'report', mock: 'traffic', category: 'Machine learning', image: '/projects/traffic-flow-prediction.webp' },
  'ai-face-analyzer': { eyebrow: 'Side project · 2026', headline: 'Age, emotion and gender from one photo', tone: 'lilac', icon: 'portrait', mock: 'face', category: 'AI web app', image: '/projects/ai-face-analyzer.webp' },
};
