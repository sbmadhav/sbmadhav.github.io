import { test, expect } from './fixtures';

test.describe('Brain Lab', () => {
  test('a sample question routes to an agent and writes an answer', async ({ page }) => {
    await page.goto('/#lab');
    const chips = page.locator('#chips .chip');
    await expect(chips).toHaveCount(4);
    await chips.first().click();
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#thought')).toContainText('route: "scheduling"');
    await expect(page.locator('.lane.pick')).toHaveText('Scheduling agent');
    await expect(page.locator('#answer')).toContainText('openings next Tuesday');
  });

  test('the grown-up examples are a clinic front desk, not a bank', async ({ page }) => {
    await page.goto('/#lab');
    await expect(page.locator('#lanes .lane')).toHaveText(['Scheduling agent', 'Billing agent', 'Human handoff']);
    await expect(page.locator('#lab h3 .pro')).toHaveText('Try a patient request');
    const chips = await page.locator('#chips .chip').allTextContents();
    expect(chips.join(' ')).not.toMatch(/card|balance|account|charged twice/i);
  });

  test('a typed question is routed by keyword', async ({ page }) => {
    await page.goto('/#lab');
    const ask = async (q: string) => {
      await page.locator('#askInput').fill(q);
      await page.locator('#askForm button[type="submit"]').click();
    };
    await ask('I am really upset about this');
    await expect(page.locator('.lane.pick')).toHaveText('Human handoff');
    await expect(page.locator('#answer')).toContainText('connecting you to a person');
    await expect(page.locator('#askInput')).toHaveValue('');
    await ask('How much will my copay be?');
    await expect(page.locator('.lane.pick')).toHaveText('Billing agent');
    await ask('Can I book a visit for Friday?');
    await expect(page.locator('.lane.pick')).toHaveText('Scheduling agent');
  });

  test('anything urgent or unrecognised goes to a person', async ({ page }) => {
    await page.goto('/#lab');
    const ask = async (q: string) => {
      await page.locator('#askInput').fill(q);
      await page.locator('#askForm button[type="submit"]').click();
    };
    await ask('I have chest pain right now');
    await expect(page.locator('.lane.pick')).toHaveText('Human handoff');
    await expect(page.locator('#thought')).toContainText('handoff.urgent');
    await expect(page.locator('#answer')).toContainText('call 911');
    await expect(page.locator('#answer')).toContainText('nurse');
    // "explain" and "complain" hold the letters of other words; they are not urgent
    await ask('Please explain the weather');
    await expect(page.locator('.lane.pick')).toHaveText('Human handoff');
    await expect(page.locator('#answer')).toContainText('passing along what you asked');
    await expect(page.locator('#thought')).not.toContainText('handoff.urgent');
  });

  test('kid mode has kid questions and does the math', async ({ page }) => {
    await page.goto('/?kid#lab');
    await expect(page.locator('#chips .chip').first()).toHaveText('Tell me a joke!');
    await page.locator('#askInput').fill('what is 7 + 6');
    await page.locator('#askForm button[type="submit"]').click();
    await expect(page.locator('.lane.pick')).toHaveText('Math helper');
    await expect(page.locator('#answer')).toContainText('7 + 6 = 13');
  });
});

test.describe('Bug Hunt', () => {
  test('start, squash a bug, and the round ends with a saved best score', async ({ page }) => {
    await page.clock.install();
    await page.goto('/#bugs');
    await page.locator('#gameMusicBtn').click(); // game music off: no audio needed for the test
    await expect(page.locator('#gameMusicState')).toHaveText('Off');
    await page.locator('#startBtn').click();
    await expect(page.locator('#overlay')).toBeHidden();
    await page.clock.runFor(1000);
    const bug = page.locator('#arena .bug:not(.squash)').first();
    await expect(bug).toBeAttached();
    await bug.dispatchEvent('pointerdown');
    await expect(page.locator('#score')).toHaveText('1');
    await page.clock.runFor(21_000);
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#ovTitle')).toContainText(/bugs? fixed/);
    await expect(page.locator('#startBtn')).toHaveText('Play again');
    expect(Number(await page.evaluate(() => localStorage.getItem('bugBest')))).toBeGreaterThanOrEqual(1);
    await expect(page.locator('#best')).not.toHaveText('0');
  });
});

