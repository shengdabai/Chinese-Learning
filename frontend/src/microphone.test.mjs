import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkMicrophonePermission } from './microphone.mjs';

test('permission check releases every microphone track', async () => {
  const stopped = [];
  await checkMicrophonePermission({
    async getUserMedia(options) {
      assert.deepEqual(options, { audio: true });
      return { getTracks: () => [
        { stop: () => stopped.push('first') },
        { stop: () => stopped.push('second') },
      ] };
    },
  });
  assert.deepEqual(stopped, ['first', 'second']);
});

test('permission denial reaches the UI error handler', async () => {
  const denied = new Error('Permission denied');
  await assert.rejects(checkMicrophonePermission({
    getUserMedia: async () => { throw denied; },
  }), denied);
});
