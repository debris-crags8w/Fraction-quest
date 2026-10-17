import { expect, test } from '@playwright/test';
import { CHALLENGES } from '../src/challenges';
import { FRACTION_ORDER_ROUNDS, fractionOrderMatches, getDueSkillReviewQuestions, MISSIONS } from '../src/game';
import { compareFractions, WAR_ROUNDS, warHint } from '../src/concept-games';
import { getCodeLevels } from '../src/code-quest';
import { getBuildChecks, getReviewCheck, getWorksheet, answerMatches, isYesNoProblem } from '../src/learning-content';
import { answerShape, canBuild, SLOTS, slotsFromAnswer } from '../src/answer-shape';
import { AREA_CUTS, areaTaskDone, pieceArea } from '../src/area-shapes';
import { generateQuestions, getExtraPractice, hasGenerator } from '../src/practice-bank';
import { isPartFinderAnswer, PART_FINDER_LESSONS, partFinderRoundsFor, type PartFinderRound } from '../src/part-finder';
import { makeSprint } from '../src/CodeSprint';
import type { Mission } from '../src/game';
import type { WorksheetProblem } from '../src/learning-content';

/** Practice, games, check-ins and grown-ups live in the top bar's "More" menu. */
async function openMenuItem(page: import('@playwright/test').Page, testId: string) {
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId(testId).click();
}

async function openAsGuest(page: import('@playwright/test').Page) {
  await page.route('**/api/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not signed in.' }),
  }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
}

async function localStorageSnapshot(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const entries: Array<[string, string | null]> = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key !== null) entries.push([key, localStorage.getItem(key)]);
    }
    entries.sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(Object.fromEntries(entries));
  });
}

test('the ordering lesson explains its strategy before showing a distinct worked model', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);

  const intro = page.getByTestId('lesson-introduction');
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('smallest to biggest');
  await expect(intro).toContainText('same denominator');
  await expect(intro).toContainText(/top numbers|numerators/);
  await expect(intro.getByRole('button', { name: 'Listen to the goal' })).toBeVisible();
  await expect(intro.getByRole('button', { name: 'Listen to the process' })).toBeVisible();
  await expect(intro.getByRole('button', { name: 'Listen to why it works' })).toBeVisible();
  const workedExample = page.getByTestId('lesson-example');
  // Fraction bars render numerator and denominator separately, so the combined text omits slashes.
  await expect(workedExample).toContainText('Order 14, 38 and 58 from smallest to biggest');
  await expect(workedExample).toContainText('14 < 38 < 58');
  const numberLine = page.getByTestId('fraction-order-numberline');
  await expect(numberLine).toBeVisible();
  await expect(numberLine).toContainText('0');
  await expect(numberLine).toContainText('1 whole');
  await expect(numberLine).toContainText('one-half benchmark is halfway');
  await expect(numberLine).toContainText('1/4 = 2/8');
  await expect(numberLine).toContainText('1/4 and 2/8 are equivalent fractions');
  await expect(numberLine).toContainText('same amount and number-line spot');
  await expect(numberLine).toContainText('1/2 = 2/4');
  await expect(numberLine).toContainText('1/2 and 2/4 are equivalent fractions');
  await expect(numberLine).toContainText('same amount and number-line spot');
  await expect(numberLine.getByRole('button', { name: 'Listen to the fraction number line' })).toBeVisible();
  const benchmark = page.getByTestId('fraction-order-benchmark');
  await expect(benchmark).toHaveAttribute('style', /left: 50%/);
  await expect(benchmark).toHaveAttribute('data-equivalent-names', '2/4');
  await expect(benchmark).toContainText('1/2 = 2/4');
  await expect(page.getByTestId('fraction-order-point-1-4')).toHaveAttribute('data-position', '25');
  await expect(page.getByTestId('fraction-order-point-1-4')).toHaveAttribute('data-equivalent-names', '2/8');
  await expect(page.getByTestId('fraction-order-point-1-4')).toContainText('1/4 = 2/8');
  await expect(page.getByTestId('fraction-order-point-3-8')).toHaveAttribute('data-position', '37.5');
  await expect(page.getByTestId('fraction-order-point-5-8')).toHaveAttribute('data-position', '62.5');
  await expect(numberLine.locator('.fq-order-line')).toHaveAttribute('aria-label', /1\/4 is at 1 of 4 equal spaces.*1\/4 and 2\/8 are equivalent fractions.*same amount and number-line spot.*3\/8 is at 3 of 8 equal spaces.*5\/8 is at 5 of 8 equal spaces.*one-half benchmark is halfway.*1\/2 and 2\/4 are equivalent fractions.*same amount and number-line spot/);

  const introBottom = await intro.evaluate((element) => element.getBoundingClientRect().bottom);
  const modelTop = await page.locator('.fq-example .fq-model-area').evaluate((element) => element.getBoundingClientRect().top);
  expect(introBottom).toBeLessThan(modelTop);
});

test('number-line labels, axis, markers, and halfway guide stay distinct in both themes', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);

  const figure = page.getByTestId('fraction-order-numberline');
  await expect(figure).toBeVisible();

  for (const dark of [false, true]) {
    await page.evaluate((useDarkTheme) => {
      document.documentElement.classList.toggle('dark', useDarkTheme);
    }, dark);
    const colors = await figure.evaluate((element) => {
      const firstPoint = element.querySelector<HTMLElement>('.fq-order-line-point');
      const firstLabel = firstPoint?.querySelector<HTMLElement>('span');
      const benchmarkLabel = element.querySelector<HTMLElement>('.fq-order-line-benchmark > span');
      const axis = element.querySelector<HTMLElement>('.fq-order-line-axis');
      const marker = firstPoint ? getComputedStyle(firstPoint, '::after') : null;
      const guide = element.querySelector<HTMLElement>('.fq-order-line-benchmark');
      const guideLine = guide ? getComputedStyle(guide, '::before') : null;
      if (!firstLabel || !benchmarkLabel || !axis || !marker || !guideLine) {
        throw new Error('Expected all number-line color targets to render');
      }
      const readColor = (value: string) => {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) throw new Error(`Could not read rendered color: ${value}`);
        const channels = match[1].split(/[\s,\/]+/).filter(Boolean).slice(0, 3).map(Number);
        if (channels.length !== 3 || channels.some(Number.isNaN)) {
          throw new Error(`Could not read rendered color channels: ${value}`);
        }
        return channels;
      };
      const markerRing = marker.boxShadow.match(/rgba?\(([^)]+)\)/)?.[0];
      if (!markerRing) throw new Error(`Could not read marker outline: ${marker.boxShadow}`);
      return {
        label: readColor(getComputedStyle(firstLabel).color),
        labelSurface: readColor(getComputedStyle(firstLabel).backgroundColor),
        benchmark: readColor(getComputedStyle(benchmarkLabel).color),
        axis: readColor(getComputedStyle(axis).backgroundColor),
        marker: readColor(marker.backgroundColor),
        markerRing: readColor(markerRing),
        guide: readColor(guideLine.borderLeftColor),
      };
    });
    const luminance = (channels: number[]) => {
      const linear = channels.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const contrast = (first: number[], second: number[]) => {
      const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const context = dark ? 'dark theme' : 'light theme';

    expect(contrast(colors.label, colors.labelSurface), `${context}: fraction labels should remain readable`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.benchmark, colors.labelSurface), `${context}: the halfway label should remain readable`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.axis, colors.labelSurface), `${context}: the number-line axis should stand out`).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.marker, colors.axis), `${context}: fraction dots should stand out from the axis`).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.markerRing, colors.marker), `${context}: marker outlines should separate dots from the line`).toBeGreaterThanOrEqual(1.5);
    expect(contrast(colors.guide, colors.labelSurface), `${context}: the dashed halfway guide should stand out`).toBeGreaterThanOrEqual(3);
  }
});

test('the ordering number line stays legible in grayscale print media', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);
  await page.getByTestId('fraction-order-numberline').evaluate((element) => {
    // The app prints only .fq-print content; mount a copy there to exercise the
    // number-line print rules without bypassing the normal print-only page filter.
    const printRoot = document.createElement('section');
    printRoot.className = 'fq-print';
    printRoot.dataset.testid = 'fraction-order-print-preview';
    printRoot.append(element.cloneNode(true));
    document.querySelector('#root')?.append(printRoot);
  });
  await page.emulateMedia({ media: 'print' });

  const figure = page.getByTestId('fraction-order-print-preview').getByTestId('fraction-order-numberline');
  await expect(figure).toBeVisible();
  await expect(figure.locator('.fq-order-line-caption')).toContainText('0');
  await expect(figure.locator('.fq-order-line-caption')).toContainText('1 whole');
  await expect(figure.locator('.fq-order-line-point > span')).toHaveCount(3);
  await expect(figure.locator('.fq-order-line-point > span').nth(0)).toContainText('1/4 = 2/8');
  await expect(figure.locator('.fq-order-line-point > span').nth(1)).toContainText('3/8');
  await expect(figure.locator('.fq-order-line-point > span').nth(2)).toContainText('5/8');
  await expect(figure.locator('.fq-order-line-benchmark > span')).toContainText('1/2 = 2/4');

  const printStyles = await figure.evaluate((element) => {
    const axis = element.querySelector<HTMLElement>('.fq-order-line-axis');
    const endpoints = [...element.querySelectorAll<HTMLElement>('.fq-order-line-end')];
    const points = [...element.querySelectorAll<HTMLElement>('.fq-order-line-point')];
    const benchmark = element.querySelector<HTMLElement>('.fq-order-line-benchmark');
    const labels = [...element.querySelectorAll<HTMLElement>('.fq-order-line-point > span, .fq-order-line-benchmark > span')];
    const guide = benchmark ? getComputedStyle(benchmark, '::before') : null;
    if (!axis || endpoints.length !== 2 || points.length !== 3 || !benchmark || !guide || labels.length !== 4) {
      throw new Error('Expected all number-line print targets to render');
    }
    return {
      figureBackground: getComputedStyle(element).backgroundColor,
      figureBorder: getComputedStyle(element).borderTopColor,
      axis: getComputedStyle(axis).backgroundColor,
      endpoints: endpoints.map((end) => getComputedStyle(end).backgroundColor),
      markerStyles: points.map((point) => {
        const marker = getComputedStyle(point, '::after');
        return {
          fill: marker.backgroundColor,
          border: marker.borderTopColor,
          borderWidth: marker.borderTopWidth,
          borderStyle: marker.borderTopStyle,
          boxShadow: marker.boxShadow,
          shape: marker.borderRadius,
        };
      }),
      labels: labels.map((label) => {
        const style = getComputedStyle(label);
        return {
          text: style.color,
          background: style.backgroundColor,
          border: style.borderTopColor,
          borderWidth: style.borderTopWidth,
        };
      }),
      guide: {
        color: guide.borderLeftColor,
        style: guide.borderLeftStyle,
        width: guide.borderLeftWidth,
      },
      caption: getComputedStyle(element.querySelector<HTMLElement>('.fq-order-line-caption')!).color,
    };
  });

  expect(printStyles.figureBackground).toBe('rgb(255, 255, 255)');
  expect(printStyles.figureBorder).toBe('rgb(0, 0, 0)');
  expect(printStyles.axis).toBe('rgb(0, 0, 0)');
  expect(printStyles.endpoints).toEqual(['rgb(0, 0, 0)', 'rgb(0, 0, 0)']);
  for (const marker of printStyles.markerStyles) {
    expect(marker.fill).toBe('rgb(255, 255, 255)');
    expect(marker.border).toBe('rgb(0, 0, 0)');
    expect(marker.borderWidth).toBe('3px');
    expect(marker.borderStyle).toBe('solid');
    expect(marker.boxShadow).toBe('none');
    expect(marker.shape).toBe('50%');
  }
  for (const label of printStyles.labels) {
    expect(label.text).toBe('rgb(0, 0, 0)');
    expect(label.background).toBe('rgb(255, 255, 255)');
    expect(label.border).toBe('rgb(0, 0, 0)');
    expect(label.borderWidth).toBe('1px');
  }
  expect(printStyles.guide).toEqual({
    color: 'rgb(0, 0, 0)',
    style: 'dashed',
    width: '2px',
  });
  expect(printStyles.caption).toBe('rgb(0, 0, 0)');
});

