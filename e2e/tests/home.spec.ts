import { test, expect } from './fixtures';

test.describe('Home page', () => {
  test('loads with no console errors and no failed requests', async ({ page, issues }) => {
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('h1')).toContainText('Madhav');
    // Let idle work (Explore menu build, service worker, analytics) run before judging
    await page.waitForTimeout(2500);
    expect(issues.console, 'console errors').toEqual([]);
    expect(issues.failed, 'failed requests').toEqual([]);
  });

  test('title, meta, Open Graph and JSON-LD are present', async ({ page, request }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Madhav Srinivasan/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://sbmadhav.com/');
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    for (const p of ['og:title', 'og:description', 'og:image', 'og:url']) {
      await expect(page.locator(`meta[property="${p}"]`)).toHaveAttribute('content', /.+/);
    }
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect((await request.get(new URL(og!).pathname)).status()).toBe(200);

    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || '{}');
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe('Madhav Srinivasan');
    expect(ld.sameAs).toEqual(expect.arrayContaining(['https://github.com/sbmadhav']));
  });

  test('header nav anchors scroll to their sections', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'The header section nav is hidden below 1180px; the Explore menu covers phones');
    await page.goto('/');
    // Five links: with six, the header did not hold the controls inside the content width
    await expect(page.locator('header .md-nav a')).toHaveCount(5);
    for (const id of ['work', 'journey', 'projects', 'views', 'games']) {
      await page.locator(`header .md-nav a[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test('hero call-to-action buttons lead with the work; one goes to the games', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('.hero .cta a');
    expect(await cta.evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['#journey', '#projects', '#games', '#hello']);
    await page.locator('.hero .cta a[href="#games"]').click();
    await expect(page.locator('#games')).toBeInViewport();
    await page.locator('#games .cta a[href="#bugs"]').click();
    await expect(page.locator('#bugs')).toBeInViewport();
  });

  test('the work comes before the games: section order', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('main > section').evaluateAll(ss => ss.map(s => s.id));
    expect(ids).toEqual(['top', 'work', 'journey', 'projects', 'views', 'games', 'lab', 'bugs', 'play', 'hello']);
  });

  test('What I do: four pillars that say what is the day job and what is not', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('#work .card');
    await expect(cards).toHaveCount(4);
    await expect(cards.locator('h3 .pro')).toHaveText(['Leading teams', 'Compliance engineering', 'Agentic engineering', 'Voice agents']);
    // Team sizes are on the page, and the voice agent work is dated to the earlier role
    await expect(cards.nth(0).locator('p.pro')).toContainText('about 70');
    await expect(cards.nth(0).locator('p.pro')).toContainText('3 to 21');
    await expect(cards.nth(0).locator('p.pro')).toContainText('2 to 25');
    await expect(cards.nth(3).locator('p.pro')).toContainText('At Ascension I built GRACE');
    await expect(cards.nth(3).locator('p.pro')).toContainText('on my own time');
  });

  test('Projects and writing: four links to my own work, the outside one in a new tab', async ({ page, request }) => {
    await page.goto('/');
    const cards = page.locator('#projects a.proj');
    expect(await cards.evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['/state-of-voice-agents/', 'https://learnvedicmath.com/', '#games', '/design-system/']);
    const out = page.locator('#projects a.proj[href="https://learnvedicmath.com/"]');
    await expect(out).toHaveAttribute('target', '_blank');
    await expect(out).toHaveAttribute('rel', /noopener/);
    await expect(out).toContainText('(opens in a new tab)');
    for (const href of ['/state-of-voice-agents/', '/design-system/', 'https://learnvedicmath.com/']) expect((await request.get(href)).status(), href).toBe(200);
    // No link anywhere on the page to the old Vedic Math address
    await expect(page.locator('a[href*="/vedic-math"]')).toHaveCount(0);
    await page.locator('#projects a.proj[href="#games"]').click();
    await expect(page.locator('#games')).toBeInViewport();
  });

  test('What I believe: four views, marked as my own, linked to the demo and the report', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#views .beliefs li')).toHaveCount(4);
    await expect(page.locator('#views .sec-head p.pro')).toContainText("not my employer's");
    await page.locator('#views .beliefs p.pro a[href="#lab"]').click();
    await expect(page.locator('#lab')).toBeInViewport();
    await expect(page.locator('#views .beliefs p.pro a[href="/state-of-voice-agents/"]')).toHaveCount(1);
  });

  test('the games band says why the games and kid mode exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#games p.pro')).toContainText('Building games is my passion');
    await expect(page.locator('#games p.pro')).toContainText('Kid mode exists for the same reason');
    expect(await page.locator('#games .cta a').evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['#lab', '#bugs', '#play']);
  });

  test('kid mode has its own copy in the new sections', async ({ page }) => {
    await page.goto('/?kid');
    await expect(page.locator('#projects h2 .kid')).toHaveText('Things I made');
    await expect(page.locator('#projects h2 .pro')).toBeHidden();
    await expect(page.locator('#views .beliefs p.kid').first()).toBeVisible();
    await expect(page.locator('#views .beliefs p.pro').first()).toBeHidden();
    await expect(page.locator('#games p.kid')).toBeVisible();
    await expect(page.locator('#journey .facts dd .kid').first()).toBeVisible();
    await expect(page.locator('#games .cta a[href="#play"] .kid')).toBeVisible();
    await expect(page.locator('#games .cta a[href="#play"] .kid')).toHaveText('Robot Maze');
  });

  test('kid mode swaps .pro and .kid copy and persists across reload', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#modeToggle');
    const proLede = page.locator('.lede .pro'), kidLede = page.locator('.lede .kid');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(proLede).toBeVisible();
    await expect(kidLede).toBeHidden();

    await toggle.click();
    await expect(page.locator('body')).toHaveClass(/kidmode/);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(kidLede).toBeVisible();
    await expect(proLede).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('kidmode'))).toBe('1');

    await page.reload();
    await expect(page.locator('body')).toHaveClass(/kidmode/);
    await expect(page.locator('.lede .kid')).toBeVisible();

    await page.locator('#modeToggle').click();
    await expect(page.locator('body')).not.toHaveClass(/kidmode/);
    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/kidmode/);
  });

  test('?kid in the URL starts in kid mode', async ({ page }) => {
    await page.goto('/?kid');
    await expect(page.locator('body')).toHaveClass(/kidmode/);
    await expect(page.locator('#play .kid .maze')).toBeVisible();
  });

  test('Deep Space blurs only the sticky header and its kid mode switch, so WebKit keeps rendering', async ({ page }) => {
    // A backdrop-filter on every card, button and chip made Linux WebKit stop painting the page
    // (no animation frames, so clicks never settled) whenever it loaded in Deep Space.
    for (const setup of ['system', 'saved'] as const) {
      await page.emulateMedia({ colorScheme: setup === 'system' ? 'dark' : 'light' });
      await page.goto('/');
      if (setup === 'saved') { await page.evaluate(() => localStorage.setItem('theme', 'dark')); await page.reload(); }
      const blurred = await page.evaluate(() => [...document.querySelectorAll('body *')]
        .filter(el => { const f = getComputedStyle(el).backdropFilter || (getComputedStyle(el) as any).webkitBackdropFilter; return f && f !== 'none'; })
        .map(el => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '')));
      // The header, plus the design system's glass on its kid mode switch (md-switch); never the page's own cards
      expect(blurred, setup).toEqual(['header.md-header', 'button.md-switch']);
      // Frames keep coming after a reload
      await page.reload();
      expect(await page.evaluate(() => new Promise(r => { const t = setTimeout(() => r('stalled'), 3000); requestAnimationFrame(() => { clearTimeout(t); r('ok'); }); })), setup).toBe('ok');
    }
  });

  for (const system of ['light', 'dark'] as const) {
    test(`color scheme: follows the ${system} system setting, switches, persists, and returns to System`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system });
      await page.goto('/');
      const root = page.locator('html');
      const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const meta = page.locator('meta[name="theme-color"]');
      const other = system === 'light' ? 'dark' : 'light';

      await expect(root).not.toHaveAttribute('data-theme', /./);
      await expect(meta).toHaveAttribute('content', system === 'dark' ? '#0F1218' : '#F6F7F9');
      const systemBg = await bg();

      // Switch away from the system scheme: an explicit, saved override
      await page.locator('#themeBtn').click();
      await expect(root).toHaveAttribute('data-theme', other);
      await expect(meta).toHaveAttribute('content', other === 'dark' ? '#0F1218' : '#F6F7F9');
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(other);
      await expect.poll(bg).not.toBe(systemBg);

      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', other);

      // Switching back to the system's scheme clears the override (follow the system again)
      await page.locator('#themeBtn').click();
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('');
      await page.reload();
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
      await expect.poll(bg).toBe(systemBg);
    });

    test(`color scheme (${system} system): Bolt reacts to the header's theme button`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system });
      await page.goto('/');
      await page.locator('#themeBtn').click();
      await expect(page.locator('#bubble')).toHaveClass(/show/);
      await expect(page.locator('#bubble')).toHaveText(system === 'light' ? /Deep Space|deep space/ : /Daybreak|sunshine/);
      await expect(page.locator('#themeBtn')).toHaveAttribute('aria-label', system === 'light' ? 'Switch to Daybreak (light) scheme' : 'Switch to Deep Space (dark) scheme');
    });
  }

  test('Bolt talks when clicked, in both modes', async ({ page }) => {
    await page.goto('/');
    await page.locator('#bot').click();
    await expect(page.locator('#bubble')).toHaveText(/Bolt|route|token|guardrail|Brain Lab|kid/);
    await page.locator('#modeToggle').click();
    await page.locator('#bot').click();
    await expect(page.locator('#bubble')).toHaveClass(/show/);
  });

  test('"How to say it" shows the pronunciation', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sayName').click();
    await expect(page.locator('#bubble')).toHaveText("It's MAA-dhuv.");
  });

  test('logo clicked five times unlocks the easter egg, without leaving the page', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('header .md-brand');
    await expect(logo).toHaveAttribute('href', '/');
    await page.evaluate(() => { (window as any).__stay = 1; });
    for (let i = 0; i < 5; i++) await logo.click();
    await expect(page.locator('#bubble')).toHaveText(/Easter egg|secret party/);
    expect(await page.evaluate(() => (window as any).__stay), 'the brand link scrolls instead of reloading the home page').toBe(1);
  });

  test('music player starts, changes track and stops (generated audio, no files)', async ({ page }) => {
    await page.goto('/');
    const play = page.locator('#musicBtn');
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    const first = await page.locator('#trackName').textContent();
    await page.locator('#nextTrack').click();
    await expect(page.locator('#trackName')).not.toHaveText(first || '');
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#trackName')).toHaveText('Music');
  });

  test('footer shows the current year', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#yr')).toHaveText(String(new Date().getFullYear()));
  });

  test('profile images and fonts load', async ({ page, request }) => {
    await page.goto('/');
    const img = page.locator('.portrait img');
    await expect(img).toBeVisible();
    expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    for (const f of ['fredoka-latin-600-normal', 'fredoka-latin-700-normal', 'nunito-sans-latin-wght-normal', 'space-grotesk-latin-wght-normal', 'jetbrains-mono-latin-500-normal']) {
      const r = await request.get(`/assets/fonts/${f}.woff2`);
      expect(r.status(), f).toBe(200);
    }
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('600 16px Fredoka'))).toBe(true);
  });
});