test.describe('Design Lab (grown-up mode)', () => {
  test('pick blocks within budget, launch, and read the post-mortem', async ({ page }) => {
    await page.goto('/#play');
    await expect(page.locator('#sdTabs .chip')).toHaveCount(3);
    await expect(page.locator('#sdTitle')).toHaveText('The Ticket Drop');
    await expect(page.locator('#sdLaunch')).toBeDisabled();
    for (const id of ['queue', 'locks', 'bots', 'cdn']) await page.locator(`.sdc[data-id="${id}"]`).click();
    await expect(page.locator('#sdSpent')).toHaveText('8');
    // The 4-credit option no longer fits the 10-credit budget
    await expect(page.locator('.sdc[data-id="bigdb"]')).toBeDisabled();
    await page.locator('#sdLaunch').click();
    await expect(page.locator('#sdResult .sd-score')).toBeVisible();
    await expect(page.locator('#sdResult h3')).toHaveText(/launch|Incident/i);
    await expect(page.locator('#sdResult .pm li').first()).toBeVisible();
  });

  test('switching scenario and reset clear the picks', async ({ page }) => {
    await page.goto('/#play');
    await page.locator('.sdc').first().click();
    await expect(page.locator('#sdTabs .chip')).toHaveText(['The Ticket Drop', 'The Clinic Voice Agent', 'The App Went Viral']);
    await page.locator('#sdTabs .chip', { hasText: 'The Clinic Voice Agent' }).click();
    await expect(page.locator('#sdTitle')).toHaveText('The Clinic Voice Agent');
    await expect(page.locator('#sdBrief')).toContainText('appointments for a clinic');
    await expect(page.locator('#sdSpent')).toHaveText('0');
    await page.locator('.sdc').first().click();
    await page.locator('#sdReset').click();
    await expect(page.locator('#sdSpent')).toHaveText('0');
    await expect(page.locator('#sdLaunch')).toBeDisabled();
  });
});