test('number-line labels, axis, markers, and halfway guide stay clear in forced-colors mode', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);
  await page.emulateMedia({ forcedColors: 'active' });

  const figure = page.getByTestId('fraction-order-numberline');
  await expect(figure).toBeVisible();
  const colors = await figure.evaluate((element) => {
    const point = element.querySelector<HTMLElement>('.fq-order-line-point');
    const pointLabels = [...element.querySelectorAll<HTMLElement>('.fq-order-line-point > span')];
    const benchmark = element.querySelector<HTMLElement>('.fq-order-line-benchmark');
    const benchmarkLabel = benchmark?.querySelector<HTMLElement>('span');
    const axis = element.querySelector<HTMLElement>('.fq-order-line-axis');
    const points = [...element.querySelectorAll<HTMLElement>('.fq-order-line-point')];
    const guide = benchmark ? getComputedStyle(benchmark, '::before') : null;
    if (!points.length || !pointLabels.length || !benchmarkLabel || !axis || !guide) {
      throw new Error('Expected all number-line forced-color targets to render');
    }

    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;color:CanvasText;background-color:Canvas;border-color:Highlight';
    element.append(probe);
    const systemColors = getComputedStyle(probe);
    const resolved = {
      text: systemColors.color,
      canvas: systemColors.backgroundColor,
      highlight: systemColors.borderTopColor,
    };
    probe.remove();

    const style = (target: Element) => getComputedStyle(target);
    const halfwayLabel = style(benchmarkLabel);
    return {
      forcedColorAdjust: style(element.querySelector<HTMLElement>('.fq-order-line')!).forcedColorAdjust,
      fractionLabels: pointLabels.map((label) => {
        const computed = style(label);
        return {
          text: computed.color,
          surface: computed.backgroundColor,
          border: computed.borderTopColor,
          borderWidth: computed.borderTopWidth,
          borderStyle: computed.borderTopStyle,
        };
      }),
      markers: points.map((markerPoint) => {
        const marker = getComputedStyle(markerPoint, '::after');
        return { fill: marker.backgroundColor, ring: marker.boxShadow };
      }),
      halfwayLabelText: halfwayLabel.color,
      halfwayLabelSurface: halfwayLabel.backgroundColor,
      halfwayLabelBorder: halfwayLabel.borderTopColor,
      axis: style(axis).backgroundColor,
      guide: guide.borderLeftColor,
      guideStyle: guide.borderLeftStyle,
      guideWidth: guide.borderLeftWidth,
      ...resolved,
    };
  });

  expect(colors.forcedColorAdjust).toBe('none');
  for (const [label, text, surface, border] of [
    ...colors.fractionLabels.map((label, index) => [`fraction label ${index + 1}`, label.text, label.surface, label.border] as const),
    ['halfway label', colors.halfwayLabelText, colors.halfwayLabelSurface, colors.halfwayLabelBorder] as const,
  ]) {
    expect(text, `${label} should use the system text color`).toBe(colors.text);
    expect(surface, `${label} should use the system canvas`).toBe(colors.canvas);
    expect(border, `${label} should have a visible system-color border`).toBe(colors.text);
  }
  for (const label of colors.fractionLabels) {
    expect(label.borderWidth).toBe('2px');
    expect(label.borderStyle).toBe('solid');
  }
  expect(colors.axis).toBe(colors.text);
  for (const marker of colors.markers) {
    expect(marker.fill).toBe(colors.highlight);
    expect(marker.ring).toContain(colors.text);
  }
  expect(colors.guide).toBe(colors.highlight);
  expect(colors.guideStyle).toBe('dashed');
  expect(colors.guideWidth).toBe('2px');
});

test('the ordering number line keeps fraction labels clear on narrow screens and with enlarged text', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await page.setViewportSize({ width: 320, height: 900 });
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);

  const figure = page.getByTestId('fraction-order-numberline');
  await expect(figure).toBeVisible();

  for (const width of [280, 300, 320, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const enlargedText of [false, true]) {
      await page.evaluate((enlarge) => {
        document.getElementById('large-text-test-style')?.remove();
        if (enlarge) {
          const style = document.createElement('style');
          style.id = 'large-text-test-style';
          style.textContent = 'html { font-size: 200% !important; }';
          document.head.append(style);
        }
      }, enlargedText);

      const layout = await figure.evaluate((element) => {
        const figureBounds = element.getBoundingClientRect();
        const labels = Array.from(element.querySelectorAll<HTMLElement>(
          '.fq-order-line-point > span, .fq-order-line-benchmark > span',
        )).map((label) => {
          const bounds = label.getBoundingClientRect();
          return {
            text: label.textContent?.trim() ?? '',
            left: bounds.left,
            right: bounds.right,
            top: bounds.top,
            bottom: bounds.bottom,
          };
        });
        const guide = element.querySelector<HTMLElement>('.fq-order-line-benchmark');
        const guideStyle = guide ? getComputedStyle(guide, '::before') : null;
        return {
          figure: {
            left: figureBounds.left,
            right: figureBounds.right,
            top: figureBounds.top,
            bottom: figureBounds.bottom,
          },
          labels,
          guide: {
            left: guide ? Number.parseFloat(guide.style.left) : Number.NaN,
            borderStyle: guideStyle?.borderLeftStyle ?? '',
            height: Number.parseFloat(guideStyle?.height ?? '0'),
          },
        };
      });

      const context = `${width}px viewport, ${enlargedText ? 'enlarged' : 'normal'} text`;
      const description = page.getByTestId('text-fraction-order-line-description-copy');
      const listenButton = figure.getByRole('button', { name: 'Listen to the fraction number line' });
      await expect(description).toBeVisible();
      await expect(listenButton).toBeVisible();
      await expect(listenButton).toBeEnabled();
      const descriptionLayout = await figure.evaluate((element) => {
        const copy = element.querySelector<HTMLElement>('[data-testid="text-fraction-order-line-description-copy"]');
        const button = element.querySelector<HTMLElement>('.fq-order-line-description .fq-learning-listen');
        const figureBounds = element.getBoundingClientRect();
        const copyBounds = copy?.getBoundingClientRect();
        const buttonBounds = button?.getBoundingClientRect();
        return {
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          copyText: copy?.textContent?.trim() ?? '',
          lineHeight: Number.parseFloat(copy ? getComputedStyle(copy).lineHeight : '0'),
          copy: copyBounds ? {
            left: copyBounds.left,
            right: copyBounds.right,
            top: copyBounds.top,
            bottom: copyBounds.bottom,
            scrollWidth: copy?.scrollWidth ?? 0,
            clientWidth: copy?.clientWidth ?? 0,
            scrollHeight: copy?.scrollHeight ?? 0,
            clientHeight: copy?.clientHeight ?? 0,
          } : null,
          button: buttonBounds ? {
            left: buttonBounds.left,
            right: buttonBounds.right,
            top: buttonBounds.top,
            bottom: buttonBounds.bottom,
            width: buttonBounds.width,
            height: buttonBounds.height,
          } : null,
          figure: { left: figureBounds.left, right: figureBounds.right },
          accessibleDescription: element.querySelector<HTMLElement>('.fq-order-line')?.getAttribute('aria-label') ?? '',
        };
      });
      expect(descriptionLayout.pageWidth, `${context}: the page should not overflow horizontally`).toBeLessThanOrEqual(descriptionLayout.viewportWidth);
      expect(descriptionLayout.copyText, `${context}: all spoken description text should remain visible`).toBe(descriptionLayout.accessibleDescription);
      expect(descriptionLayout.copy, `${context}: the description should have a measurable layout`).not.toBeNull();
      expect(descriptionLayout.copy!.scrollWidth, `${context}: the description should not overflow its width`).toBeLessThanOrEqual(descriptionLayout.copy!.clientWidth + 1);
      expect(descriptionLayout.copy!.scrollHeight, `${context}: the description should not be vertically clipped`).toBeLessThanOrEqual(descriptionLayout.copy!.clientHeight + 1);
      expect(descriptionLayout.copy!.bottom - descriptionLayout.copy!.top, `${context}: the full description should wrap across lines`).toBeGreaterThan(descriptionLayout.lineHeight);
      expect(descriptionLayout.button, `${context}: the Listen control should have a measurable layout`).not.toBeNull();
      expect(descriptionLayout.button!.left, `${context}: Listen should stay inside the number-line card`).toBeGreaterThanOrEqual(descriptionLayout.figure.left);
      expect(descriptionLayout.button!.right, `${context}: Listen should not clip past the number-line card`).toBeLessThanOrEqual(descriptionLayout.figure.right);
      expect(descriptionLayout.button!.top, `${context}: Listen should appear below the wrapped description`).toBeGreaterThanOrEqual(descriptionLayout.copy!.bottom - 1);
      expect(descriptionLayout.button!.height, `${context}: Listen should retain a usable touch target`).toBeGreaterThanOrEqual(34);
      await listenButton.focus();
      await expect(listenButton, `${context}: Listen should remain keyboard reachable`).toBeFocused();

      expect(layout.labels, `${context}: all four fraction and halfway labels should render`).toHaveLength(4);
      for (const label of layout.labels) {
        expect(label.left, `${context}: ${label.text} should not clip past the left edge`).toBeGreaterThanOrEqual(layout.figure.left);
        expect(label.right, `${context}: ${label.text} should not clip past the right edge`).toBeLessThanOrEqual(layout.figure.right);
        expect(label.top, `${context}: ${label.text} should not clip above the number line`).toBeGreaterThanOrEqual(layout.figure.top);
        expect(label.bottom, `${context}: ${label.text} should not clip below the number line`).toBeLessThanOrEqual(layout.figure.bottom);
      }
      for (let first = 0; first < layout.labels.length; first += 1) {
        for (let second = first + 1; second < layout.labels.length; second += 1) {
          const a = layout.labels[first];
          const b = layout.labels[second];
          const overlaps = a.left < b.right - 1 && a.right > b.left + 1
            && a.top < b.bottom - 1 && a.bottom > b.top + 1;
          expect(overlaps, `${context}: ${a.text} and ${b.text} must not overlap`).toBe(false);
        }
      }
      expect(layout.guide.left, `${context}: halfway guide should stay at the midpoint`).toBeCloseTo(50);
      expect(layout.guide.borderStyle, `${context}: halfway guide should remain visibly dashed`).toBe('dashed');
      expect(layout.guide.height, `${context}: halfway guide should reach the line from its label`).toBeGreaterThan(0);
    }
  }
});

test('the ordering number-line explanation and Listen control stay usable at 400% text size', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await page.setViewportSize({ width: 280, height: 900 });
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);

  await page.addStyleTag({
    content: 'html { font-size: 400% !important; }',
  });

  const figure = page.getByTestId('fraction-order-numberline');
  const description = page.getByTestId('text-fraction-order-line-description-copy');
  const listenButton = figure.getByRole('button', { name: 'Listen to the fraction number line' });
  await expect(description).toBeVisible();
  await expect(listenButton).toBeVisible();
  await expect(listenButton).toBeEnabled();

  const layout = await figure.evaluate((element) => {
    const copy = element.querySelector<HTMLElement>('[data-testid="text-fraction-order-line-description-copy"]');
    const button = element.querySelector<HTMLElement>('.fq-order-line-description .fq-learning-listen');
    const visualDescription = element.querySelector<HTMLElement>('.fq-order-line');
    const figureBounds = element.getBoundingClientRect();
    const copyBounds = copy?.getBoundingClientRect();
    const buttonBounds = button?.getBoundingClientRect();
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      copyText: copy?.textContent?.trim() ?? '',
      accessibleDescription: visualDescription?.getAttribute('aria-label') ?? '',
      copy: copy && copyBounds ? {
        scrollWidth: copy.scrollWidth,
        clientWidth: copy.clientWidth,
        scrollHeight: copy.scrollHeight,
        clientHeight: copy.clientHeight,
        top: copyBounds.top,
        bottom: copyBounds.bottom,
      } : null,
      button: buttonBounds ? {
        left: buttonBounds.left,
        right: buttonBounds.right,
        top: buttonBounds.top,
        height: buttonBounds.height,
      } : null,
      figure: { left: figureBounds.left, right: figureBounds.right },
    };
  });

  expect(layout.pageWidth, 'the page should not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.copyText, 'all spoken description text should remain visible').toBe(layout.accessibleDescription);
  expect(layout.copy, 'the description should have a measurable layout').not.toBeNull();
  expect(layout.copy!.scrollWidth, 'the description should not overflow its width').toBeLessThanOrEqual(layout.copy!.clientWidth + 1);
  expect(layout.copy!.scrollHeight, 'the description should not be vertically clipped').toBeLessThanOrEqual(layout.copy!.clientHeight + 1);
  expect(layout.button, 'Listen should have a measurable layout').not.toBeNull();
  expect(layout.button!.left, 'Listen should stay inside the number-line card').toBeGreaterThanOrEqual(layout.figure.left);
  expect(layout.button!.right, 'Listen should not clip past the number-line card').toBeLessThanOrEqual(layout.figure.right);
  expect(layout.button!.top, 'Listen should appear below the complete description').toBeGreaterThanOrEqual(layout.copy!.bottom - 1);
  let reachedWithTab = false;
  for (let tabPress = 0; tabPress < 40; tabPress += 1) {
    await page.keyboard.press('Tab');
    if (await listenButton.evaluate((button) => document.activeElement === button)) {
      reachedWithTab = true;
      break;
    }
  }
  expect(reachedWithTab, 'Listen should remain reachable in the keyboard tab order').toBe(true);
});

test('learners sort fractions in both directions, correct a try, and do not save progress before questions', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openAsGuest(page);
  const savedStorage = await localStorageSnapshot(page);
  await openDeveloperLesson(page, mission);
  await expect(page.getByTestId('fraction-order-activity')).toBeVisible();
  await expect(page.getByTestId('fraction-order-example')).toContainText(mission.title);
  await expect.poll(() => localStorageSnapshot(page)).toBe(savedStorage);

  await completeFractionOrderLesson(page);
  await expectLessonQuestionProgress(page, 1, 0);
  await expect.poll(() => localStorageSnapshot(page)).toBe(savedStorage);
});

async function expectLessonQuestionProgress(
  page: import('@playwright/test').Page,
  currentQuestion: number,
  completedQuestions: number,
) {
  const progress = page.getByTestId('status-lesson-progress');
  await expect(progress).toHaveAttribute(
    'aria-label',
    new RegExp(`^Lesson question progress: ${completedQuestions} of \\d+ completed$`),
  );
  await expect(progress.locator('.fq-sr')).toHaveText(
    new RegExp(`^Question ${currentQuestion} of \\d+; ${completedQuestions} completed\\.$`),
  );
}

