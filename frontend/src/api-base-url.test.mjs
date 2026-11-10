import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveApiBaseUrl } from './api-base-url.mjs';

test('production requests use the page origin when no backend URL is configured', () => {
  assert.equal(resolveApiBaseUrl(undefined, false), '');
  assert.equal(resolveApiBaseUrl('', false), '');
});

test('development and explicitly configured backends remain supported', () => {
  assert.equal(resolveApiBaseUrl(undefined, true), 'http://localhost:8001');
  assert.equal(resolveApiBaseUrl('https://api.example.com', false), 'https://api.example.com');
  assert.equal(resolveApiBaseUrl('https://api.example.com', true), 'https://api.example.com');
});
