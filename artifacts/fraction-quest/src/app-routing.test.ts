import assert from 'node:assert/strict';
import test from 'node:test';
import { getRouterBasePath } from './app-routing';

test('router strips the artifact path when the preview serves Vite from root', () => {
  assert.equal(getRouterBasePath('/', '/fraction-quest/'), '/fraction-quest');
  assert.equal(getRouterBasePath('/', '/fraction-quest'), '/fraction-quest');
});

test('router keeps configured bases and root-mounted paths intact', () => {
  assert.equal(getRouterBasePath('/fraction-quest/', '/fraction-quest/'), '/fraction-quest');
  assert.equal(getRouterBasePath('/', '/'), '');
  assert.equal(getRouterBasePath('/', '/fraction-quest/unknown'), '');
});