async function completeQuestionSequence(
  page: import('@playwright/test').Page,
  questions: Mission['questions'],
) {
  await page.evaluate(async (items) => {
    const settleReactUpdate = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    const button = (testId: string) => {
      const element = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`);
      if (!(element instanceof HTMLButtonElement) || element.disabled) {
        throw new Error(`Expected enabled button ${testId}`);
      }
      return element;
    };
    for (const [index, question] of items.entries()) {
      const progress = document.querySelector<HTMLElement>('[data-testid="status-lesson-progress"]');
      const activeQuestionText = progress?.querySelector<HTMLElement>('.fq-sr')?.textContent?.trim();
      if (!progress || activeQuestionText !== `Question ${index + 1} of ${items.length}; ${index} completed.`) {
        throw new Error(`Lesson question ${index + 1} is not the active question`);
      }
      if (progress.getAttribute('aria-label') !== `Lesson question progress: ${index} of ${items.length} completed`) {
        throw new Error(`Lesson question progress did not report ${index} completed`);
      }
      if (index === 0 && !document.querySelector('[data-testid="question-model-area"]')) {
        throw new Error('The lesson question model is missing');
      }

      button(`button-answer-${question.id}-${question.correctChoice}`).click();
      await settleReactUpdate();
      button('button-check-answer').click();
      await settleReactUpdate();

      const feedback = document.querySelector<HTMLElement>('[data-testid="status-feedback"]');
      if (feedback?.getAttribute('data-result') !== 'correct') {
        throw new Error(`Question ${question.id} did not accept its correct answer`);
      }
      if (progress.getAttribute('aria-label') !== `Lesson question progress: ${index + 1} of ${items.length} completed`) {
        throw new Error(`Question ${question.id} did not advance lesson progress`);
      }

      button(index === items.length - 1 ? 'button-finish-mission' : 'button-next-question').click();
      await settleReactUpdate();
      if (index === items.length - 1) {
        if (!document.querySelector('[data-testid="learning-lab"]')) {
          throw new Error('The learning lab did not open after the final question');
        }
      } else {
        const nextProgress = document.querySelector<HTMLElement>('[data-testid="status-lesson-progress"]');
        const nextQuestionText = nextProgress?.querySelector<HTMLElement>('.fq-sr')?.textContent?.trim();
        if (nextQuestionText !== `Question ${index + 2} of ${items.length}; ${index + 1} completed.`) {
          throw new Error(`Question ${index + 2} did not open`);
        }
        if (nextProgress?.getAttribute('aria-label') !== `Lesson question progress: ${index + 1} of ${items.length} completed`) {
          throw new Error(`Question ${index + 2} progress was not announced`);
        }
      }
    }
  }, questions.map(({ id, correctChoice }) => ({ id, correctChoice })));
}

async function openDeveloperLesson(page: import('@playwright/test').Page, mission: Mission) {
  await page.evaluate(async ({ id, title, isPartFinder, isFractionOrder }) => {
    const settleReactUpdate = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    const developerTest = document.querySelector<HTMLDetailsElement>('[data-testid="developer-module-test"]');
    const selector = document.querySelector<HTMLSelectElement>('[data-testid="select-developer-lesson"]');
    if (!developerTest || !selector) throw new Error('The developer lesson selector is missing');
    developerTest.open = true;
    selector.value = id;
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    await settleReactUpdate();
    if (selector.value !== id) throw new Error(`The developer selector did not choose ${id}`);

    const open = document.querySelector<HTMLButtonElement>('[data-testid="button-open-developer-lesson"]');
    if (!open || open.disabled) throw new Error('The developer lesson could not be opened');
    open.click();
    await settleReactUpdate();
    if (!document.querySelector('[data-testid="developer-test-banner"]')) {
      throw new Error('The isolated developer test did not start');
    }

    const titleSelector = isPartFinder
      ? '.fq-pf-lesson-example .fq-example-heading'
      : isFractionOrder
        ? '.fq-order-sort-example .fq-example-heading'
        : '#lesson-title';
    const lessonTitle = document.querySelector<HTMLElement>(titleSelector);
    if (lessonTitle?.textContent?.trim() !== title) {
      throw new Error(`Expected to open ${title}, but the lesson title did not match`);
    }
    const exampleSelector = isPartFinder ? '[data-testid="part-finder-lesson-example"]' : '[data-testid="lesson-example"]';
    if (!document.querySelector(exampleSelector)) throw new Error(`The example for ${title} is missing`);
    if (!isPartFinder && !document.querySelector('.fq-example .fq-model-area')) {
      throw new Error(`The worked model for ${title} is missing`);
    }
  }, {
    id: mission.id,
    title: mission.title,
    isPartFinder: PART_FINDER_LESSONS.has(mission.id),
    isFractionOrder: mission.id === 'order-unlike-fractions',
  });
}

async function finishDeveloperLesson(page: import('@playwright/test').Page, savedStorage: string) {
  await page.evaluate(async (expectedStorage) => {
    const settleReactUpdate = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    const snapshot = () => {
      const entries: Array<[string, string | null]> = [];
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key !== null) entries.push([key, localStorage.getItem(key)]);
      }
      entries.sort(([a], [b]) => a.localeCompare(b));
      return JSON.stringify(Object.fromEntries(entries));
    };
    const lab = document.querySelector('[data-testid="learning-lab"]');
    if (!lab) throw new Error('Finishing the questions did not open the learning lab');
    const requirements = document.querySelector('[data-testid="list-requirements"]');
    const practice = requirements && Array.from(requirements.querySelectorAll<HTMLElement>('*'))
      .find((element) => element.textContent?.trim() === 'Practice');
    if (!practice?.classList.contains('done')) throw new Error('The lesson practice requirement was not saved');
    const finish = document.querySelector<HTMLButtonElement>('[data-testid="button-lab-finish"]');
    if (!finish?.disabled) throw new Error('The lesson unlocked before its other required work was complete');

    const breakOverlay = document.querySelector<HTMLElement>('[data-testid="brain-break-overlay"]');
    const visible = !!breakOverlay
      && breakOverlay.getClientRects().length > 0
      && getComputedStyle(breakOverlay).visibility !== 'hidden'
      && getComputedStyle(breakOverlay).display !== 'none';
    if (visible) {
      const skip = document.querySelector<HTMLButtonElement>('[data-testid="button-break-skip"]');
      if (!skip || skip.disabled) throw new Error('The lesson break could not be dismissed');
      skip.click();
      await settleReactUpdate();
    }
    if (snapshot() !== expectedStorage) throw new Error('The developer test wrote learner progress to browser storage');

    const exit = document.querySelector<HTMLButtonElement>('[data-testid="button-exit-developer-test"]');
    if (!exit || exit.disabled) throw new Error('The developer test could not be exited');
    exit.click();
    await settleReactUpdate();
    const mapVisible = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3'))
      .some((heading) => /your learning map/i.test(heading.textContent ?? ''));
    if (!mapVisible) throw new Error('Exiting the developer test did not return to the learning map');
    if (snapshot() !== expectedStorage) throw new Error('Exiting the developer test changed browser storage');
  }, savedStorage);
}

function partFinderSolution(round: PartFinderRound): { assignment?: number[]; selected: number[]; tileCount?: number } {
  const pieces = AREA_CUTS[round.cut];
  if (round.mode === 'sort') {
    const shareCount = round.shares ?? 0;
    const target = 1 / shareCount;
    const assignment = Array<number>(pieces.length).fill(-1);
    const areas = Array.from(pieces, pieceArea);
    const totals = Array<number>(shareCount).fill(0);
    const assign = (index: number): boolean => {
      if (index === pieces.length) return totals.every((area) => Math.abs(area - target) < 1e-9);
      for (let share = 0; share < shareCount; share++) {
        if (totals[share] + areas[index] > target + 1e-9) continue;
        assignment[index] = share;
        totals[share] += areas[index];
        if (assign(index + 1)) return true;
        totals[share] -= areas[index];
        assignment[index] = -1;
      }
      return false;
    };
    if (shareCount > 0 && assign(0)) return { assignment, selected: [] };
    throw new Error(`No fair share assignment found for Part Finder round ${round.id}`);
  }

  for (let mask = 1; mask < 2 ** pieces.length; mask++) {
    const selected = pieces.map((_, index) => index).filter((index) => mask & (1 << index));
    if (round.mode === 'tile') {
      if (selected.length !== 1) continue;
      const tileCount = Math.round(1 / pieceArea(pieces[selected[0]]));
      if (isPartFinderAnswer(round, selected, tileCount)) return { selected, tileCount };
    } else if (isPartFinderAnswer(round, selected)) {
      return { selected };
    }
  }
  throw new Error(`No valid piece selection found for Part Finder round ${round.id}`);
}

async function completePartFinderLesson(page: import('@playwright/test').Page, missionId: string) {
  if (missionId === 'equal-parts') {
    const introduction = page.getByTestId('first-fraction-introduction');
    await expect(introduction).toBeVisible();
    await expect(introduction.getByRole('heading', { name: 'Meet fractions with Numi' })).toBeVisible();
    await expect(page.getByTestId('first-fraction-intro-model').getByRole('img', { name: 'One whole divided into four equal-size parts' })).toBeVisible();
    await expect(introduction.getByTestId('button-listen-learning-text')).toBeVisible();
  } else {
    await expect(page.getByTestId('first-fraction-introduction')).toHaveCount(0);
  }
  for (const round of partFinderRoundsFor(missionId)) {
    const solution = partFinderSolution(round);
    if (solution.assignment) {
      for (const [index, share] of solution.assignment.entries()) {
        if (share > 0) await page.getByTestId(`button-part-finder-share-${share + 1}`).click();
        const piece = page.getByTestId(`button-part-finder-piece-${index + 1}`);
        await piece.focus();
        await piece.press('Enter');
      }
    } else {
      for (const index of solution.selected) {
        const piece = page.getByTestId(`button-part-finder-piece-${index + 1}`);
        await piece.focus();
        await piece.press('Enter');
      }
      if (solution.tileCount !== undefined) {
        await page.getByTestId('slot-part-finder-tile-count-n').click();
        for (const digit of String(solution.tileCount)) {
          await page.getByTestId(`tile-part-finder-tile-count-digit-${digit}`).click();
        }
      }
    }
    await page.getByTestId('button-part-finder-check').click();
    await expect(page.getByTestId('part-finder-feedback')).toContainText('That fits!');
    await page.getByTestId('button-part-finder-next').click();
  }
}

async function completeFractionOrderLesson(page: import('@playwright/test').Page) {
  const firstRound = FRACTION_ORDER_ROUNDS[0];
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText(/Almost!|Good try!|Let’s look again\.|Not quite\.|So close!/);
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText('1/2');
  await page.getByTestId('button-sort-8-10-down').click();
  await page.getByTestId('button-sort-8-10-down').click();
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText(firstRound.explanation);
  await page.getByTestId('button-sort-next').click();

  const secondRound = FRACTION_ORDER_ROUNDS[1];
  await page.getByTestId('button-sort-5-8-up').click();
  await page.getByTestId('button-sort-3-8-up').click();
  const sortedCards = await page.locator('[data-testid^="sort-card-"]').evaluateAll((items) =>
    items.map((item) => {
      const [numerator, denominator] = (item.getAttribute('data-fraction') ?? '').split('/').map(Number);
      return { numerator, denominator };
    }),
  );
  expect(fractionOrderMatches(sortedCards, secondRound.direction)).toBe(true);
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText('That order is right!');
  await page.getByTestId('button-sort-next').click();
}

async function retryLessonQuestion(
  page: import('@playwright/test').Page,
  question: Mission['questions'][number],
) {
  const wrongChoice = (question.correctChoice + 1) % question.choices.length;
  await page.getByTestId(`button-answer-${question.id}-${wrongChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'retry');
  await expect(page.locator('[data-testid="status-feedback"] .fq-hoot')).toBeVisible();

  await page.getByTestId('button-try-again').click();
  await expect(page.getByTestId('button-check-answer')).toBeDisabled();
  // The choice already tried is greyed out, so the next try is a real choice.
  await expect(page.getByTestId(`button-answer-${question.id}-${wrongChoice}`)).toBeDisabled();
  const correctAnswer = page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`);
  await expect(correctAnswer).toHaveAttribute('aria-pressed', 'false');
  await correctAnswer.click();
  await expect(page.getByTestId('button-check-answer')).toBeEnabled();
  await expect(correctAnswer).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
  await expect(page.getByTestId('button-next-question')).toBeVisible();
}

function masteredRecord(missionId: string) {
  const checks = Object.fromEntries(getBuildChecks(missionId).map((check) => [
    check.id,
    { passed: true, supported: false, attempts: 1 },
  ]));
  const worksheet = Object.fromEntries(getWorksheet(missionId).map((problem) => [
    problem.id,
    { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false },
  ]));
  return { practiceDone: true, checks, worksheet, helpUses: 0, misconceptions: {} };
}

async function setNumberSlot(page: import('@playwright/test').Page, label: string, value: number) {
  const editor = page.locator('.fq-code-editor');
  const output = editor.getByTestId(`code-input-${label.replace(/\W+/g, '-')}`);
  let current = Number(await output.textContent()) || 0;
  while (current < value) {
    await editor.getByRole('button', { name: `More: ${label}` }).click();
    current += 1;
  }
  while (current > value) {
    await editor.getByRole('button', { name: `Less: ${label}` }).click();
    current -= 1;
  }
}

async function fillProgramNumbers(page: import('@playwright/test').Page, target: { kind: 'bar' | 'line' | 'set'; n: number; d: number }) {
  const splitLabel = target.kind === 'line' ? 'split each whole into' : target.kind === 'set' ? 'make equal groups:' : 'split each bar into';
  await setNumberSlot(page, `${splitLabel} 0`, target.d);
  await setNumberSlot(page, 'repeat 1', target.n);
}

async function enterTileNumber(page: import('@playwright/test').Page, prefix: string, slot: 'num' | 'den', value: number) {
  await page.getByTestId(`slot-${prefix}-${slot}`).click();
  for (const digit of String(value)) await page.getByTestId(`tile-${prefix}-digit-${digit}`).click();
}

function progressBefore(mission: Mission) {
  const missionIndex = MISSIONS.findIndex((item) => item.id === mission.id);
  return {
    completedMissionIds: [],
    starsByMission: {},
    reviewQueue: [],
    learning: {
      ...Object.fromEntries(MISSIONS.slice(0, missionIndex).map((item) => [item.id, masteredRecord(item.id)])),
      [mission.id]: { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} },
    },
    assessments: [],
  };
}

async function expectMissionStart(page: import('@playwright/test').Page, missionId: string, unlocked: boolean) {
  // Current/next lesson nodes animate continuously, so wait-for-stability clicks can hang.
  const node = page.getByTestId(`button-node-${missionId}`);
  await node.click({ force: true });
  if (await node.getAttribute('aria-expanded') !== 'true') await node.click({ force: true });
  await expect(node).toHaveAttribute('aria-expanded', 'true');
  const start = page.getByTestId(`button-start-mission-${missionId}`);
  if (unlocked) await expect(start).toBeEnabled();
  else await expect(start).toBeDisabled();
}

/** Steppers have no typing: press +10/−10 and +/− until the value matches. */
async function setStepper(page: import('@playwright/test').Page, id: string, target: number) {
  const read = async () => { const text = (await page.getByTestId(`value-${id}`).textContent())?.trim() ?? ''; return /^\d+$/.test(text) ? Number(text) : 0; };
  for (let guard = 0; guard < 60; guard++) {
    const value = await read();
    if (value === target) return;
    const diff = target - value;
    const big = Math.abs(diff) >= 10 && await page.getByTestId(`button-${id}-${diff > 0 ? 'plus10' : 'minus10'}`).count();
    await page.getByTestId(`button-${id}-${diff > 0 ? 'plus' : 'minus'}${big ? '10' : ''}`).click();
  }
  throw new Error(`Could not set ${id} to ${target}`);
}

/** Build an answer with tiles (tap a box, then tap tiles), clearing anything already there. */
async function buildTileAnswer(scope: import('@playwright/test').Locator, prefix: string, problem: WorksheetProblem, answer: string) {
  const shape = answerShape(problem);
  const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
  if (shape.kind === 'pick') {
    await scope.getByTestId(`tile-${prefix}-option-${shape.options.findIndex((option) => same(option, answer))}`).click();
  } else if (shape.kind === 'symbol') {
    await scope.getByTestId(`tile-${prefix}-symbol-${({ '<': 'lt', '=': 'eq', '>': 'gt' } as Record<string, string>)[answer.trim()]}`).click();
  } else if (shape.kind === 'ordered') {
    for (let slot = 0; slot < shape.items.length; slot++) {
      const box = scope.getByTestId(`slot-${prefix}-${slot}`);
      if (((await box.getAttribute('class')) ?? '').includes('filled')) await box.click();
    }
    for (const item of answer.split(',').map((value) => value.trim())) await scope.getByTestId(`tile-${prefix}-card-${shape.items.indexOf(item)}`).click();
  } else if (shape.kind !== 'yesno') {
    const slots = slotsFromAnswer(shape, answer);
    for (const name of SLOTS[shape.kind]) {
      const box = scope.getByTestId(`slot-${prefix}-${name}`);
      await box.click();
      for (let k = 0; k < 4 && ((await box.textContent()) ?? '').trim(); k++) await scope.getByTestId(`button-${prefix}-erase`).click();
      for (const digit of slots[name] ?? '') await scope.getByTestId(`tile-${prefix}-digit-${digit}`).click();
    }
  }
}

/** A wrong answer that can still be built with the question's tiles. */
function wrongTileAnswer(problem: WorksheetProblem): string {
  const shape = answerShape(problem);
  const candidates = shape.kind === 'yesno' ? ['yes', 'no']
    : shape.kind === 'pick' ? shape.options
    : shape.kind === 'symbol' ? ['<', '=', '>']
    : shape.kind === 'ordered' ? [[...shape.items].reverse().join(', '), shape.items.join(', ')]
    : ['99', '98', '9/99', '99/1', '1 1/99', '9.9', '99%', '0'];
  return candidates.find((candidate) => canBuild(shape, candidate) && !answerMatches(problem, candidate))!;
}

async function enterModel(
  page: import('@playwright/test').Page,
  checkId: string,
  builder: 'a' | 'b',
  target: ReturnType<typeof getBuildChecks>[number]['target'],
) {
  const builderId = `${checkId}-${builder}`;
  await setStepper(page, `${builderId}-d`, target.d);

  if (target.kind === 'bar') {
    if (target.wholes > 1) await setStepper(page, `${builderId}-wholes`, target.wholes);
    for (let part = 0; part < target.n; part++) {
      await page.getByTestId(`piece-${builderId}-${part}`).click();
    }
  } else if (target.kind === 'set') {
    for (let group = 0; group < target.n; group++) {
      await page.getByTestId(`group-${builderId}-${group}`).click();
    }
  } else {
    await page.getByTestId(`tick-${builderId}-${target.n}`).click();
  }
}

async function completeBuilds(page: import('@playwright/test').Page, missionId: string) {
  const checks = getBuildChecks(missionId);
  for (const [index, check] of checks.entries()) {
    const checkCard = page.getByTestId(`check-${check.id}`);
    await expect(checkCard.locator('.fq-ll-check-heading').getByTestId('button-listen-learning-text')).toHaveCount(1);
    await enterModel(page, check.id, 'a', check.target);
    const primaryStatus = page.getByTestId(`status-primary-${check.id}`);
    await expect(primaryStatus).toBeVisible();
    await expect(primaryStatus.getByTestId('button-listen-learning-text')).toHaveCount(1);
    await enterModel(page, check.id, 'b', {
      ...check.target,
      kind: check.target.kind === 'line' ? 'bar' : 'line',
      wholes: Math.max(1, Math.ceil(check.target.n / check.target.d)),
    });
    const secondaryStatus = page.getByTestId(`status-secondary-${check.id}`);
    await expect(secondaryStatus).toBeVisible();
    await expect(secondaryStatus.getByTestId('button-listen-learning-text')).toHaveCount(1);
    if (index === 0) {
      const wrongReason = check.reasons.findIndex((_, reason) => reason !== check.correctReason);
      if (wrongReason >= 0) {
        await page.getByTestId(`radio-reason-${check.id}-${wrongReason}`).check({ force: true });
        await page.getByTestId(`button-check-${check.id}`).click();
        const errors = page.getByTestId(`status-errors-${check.id}`);
        await expect(errors).toBeVisible();
        await expect(errors.getByTestId('button-listen-learning-text')).toHaveCount(1);
        await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
      }
    }
    await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
    await page.getByTestId(`button-check-${check.id}`).click();
    // The passed check stays with its explanation until Next is pressed (no automatic jump).
    const passedStatus = page.getByTestId(`status-pass-${check.id}`);
    await expect(passedStatus).toBeVisible();
    await expect(passedStatus.locator('.fq-ll-full-explanation').getByTestId('button-listen-learning-text')).toHaveCount(1);
    await expect(checkCard).toBeVisible();
    await expect(page.getByTestId(`button-check-${check.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`check-${check.id}`).locator('.fq-ll-check-passed')).toHaveText('Passed');
    const next = page.getByTestId(`button-next-${check.id}`);
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();
    await next.click();
    const nextCheck = checks[index + 1];
    if (nextCheck) await expect(page.getByTestId(`check-${nextCheck.id}`)).toBeVisible();
    else {
      await expect(page.getByTestId('section-build-practice')).toBeVisible();
      await expect(page.getByTestId('section-worksheet')).toBeVisible();
    }
  }
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
]) {
  test(`a passed Build check clearly offers the next step on ${viewport.name}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const mission = MISSIONS.find(({ id }) => id === 'equal-parts');
    if (!mission) throw new Error('The first lesson is missing');

    await openAsGuest(page);
    await page.evaluate((progress) => {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    }, progressBefore(mission));
    await page.reload();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await expect(page.getByTestId('learning-lab')).toBeVisible();

    const check = getBuildChecks(mission.id)[0];
    if (!check) throw new Error('The first lesson has no Build check');
    await enterModel(page, check.id, 'a', check.target);
    await enterModel(page, check.id, 'b', {
      ...check.target,
      kind: check.target.kind === 'line' ? 'bar' : 'line',
      wholes: Math.max(1, Math.ceil(check.target.n / check.target.d)),
    });

    const checkButton = page.getByTestId(`button-check-${check.id}`);
    await expect(checkButton).toBeDisabled();
    await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
    await expect(checkButton).toBeEnabled();
    await checkButton.click();

    await expect(page.getByTestId(`status-pass-${check.id}`)).toContainText('Correct!');
    await expect(checkButton).toHaveCount(0);
    await expect(page.getByTestId(`check-${check.id}`).locator('.fq-ll-check-passed')).toHaveText('Passed');
    const next = page.getByTestId(`button-next-${check.id}`);
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();
    const bounds = await next.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
    });
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
    if (viewport.width <= 560) expect(bounds.width).toBeGreaterThan(viewport.width * 0.7);

    await page.getByTestId('button-lab-back').click();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();

    const reopenedCheck = page.getByTestId(`check-${check.id}`);
    await expect(reopenedCheck.locator('.fq-ll-check-passed')).toHaveText('Passed');
    await expect(page.getByTestId(`status-pass-${check.id}`)).toContainText('Correct!');
    await expect(page.getByTestId(`button-check-${check.id}`)).toHaveCount(0);
    const reopenedNext = page.getByTestId(`button-next-${check.id}`);
    await expect(reopenedNext).toBeVisible();
    await expect(reopenedNext).toBeEnabled();
    const explanation = reopenedCheck.locator('.fq-ll-full-explanation');
    await explanation.locator('summary').click();
    await expect(explanation).toContainText(/Shade 1 part in the bar and mark 1 of 3 equal jumps on the number line/);
    await reopenedNext.click();

    const nextCheck = getBuildChecks(mission.id)[1];
    if (nextCheck) await expect(page.getByTestId(`check-${nextCheck.id}`)).toBeVisible();
    else await expect(page.getByTestId('section-build-practice')).toBeVisible();

    await page.getByTestId('button-lab-back').click();
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    if (nextCheck) {
      const resumedCheck = page.getByTestId(`check-${nextCheck.id}`);
      await expect(resumedCheck).toBeVisible();
      await expect(resumedCheck.locator('.fq-ll-check-passed')).toHaveCount(0);
      await expect(page.getByTestId(`check-${check.id}`)).toHaveCount(0);
    } else {
      await expect(page.getByTestId('section-build-practice')).toBeVisible();
    }
  });
}

test('a passed Build check in later review clearly offers Finish review', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mission = MISSIONS.find(({ id }) => id === 'equal-parts');
  if (!mission) throw new Error('The first lesson is missing');
  const progress = {
    completedMissionIds: [mission.id],
    starsByMission: { [mission.id]: 1 },
    reviewQueue: [{
      missionId: mission.id,
      missedQuestionId: mission.questions[0].id,
      dueAt: 0,
      reviewCount: 0,
    }],
    learning: {
      [mission.id]: {
        practiceDone: true,
        completedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        checks: {},
        worksheet: {},
        helpUses: 0,
        misconceptions: {},
      },
    },
    assessments: [],
  };
  const reviewQuestion = getDueSkillReviewQuestions(progress)[0];
  if (!reviewQuestion) throw new Error('The saved skill review has no question');

  await page.addInitScript((savedProgress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
  }, progress);
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-due-review');
  await page.getByTestId(`button-answer-${reviewQuestion.id}-${reviewQuestion.correctChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
  await page.getByTestId('button-finish-mission').click();
  await expect(page.getByTestId('learning-lab-review')).toBeVisible();

  const check = getReviewCheck(mission.id, 0);
  await enterModel(page, check.id, 'a', check.target);
  await enterModel(page, check.id, 'b', {
    ...check.target,
    kind: check.target.kind === 'line' ? 'bar' : 'line',
    wholes: Math.max(1, Math.ceil(check.target.n / check.target.d)),
  });
  await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
  await page.getByTestId(`button-check-${check.id}`).click();

  const reviewCheck = page.getByTestId(`check-${check.id}`);
  await expect(reviewCheck.getByTestId(`status-pass-${check.id}`)).toContainText('Correct!');
  const explanation = reviewCheck.locator('.fq-ll-full-explanation');
  await explanation.locator('summary').click();
  await expect(explanation).toContainText('The shaded part is 1 of them.');
  await expect(reviewCheck.locator('.fq-ll-check-passed')).toHaveText('Passed');
  await expect(page.getByTestId(`button-check-${check.id}`)).toHaveCount(0);

  const finishReview = page.getByTestId('button-review-finish');
  await expect(finishReview).toBeVisible();
  await expect(finishReview).toBeEnabled();
  const bounds = await finishReview.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
  });
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
  expect(bounds.width).toBeGreaterThan(bounds.viewportWidth * 0.7);

  await finishReview.click();
  await expect(page.getByTestId('status-review-complete')).toBeVisible();
});

