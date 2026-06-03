import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

try {
  execSync(
    'node node_modules/typescript/bin/tsc --noEmit',
    { cwd: 'C:\\Users\\Siinn\\Downloads\\NT208_HealthOS\\mobile', stdio: 'pipe' }
  );
  writeFileSync('C:\\Users\\Siinn\\Downloads\\NT208_HealthOS\\mobile\\tsc-result.txt', 'EXIT:0\nNo type errors.');
} catch (e) {
  writeFileSync(
    'C:\\Users\\Siinn\\Downloads\\NT208_HealthOS\\mobile\\tsc-result.txt',
    'EXIT:' + e.status + '\n' + (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '')
  );
}