test.describe('Robot Maze (kid mode)', () => {
  test('level 1: four Forward blocks reach the star and unlock level 2', async ({ page }) => {
    await page.goto('/?kid#play');
    await expect(page.locator('#mazeLevel')).toHaveText('Level 1 of 5');
    const fwd = page.locator('.palette button[data-k="F"]');
    for (let i = 0; i < 4; i++) await fwd.click();
    await expect(page.locator('#blockCount')).toHaveText('4/16');
    await page.locator('#runBtn').click();
    await expect(page.locator('#mazeMsg')).toContainText('You did it in 4 blocks', { timeout: 15_000 });
    await expect(page.locator('#nextLevelBtn')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('mazeUnlocked'))).toBe('1');
    await page.locator('#nextLevelBtn').click();
    await expect(page.locator('#mazeLevel')).toHaveText('Level 2 of 5');
  });

  test('a short program stops before the star; undo and clear edit the program', async ({ page }) => {
    await page.goto('/?kid#play');
    await page.locator('.palette button[data-k="F"]').click();
    await page.locator('.palette button[data-k="L"]').click();
    await expect(page.locator('#program .pblock')).toHaveCount(2);
    await page.locator('#undoBtn').click();
    await expect(page.locator('#program .pblock')).toHaveCount(1);
    await page.locator('#runBtn').click();
    await expect(page.locator('#mazeMsg')).toContainText('So close', { timeout: 10_000 });
    await page.locator('#clearBtn').click();
    await expect(page.locator('#program .pblock')).toHaveCount(0);
    await expect(page.locator('#runBtn')).toBeDisabled();
  });

  test('the board is a labelled picture that says where Bolt, the star and the rocks are', async ({ page }) => {
    await page.goto('/?kid#play');
    const board = page.getByRole('img', { name: /^Maze board/ });
    await expect(board).toHaveAttribute('id', 'mazeBoard');
    await expect(board).toHaveAttribute('aria-label', 'Maze board, 6 by 6 squares. Bolt is at column 1, row 3, facing right. The star is at column 5, row 3. No rocks.');
    await expect(page.getByRole('group', { name: 'Levels' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Blocks' })).toBeVisible();
    // After a run the label follows Bolt
    await page.locator('.palette button[data-k="F"]').click();
    await page.locator('#runBtn').click();
    await expect(page.locator('#mazeMsg')).toContainText('So close', { timeout: 10_000 });
    await expect(board).toHaveAttribute('aria-label', /Bolt is at column 2, row 3, facing right/);
    // Clear puts Bolt back at the start
    await page.locator('#clearBtn').click();
    await expect(board).toHaveAttribute('aria-label', /Bolt is at column 1, row 3/);
  });

  test('walking off the board is caught', async ({ page }) => {
    await page.goto('/?kid#play');
    await page.locator('.palette button[data-k="L"]').click();
    for (let i = 0; i < 3; i++) await page.locator('.palette button[data-k="F"]').click();
    await page.locator('#runBtn').click();
    await expect(page.locator('#mazeMsg')).toContainText('off the board', { timeout: 10_000 });
  });
});

test.describe('Journey', () => {
  test('levels are tabs that show their details, in both modes', async ({ page }) => {
    await page.goto('/#journey');
    const levels = page.locator('#levels .level');
    await expect(levels).toHaveCount(6);
    await expect(levels.nth(4)).toHaveAttribute('aria-selected', 'true'); // current level by default
    await levels.nth(0).click();
    await expect(levels.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#detail h3')).toHaveText('Consulting');
    await expect(page.locator('#detail li')).toHaveCount(3);
    await page.locator('#modeToggle').click();
    await expect(page.locator('#detail h3')).toHaveText('Problem Solvers');
    await expect(levels.nth(2).locator('.nm')).toHaveText('Sneaker World');
  });

  test('cloud experience names both AWS and Google Cloud, without durations', async ({ page }) => {
    await page.goto('/#journey');
    // Toolkit chips and the platform card
    const chips = page.locator('.powerups .pu');
    await expect(chips.filter({ hasText: /^AWS$/ })).toHaveCount(1);
    await expect(chips.filter({ hasText: /^Google Cloud$/ })).toHaveCount(1);
    await expect(page.locator('#work .card p.pro', { hasText: 'corporate surveillance' })).toContainText('built on AWS');
    // The AWS roles (Nike, Capital One) and the Google Cloud role (Lowe's) say which cloud
    const levels = page.locator('#levels .level');
    const cloudOf = async (i: number) => { await levels.nth(i).click(); return page.locator('#detail li').allTextContents(); };
    for (const i of [2, 4]) {
      const bullets = (await cloudOf(i)).filter(t => t.includes('AWS'));
      expect(bullets, `level ${i + 1} mentions AWS`).toHaveLength(1);
      expect(bullets[0]).not.toMatch(/\d+\s*\+?\s*(year|yr)/i);
    }
    expect((await cloudOf(1)).some(t => t.includes('Google Cloud'))).toBe(true);
  });

  test('the current level says what I lead; advising and education sit under the toolkit', async ({ page }) => {
    await page.goto('/#journey');
    const detail = page.locator('#detail');
    await expect(detail.locator('h3')).toHaveText('Capital One');
    await expect(detail.locator('li')).toHaveCount(4);
    await expect(detail).toContainText('Core Compliance');
    await expect(detail).toContainText('compliance testing, corporate surveillance, and corporate integrity and ethics');
    await expect(detail).toContainText('about 70');
    // The tools are named: the production model family, the coding tool and the spec framework
    for (const name of ['Nemotron', 'Claude Code', 'MCP', 'OpenSpec']) await expect(detail).toContainText(name);
    // Primary Venture Partners is an ongoing honorary role, not part of the Capital One job
    await expect(detail).not.toContainText('Primary Venture Partners');
    const facts = page.locator('#journey .facts');
    await expect(facts.locator('dt')).toHaveCount(4);
    await expect(facts).toContainText('Honorary Expert at Primary Venture Partners, advising founders since 2024');
    await expect(facts).toContainText('Anna University');
    await expect(facts).toContainText('English, Tamil and Hindi');
    await expect(page.locator('#journey')).not.toContainText('2024 to 2026');
    // The consulting and Lowe's dates overlap, so both levels say why
    const levels = page.locator('#levels .level');
    await levels.nth(0).click();
    await expect(detail).toContainText("the last stretch on the Lowe's account");
    await levels.nth(1).click();
    await expect(detail).toContainText('through Publicis Sapient, then joined in-house');
    // What's next: the voice agent and more games
    await levels.nth(5).click();
    await expect(detail).toContainText('voice agent of my own');
    await expect(detail).toContainText('More games');
  });

  test('the toolkit is short and the team numbers are in the stats', async ({ page }) => {
    await page.goto('/#journey');
    expect(await page.locator('.powerups .pu').count()).toBeLessThanOrEqual(10);
    const stats = page.locator('#journey .stats .stat');
    await expect(stats).toHaveCount(4);
    await expect(stats.nth(1)).toContainText('~70');
    await expect(stats.nth(2)).toContainText('3 to 21');
    await expect(stats.nth(3).locator('.v .pro')).toHaveText('$70M+');
  });
});

test.describe('Say hi', () => {
  test('LinkedIn and GitHub links open in a new tab and point at the right profiles', async ({ page, request }) => {
    await page.goto('/#hello');
    const li = page.locator('#hello a', { hasText: 'LinkedIn' });
    const gh = page.locator('#hello a', { hasText: 'GitHub' });
    await expect(li).toHaveAttribute('href', 'https://www.linkedin.com/in/sbmadhav/');
    await expect(gh).toHaveAttribute('href', 'https://github.com/sbmadhav');
    for (const a of [li, gh]) {
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
    // GitHub answers bots; LinkedIn blocks them (999), so only GitHub is fetched
    expect((await request.get('https://github.com/sbmadhav')).status()).toBe(200);
  });
});