async function buildWorksheetModel(page: import('@playwright/test').Page, problem: WorksheetProblem) {
  const row = page.getByTestId(`row-worksheet-${problem.id}`);
  if (problem.modelRequired && problem.model?.kind === 'bar') {
    const total = problem.model.d * problem.model.wholes;
    const count = problem.task?.kind === 'count'
      ? total
      : problem.task?.kind === 'shade'
        ? problem.task.n
        : problem.model.n;
    for (let part = 0; part < count; part++) {
      await row.getByTestId(`button-copy-part-${part + 1}`).click();
    }
  }
  if (problem.area && problem.areaTask) {
    const pieceCount = AREA_CUTS[problem.area.cut].length;
    let answer: number[] | undefined;
    for (let mask = 1; mask < 2 ** pieceCount && !answer; mask++) {
      const pieces = Array.from({ length: pieceCount }, (_, index) => index).filter((index) => mask & (1 << index));
      if (areaTaskDone(problem.area.cut, problem.areaTask, pieces)) answer = pieces;
    }
    if (!answer) throw new Error(`No valid area model found for ${problem.id}`);
    for (const piece of answer) {
      await row.getByTestId(`button-area-piece-${piece + 1}`).click();
    }
  }
}

async function enterWorksheetAnswer(page: import('@playwright/test').Page, problem: WorksheetProblem, answer: string) {
  const row = page.getByTestId(`row-worksheet-${problem.id}`);
  if (isYesNoProblem(problem)) {
    const choice = answer.trim().toLowerCase();
    if (choice !== 'yes' && choice !== 'no') throw new Error(`Expected a Yes/No answer for ${problem.id}`);
    await row.getByTestId(`button-worksheet-${problem.id}-${choice}`).click();
  } else {
    await buildTileAnswer(row, `ws-${problem.id}`, problem, answer);
  }
  await row.getByTestId(`button-check-worksheet-${problem.id}`).click();
}

