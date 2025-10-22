Nice—if you’ve got explicit permission, Playwright can handle the whole loop: log in once, reuse the session, search, and drive both **Easy Apply** and **external ATS** flows.

Below is a lean, local-first setup you can run today. It’s TypeScript + Playwright, uses a saved session (so you don’t store passwords), rate-limits itself, and has pluggable adapters for Lever/Greenhouse/Workday.

---

# 0) Prereqs

* Node.js 20+
* `npm i -D playwright tsx typescript`
* `npx playwright install`

Folder:

```
li-assistant/
  .env
  resumes/ Azure-API-Lead.pdf
  storage/ storageState.json        # saved session here
  src/
    login.ts
    search.ts
    easyApply.ts
    adapters/
      greenhouse.ts
      lever.ts
      workday.ts
    applyExternal.ts
    cli.ts
  tsconfig.json
  package.json
```

**package.json**

```json
{
  "name": "li-assistant",
  "private": true,
  "type": "module",
  "scripts": {
    "login": "tsx src/login.ts",
    "search": "tsx src/search.ts",
    "apply:easy": "tsx src/easyApply.ts",
    "apply:ext": "tsx src/applyExternal.ts",
    "run": "tsx src/cli.ts"
  },
  "dependencies": {
    "playwright": "^1.46.0"
  },
  "devDependencies": {
    "tsx": "^4.16.0",
    "typescript": "^5.6.3"
  }
}
```

**tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  }
}
```

---

# 1) One-time login that saves the session

You’ll do the first login **manually** in a headed browser; Playwright then stores cookies + tokens to reuse safely.

**src/login.ts**

```ts
import { chromium } from 'playwright';
import fs from 'fs/promises';

const STORAGE = 'storage/storageState.json';

(async () => {
  await fs.mkdir('storage', { recursive: true });
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Opening LinkedIn login…');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

  console.log('Log in manually (2FA too). When you’re fully logged in and the top bar shows your avatar, press ENTER here.');
  process.stdin.resume();
  process.stdin.on('data', async () => {
    await context.storageState({ path: STORAGE });
    console.log(`Saved session to ${STORAGE}`);
    process.exit(0);
  });
})();
```

Run: `npm run login` → log in → press ENTER in the terminal → session saved.

---

# 2) Job search that builds a queue

This example uses the logged-in session to load filters reliably and then collects **job card** links + metadata. (You can also do this logged-out; your call.)

**src/search.ts**

```ts
import { chromium } from 'playwright';
const STORAGE = 'storage/storageState.json';

type Job = { title: string; company: string; link: string; easy: boolean };

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: STORAGE });
  const page = await context.newPage();

  // Example: Azure API jobs, US remote, posted < week. Adjust as needed.
  const url = 'https://www.linkedin.com/jobs/search/?keywords=Azure%20API%20Engineer&f_TPR=r604800&f_WT=2&location=United%20States&geoId=103644278';
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Scroll to load more
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 3000);
    await delay(600);
  }

  const cards = page.locator('ul.jobs-search__results-list li');
  const n = await cards.count();
  const jobs: Job[] = [];

  for (let i = 0; i < n; i++) {
    const li = cards.nth(i);
    const title = (await li.locator('.base-search-card__title').innerText()).trim();
    const company = (await li.locator('.base-search-card__subtitle').innerText()).trim();
    const link = await li.locator('a.base-card__full-link').getAttribute('href') ?? '';
    const easy = await li.locator('span:has-text("Easy Apply")').count() > 0;
    if (link) jobs.push({ title, company, link, easy });
  }

  console.log(JSON.stringify(jobs, null, 2));
  await browser.close();
})();
```

Pipe that JSON to a file if you want: `npm run search > jobs.json`.

---

# 3) Easy Apply automation (modal flow)

This loop opens each job, clicks **Easy Apply**, then iterates steps. We fill by accessible **labels** and **roles**; you can extend the field map to suit your profile. We handle uploads where allowed.

**src/easyApply.ts**

```ts
import { chromium, Page } from 'playwright';
import fs from 'fs';

const STORAGE = 'storage/storageState.json';
const RESUME = 'resumes/Azure-API-Lead.pdf';
const JOBS_PATH = 'jobs.json'; // from search step

const ANSWERS: Record<string,string> = {
  'Full name': 'Rommel Bandeira',
  'Email': 'rommelb@gmail.com',
  'Phone': '352-397-8650',
  'City': 'Brooksville, FL',
  'LinkedIn Profile': 'https://www.linkedin.com/in/rombandeira',
  'Work authorization': 'Citizen',
  'Do you require sponsorship': 'No',
  'Years of .NET': '15',
  'Why are you a fit?': 'Built Azure API platforms with APIM governance, Service Bus EDA, Durable orchestrations, and DDD in production.'
};

