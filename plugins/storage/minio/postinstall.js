#!/usr/bin/env node
/**
 * postinstall.js — patches @moduul/builder's missing bin entry.
 *
 * The @moduul/builder package declares:
 *   "bin": { "moduul-builder": "./dist/bin/moduul-builder.js" }
 * but ships only "augment-builder.js" in dist/bin/.
 * npm therefore never creates the .bin/moduul-builder symlink.
 *
 * This script creates that shim so `npx moduul-builder build` (and
 * `npm run build`) work as expected.
 */
import { writeFile, copyFile, chmod } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

// npm sets cwd to the package root when running lifecycle scripts
const root = process.cwd();

const srcBin  = join(root, 'node_modules/@moduul/builder/dist/bin/augment-builder.js');
const destBin = join(root, 'node_modules/@moduul/builder/dist/bin/moduul-builder.js');
const binDir  = join(root, 'node_modules/.bin');

async function main() {
  // 1. Copy augment-builder.js → moduul-builder.js inside the package
  if (existsSync(srcBin) && !existsSync(destBin)) {
    await copyFile(srcBin, destBin);
    console.log('postinstall: created moduul-builder.js shim in @moduul/builder/dist/bin/');
  }

  // 2. Create a .bin/moduul-builder (bash shim) for Unix & Git Bash on Windows
  const binShim = join(binDir, 'moduul-builder');
  if (!existsSync(binShim)) {
    const shimContent = `#!/bin/sh\nbasedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")\nexec node "$basedir/../@moduul/builder/dist/bin/moduul-builder.js" "$@"\n`;
    await writeFile(binShim, shimContent, 'utf-8');
    try { await chmod(binShim, 0o755); } catch { /* Windows ignores chmod */ }
    console.log('postinstall: created .bin/moduul-builder shim');
  }

  // 3. Create .bin/moduul-builder.cmd for Windows CMD / PowerShell
  const binCmd = join(binDir, 'moduul-builder.cmd');
  if (!existsSync(binCmd)) {
    const cmdContent = `@ECHO off\r\nnode "%~dp0\\..\\@moduul\\builder\\dist\\bin\\moduul-builder.js" %*\r\n`;
    await writeFile(binCmd, cmdContent, 'utf-8');
    console.log('postinstall: created .bin/moduul-builder.cmd shim');
  }

  // 4. Create .bin/moduul-builder.ps1 for PowerShell
  const binPs1 = join(binDir, 'moduul-builder.ps1');
  if (!existsSync(binPs1)) {
    const ps1Content = `#!/usr/bin/env pwsh\n& node "$PSScriptRoot/../@moduul/builder/dist/bin/moduul-builder.js" $args\n`;
    await writeFile(binPs1, ps1Content, 'utf-8');
    console.log('postinstall: created .bin/moduul-builder.ps1 shim');
  }
}

main().catch(err => {
  console.error('postinstall error:', err.message);
  process.exit(1);
});