const unitRepresentativeIds = [
  'equal-parts',
  'sets-nonunit',
  'fraction-magnitude',
  'number-line-beyond-one',
  'order-fractions',
  'missing-equivalent',
  'mixed-improper',
  'multiply-whole-by-fraction',
  'order-unlike-fractions',
  'fraction-of-quantity',
  'divide-whole-by-unit-fraction',
  'fraction-as-division',
  'fraction-recipes',
  'multi-step-fraction-stories',
  'spot-the-mistake',
];

for (const missionId of unitRepresentativeIds) {
  const mission = MISSIONS.find((item) => item.id === missionId)!;
  test(`unit ${mission.unit} model builds and worksheet evidence unlock lessons in order`, async ({ page }) => {
    test.setTimeout(90_000);
    if (mission.id !== 'equal-parts') {
      await page.addInitScript((progress) => {
        localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
      }, progressBefore(mission));
    }
    if (mission.id === 'equal-parts') await page.setViewportSize({ width: 390, height: 844 });
    await openAsGuest(page);
    if (mission.id === 'equal-parts') {
      await page.evaluate((progress) => {
        localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
      }, progressBefore(mission));
      await page.reload();
      await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    }

    // In units 9–14, same-unit lessons are selectable together; the next unit stays gated.
    const nextMission = MISSIONS[MISSIONS.indexOf(mission) + 1];
    const gateBoundaryMission = mission.unit < 9
      ? nextMission
      : MISSIONS.find((item) => item.unit === mission.unit + 1);
    if (gateBoundaryMission) await expectMissionStart(page, gateBoundaryMission.id, false);
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await expect(page.getByTestId('learning-lab')).toBeVisible();

    await completeBuilds(page, mission.id);
    await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByTestId('button-lab-finish')).toBeDisabled();

    // Passing the two model checks alone is not enough to open the next lesson.
    await page.getByTestId('button-lab-back').click();
    if (gateBoundaryMission) await expectMissionStart(page, gateBoundaryMission.id, false);
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await expect(page.getByTestId('section-worksheet')).toBeVisible();

    const worksheet = getWorksheet(mission.id);
    const problemProgress = page.getByTestId('worksheet-problem-progress');
    await expect(problemProgress.locator(':scope > li')).toHaveCount(12);
    const firstWorksheetRow = page.getByTestId(`row-worksheet-${worksheet[0].id}`);
    await expect(firstWorksheetRow.locator('.fq-ll-row-prompt-header').getByTestId('button-listen-learning-text')).toHaveCount(1);
    await expect(page.getByTestId(`worksheet-progress-${worksheet[0].id}`)).toHaveAttribute('aria-current', 'step');
    await expect(page.getByTestId(`row-worksheet-${worksheet[0].id}`)).toContainText('Question 1 of 12');
    await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuetext', /0 of 12 worksheet questions complete/);
    if (mission.id === 'equal-parts') {
      const problem = worksheet.find((row) => !row.modelRequired && !row.areaTask)!;
      const wrongAnswer = wrongTileAnswer(problem);
      await enterWorksheetAnswer(page, problem, wrongAnswer);
      await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Not yet.');
      await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '0');
      const retryMarker = page.getByTestId(`worksheet-progress-${problem.id}`);
      await expect(retryMarker).toHaveClass(/retry/);
      await expect(retryMarker).toContainText('Needs another try');
      await expect(page.getByTestId('button-lab-finish')).toBeDisabled();

      // A wrong attempt remains marked for retry after the learner leaves and reopens the lesson.
      await page.reload();
      await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
      await expectMissionStart(page, mission.id, true);
      await page.getByTestId(`button-start-mission-${mission.id}`).click();
      await expect(page.getByTestId('section-worksheet')).toBeVisible();
      await expect(page.getByTestId(`worksheet-progress-${problem.id}`)).toHaveClass(/retry/);
    }

    // The whole worksheet is handed in: the lesson cannot finish until every question is right.
    for (const [index, problem] of worksheet.entries()) {
      await buildWorksheetModel(page, problem);
      await enterWorksheetAnswer(page, problem, problem.answer);
      await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Correct!');
      if (index < worksheet.length - 1) {
        await expect(page.getByTestId('button-lab-finish')).toBeDisabled();
        await expect(page.getByTestId('callout-lab-finish')).toHaveCount(0);
      }
    }
    await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '12');
    await expect(problemProgress.locator(':scope > li.complete')).toHaveCount(12);
    await expect(page.getByTestId('text-next-level')).toHaveText('All done! You can finish this lesson.');
    await expect(page.getByTestId('button-lab-finish')).toBeEnabled();
    await expect(page.getByTestId('callout-lab-finish')).toBeVisible();

    await page.getByTestId('button-lab-finish').click();
    const breakOverlay = page.getByTestId('brain-break-overlay');
    if (await breakOverlay.isVisible()) await page.getByTestId('button-break-skip').click();
    await expect(page.getByTestId('status-mission-complete')).toBeVisible();
    await page.getByTestId('button-return-map').click();
    if (mission.unit < 8) {
      const expected = MISSIONS[MISSIONS.indexOf(mission) + 1];
      const later = MISSIONS[MISSIONS.indexOf(mission) + 2];
      await expectMissionStart(page, expected.id, true);
      if (later) await expectMissionStart(page, later.id, false);
    } else if (mission.unit < 14) {
      const expected = MISSIONS.find((item) => item.unit === mission.unit + 1)!;
      const laterUnit = MISSIONS.find((item) => item.unit === mission.unit + 2);
      await expectMissionStart(page, expected.id, true);
      if (laterUnit) await expectMissionStart(page, laterUnit.id, false);
    } else {
      await expectMissionStart(page, mission.id, true);
    }
  });
}

test('a new learner can start a lesson from the top of the course', async ({ page }) => {
  await openAsGuest(page);
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);

  await page.getByTestId('button-continue-course').click();
  await expect(page.locator('.fq-taskbar-title')).toHaveText('Make fair shares');
  const firstIntro = page.getByTestId('first-fraction-introduction');
  await expect(firstIntro).toBeVisible();
  await expect(firstIntro.getByRole('heading', { name: 'Meet fractions with Numi' })).toBeVisible();
  await expect(firstIntro.getByText(/A fraction shows equal parts of one whole/)).toBeVisible();
  await expect(page.getByTestId('first-fraction-intro-model').getByRole('img', { name: 'One whole divided into four equal-size parts' })).toBeVisible();
  await expect(firstIntro.getByTestId('button-listen-learning-text')).toBeVisible();
  await expect(page.getByTestId('part-finder-lesson-example')).toBeVisible();
  await expect(page.locator('.fq-pf-lesson-example .fq-example-heading')).toHaveText(MISSIONS[0].title);
  await expect(page.getByTestId('button-listen-learning-text').first()).toBeVisible();
  await expect(page.locator('.fq-pf-intro-part').first()).toHaveCSS('animation-name', 'fq-pf-piece-reveal');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);
});

test('the first fraction introduction stays complete when reduced motion is enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openAsGuest(page);
  await page.getByTestId('button-continue-course').click();

  await expect(page.getByTestId('first-fraction-introduction')).toBeVisible();
  await expect(page.getByTestId('first-fraction-intro-model').getByRole('img', { name: 'One whole divided into four equal-size parts' })).toBeVisible();
  await expect(page.locator('.fq-pf-intro-part')).toHaveCount(4);
  await expect(page.locator('.fq-pf-intro-part').first()).toHaveCSS('animation-name', 'none');
  await expect(page.getByTestId('button-part-finder-exit')).toBeVisible();
});

test('replaying the first lesson and skipping its hands-on rounds preserves saved progress', async ({ page }) => {
  const savedProgress = {
    completedMissionIds: ['equal-parts'],
    starsByMission: { 'equal-parts': 2 },
    reviewQueue: [],
    learning: { 'equal-parts': { completedAt: 1 } },
    assessments: [],
  };
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, savedProgress);
  await openAsGuest(page);
  await page.getByTestId('button-node-equal-parts').click();
  await page.getByTestId('button-start-mission-equal-parts').click();

  await expect(page.locator('.fq-taskbar-title')).toHaveText('Make fair shares');
  await expect(page.getByTestId('first-fraction-introduction')).toBeVisible();
  await page.getByTestId('button-hands-on-skip').click();
  await expectLessonQuestionProgress(page, 1, 0);
  await page.getByTestId('button-back-map').click();

  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}'));
  expect(progress.completedMissionIds).toEqual(savedProgress.completedMissionIds);
  expect(progress.starsByMission).toEqual(savedProgress.starsByMission);
  expect(progress.learning).toEqual(savedProgress.learning);
});

test('the first fraction introduction uses natural read-aloud language', async ({ page }) => {
  await openAsGuest(page);
  const firstLesson = MISSIONS.find((mission) => mission.id === 'equal-parts')!;
  await openDeveloperLesson(page, firstLesson);

  const introduction = page.getByTestId('first-fraction-introduction');
  await expect(introduction.locator('p')).toHaveText(
    'A fraction shows equal parts of one whole. First look at the whole. Then split it into equal pieces and share them fairly.',
  );
  await expect(introduction.getByTestId('button-listen-learning-text')).toBeVisible();
});

test.describe('all-lesson required-question smoke', () => {
  test.describe.configure({ timeout: 900_000 });

  test('every lesson completes its required questions in an isolated developer test', async ({ page }) => {
    await openAsGuest(page);
    const savedStorage = await localStorageSnapshot(page);
    for (const mission of MISSIONS) {
      await test.step(`${mission.id}: ${mission.title}`, async () => {
        await openDeveloperLesson(page, mission);

        if (PART_FINDER_LESSONS.has(mission.id)) {
          await completePartFinderLesson(page, mission.id);
        } else if (mission.id === 'order-unlike-fractions') {
          await completeFractionOrderLesson(page);
        }

        const lessonQuestions = [
          ...mission.questions.slice(0, -1),
          ...(hasGenerator(mission.id)
            ? getExtraPractice(mission.id, mission.questions.map((question) => question.id)).slice(0, 4)
            : []),
          mission.questions.at(-1)!,
        ];
        await completeQuestionSequence(page, lessonQuestions);
        await finishDeveloperLesson(page, savedStorage);
      });
    }
  });
});

test('learners can correct a wrong answer across every lesson model type', async ({ page }) => {
  test.setTimeout(60_000);
  const modelKinds = ['area', 'bars', 'decimal', 'line', 'partition', 'set'] as const;
  const representativeMissions = modelKinds.map((kind) =>
    MISSIONS.find((mission) => mission.questions[0]?.model.kind === kind),
  );
  expect(representativeMissions.every(Boolean)).toBe(true);

  await page.addInitScript((ids) => {
    const completedAt = Date.now();
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: ids,
      starsByMission: {},
      reviewQueue: [],
      learning: Object.fromEntries(ids.map((id) => [id, { completedAt }])),
      assessments: [],
    }));
  }, MISSIONS.map((item) => item.id));
  await openAsGuest(page);

  for (const mission of representativeMissions) {
    if (!mission) throw new Error('Missing lesson for a question model type');
    await page.getByTestId(`button-node-${mission.id}`).click();
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    if (PART_FINDER_LESSONS.has(mission.id)) await page.getByTestId('button-hands-on-skip').click();
    else await expect(page.getByTestId('lesson-example')).toBeVisible();

    const question = mission.questions[0];
    await expect(page.getByTestId('question-model-area')).toBeVisible();
    await retryLessonQuestion(page, question);
    await page.getByTestId('button-next-question').click();
    await expectLessonQuestionProgress(page, 2, 1);
    await page.getByTestId('button-back-map').click();
  }
});

test('a generated practice question can be corrected and continued', async ({ page }) => {
  const mission = MISSIONS.find((item) => hasGenerator(item.id))!;
  const generatedQuestion = getExtraPractice(mission.id, mission.questions.map((question) => question.id))[0];
  expect(generatedQuestion).toBeDefined();
  expect(generatedQuestion.id).not.toBe(mission.questions[0].id);

  await page.addInitScript((ids) => {
    const completedAt = Date.now();
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: ids,
      starsByMission: {},
      reviewQueue: [],
      learning: Object.fromEntries(ids.map((id) => [id, { completedAt }])),
      assessments: [],
    }));
  }, MISSIONS.map((item) => item.id));
  await openAsGuest(page);
  await page.getByTestId(`button-node-${mission.id}`).click();
  await page.getByTestId(`button-practice-more-${mission.id}`).click();

  await expectLessonQuestionProgress(page, 1, 0);
  await expect(page.getByTestId(`button-answer-${generatedQuestion.id}-0`)).toBeVisible();
  await retryLessonQuestion(page, generatedQuestion);
  await page.getByTestId('button-next-question').click();
  await expectLessonQuestionProgress(page, 2, 1);
});