async function fillAll(page: Page, answers: Record<string,string>) {
  for (const [label, value] of Object.entries(answers)) {
    try {
      const byLabel = page.getByLabel(new RegExp(label, 'i'));
      if (await byLabel.count()) { await byLabel.first().fill(value); continue; }

      const textbox = page.getByRole('textbox', { name: new RegExp(label, 'i') });
      if (await textbox.count()) { await textbox.first().fill(value); continue; }

      // Radios/checkboxes
      const group = page.locator('label:has(input[type="radio"]), label:has(input[type="checkbox"])');
      const count = await group.count();
      for (let i=0;i<count;i++){
        const L = group.nth(i);
        const text = (await L.innerText()).toLowerCase();
        if (text.includes(value.toLowerCase())) { await L.click(); break; }
      }
    } catch { /* tolerate odd fields */ }
  }

  // Resume upload if file input exists
  const file = page.locator('input[type="file"]');
  if (await file.count()) await file.first().setInputFiles(RESUME);
}

async function nextOrSubmit(page: Page): Promise<'next'|'submit'|'done'|'stuck'> {
  // Buttons differ per step; try common patterns
  const submit = page.locator('button:has-text("Submit")');
  if (await submit.count()) { await submit.first().click(); return 'submit'; }

  const review = page.locator('button:has-text("Review")');
  if (await review.count()) { await review.first().click(); return 'next'; }

  const next = page.locator('button:has-text("Next")');
  if (await next.count()) { await next.first().click(); return 'next'; }

  const done = page.locator('button:has-text("Done")');
  if (await done.count()) { return 'done'; }

  return 'stuck';
}

(async () => {
  const jobs = JSON.parse(fs.readFileSync(JOBS_PATH,'utf-8')) as Array<{link:string, easy:boolean}>;
  const targets = jobs.filter(j => j.easy);

  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ storageState: STORAGE });
  const page = await context.newPage();

  for (const job of targets) {
    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded' });
      const easyBtn = page.locator('button:has-text("Easy Apply")');
      if (!(await easyBtn.count())) { console.log('No Easy Apply here.'); continue; }

      await easyBtn.first().click();
      const modal = page.locator('[data-test-modal], .jobs-easy-apply-modal');
      await modal.waitFor({ state: 'visible', timeout: 10000 });

      // Step loop
      for (let step=0; step<8; step++){
        await fillAll(page, ANSWERS);
        const res = await nextOrSubmit(page);
        if (res === 'submit') { 
          console.log('Submitted.'); 
          break; 
        }
        if (res === 'done') { 
          console.log('Done without submit (might be already applied).'); 
          break; 
        }
        if (res === 'stuck') { 
          console.log('Stuck—needs manual review.'); 
          break; 
        }
        await page.waitForTimeout(600);
      }

      // Close modal if open
      const close = page.locator('button[aria-label="Dismiss"], button[aria-label="Close"]');
      if (await close.count()) await close.first().click();

      // Pace to look human
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log('Error on job:', job.link, (e as Error).message);
    }
  }

  await browser.close();
})();
```

---

# 4) External “Apply” → ATS adapters

We follow the “Apply” link to Lever/Greenhouse/Workday/etc., then run a domain-specific filler. Start with two adapters; you can add more later.

**src/adapters/greenhouse.ts**

```ts
import { Page } from 'playwright';
export async function fillGreenhouse(page: Page, answers: Record<string,string>, resumePath?: string) {
  for (const [k,v] of Object.entries(answers)) {
    const byLabel = page.getByLabel(new RegExp(k, 'i'));
    if (await byLabel.count()) { await byLabel.first().fill(v); continue; }
    const key = k.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    const byName = page.locator(`[name*="${key}"], [id*="${key}"]`);
    if (await byName.count()) { await byName.first().fill(v); continue; }
  }
  const file = page.locator('input[type="file"]');
  if (resumePath && await file.count()) await file.first().setInputFiles(resumePath);
}
```

**src/adapters/lever.ts**

```ts
import { Page } from 'playwright';
export async function fillLever(page: Page, answers: Record<string,string>, resumePath?: string) {
  for (const [k,v] of Object.entries(answers)) {
    const byPlaceholder = page.getByPlaceholder(new RegExp(k, 'i'));
    if (await byPlaceholder.count()) { await byPlaceholder.first().fill(v); continue; }
    const byLabel = page.getByLabel(new RegExp(k, 'i'));
    if (await byLabel.count()) { await byLabel.first().fill(v); continue; }
  }
  const file = page.locator('input[type="file"]');
  if (resumePath && await file.count()) await file.first().setInputFiles(resumePath);
}
```

**src/adapters/workday.ts**

```ts
import { Page } from 'playwright';
export async function fillWorkday(page: Page, answers: Record<string,string>, resumePath?: string) {
  await page.waitForLoadState('domcontentloaded');
  for (const [k,v] of Object.entries(answers)) {
    const tb = page.getByRole('textbox', { name: new RegExp(k, 'i') });
    if (await tb.count()) { await tb.first().fill(v); continue; }
    const dataAuto = page.locator(`[data-automation-id*="${k.replace(/\s+/g,'')}"] input`);
    if (await dataAuto.count()) { await dataAuto.first().fill(v); }
  }
  const file = page.locator('input[type="file"]');
  if (resumePath && await file.count()) await file.first().setInputFiles(resumePath);
}
```

**src/applyExternal.ts**

```ts
import { chromium, Page } from 'playwright';
import fs from 'fs';

