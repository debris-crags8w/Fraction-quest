import { expect, test } from './fixtures';
import { MISSIONS } from '../src/game';
import { getBuildChecks, getWorksheet } from '../src/learning-content';

const SHOTS = process.env.SHOTS_DIR ?? '';
test('some lessons have worksheet number-line rows', () => { expect(ids.length).toBeGreaterThan(0); });
/* The read-only number line drawn in a worksheet row: rendered in a grid whose items shrink to their content, it once
   collapsed to a sliver (a unit test cannot see that). This walks every lesson whose worksheet has such a row. */
const ids = MISSIONS.filter((m) => getWorksheet(m.id).some((p) => p.model?.kind === 'line' && (!p.task || p.task.kind === 'copy'))).map((m) => m.id);

function seed(missionId: string) {
  const index = MISSIONS.findIndex((m) => m.id === missionId);
  const mastered = (id: string) => ({
    practiceDone: true,
    checks: Object.fromEntries(getBuildChecks(id).map((c) => [c.id, { passed: true, supported: false, attempts: 1 }])),
    worksheet: Object.fromEntries(getWorksheet(id).map((p) => [p.id, { draft: p.answer, checkedValue: p.answer, attempts: 1, supported: false }])),
    helpUses: 0, misconceptions: {},
  });
  return {
    completedMissionIds: [], starsByMission: {}, reviewQueue: [],
    learning: {
      ...Object.fromEntries(MISSIONS.slice(0, index).map((m) => [m.id, mastered(m.id)])),
      [missionId]: { ...mastered(missionId), worksheet: {} },
    },
    assessments: [],
  };
}

for (const width of [390, 1100]) for (const id of ids) {
  test(`worksheet number-line rows are full width and readable (${id}, ${width}px)`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width === 390 ? 664 : 800 });
    await page.addInitScript((p) => localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(p)), seed(id));
    await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Not signed in."}' }));
    await page.goto('/');
    await page.getByTestId('button-play-guest').click();
    const node = page.getByTestId(`button-node-${id}`);
    await node.click({ force: true });
    if (await node.getAttribute('aria-expanded') !== 'true') await node.click({ force: true });
    await page.getByTestId(`button-start-mission-${id}`).click();
    for (let s = 0; s < 3; s++) {
      await page.waitForTimeout(50);
      const introGo = page.getByTestId('button-story-intro-go');
      if (await introGo.isVisible()) { await introGo.click(); continue; }
      const skip = page.getByTestId('button-story-skip');
      if (await skip.isVisible()) await skip.click();
      const go = page.getByTestId('button-story-go');
      if (!(await go.isVisible())) break;
      const choice = page.getByTestId('button-story-choice-0');
      if (await choice.isVisible()) await choice.click();
      await go.click();
    }
    await expect(page.getByTestId('section-worksheet')).toBeVisible();
    const rows = page.locator('[data-testid^="row-worksheet-"]:has(.fq-ll-pline)');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await row.scrollIntoViewIfNeeded();
      const m = await row.evaluate((el) => {
        const line = el.querySelector('.fq-ll-pline') as HTMLElement;
        const r = line.getBoundingClientRect(); const rr = el.getBoundingClientRect();
        const ticks = Array.from(line.querySelectorAll('i')).map((t) => t.getBoundingClientRect());
        const labels = Array.from(line.querySelectorAll('i span')).map((t) => t.getBoundingClientRect());
        const dot = line.querySelector('i.on')?.getBoundingClientRect();
        const doc = document.documentElement;
        return { line: r.width, row: rr.width, left: r.left - rr.left, rightGap: rr.right - r.right, minTickGap: ticks.length > 1 ? Math.min(...ticks.slice(1).map((t, k) => t.left - ticks[k].left)) : 0,
          dot: dot ? dot.width : 0, labelGap: labels.length > 1 ? Math.min(...labels.slice(1).map((l, k) => l.left - labels[k].right)) : 99, labelsInside: labels.every((l) => l.left >= rr.left - 1 && l.right <= rr.right + 1), overflowX: doc.scrollWidth > doc.clientWidth };
      });
      console.log(id, width, await row.getAttribute('data-testid'), JSON.stringify(m));
      if (SHOTS && (i === 0 || process.env.SHOTS_ALL)) await row.screenshot({ path: `${SHOTS}/${id}-${width}${i ? `-${i}` : ""}.png` });
      expect(m.line, 'the line takes the row width (up to 520px)').toBeGreaterThanOrEqual(Math.min(m.row * 0.75, 400));
      expect(m.dot, 'the dot is big enough to see').toBeGreaterThanOrEqual(14);
      expect(m.labelGap, 'the whole-number labels do not touch').toBeGreaterThan(4);
      expect(m.labelsInside).toBe(true);
      expect(m.overflowX).toBe(false);
    }
  });
}
