import { Capacitor, registerPlugin } from '@capacitor/core';

/* window.print() does nothing inside an iOS app's web view, so there we ask the native Printing plugin
   (native/ios/Printing.swift) to show Apple's print sheet for the page. On the web, the browser prints. */
type PrintingPlugin = { print(options: { jobName: string }): Promise<{ completed: boolean }> };
const Printing = registerPlugin<PrintingPlugin>('Printing');

export async function printPage(jobName = 'Fraction Quest'): Promise<void> {
  if (!Capacitor.isNativePlatform()) { window.print(); return; }
  try { await Printing.print({ jobName }); } catch { window.print(); }
  // The web view doesn't fire "afterprint" for the native sheet; screens that wait for it (the report's answer key) need it.
  window.dispatchEvent(new Event('afterprint'));
}
