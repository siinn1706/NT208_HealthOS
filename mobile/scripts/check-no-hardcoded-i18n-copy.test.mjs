import assert from 'assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { findHardcodedCopy } from './check-no-hardcoded-i18n-copy.mjs';

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'healthos-i18n-'));
  mkdirSync(join(root, 'src', 'components'), { recursive: true });
  mkdirSync(join(root, 'src', 'i18n', 'locales'), { recursive: true });
  writeFileSync(join(root, 'src', 'i18n', 'locales', 'en.json'), '{"common":{"save":"Save"}}');
  return root;
}

function writeAllowlist(root, value) {
  const filePath = join(root, 'allowlist.json');
  writeFileSync(filePath, JSON.stringify(value, null, 2));
  return filePath;
}

{
  const root = makeFixture();
  const allowlist = writeAllowlist(root, { globalTexts: [], entries: [], patterns: [] });
  writeFileSync(
    join(root, 'src', 'components', 'hardcoded.tsx'),
    "import { Text } from 'react-native'; export function Demo(){ return <Text>Hello patient</Text>; }",
  );

  const violations = findHardcodedCopy({ root, allowlistPath: allowlist });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].text, 'Hello patient');
}

{
  const root = makeFixture();
  const allowlist = writeAllowlist(root, {
    globalTexts: ['Google'],
    entries: [{ path: 'src/components/allowed.tsx', text: 'Legacy copy', reason: 'existing debt' }],
    patterns: [{ pattern: '^\\d+ bpm$', reason: 'measurement' }],
  });
  writeFileSync(
    join(root, 'src', 'components', 'allowed.tsx'),
    "import { Text } from 'react-native'; export function Demo(){ return <><Text>Google</Text><Text>Legacy copy</Text><Text>72 bpm</Text></>; }",
  );

  const violations = findHardcodedCopy({ root, allowlistPath: allowlist });
  assert.deepEqual(violations, []);
}
