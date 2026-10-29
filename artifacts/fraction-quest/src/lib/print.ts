import { Capacitor, registerPlugin } from '@capacitor/core';
import { inExpoShell, postToShell, printableHtml } from './native-shell';

/* window.print() does nothing inside an iOS app's web view, so there we ask the native Printing plugin
   (native/ios/Printing.swift) to show Apple's print sheet for the page. On the web, the browser prints. */
type PrintingPlugin = { print(options: { jobName: string }): Promise<{ completed: boolean }> };
const Printing = registerPlugin<PrintingPlugin>('Printing');

/** Open every folded part of the grown-ups' report (unit tables, other grades), so it prints in full. */
export function openFoldedSections(root: ParentNode = document): void {
  root.querySelectorAll<HTMLDetailsElement>('.fq-parent-report details').forEach((item) => { item.open = true; });
}

export async function printPage(jobName = 'Fraction Quest'): Promise<void> {
  // The Expo iPhone app prints the page through the iPhone's own print sheet. A browser fires "beforeprint" itself so
  // the page can open its folded parts; here nothing does, so fire it before the page's HTML is copied.
  if (inExpoShell()) {
    window.dispatchEvent(new Event('beforeprint'));
    postToShell({ type: 'print', jobName, html: printableHtml() });
    window.dispatchEvent(new Event('afterprint'));
    return;
  }
  if (!Capacitor.isNativePlatform()) { window.print(); return; }
  try { await Printing.print({ jobName }); } catch { window.print(); }
  // The web view doesn't fire "afterprint" for the native sheet; screens that wait for it (the report's answer key) need it.
  window.dispatchEvent(new Event('afterprint'));
}