test('a completed learner can open a redo section without changing the lesson route', async ({ page }) => {
  const buildChecks = getBuildChecks('equal-parts');
  const worksheet = getWorksheet('equal-parts');
  const completedRecord = {
    practiceDone: true,
    checks: Object.fromEntries(buildChecks.map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
    worksheet: Object.fromEntries(worksheet.map((problem) => [problem.id, {
      draft: problem.answer,
      checkedValue: problem.answer,
      attempts: 1,
      supported: false,
    }])),
    helpUses: 0,
    misconceptions: {},
  };
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, {
    completedMissionIds: ['equal-parts'],
    starsByMission: { 'equal-parts': 1 },
    reviewQueue: [],
    learning: { 'equal-parts': completedRecord },
    assessments: [],
  });
  await openAsGuest(page);
  await page.getByTestId('button-node-equal-parts').click();
  const redo = page.getByTestId('button-redo-equal-parts');
  await expect(redo).toBeVisible();
  await redo.click();
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await expect(page.getByTestId('button-redo-builds')).toBeVisible();
  await expect(page.getByTestId('button-redo-worksheet')).toBeVisible();
  await page.getByTestId('button-redo-worksheet').click();
  await expect(page.getByTestId('section-redo-worksheet')).toBeVisible();
  const yesNoCards = page.getByRole('group', { name: 'Choose yes or no' }).first();
  const yes = yesNoCards.getByRole('button', { name: 'Yes' });
  const no = yesNoCards.getByRole('button', { name: 'No' });
  await expect(yes).toBeVisible();
  await expect(no).toBeVisible();
  await yes.click();
  await expect(yes).toHaveAttribute('aria-pressed', 'true');
  await no.click();
  await expect(no).toHaveAttribute('aria-pressed', 'true');
  await expect(yes).toHaveAttribute('aria-pressed', 'false');
});

test('daily practice opens as a separate short session', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.locator('.fq-taskbar-title')).toContainText('Daily practice');
  await expect(page.locator('#daily-question-title')).toBeVisible();
  await expect(page.getByTestId('button-daily-hint')).toBeVisible();
});

test('daily practice resumes its checked scaffold and parent report after reload without duplicating adaptation history', async ({ page }) => {
  const mission = MISSIONS[0];
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, {
    completedMissionIds: [],
    starsByMission: {},
    reviewQueue: [],
    learning: {
      [mission.id]: { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} },
    },
    adaptiveStandards: {
      '3.NF.1': {
        status: 'developing',
        recent: [false, false, false],
        accuracy: 0,
        streakCorrect: 0,
        streakMisses: 3,
        lastUpdatedAt: Date.now(),
      },
    },
    assessments: [],
  });
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.locator('#daily-question-title')).toBeVisible();

  const started = await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}');
    const session = progress.dailyPractice;
    const question = session.questions[session.index];
    return {
      index: session.index,
      question,
      adaptationLog: progress.adaptationLog ?? [],
    };
  });
  expect(started.question.difficultyBand).toBe('scaffolded');
  expect(started.question.kind).toBe('build');
  expect(started.question.adaptationReason).toMatch(/moved to scaffolded/i);
  expect(started.adaptationLog.length).toBeGreaterThan(0);
  expect(started.adaptationLog.some((event: { missionId: string; band: string; reason: string }) =>
    event.missionId === started.question.missionId
    && event.band === 'scaffolded'
    && event.reason === started.question.adaptationReason,
  )).toBe(true);

  await page.getByTestId(`button-daily-parts-${started.question.denominator}`).click();
  for (let part = 1; part <= started.question.numerator; part++) {
    await page.getByTestId(`button-daily-part-${part}`).click();
  }
  await page.getByTestId('button-daily-check-model').click();
  await expect(page.getByRole('status')).toContainText('That’s it!');
  await expect(page.getByTestId('button-daily-next')).toBeVisible();

  const afterCheck = await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}');
    const session = progress.dailyPractice;
    return {
      index: session.index,
      questionId: session.questions[session.index].id,
      answer: session.attempts[session.questions[session.index].id],
      adaptationLog: progress.adaptationLog ?? [],
    };
  });
  expect(afterCheck.index).toBe(started.index);
  expect(afterCheck.questionId).toBe(started.question.id);
  expect(afterCheck.answer.answerCorrect).toBe(true);
  expect(afterCheck.adaptationLog).toHaveLength(started.adaptationLog.length);

  await page.reload();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.locator('#daily-question-title')).toBeVisible();
  await expect(page.getByTestId('button-daily-next')).toBeVisible();
  // The grown-up reason stays in the parent report; the child never sees it.
  await expect(page.locator('.fq-daily-card')).not.toContainText(started.question.adaptationReason);

  const resumed = await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}');
    const session = progress.dailyPractice;
    const question = session.questions[session.index];
    return {
      index: session.index,
      questionId: question.id,
      answer: session.attempts[question.id],
      adaptationLog: progress.adaptationLog ?? [],
    };
  });
  expect(resumed.index).toBe(started.index);
  expect(resumed.questionId).toBe(started.question.id);
  expect(resumed.answer.answerCorrect).toBe(true);
  expect(resumed.adaptationLog).toHaveLength(started.adaptationLog.length);

  await page.getByTestId('button-daily-back').click();
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge?.match(/(\d+)\s×\s(\d+)/);
  expect(factors).not.toBeNull();
  await page.getByTestId('input-parent-gate').fill(String(Number(factors![1]) * Number(factors![2])));
  await page.getByTestId('button-parent-gate').click();
  const adaptations = page.getByTestId('parent-adaptation-reasons');
  await expect(adaptations).toBeVisible();
  await expect(adaptations).toContainText(started.question.adaptationReason);
  await expect(adaptations).not.toContainText('transfer');
  await expect(adaptations.getByRole('listitem')).toHaveCount(started.adaptationLog.length);
});

test('lesson 1 has hands-on cake rounds after the worked example: equal pieces, then mixed shapes', async ({ page }) => {
  await page.addInitScript(() => {
    const sent: string[] = [];
    (window as unknown as { __shell: string[] }).__shell = sent;
    (window as unknown as { ReactNativeWebView: unknown }).ReactNativeWebView = { postMessage: (message: string) => sent.push(message) };
  });
  await openAsGuest(page);
  await page.getByTestId('button-continue-course').click();
  await expect(page.getByTestId('button-hands-on-skip')).toHaveCount(0);
  await expect(page.getByTestId('part-finder-lesson-example')).toBeVisible();
  await expect(page.locator('.fq-pf-lesson-example .fq-example-heading')).toHaveText(MISSIONS[0].title);

  await expect(page.getByRole('heading', { name: 'Share a cake cut into equal pieces' })).toBeVisible();
  await expect(page.getByText(/4 friends share this square cake\. It is cut into 8 equal pieces\./)).toBeVisible();
  await expect(page.getByText(/each share gets 2/i)).toHaveCount(0);
  await expect(page.locator('.fq-pf-interactive .fq-pf-piece')).toHaveCount(8);
  await expect(page.getByTestId('part-finder-selection')).toHaveText('0 of 8 pieces given out.');

  const assignPiece = async (pieceNumber: number) => {
    const piece = page.getByTestId(`button-part-finder-piece-${pieceNumber}`);
    await piece.focus();
    await piece.press('Enter');
  };
  await assignPiece(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shell: string[] }).__shell
    .map((message) => JSON.parse(message) as { type: string; cue?: string })
    .filter((message) => message.type === 'haptic' && message.cue === 'selection').length)).toBe(1);
  await assignPiece(2);
  await page.getByTestId('button-part-finder-share-2').click();
  await assignPiece(3);
  await assignPiece(4);
  await page.getByTestId('button-part-finder-share-3').click();
  await assignPiece(5);
  await assignPiece(6);
  await page.getByTestId('button-part-finder-share-4').click();
  await assignPiece(7);
  await assignPiece(8);
  await expect(page.getByTestId('part-finder-selection')).toHaveText('8 of 8 pieces given out.');
  await page.getByTestId('button-part-finder-check').click();
  await expect(page.getByTestId('part-finder-feedback')).toContainText('Each friend gets 2 of the 8 equal pieces.');
  const selectedPieceCues = await page.evaluate(() => (window as unknown as { __shell: string[] }).__shell
    .map((message) => JSON.parse(message) as { type: string; cue?: string })
    .filter((message) => message.type === 'haptic' && message.cue === 'selection').length);
  await page.getByTestId('button-part-finder-piece-1').dispatchEvent('click');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shell: string[] }).__shell
    .map((message) => JSON.parse(message) as { type: string; cue?: string })
    .filter((message) => message.type === 'haptic' && message.cue === 'selection').length)).toBe(selectedPieceCues);

  await page.getByTestId('button-part-finder-next').click();
  await expect(page.getByRole('heading', { name: 'Now the pieces are different shapes' })).toBeVisible();
  await expect(page.locator('.fq-pf-interactive .fq-pf-piece')).toHaveCount(7);
  await expect(page.getByTestId('part-finder-selection')).toHaveText('0 of 7 pieces given out.');
  await assignPiece(1);
  await page.getByTestId('button-part-finder-share-2').click();
  await assignPiece(2);
  await assignPiece(3);
  await page.getByTestId('button-part-finder-share-3').click();
  await assignPiece(4);
  await assignPiece(5);
  await page.getByTestId('button-part-finder-share-4').click();
  await assignPiece(6);
  await assignPiece(7);
  await page.getByTestId('button-part-finder-check').click();
  await expect(page.getByTestId('part-finder-feedback')).toContainText('Every friend gets 1/4 of the cake.');
  await page.getByTestId('button-part-finder-next').click();
  await expectLessonQuestionProgress(page, 1, 0);
});

test('daily bar builder explains the denominator as total equal parts in one whole', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: [],
      starsByMission: {},
      reviewQueue: [],
      dailyPractice: {
        day,
        startedAt: now.getTime(),
        questions: [{
          id: 'daily-bar-one-fourth',
          missionId: 'equal-parts',
          topicTitle: 'Equal parts',
          modelKind: 'bar',
          numerator: 1,
          denominator: 4,
          explanation: 'One of four equal parts is one fourth.',
          kind: 'build',
        }],
        index: 0,
        attempts: {},
      },
    }));
  });
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-daily-practice');

  await expect(page.getByTestId('text-daily-parts-instruction')).toHaveText(
    'The denominator (bottom number) tells how many equal parts make one whole: choose that below. The numerator (top number) tells how many of those parts to shade.',
  );
  await expect(page.getByText('Total equal parts in one whole', { exact: true })).toBeVisible();
  const fourParts = page.getByRole('radio', { name: '4 equal parts in one whole' });
  await expect(fourParts).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('button-daily-parts-4').click();
  await expect(fourParts).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.fq-whole-bracket')).toHaveText('1 whole: 4 equal parts');
});

test('daily number-line model lets a learner choose the 1/3 landing point after 2/3', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: [],
      starsByMission: {},
      reviewQueue: [],
      dailyPractice: {
        day,
        startedAt: now.getTime(),
        questions: [{
          id: 'daily-line-one-third',
          missionId: 'equal-parts',
          topicTitle: 'Equal parts',
          modelKind: 'number-line',
          numerator: 1,
          denominator: 3,
          explanation: 'The line from 0 to 1 has 3 equal spaces. One jump lands at 1/3.',
          kind: 'build',
        }],
        index: 0,
        attempts: {},
      },
    }));
  });
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-daily-practice');
  await page.getByTestId('button-daily-parts-3').click();

  const twoThirds = page.getByTestId('button-daily-jump-2');
  const oneThird = page.getByTestId('button-daily-jump-1');
  await twoThirds.click();
  await expect(twoThirds).toHaveAttribute('aria-checked', 'true');
  await oneThird.click();
  await expect(oneThird).toHaveAttribute('aria-checked', 'true');
  await expect(twoThirds).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('button-daily-check-model').click();
  await expect(page.getByRole('status')).toContainText('That’s it!');
});

test('an adult progress report can invoke browser printing', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => { (window as Window & { __printCalls?: number }).__printCalls! += 1; };
  });
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge?.match(/(\d+)\s×\s(\d+)/);
  expect(factors).not.toBeNull();
  await page.getByRole('textbox').fill(String(Number(factors![1]) * Number(factors![2])));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('parent-report')).toBeVisible();
  await page.getByTestId('button-parent-print').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(1);
});

test('the map shows only lessons; extras live in the More menu; start becomes jump after the first lesson', async ({ page }) => {
  await openAsGuest(page);
  await expect(page.getByTestId('button-continue-course')).toContainText('Start your first lesson');
  await expect(page.getByTestId('button-jump-current')).toHaveCount(0);
  for (const id of ['button-start-daily-practice', 'button-open-concept-games', 'button-open-assessments', 'button-find-level', 'button-open-parent']) {
    await expect(page.getByTestId(id)).toHaveCount(0); // not on the map itself
  }
  await page.getByTestId('button-app-menu').click();
  await expect(page.getByTestId('app-menu')).toBeVisible();
  for (const id of ['button-start-daily-practice', 'button-open-concept-games', 'button-open-assessments', 'button-find-level', 'button-open-parent']) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('app-menu')).toHaveCount(0);

  // After the first lesson is finished, the map offers "Jump to current section" instead.
  const first = MISSIONS[0];
  await page.evaluate((record) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [], learning: { [record.id]: record.value }, assessments: [] }));
  }, { id: first.id, value: masteredRecord(first.id) });
  await page.reload();
  await expect(page.getByTestId('button-continue-course')).toHaveCount(0);
  const jump = page.getByTestId('button-jump-current');
  await expect(jump).toContainText('Jump to current section');
  await jump.click();
  await expect(page.getByTestId(`button-node-${MISSIONS[1].id}`)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId(`button-start-mission-${MISSIONS[1].id}`)).toBeInViewport();
});