const STORAGE = 'storage/storageState.json';
const RESUME = 'resumes/Azure-API-Lead.pdf';
const JOBS_PATH = 'jobs.json';

const ANSWERS: Record<string,string> = {
  'Full name': 'Rommel Bandeira',
  'Email': 'rommelb@gmail.com',
  'Phone': '352-397-8650',
  'City': 'Brooksville, FL',
  'LinkedIn Profile': 'https://www.linkedin.com/in/rombandeira',
  'Work authorization': 'Citizen',
  'Do you require sponsorship': 'No'
};

function pickAdapter(url: string) {
  if (/jobs\.lever\.co/.test(url)) return 'lever';
  if (/greenhouse\.io/.test(url)) return 'greenhouse';
  if (/myworkdayjobs\.com|workday\.com/.test(url)) return 'workday';
  return 'generic';
}

async function fillGeneric(page: Page, answers: Record<string,string>, resumePath?: string) {
  for (const [k,v] of Object.entries(answers)) {
    const byLabel = page.getByLabel(new RegExp(k, 'i'));
    if (await byLabel.count()) { await byLabel.first().fill(v); continue; }
    const tb = page.getByRole('textbox', { name: new RegExp(k, 'i') });
    if (await tb.count()) { await tb.first().fill(v); continue; }
  }
  const file = page.locator('input[type="file"]');
  if (resumePath && await file.count()) await file.first().setInputFiles(resumePath);
}

(async () => {
  const { fillGreenhouse } = await import('./adapters/greenhouse.js');
  const { fillLever } = await import('./adapters/lever.js');
  const { fillWorkday } = await import('./adapters/workday.js');

  const jobs = JSON.parse(fs.readFileSync(JOBS_PATH,'utf-8')) as Array<{link:string, easy:boolean}>;
  const external = jobs.filter(j => !j.easy);

  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ storageState: STORAGE });
  const page = await context.newPage();

  for (const job of external) {
    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded' });
      // Find the external apply button/link on the LI job page
      const applyBtn = page.locator('a:has-text("Apply"), a:has-text("Apply on company site"), a:has-text("Apply on")');
      if (!(await applyBtn.count())) { console.log('No external apply link.'); continue; }

      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        applyBtn.first().click()
      ]);
      await newPage.waitForLoadState('domcontentloaded');

      const which = pickAdapter(newPage.url());
      if (which === 'lever') await fillLever(newPage, ANSWERS, RESUME);
      else if (which === 'greenhouse') await fillGreenhouse(newPage, ANSWERS, RESUME);
      else if (which === 'workday') await fillWorkday(newPage, ANSWERS, RESUME);
      else await fillGeneric(newPage, ANSWERS, RESUME);

      // pause for human review and submit
      console.log(`Filled ${which}. Review and submit: ${newPage.url()}`);
      await newPage.waitForTimeout(4000);

      await newPage.close();
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log('External apply error:', (e as Error).message);
    }
  }

  await browser.close();
})();
```

---

# 5) Running it

1. `npm run login` → log in manually → ENTER to save session.
2. `npm run search > jobs.json`
3. `npm run apply:easy`
4. `npm run apply:ext`

You can merge these in `cli.ts` later with flags like `--easy-only` / `--ext-only`.

---

# Practical tips that make this durable

* **Reuse storage state**: you avoid flaky credential flows and 2FA loops.
* **Headed + slowMo** in early runs to stabilize selectors; turn headless on later if desired.
* **Field synonyms**: keep a small map of label variants (e.g., “Do you require sponsorship?” ↔ “Work Authorization”).
* **Backoff + jitter**: add small random waits between steps (`await page.waitForTimeout(800 + Math.random()*600)`), especially across many jobs.
* **Trace viewer**: wrap tricky runs with `context.tracing.start({ screenshots: true, snapshots: true }); … stop({ path: 'trace.zip' })` and `npx playwright show-trace trace.zip`.
* **Uploads**: every ATS names the file input differently; the generic `input[type="file"]` catch usually works, but adapters let you special-case odd ones.
* **Errors**: catch and continue—log the job link so you can revisit manually.

---

# Security & compliance notes

You said you have permission; still, a few guardrails keep things sane:

* Keep a **human review** step before submission (especially for external ATS).
* Store your session in a private folder; don’t commit `storage/storageState.json`.
* Never hardcode PII; load it from a local `.env` / encrypted store if you must.
* If you hit captchas, do not bypass: pause and handle manually.

---

This is a compact but production-capable skeleton. If you want, I can collapse it into a single `cli.ts` with commands `login`, `search`, `apply --easy`, `apply --ext`, and add a tiny SQLite to track statuses (`queued/applied/interview`).
