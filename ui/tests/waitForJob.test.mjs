import assert from 'node:assert/strict';
import test from 'node:test';


const modulePath = new URL('../src/utils/waitForJob.ts', import.meta.url);
const pollingModule = await import(modulePath).catch(() => null);


test('waits through the scheduling race and returns after the selected job finishes', async () => {
  assert.ok(pollingModule, 'waitForJob module must exist');
  const statuses = [
    { is_running: false, cmd: '', returncode: null },
    { is_running: true, cmd: 'draft_chapter.py 4', returncode: null },
    { is_running: false, cmd: 'draft_chapter.py 4', returncode: 0 },
  ];

  const result = await pollingModule.waitForJobCompletion(
    'draft_chapter.py 4',
    async () => statuses.shift() ?? statuses.at(-1),
    async () => {},
    5,
  );

  assert.equal(result.returncode, 0);
});


test('surfaces a failed background command instead of refreshing stale content', async () => {
  assert.ok(pollingModule, 'waitForJob module must exist');
  const statuses = [
    { is_running: true, cmd: 'generate_chapter_beats.py 2', returncode: null },
    { is_running: false, cmd: 'generate_chapter_beats.py 2', returncode: 2 },
  ];

  await assert.rejects(
    pollingModule.waitForJobCompletion(
      'generate_chapter_beats.py 2',
      async () => statuses.shift() ?? statuses.at(-1),
      async () => {},
      5,
    ),
    /exit code 2/,
  );
});