test('top-bar symbols explain themselves when tapped, one at a time', async ({ page }) => {
  await openAsGuest(page);
  await page.getByTestId('button-tip-streak').click();
  await expect(page.getByTestId('button-tip-streak-tip')).toContainText('streak');
  await page.getByTestId('button-tip-xp').click();
  await expect(page.getByTestId('button-tip-xp-tip')).toContainText(/10 (points|candy) for every right answer/);
  await expect(page.getByTestId('button-tip-streak-tip')).toHaveCount(0);
  await page.getByTestId('button-tip-daily').click();
  await expect(page.getByTestId('button-tip-daily-tip')).toContainText("Today's goal");
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('button-tip-daily-tip')).toHaveCount(0);
  await page.getByTestId('button-tip-account').click();
  await expect(page.getByTestId('button-tip-account-tip')).toContainText('Playing as');
  await page.locator('h1').first().click();
  await expect(page.getByTestId('button-tip-account-tip')).toHaveCount(0);
});

test('racing the robot reads each new question aloud as it appears', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-natural-voice', 'off'); // device voice, so the stub below hears it
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class FakeUtterance { text: string; voice = null; lang = ''; rate = 1; pitch = 1; volume = 1; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    const synth = {
      speaking: false, pending: false, paused: false,
      getVoices: () => [{ name: 'Test voice', lang: 'en-US', default: true, localService: true, voiceURI: 'test' }],
      speak: (u: FakeUtterance) => { if (u.text.trim()) spoken.push(u.text); setTimeout(() => u.onend?.(), 10); },
      cancel: () => {}, pause: () => {}, resume: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
  });
  await openAsGuest(page);
  const node = page.getByTestId('button-node-equal-parts');
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId('button-race-equal-parts').click();
  await page.getByTestId('button-race-robot-1').click();
  const firstPrompt = page.locator('.fq-race-q').first();
  await expect(firstPrompt).toBeVisible({ timeout: 5000 });
  const spokenCount = () => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length);
  await expect.poll(spokenCount).toBeGreaterThan(0);
  const before = await spokenCount();
  // Answer (right or wrong); the next question is read when it shows.
  await page.locator('[data-testid^="race-you-choice-"]').first().click();
  await expect.poll(spokenCount, { timeout: 6000 }).toBeGreaterThan(before);
});

