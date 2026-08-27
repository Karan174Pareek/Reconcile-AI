import fs from 'fs';
import path from 'path';

const sections = [
  'overview',
  'how-it-works',
  'master-flow',
  'matching-engine',
  'multi-pass',
  'data-transformation',
  'exceptions',
  'results',
  'architecture',
  'verification',
  'system-map'
];

const homeViewPath = path.resolve('client/src/components/HomeLandingView.jsx');
const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');

console.log('=== Scroll-Spy 11-Section Target Audit ===');
sections.forEach((id) => {
  const fileSearchRegex = new RegExp(`id=["']${id}["']`);
  // Search component files under client/src/components/storytelling
  const storytellingDir = path.resolve('client/src/components/storytelling');
  const files = fs.readdirSync(storytellingDir);
  let foundFile = null;
  for (const f of files) {
    if (f.endsWith('.jsx')) {
      const content = fs.readFileSync(path.join(storytellingDir, f), 'utf8');
      if (fileSearchRegex.test(content)) {
        foundFile = f;
        break;
      }
    }
  }

  const renderedInHome = homeViewContent.includes(id) || foundFile !== null;
  console.log(`Section "${id}": ${foundFile ? 'EXISTS in ' + foundFile : 'NOT FOUND'} (Rendered in HomeLandingView: ${renderedInHome})`);
});
