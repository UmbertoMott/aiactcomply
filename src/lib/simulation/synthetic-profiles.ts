export interface SyntheticProfile {
  id: number;
  age: number;
  gender: string;
  ethnicity: string;
  disability: string;
  income_level: string;
  education: string;
  region: string;
  vulnerable_group: string[];
}

const ETHNICITIES = ["Caucasico", "Asiatico", "Africano", "Ispanico", "Mediorientale", "Misto"];
const DISABILITIES = ["Nessuna", "Visiva", "Motoria", "Cognitiva", "Uditive", "Nessuna", "Nessuna"];
const REGIONS = ["Nord Italia", "Centro Italia", "Sud Italia", "Isole", "Est Europa", "Nord Africa"];
const EDUCATION = ["Laurea", "Diploma", "Media", "Dottorato", "Nessun titolo", "Master"];
const INCOMES = ["Basso (<15k)", "Medio-basso (15-30k)", "Medio (30-50k)", "Alto (50-100k)", "Molto alto (>100k)"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSyntheticProfiles(count: number = 10000): SyntheticProfile[] {
  const profiles: SyntheticProfile[] = [];

  for (let i = 0; i < count; i++) {
    const age = Math.floor(Math.random() * 80) + 18;
    const ethnicity = pick(ETHNICITIES);
    const disability = pick(DISABILITIES);

    const vulnerability: string[] = [];
    if (age > 65) vulnerability.push("Anziano");
    if (age < 25) vulnerability.push("Giovane");
    if (ethnicity !== "Caucasico") vulnerability.push("Minoranza etnica");
    if (disability !== "Nessuna") vulnerability.push(`Disabilità ${disability.toLowerCase()}`);
    if (Math.random() > 0.7) vulnerability.push("Basso reddito");
    if (Math.random() > 0.85) vulnerability.push("Migranti");
    if (vulnerability.length === 0) vulnerability.push("Nessuna vulnerabilità");

    profiles.push({
      id: i + 1,
      age,
      gender: Math.random() > 0.5 ? "M" : "F",
      ethnicity,
      disability,
      income_level: pick(INCOMES),
      education: pick(EDUCATION),
      region: pick(REGIONS),
      vulnerable_group: vulnerability,
    });
  }

  return profiles;
}

export interface ImpactResult {
  group: string;
  totalTests: number;
  positiveOutcomes: number;
  positiveRate: number;
  referenceRate: number;
  impactRatio: number;
  disparity: number;
  flagged: boolean;
}

export function computeImpactRatio(
  profiles: SyntheticProfile[],
  simulateBias: boolean = false
): ImpactResult[] {
  const referenceGroup = profiles.filter(
    (p) => p.ethnicity === "Caucasico" && p.disability === "Nessuna" && p.age >= 25 && p.age <= 55
  );
  const refPositive = referenceGroup.filter(() => Math.random() > (simulateBias ? 0.35 : 0.25)).length;
  const refRate = referenceGroup.length > 0 ? refPositive / referenceGroup.length : 1;

  const groups: Record<string, SyntheticProfile[]> = {};
  for (const p of profiles) {
    for (const v of p.vulnerable_group) {
      if (v === "Nessuna vulnerabilità") continue;
      if (!groups[v]) groups[v] = [];
      groups[v].push(p);
    }
  }

  return Object.entries(groups).map(([group, members]) => {
    const total = members.length;
    const positive = members.filter(() => {
      let base = Math.random();
      if (simulateBias) {
        if (group === "Minoranza etnica") base += 0.15;
        if (group === "Disabilità visiva") base += 0.2;
        if (group === "Disabilità motoria") base += 0.18;
        if (group === "Anziano") base += 0.12;
        if (group === "Basso reddito") base += 0.1;
      }
      return base > 0.3;
    }).length;

    const rate = total > 0 ? positive / total : 0;
    const impactRatio = refRate > 0 ? rate / refRate : 1;
    const disparity = Math.abs(1 - impactRatio) * 100;

    return {
      group,
      totalTests: total,
      positiveOutcomes: positive,
      positiveRate: rate,
      referenceRate: refRate,
      impactRatio,
      disparity,
      flagged: impactRatio < 0.8,
    };
  }).sort((a, b) => a.impactRatio - b.impactRatio);
}
