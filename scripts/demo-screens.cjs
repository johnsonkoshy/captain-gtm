const { chromium } = require('playwright');
// Clicks through the demo story on seed data and saves a screenshot of each step.
// Run the dev server first (npm run dev), then: node scripts/demo-screens.cjs [outDir]
// Needs Playwright with Chromium installed (not a project dependency).
const out = process.argv[2] || 'docs/screenshots';
const base = process.env.BASE_URL || 'http://localhost:3000';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1456, height: 860 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  require('fs').mkdirSync(out, { recursive: true });
  const shot = async (n, full=false) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${n}.png`, fullPage: false }); };
  const btn = (re) => p.getByRole('button', { name: re }).first();
  const click = async (re, wait=1800) => { await btn(re).click(); await p.waitForTimeout(wait); };
  const row = (name) => p.locator('.qrow', { hasText: name }).first();
  await p.goto(`${base}/intake`); await p.waitForLoadState('networkidle');
  await shot('1-intake');
  await btn(/Build the ICP/).click(); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/1b-thinking.png` });
  await p.waitForTimeout(1500); await shot('2-icp');
  await click(/^Accept$/, 600); await shot('2b-icp-accepted', true);
  await click(/Find accounts/); await shot('3-discovery', true);
  await click(/Find warm intros/); await shot('4-intros', true);
  await click(/Draft outreach/); 
  await row('Jonah').click(); await shot('5-review-flagged', true);
  await click(/^Edit$/, 400); await click(/Use the Reviewer/, 400); await shot('5b-editing');
  await click(/Save edit/, 500); await shot('5c-resolved', true);
  await click(/Approve and send/); await shot('5d-approved', true);
  await row('Sara').click(); await p.waitForTimeout(300); await click(/^Reject$/, 600);
  await row('Maya').click(); await p.waitForTimeout(300); await click(/Approve and send/); await shot('5e-all-decided', true);
  await click(/Open the pipeline/); await shot('6-pipeline');
  // empty state on a fresh session
  const p2 = await b.newPage({ viewport: { width: 1456, height: 860 } });
  await p2.goto(`${base}/review`); await p2.waitForTimeout(1500); await p2.screenshot({ path: `${out}/7-empty.png` });
  console.log(p.url()); console.log(errs.join('\n'));
  await b.close();
})();
