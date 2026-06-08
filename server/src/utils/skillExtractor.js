/**
 * Phase 4 — keyword-based skill extraction.
 * Phase 8 replaces this with OpenAI structured extraction.
 * The extractedSkills field is already in the Resume schema so the
 * AI results slot in without a schema migration.
 */

// Each entry is lower-cased. Multi-word entries use simple includes().
// Single-word entries use word-boundary regex to avoid false positives
// (e.g. "go" inside "good").
const SKILLS = [
  // ── Languages ──────────────────────────────────────────────────────────────
  'javascript', 'typescript', 'python', 'java', 'golang', 'rust',
  'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'r',
  'bash', 'powershell', 'perl', 'lua', 'elixir', 'haskell', 'dart',

  // ── Frontend ───────────────────────────────────────────────────────────────
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'gatsby',
  'html', 'css', 'sass', 'tailwind', 'webpack', 'vite', 'redux',
  'react native', 'flutter', 'electron',

  // ── Backend ────────────────────────────────────────────────────────────────
  'node.js', 'express', 'fastapi', 'django', 'flask', 'spring boot',
  'laravel', 'rails', 'gin', 'fiber', 'nestjs',
  'graphql', 'grpc', 'rest api', 'websockets', 'oauth',

  // ── Databases ──────────────────────────────────────────────────────────────
  'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch',
  'cassandra', 'dynamodb', 'firebase', 'supabase', 'prisma', 'sequelize',

  // ── Cloud & DevOps ─────────────────────────────────────────────────────────
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ansible',
  'github actions', 'jenkins', 'circleci', 'nginx', 'linux', 'helm',
  'cloudflare', 'vercel', 'netlify', 'heroku',

  // ── AI / ML ────────────────────────────────────────────────────────────────
  'machine learning', 'deep learning', 'tensorflow', 'pytorch',
  'scikit-learn', 'nlp', 'computer vision', 'langchain', 'openai',
  'hugging face', 'pandas', 'numpy', 'matplotlib',

  // ── Testing ────────────────────────────────────────────────────────────────
  'jest', 'pytest', 'cypress', 'playwright', 'selenium', 'junit',
  'testing library', 'vitest',

  // ── Other ──────────────────────────────────────────────────────────────────
  'git', 'agile', 'scrum', 'microservices', 'kafka', 'rabbitmq',
  'grpc', 'websockets', 'blockchain', 'solidity',
];

// Words where substring matching causes false positives — these need
// a strict word-boundary test.
const SINGLE_WORD_SKILLS = new Set([
  'java', 'go', 'r', 'c', 'lua', 'git', 'aws', 'gcp', 'gin',
  'html', 'css', 'sass', 'dart', 'jest', 'helm',
]);

/**
 * Extracts a deduplicated list of known skills from resume text.
 * @param {string} text
 * @returns {string[]}
 */
export const extractSkills = (text) => {
  if (!text || typeof text !== 'string') return [];

  const found = new Set();
  const lower = text.toLowerCase();

  for (const skill of SKILLS) {
    if (SINGLE_WORD_SKILLS.has(skill)) {
      // Use word boundary to avoid "go" matching "good", etc.
      const re = new RegExp(`(?<![a-z])${escapeRegex(skill)}(?![a-z])`, 'i');
      if (re.test(lower)) found.add(skill);
    } else {
      if (lower.includes(skill)) found.add(skill);
    }
  }

  return [...found].sort();
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