test('a wrong answer brings Hoot, reads the help aloud, and greys out the tried choice', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-natural-voice', 'off');
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class FakeUtterance { text: string; voice = null; lang = ''; rate = 1; pitch = 1; volume = 1; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speaking: false, pending: false, paused: false,
      getVoices: () => [{ name: 'Test voice', lang: 'en-US', default: true, localService: true, voiceURI: 'test' }],
      speak: (u: FakeUtterance) => { if (u.text.trim()) spoken.push(u.text); setTimeout(() => u.onend?.(), 10); },
      cancel: () => {}, pause: () => {}, resume: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
  });
  // Lesson 2 (no cake rounds): its first question is a tap question.
  await page.addInitScript(() => localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: ['equal-parts'], starsByMission: {}, reviewQueue: [], learning: { 'equal-parts': { completedAt: Date.now() } }, assessments: [] })));
  await openAsGuest(page);
  // Sound starts on; turn it on only if this device saved it as off.
  const soundToggle = page.getByTestId('button-toggle-sound');
  if (await soundToggle.getAttribute('aria-label') === 'Turn sound on') await soundToggle.click();
  await expect(soundToggle).toHaveAttribute('aria-label', 'Turn sound off');
  const mission = MISSIONS[1];
  const question = mission.questions[0];
  await page.getByTestId('button-continue-course').or(page.getByTestId('button-jump-current')).first().click();
  if (await page.getByTestId(`button-start-mission-${mission.id}`).count()) await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await expect(page.getByTestId('lesson-example')).toBeVisible();
  const wrong = (question.correctChoice + 1) % question.choices.length;
  await page.getByTestId(`button-answer-${question.id}-${wrong}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.locator('[data-testid="status-feedback"] .fq-hoot')).toBeVisible();
  // "Count with me": numbers pop onto the parts of the picture.
  await expect(page.getByTestId('question-model-area').locator('.fq-count-badge').first()).toBeAttached();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(' | '))).toMatch(/Almost|Good try|look again|Not quite|So close/);
  await page.getByTestId('button-try-again').click();
  await expect(page.getByTestId(`button-answer-${question.id}-${wrong}`)).toBeDisabled();
});

test('inside the Expo iPhone app, answer and result haptics work with sound off, and printing uses the native print sheet', async ({ page }) => {
  await page.addInitScript(() => {
    const sent: string[] = [];
    (window as unknown as { __shell: string[] }).__shell = sent;
    (window as unknown as { ReactNativeWebView: unknown }).ReactNativeWebView = { postMessage: (m: string) => sent.push(m) };
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => { (window as Window & { __printCalls?: number }).__printCalls! += 1; };
  });
  const messages = () => page.evaluate(() => (window as unknown as { __shell: string[] }).__shell.map((m) => JSON.parse(m) as { type: string; cue?: string; html?: string }));
  // A right answer in lesson 2's first question: a haptic tap.
  await page.addInitScript(() => localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: ['equal-parts'], starsByMission: {}, reviewQueue: [], learning: { 'equal-parts': { completedAt: Date.now() } }, assessments: [] })));
  await openAsGuest(page);
  const mission = MISSIONS[1];
  const question = mission.questions[0];
  await page.getByTestId('button-continue-course').or(page.getByTestId('button-jump-current')).first().click();
  if (await page.getByTestId(`button-start-mission-${mission.id}`).count()) await page.getByTestId(`button-start-mission-${mission.id}`).click();
  if (await page.getByTestId('button-start-practice').count()) await page.getByTestId('button-start-practice').click();
  await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
  await expect.poll(async () => (await messages()).some((m) => m.type === 'haptic' && m.cue === 'selection')).toBe(true);
  const selectionCues = (await messages()).filter((message) => message.type === 'haptic' && message.cue === 'selection').length;
  await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
  await expect.poll(async () => (await messages()).filter((message) => message.type === 'haptic' && message.cue === 'selection').length).toBe(selectionCues);
  await page.getByTestId('button-check-answer').click();
  await expect.poll(async () => (await messages()).some((m) => m.type === 'haptic' && m.cue === 'correct')).toBe(true);
  // Printing the progress report hands the page to the native print sheet (not the web view's print, which does nothing).
  await page.getByTestId('button-back-map').click();
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByRole('textbox').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('button-parent-print').click();
  await expect.poll(async () => (await messages()).find((m) => m.type === 'print')?.html ?? '').toMatch(/<base href=.*parent-report|<base href=[\s\S]*data-testid="parent-report"/);
  expect(await page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(0);
});

test('Frog Hop: a splash hops back, the best route lands with 3 flies, and Next moves through all six ponds', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-frog').click();
  const pond = page.getByTestId('frog-pond');
  // Reads the pond, then finds the fewest hops with the same rule as the game (hops always go toward the goal).
  const bestRoute = async () => {
    const goal = Number(await pond.getAttribute('data-goal'));
    const d = Number(await pond.getAttribute('data-denominator'));
    const end = d * Number(await pond.getAttribute('data-wholes'));
    const cards = await page.locator('[data-testid^="button-frog-card-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-card')!));
    const steps = cards.map((card) => { const [n, den] = card.split('/').map(Number); return (n * d) / den; });
    const queue: { at: number; path: number[] }[] = [{ at: 0, path: [] }];
    const seen = new Set([0]);
    while (queue.length) {
      const { at, path } = queue.shift()!;
      for (const [index, size] of steps.entries()) {
        const to = Math.max(0, Math.min(end, at + (at <= goal ? size : -size)));
        if (to === goal) return [...path, index];
        if (!seen.has(to)) { seen.add(to); queue.push({ at: to, path: [...path, index] }); }
      }
    }
    throw new Error('no route');
  };
  for (let round = 0; round < 6; round++) {
    if (round === 0) {
      // Too big a jump first: the largest card always overshoots a goal that is not one hop away... unless it lands short.
      await page.getByTestId('button-frog-card-0').click();
      await page.getByTestId('button-frog-hop').click();
      await expect(page.getByTestId('status-frog-feedback')).toContainText(/Splash|The frog is at|You landed/);
      if (await page.getByTestId('button-frog-next').count()) { await page.getByTestId('button-frog-next').click(); continue; }
      // Start this pond over with the planned route so it scores 3 flies.
      await page.getByTestId('button-frog-replay').click();
    }
    for (const index of await bestRoute()) {
      await page.getByTestId(`button-frog-card-${index}`).click();
      await page.getByTestId('button-frog-hop').click();
    }
    await expect(page.getByTestId('status-frog-feedback')).toContainText('You landed');
    await expect(page.getByTestId('status-frog-round-flies')).toHaveAttribute('aria-label', /^3 (fire)?flies$/);
    await page.getByTestId('button-frog-next').click();
  }
  await expect(page.getByTestId('status-frog-done')).toContainText(/You caught 18 of 18 (fire)?flies/);
});

test('Fraction War gives a clear retry hint after a wrong comparison', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-war').click();

  const [left, right] = WAR_ROUNDS[0];
  for (const [side, fraction] of [left, right].entries()) {
    await page.getByTestId(`select-war-denominator-${side}`).selectOption(String(fraction.d));
    const bar = side === 0 ? 'whole-a' : 'whole-b';
    for (let part = 1; part <= fraction.n; part += 1) {
      await page.getByTestId(`${bar}-part-${part}`).click();
    }
  }

  const comparison = compareFractions(left, right);
  const incorrectChoice = comparison > 0 ? 'right' : comparison < 0 ? 'left' : 'left';
  await page.getByTestId(`button-war-choice-${incorrectChoice}`).click();
  await page.getByTestId('button-war-check').click();

  const feedback = page.getByTestId('status-war-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toHaveClass(/retry/);
  await expect(feedback).toContainText(warHint(left, right));
  await expect(page.getByTestId('status-war-score')).toContainText('0');
});

test('Fraction Line-Up: order same-numerator fractions, miss once with a hint, then finish with Next', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-lineup').click();
  await page.getByTestId('button-lineup-mode-same-numerator').click();
  const value = (text: string) => { const [n, d] = text.split('/').map(Number); return n / d; };
  for (let round = 0; round < 6; round++) {
    const heading = await page.locator('#lineup-title').innerText();
    const smallestFirst = /smallest first/i.test(heading);
    if (round === 0) {
      // A first check of the shuffled cards is never right: the hint explains the rule without naming an answer.
      await page.getByTestId('button-lineup-check').click();
      await expect(page.getByTestId('status-lineup-feedback')).toContainText('Same numerator');
    }
    // Sort with the arrow buttons (bubble sort: always a valid, explicit move).
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < 3; i++) {
        const a = value((await page.getByTestId(`lineup-card-${i}`).getAttribute('data-fraction'))!);
        const b = value((await page.getByTestId(`lineup-card-${i + 1}`).getAttribute('data-fraction'))!);
        if (smallestFirst ? a > b : a < b) await page.getByTestId(`button-lineup-down-${i}`).click();
      }
    }
    await page.getByTestId('button-lineup-check').click();
    await expect(page.getByTestId('status-lineup-feedback')).toContainText('Yes!');
    await page.getByTestId('button-lineup-next').click();
  }
  await expect(page.getByTestId('status-lineup-done')).toContainText('5 were right on the first try');
});

test('Fraction Line-Up: a card follows the drag and drops into the slot where it is let go', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-lineup').click();
  await page.getByTestId('button-lineup-mode-same-denominator').click();
  const order = () => page.locator('[data-testid^="lineup-card-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-fraction')));
  const before = await order();
  const from = (await page.getByTestId('lineup-card-0').boundingBox())!;
  const to = (await page.getByTestId('lineup-card-2').boundingBox())!;
  // Grab the card on its fraction (not the arrow buttons) and drag it down slowly.
  const x = from.x + 60;
  await page.mouse.move(x, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, to.y + to.height / 2, { steps: 12 });
  // Mid-drag the card follows the pointer, but the order has not changed yet.
  expect(await order()).toEqual(before);
  const moving = (await page.getByTestId('lineup-card-0').boundingBox())!;
  expect(moving.y).toBeGreaterThan(to.y - 10);
  await page.mouse.up();
  await expect.poll(order).toEqual([before[1], before[2], before[0], before[3]]);
  // A tap without moving changes nothing.
  const after = await order();
  await page.getByTestId('lineup-card-1').click({ position: { x: 60, y: 20 } });
  expect(await order()).toEqual(after);
});

test('a wrong unit-challenge answer gives a hint, allows a retry, and earns no points', async ({ page }) => {
  const unitMissions = MISSIONS.filter((mission) => mission.unit === 1);
  const completedAt = Date.now();
  const progress = {
    completedMissionIds: unitMissions.map((mission) => mission.id),
    starsByMission: {},
    reviewQueue: [],
    learning: Object.fromEntries(unitMissions.map((mission) => [
      mission.id,
      { ...masteredRecord(mission.id), completedAt },
    ])),
    assessments: [],
  };
  await page.addInitScript((value) => localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(value)), progress);
  await openAsGuest(page);
  await page.getByTestId('button-challenge-unit-1').click();

  const question = CHALLENGES[1][0];
  const wrong = question.correct === 0 ? 1 : 0;
  const savedProgress = await localStorageSnapshot(page);
  await page.getByTestId(`button-challenge-${question.id}-${String.fromCharCode(65 + wrong)}`).click();
  await page.getByTestId('button-challenge-check').click();

  const feedback = page.getByTestId('status-challenge-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toContainText('Compare the amounts in the choices, then try again.');
  await expect(page.getByTestId('status-challenge-points')).toHaveText('0 pts');
  await expect(page.getByRole('progressbar', { name: 'Challenge question 1 of 6' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId(`button-challenge-${question.id}-${String.fromCharCode(65 + wrong)}`)).toBeDisabled();
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await page.getByTestId('button-challenge-retry').click();
  const secondWrong = (question.correct + 2) % question.choices.length;
  await page.getByTestId(`button-challenge-${question.id}-${String.fromCharCode(65 + secondWrong)}`).click();
  await page.getByTestId('button-challenge-check').click();
  await expect(page.getByTestId('status-challenge-feedback')).toContainText(`The answer is ${String.fromCharCode(65 + question.correct)}.`);
  await expect(page.getByTestId('status-challenge-points')).toHaveText('0 pts');
  await page.getByTestId('button-challenge-next').click();

  for (const item of CHALLENGES[1].slice(1, 3)) {
    await page.getByTestId(`button-challenge-${item.id}-${String.fromCharCode(65 + item.correct)}`).click();
    await page.getByTestId('button-challenge-check').click();
    await expect(page.getByTestId('status-challenge-feedback')).toContainText(item.explanation.replaceAll('/', ''));
    await page.getByTestId('button-challenge-next').click();
  }

  const guidedQuestion = CHALLENGES[1][3];
  await expect(page.getByTestId('button-walkthrough')).toBeVisible();
  await page.getByTestId('button-walkthrough').click();
  const step = guidedQuestion.steps![0];
  const wrongStepChoice = (step.correct + 1) % step.choices.length;
  const scoreBeforeStepMiss = await page.getByTestId('status-challenge-points').textContent();
  await page.getByTestId(`button-step-1-${wrongStepChoice}`).click();
  await expect(page.locator('.fq-walk-retry')).toHaveAttribute('role', 'status');
  await expect(page.locator('.fq-walk-retry')).toContainText('Read the step again and count carefully.');
  await expect(page.getByTestId('status-challenge-points')).toHaveText(scoreBeforeStepMiss!);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
  await page.getByTestId(`button-step-1-${step.correct}`).click();
  await page.getByTestId('button-step-next').click();
  await expect(page.getByTestId('section-walkthrough')).toContainText('step 2 of');
  await expect(page.getByTestId('status-challenge-points')).toHaveText(scoreBeforeStepMiss!);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('a wrong Fraction Race answer explains the miss, stalls without scoring, then moves to the next question', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.123; });
  await openAsGuest(page);
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  const firstQuestion = generateQuestions(mission.id, mission.questions.map((question) => question.id), 123000001, 40)[0];
  const savedProgress = await localStorageSnapshot(page);
  const node = page.getByTestId(`button-node-${mission.id}`);
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId(`button-race-${mission.id}`).click();
  await page.getByTestId('button-race-robot-1').click();
  await expect(page.getByTestId('race-live')).toBeVisible();
  await expect(page.locator('.fq-race-q')).toContainText(firstQuestion.prompt);

  const wrong = (firstQuestion.correctChoice + 1) % firstQuestion.choices.length;
  await page.getByTestId(`race-you-choice-${wrong}`).click();
  const feedback = page.getByTestId('race-you-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toContainText(firstQuestion.retryFeedback);
  await expect(feedback).toContainText('The answer is');
  await expect(feedback).toContainText('Back one space');
  await expect(page.getByRole('progressbar', { name: 'You progress' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.fq-race-lane').first()).toContainText('0/10');
  await expect(page.getByTestId(`race-you-choice-${wrong}`)).toBeDisabled();
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await expect(page.locator('.fq-race-q')).not.toContainText(firstQuestion.prompt, { timeout: 4000 });
  await expect(page.locator('.fq-response-sequence').first()).toContainText('Question 2 of 10');
  await expect(page.getByRole('progressbar', { name: 'You progress' })).toHaveAttribute('aria-valuenow', '0');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('a wrong number-line placement explains how to retry without changing the target', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-number-line').click();
  const savedProgress = await localStorageSnapshot(page);

  await page.getByTestId('select-line-spaces').selectOption('4');
  await page.getByTestId('button-line-tick-2').click();
  const feedback = page.getByTestId('status-line-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toHaveClass(/retry/);
  await expect(feedback).toContainText('Count equal jumps from 0, then try again.');
  await expect(page.getByTestId('status-line-round')).toHaveText('Target 1');
  await expect(page.getByTestId('button-line-tick-2')).toHaveAttribute('aria-pressed', 'true');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await page.getByTestId('button-line-tick-3').click();
  await expect(page.getByTestId('status-line-feedback')).toHaveClass(/success/);
  await expect(page.getByTestId('status-line-feedback')).toContainText('You found it');
  await expect(page.getByTestId('status-line-round')).toHaveText('Target 1');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('a wrong equivalence match explains what to compare and does not count as a pair', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-match').click();
  const savedProgress = await localStorageSnapshot(page);

  await page.getByTestId('button-match-card-0').click();
  await page.getByTestId('button-match-card-1').click();
  const feedback = page.getByTestId('status-match-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toHaveClass(/retry/);
  await expect(feedback).toContainText('Compare the shaded lengths, then try another pair.');
  await expect(page.getByTestId('status-match-score')).toHaveText('Pairs found · 0/3');
  await expect(page.getByTestId('button-match-card-0')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('button-match-card-1')).toHaveAttribute('aria-pressed', 'true');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await expect(page.getByTestId('button-match-card-0')).toBeEnabled({ timeout: 2500 });
  await page.getByTestId('button-match-card-0').click();
  await page.getByTestId('button-match-card-3').click();
  await expect(page.getByTestId('status-match-score')).toHaveText('Pairs found · 1/3');
  await expect(page.getByTestId('status-match-feedback')).toHaveClass(/success/);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('a wrong Code Quest run gives a next step and does not pass the level until corrected', async ({ page }) => {
  await openAsGuest(page);
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  const target = getCodeLevels(mission.id)[0].target;
  const savedProgress = await localStorageSnapshot(page);
  const node = page.getByTestId(`button-node-${mission.id}`);
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId(`button-code-${mission.id}`).click();
  await page.getByTestId('button-code-run').click();

  const result = page.getByTestId('code-result');
  await expect(result).toHaveClass(/miss/);
  await expect(result).toContainText('One number block is blank. Fill it in, then run the robot again.');
  await expect(page.getByTestId('text-code-hint')).toContainText('One number block is blank');
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('0 of 6');
  await expect(page.getByTestId('button-code-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await fillProgramNumbers(page, target);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/win/, { timeout: 10_000 });
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('1 of 6');
  await expect(page.getByTestId('button-code-next')).toBeVisible();

  const levels = getCodeLevels(mission.id);
  await page.getByTestId('button-code-next').click();
  await page.getByTestId('button-code-add-split').click();
  await page.getByTestId('button-code-add-repeat').click();
  await fillProgramNumbers(page, levels[1].target);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/win/, { timeout: 10_000 });
  await expect(page.getByTestId('button-code-next')).toBeVisible();
  await page.getByTestId('button-code-next').click();
  const beforeDebugMiss = await localStorageSnapshot(page);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/miss/, { timeout: 10_000 });
  await expect(page.getByTestId('text-code-hint')).toContainText(/Hint: .*(Check|Move|Change|Add)/i);
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('2 of 6');
  await expect(page.getByTestId('button-code-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(beforeDebugMiss);
  await fillProgramNumbers(page, levels[2].target);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/win/, { timeout: 10_000 });
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('3 of 6');
  await page.getByTestId('button-code-next').click();

  const beforePredictionMiss = await localStorageSnapshot(page);
  const predictionTarget = levels[3].target;
  await enterTileNumber(page, 'code-prediction', 'num', predictionTarget.n);
  await enterTileNumber(page, 'code-prediction', 'den', predictionTarget.d + 1);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/miss/);
  await expect(result).toContainText('Not yet. Read the split number and count how many times the loop runs, then try again.');
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('3 of 6');
  await expect(page.getByTestId('button-code-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(beforePredictionMiss);
});

test('a wrong Code Sprint run explains the fix, adds its penalty, and can be retried', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.123; });
  await openAsGuest(page);
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  const rounds = makeSprint(mission.id, () => 0.123);
  const target = rounds[0].target;
  const node = page.getByTestId(`button-node-${mission.id}`);
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId(`button-race-${mission.id}`).click();
  await page.getByTestId('button-race-sprint').click();
  await page.getByTestId('button-sprint-start').click();
  const savedProgress = await localStorageSnapshot(page);

  await page.getByTestId('button-sprint-run').click();
  const message = page.getByTestId('text-sprint-message');
  await expect(message).toBeVisible();
  await expect(message).toHaveAttribute('role', 'status');
  await expect(message).toContainText('A block is missing a number.');
  await expect(message).toContainText('+5 s. Fix it and run again.');
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+5)');
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 1 of 5');
  await expect(page.getByTestId('button-sprint-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await fillProgramNumbers(page, target);
  await page.getByTestId('button-sprint-run').click();
  await expect(message).toContainText('It works!', { timeout: 10_000 });
  await expect(page.getByTestId('button-sprint-next')).toBeVisible();
  await page.getByTestId('button-sprint-next').click();
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 2 of 5');
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+5)');

  await fillProgramNumbers(page, rounds[1].target);
  await page.getByTestId('button-sprint-run').click();
  await expect(message).toContainText('It works!', { timeout: 10_000 });
  await page.getByTestId('button-sprint-next').click();
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 3 of 5');

  await page.getByTestId('button-sprint-run').click();
  await expect(message).toContainText('+5 s. Fix it and run again.', { timeout: 10_000 });
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+10)');
  await fillProgramNumbers(page, rounds[2].target);
  await page.getByTestId('button-sprint-run').click();
  await expect(message).toContainText('It works!', { timeout: 10_000 });
  await page.getByTestId('button-sprint-next').click();
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 4 of 5');

  await page.getByTestId('button-sprint-read-wrong-0').click();
  await expect(message).toContainText('That one makes the robot');
  await expect(message).toContainText('+5 s.');
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+15)');
  await expect(page.getByTestId('button-sprint-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
  await page.getByTestId('button-sprint-read-right').click();
  await expect(message).toContainText('Yes! That program works.');
  await expect(page.getByTestId('button-sprint-next')).toBeVisible();
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+15)');
  await page.getByTestId('button-sprint-next').click();
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 5 of 5');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('Halloween: the night map, costumes earned by finishing lessons, candy points, a swamp Frog Hop, and a grown-up off switch', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date(2026, 9, 20, 10, 0, 0));
  const mission = MISSIONS.find((item) => item.id === 'sets-nonunit')!;
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 40, sound: false, breakPreferences: { intervalMinutes: 0, quietMode: false }, seasonLessons: { 'halloween-2026': ['equal-parts', 'unit-fractions'] } }));
  }, progressBefore(mission));
  await openAsGuest(page);

  // The map: banner with progress to the first costume, and Numi in a witch hat.
  const banner = page.getByTestId('season-banner');
  await expect(banner).toContainText('Spooky fraction night');
  await expect(banner).toContainText("Finish 1 more lesson to unlock Numi's bat wings.");
  await expect(banner.locator('svg.fq-mascot')).toHaveAttribute('data-costume', 'witch-hat');
  await expect(page.getByTestId('status-xp')).toContainText('40');
  await expect(page.locator('html')).toHaveAttribute('data-fq-season', 'halloween');

  // Finishing a lesson earns the bat wings.
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await completeBuilds(page, mission.id);
  for (const problem of getWorksheet(mission.id)) {
    await buildWorksheetModel(page, problem);
    await enterWorksheetAnswer(page, problem, problem.answer);
    await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Correct!');
  }
  await page.getByTestId('button-lab-finish').click();
  await expect(page.getByTestId('status-mission-complete')).toContainText('Spooky good!');
  const reward = page.getByTestId('season-reward');
  await expect(reward).toContainText('Costume unlocked');
  await expect(reward).toContainText("Numi's bat wings");
  await expect(reward).toContainText('2 more lessons for the glow-in-the-dark hat.');
  await expect(page.locator('.fq-reward-mascot svg.fq-mascot')).toHaveAttribute('data-costume', 'witch-hat bat-wings');
  await page.getByTestId('button-return-map').click();
  await expect(page.getByTestId('season-banner')).toContainText('Finish 2 more lessons to unlock the glow-in-the-dark hat.');

  // Frog Hop is a moonlit swamp with fireflies.
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-frog').click();
  await expect(page.getByTestId('frog-pond')).toHaveClass(/is-halloween/);
  await expect(page.getByTestId('status-frog-flies')).toContainText('Fireflies');

  // A grown-up can turn seasonal themes off; lessons and points stay the same.
  await page.goto('/');
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await page.getByTestId('checkbox-seasonal-themes').uncheck();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await expect(page.getByTestId('season-banner')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-fq-season', 'halloween');
  await expect(page.getByTestId('status-xp')).toContainText('XP');
});
