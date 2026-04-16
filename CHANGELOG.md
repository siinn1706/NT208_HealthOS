## [2.13.0](https://github.com/claudekit/claudekit-engineer/compare/v2.12.1...v2.13.0) (2026-02-25)


### 🚀 Features

* add argument-hint to all skills for discoverability ([#520](https://github.com/claudekit/claudekit-engineer/issues/520)) ([7b1417a](https://github.com/claudekit/claudekit-engineer/commit/7b1417a1722062f98401bf8398f9e42baf146f40))
* add ck: namespace prefix to all skill names ([7dd3d63](https://github.com/claudekit/claudekit-engineer/commit/7dd3d631e6a9a276d74f7356ceb5ed568a09dd98)), closes [#514](https://github.com/claudekit/claudekit-engineer/issues/514)
* **ck-help:** add subcommand-aware query routing ([7794a48](https://github.com/claudekit/claudekit-engineer/commit/7794a484423cadb26b34ff002b0530d915550001))
* migrate all 19 claudekit-engineer commands to skills ([f5af9aa](https://github.com/claudekit/claudekit-engineer/commit/f5af9aa1ed9430417a6e3ba7eda0435e3a8f253d))
* migrate skills to CC plugin format for ck: namespace ([5e6da92](https://github.com/claudekit/claudekit-engineer/commit/5e6da922a312a146c41e35b1503ec57fe207e8e0)), closes [#491](https://github.com/claudekit/claudekit-engineer/issues/491)
* **plugin:** include plugin dirs in release and restore skill deletions ([5a20ea4](https://github.com/claudekit/claudekit-engineer/commit/5a20ea4c596bd994c75d1f89e9c819093d53bd52))
* **skills:** add argument-hint frontmatter and subcommand browsing to 6 skills ([327ad87](https://github.com/claudekit/claudekit-engineer/commit/327ad87baa25cec8b376627df77e78b5eb3e7da3))


### 🐞 Bug Fixes

* add ck: prefix to all skill cross-references ([99cfe27](https://github.com/claudekit/claudekit-engineer/commit/99cfe2775bc1250b4d75c96c0e41a12bdf5f4237)), closes [claudekit/claudekit-engineer#513](https://github.com/claudekit/claudekit-engineer/issues/513)
* add ck: prefix to remaining 88 missed cross-references ([e3045fb](https://github.com/claudekit/claudekit-engineer/commit/e3045fb4b48a6eeb908174abfa64a52c990425ce))
* add missing skills to metadata.json deletions array ([665dc75](https://github.com/claudekit/claudekit-engineer/commit/665dc75040eadf6a98f02e00d47374cdb6c68df4)), closes [#513](https://github.com/claudekit/claudekit-engineer/issues/513)
* address code review findings on argument-hint values ([5453dad](https://github.com/claudekit/claudekit-engineer/commit/5453dad397de671d4e784bf068edb76d84977402))
* address review round 2 findings ([a36db25](https://github.com/claudekit/claudekit-engineer/commit/a36db257838aa808d9231d1847e00e193279b41c))
* comprehensive plugin namespace cleanup after parallel code review ([25bc4b5](https://github.com/claudekit/claudekit-engineer/commit/25bc4b5e74936eb03a30adb44770d0b6a8958d48))
* **plugin:** migrate script paths to ${CLAUDE_PLUGIN_ROOT} ([6e35bea](https://github.com/claudekit/claudekit-engineer/commit/6e35bea73f262d85490cf2fd462695a131aac42d))
* **plugin:** OpenCode generation + template-skill deletion ([6da4106](https://github.com/claudekit/claudekit-engineer/commit/6da41061d048bdc31e8fb2232a0187df388e2421))
* **plugin:** sync version to 3.0.0-beta.1 and fix script permissions ([714b8cd](https://github.com/claudekit/claudekit-engineer/commit/714b8cdd97308422e34084288c4006945de5ba6a))
* **release:** add plugin validation, version sync, and OpenCode path resolution ([e590e2c](https://github.com/claudekit/claudekit-engineer/commit/e590e2cb4c2d713894c1710745b42f03b2b1e2fc))
* remove redundant [CK] tag from skill descriptions ([23844a1](https://github.com/claudekit/claudekit-engineer/commit/23844a1f27d36ee519582e111cf0b43d699886d1)), closes [claudekit/claudekit-engineer#513](https://github.com/claudekit/claudekit-engineer/issues/513)
* resolve stale references and inconsistencies after dev merge ([178584d](https://github.com/claudekit/claudekit-engineer/commit/178584da0a81e7ab664cc6959fb11e86a7132946))
* **scripts:** restore generate_catalogs.py to .claude/scripts/ for user deployment ([757a901](https://github.com/claudekit/claudekit-engineer/commit/757a9011798a32a0b94da54bae80362df9fad1ec)), closes [#325](https://github.com/claudekit/claudekit-engineer/issues/325)
* **skills:** address review findings from commands-to-skills migration ([9b7dee2](https://github.com/claudekit/claudekit-engineer/commit/9b7dee2e41326744cdfe6fcfbb295bb1d5409a6c))
* **skills:** address second-pass review findings for commands-to-skills migration ([d366fb9](https://github.com/claudekit/claudekit-engineer/commit/d366fb9b66f885c9be3db4b6bc5dba5497f8b7e0))
* **skills:** address third-pass review findings ([b19cf5b](https://github.com/claudekit/claudekit-engineer/commit/b19cf5be5c55fada0258c60d9d881fa7b9bced7d))
* **skills:** remove dead elif branches and PROJECT/ path remnants ([b001048](https://github.com/claudekit/claudekit-engineer/commit/b0010489b99bce650ce019dc2825732d8007fbc1))
* **workflows:** enforce full-plan phase sync-back on finalize ([a95ab81](https://github.com/claudekit/claudekit-engineer/commit/a95ab8183538d1e769e52861ae520f940e3d8bbb))
* **worktree:** harden sanitization and matching behavior ([8be2a2f](https://github.com/claudekit/claudekit-engineer/commit/8be2a2f60d7f8e5ff784c1405a9bf53fa95e2fb1))


### 📚 Documentation

* **architecture:** shift core docs to skills model ([2dca8e7](https://github.com/claudekit/claudekit-engineer/commit/2dca8e72aab5336372ef411bb86c806b3f714938))
* **readme:** replace stale command references ([8aa3cea](https://github.com/claudekit/claudekit-engineer/commit/8aa3ceae787d5b7acb12b600913a416c38127443))
* **skills:** fix remaining command-to-skill doc references ([4837489](https://github.com/claudekit/claudekit-engineer/commit/48374897f90840bfdae8024edd68c13e9f1249db))
* **skills:** normalize review and subcommand syntax ([276e807](https://github.com/claudekit/claudekit-engineer/commit/276e8074b2dd86e6965bb241f3a97cd86dc2a056))
* update docs for plugin namespace migration ([091dfba](https://github.com/claudekit/claudekit-engineer/commit/091dfba271aab6f40e49757fa52dc0fa7c8ec6a9))
* **workflow:** align plan syntax references ([6803b63](https://github.com/claudekit/claudekit-engineer/commit/6803b632ec3ea9d1c4884a385d31d406d9576378))


### ♻️ Code Refactoring

* **scripts:** wrap legacy ck-help entrypoint ([6e99192](https://github.com/claudekit/claudekit-engineer/commit/6e991926981c8a0208850eb0e0f68da41158259c))
* **scripts:** wrap legacy worktree entrypoints ([60eb573](https://github.com/claudekit/claudekit-engineer/commit/60eb573d9b39d90421b1a1d8d3caa6dc07127c37))


### ✅ Tests

* **ck-help:** refresh canonical help regression suite ([eb435f2](https://github.com/claudekit/claudekit-engineer/commit/eb435f2b9ddbf0a8fc8c5adab4e0e72f96146e16))

## [2.13.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.9...v2.13.0-beta.10) (2026-02-25)


### 🚀 Features

* add argument-hint to all skills for discoverability ([#520](https://github.com/claudekit/claudekit-engineer/issues/520)) ([7b1417a](https://github.com/claudekit/claudekit-engineer/commit/7b1417a1722062f98401bf8398f9e42baf146f40))


### 🐞 Bug Fixes

* address code review findings on argument-hint values ([5453dad](https://github.com/claudekit/claudekit-engineer/commit/5453dad397de671d4e784bf068edb76d84977402))
* address review round 2 findings ([a36db25](https://github.com/claudekit/claudekit-engineer/commit/a36db257838aa808d9231d1847e00e193279b41c))

## [2.13.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.8...v2.13.0-beta.9) (2026-02-25)


### 🐞 Bug Fixes

* add ck: prefix to all skill cross-references ([99cfe27](https://github.com/claudekit/claudekit-engineer/commit/99cfe2775bc1250b4d75c96c0e41a12bdf5f4237)), closes [claudekit/claudekit-engineer#513](https://github.com/claudekit/claudekit-engineer/issues/513)
* add ck: prefix to remaining 88 missed cross-references ([e3045fb](https://github.com/claudekit/claudekit-engineer/commit/e3045fb4b48a6eeb908174abfa64a52c990425ce))

## [2.13.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.7...v2.13.0-beta.8) (2026-02-25)


### 🐞 Bug Fixes

* remove redundant [CK] tag from skill descriptions ([23844a1](https://github.com/claudekit/claudekit-engineer/commit/23844a1f27d36ee519582e111cf0b43d699886d1)), closes [claudekit/claudekit-engineer#513](https://github.com/claudekit/claudekit-engineer/issues/513)

## [2.13.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.6...v2.13.0-beta.7) (2026-02-25)


### 🚀 Features

* add ck: namespace prefix to all skill names ([7dd3d63](https://github.com/claudekit/claudekit-engineer/commit/7dd3d631e6a9a276d74f7356ceb5ed568a09dd98)), closes [#514](https://github.com/claudekit/claudekit-engineer/issues/514)

## [2.13.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.5...v2.13.0-beta.6) (2026-02-25)


### 🐞 Bug Fixes

* add missing skills to metadata.json deletions array ([665dc75](https://github.com/claudekit/claudekit-engineer/commit/665dc75040eadf6a98f02e00d47374cdb6c68df4)), closes [#513](https://github.com/claudekit/claudekit-engineer/issues/513)

## [2.13.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.4...v2.13.0-beta.5) (2026-02-25)


### 🚀 Features

* migrate skills to CC plugin format for ck: namespace ([5e6da92](https://github.com/claudekit/claudekit-engineer/commit/5e6da922a312a146c41e35b1503ec57fe207e8e0)), closes [#491](https://github.com/claudekit/claudekit-engineer/issues/491)
* **plugin:** include plugin dirs in release and restore skill deletions ([5a20ea4](https://github.com/claudekit/claudekit-engineer/commit/5a20ea4c596bd994c75d1f89e9c819093d53bd52))


### 🐞 Bug Fixes

* comprehensive plugin namespace cleanup after parallel code review ([25bc4b5](https://github.com/claudekit/claudekit-engineer/commit/25bc4b5e74936eb03a30adb44770d0b6a8958d48))
* **plugin:** migrate script paths to ${CLAUDE_PLUGIN_ROOT} ([6e35bea](https://github.com/claudekit/claudekit-engineer/commit/6e35bea73f262d85490cf2fd462695a131aac42d))
* **plugin:** OpenCode generation + template-skill deletion ([6da4106](https://github.com/claudekit/claudekit-engineer/commit/6da41061d048bdc31e8fb2232a0187df388e2421))
* **plugin:** sync version to 3.0.0-beta.1 and fix script permissions ([714b8cd](https://github.com/claudekit/claudekit-engineer/commit/714b8cdd97308422e34084288c4006945de5ba6a))
* **release:** add plugin validation, version sync, and OpenCode path resolution ([e590e2c](https://github.com/claudekit/claudekit-engineer/commit/e590e2cb4c2d713894c1710745b42f03b2b1e2fc))
* resolve stale references and inconsistencies after dev merge ([178584d](https://github.com/claudekit/claudekit-engineer/commit/178584da0a81e7ab664cc6959fb11e86a7132946))
* **skills:** remove dead elif branches and PROJECT/ path remnants ([b001048](https://github.com/claudekit/claudekit-engineer/commit/b0010489b99bce650ce019dc2825732d8007fbc1))


### 📚 Documentation

* update docs for plugin namespace migration ([091dfba](https://github.com/claudekit/claudekit-engineer/commit/091dfba271aab6f40e49757fa52dc0fa7c8ec6a9))

## [2.13.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.3...v2.13.0-beta.4) (2026-02-25)


### 🐞 Bug Fixes

* **skill:** `chrome-devtools` evaluate should use await ([791cab6](https://github.com/claudekit/claudekit-engineer/commit/791cab6d4033c67360de8db2b011bf2b064410e8))

## [2.13.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.2...v2.13.0-beta.3) (2026-02-24)


### 🐞 Bug Fixes

* **scripts:** restore generate_catalogs.py to .claude/scripts/ for user deployment ([757a901](https://github.com/claudekit/claudekit-engineer/commit/757a9011798a32a0b94da54bae80362df9fad1ec)), closes [#325](https://github.com/claudekit/claudekit-engineer/issues/325)

## [2.13.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.13.0-beta.1...v2.13.0-beta.2) (2026-02-24)


### 🐞 Bug Fixes

* **workflows:** enforce full-plan phase sync-back on finalize ([a95ab81](https://github.com/claudekit/claudekit-engineer/commit/a95ab8183538d1e769e52861ae520f940e3d8bbb))

## [2.13.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0...v2.13.0-beta.1) (2026-02-24)


### 🚀 Features

* **ck-help:** add subcommand-aware query routing ([7794a48](https://github.com/claudekit/claudekit-engineer/commit/7794a484423cadb26b34ff002b0530d915550001))
* migrate all 19 claudekit-engineer commands to skills ([f5af9aa](https://github.com/claudekit/claudekit-engineer/commit/f5af9aa1ed9430417a6e3ba7eda0435e3a8f253d))
* **skills:** add argument-hint frontmatter and subcommand browsing to 6 skills ([327ad87](https://github.com/claudekit/claudekit-engineer/commit/327ad87baa25cec8b376627df77e78b5eb3e7da3))


### 🐞 Bug Fixes

* **skills:** address review findings from commands-to-skills migration ([9b7dee2](https://github.com/claudekit/claudekit-engineer/commit/9b7dee2e41326744cdfe6fcfbb295bb1d5409a6c))
* **skills:** address second-pass review findings for commands-to-skills migration ([d366fb9](https://github.com/claudekit/claudekit-engineer/commit/d366fb9b66f885c9be3db4b6bc5dba5497f8b7e0))
* **skills:** address third-pass review findings ([b19cf5b](https://github.com/claudekit/claudekit-engineer/commit/b19cf5be5c55fada0258c60d9d881fa7b9bced7d))
* **worktree:** harden sanitization and matching behavior ([8be2a2f](https://github.com/claudekit/claudekit-engineer/commit/8be2a2f60d7f8e5ff784c1405a9bf53fa95e2fb1))


### 📚 Documentation

* **architecture:** shift core docs to skills model ([2dca8e7](https://github.com/claudekit/claudekit-engineer/commit/2dca8e72aab5336372ef411bb86c806b3f714938))
* **readme:** replace stale command references ([8aa3cea](https://github.com/claudekit/claudekit-engineer/commit/8aa3ceae787d5b7acb12b600913a416c38127443))
* **skills:** fix remaining command-to-skill doc references ([4837489](https://github.com/claudekit/claudekit-engineer/commit/48374897f90840bfdae8024edd68c13e9f1249db))
* **skills:** normalize review and subcommand syntax ([276e807](https://github.com/claudekit/claudekit-engineer/commit/276e8074b2dd86e6965bb241f3a97cd86dc2a056))
* **workflow:** align plan syntax references ([6803b63](https://github.com/claudekit/claudekit-engineer/commit/6803b632ec3ea9d1c4884a385d31d406d9576378))


### ♻️ Code Refactoring

* **scripts:** wrap legacy ck-help entrypoint ([6e99192](https://github.com/claudekit/claudekit-engineer/commit/6e991926981c8a0208850eb0e0f68da41158259c))
* **scripts:** wrap legacy worktree entrypoints ([60eb573](https://github.com/claudekit/claudekit-engineer/commit/60eb573d9b39d90421b1a1d8d3caa6dc07127c37))


### ✅ Tests

* **ck-help:** refresh canonical help regression suite ([eb435f2](https://github.com/claudekit/claudekit-engineer/commit/eb435f2b9ddbf0a8fc8c5adab4e0e72f96146e16))

## [2.12.0](https://github.com/claudekit/claudekit-engineer/compare/v2.11.3...v2.12.0) (2026-02-24)


### ⚠ BREAKING CHANGES

* **team:** /team templates now auto-execute instead of providing
instructions for manual orchestration.

### 🚀 Features

* add portable-manifest.json with Codex AGENTS.md to TOML path migration ([2e7b29a](https://github.com/claudekit/claudekit-engineer/commit/2e7b29a337fe165bf980ce969dab5e0783d2c8f5)), closes [mrgoonie/claudekit-cli#433](https://github.com/mrgoonie/claudekit-cli/issues/433) [#494](https://github.com/claudekit/claudekit-engineer/issues/494) [#498](https://github.com/claudekit/claudekit-engineer/issues/498)
* **agents:** update agent definitions and references for agent teams support ([cfa9950](https://github.com/claudekit/claudekit-engineer/commit/cfa99507b0c1714bff01567d2b4d790a56662ba8))
* **commands:** add /plan:red-team adversarial plan review ([0c187cc](https://github.com/claudekit/claudekit-engineer/commit/0c187ccccf704ef8ca1cb687304da01871862404)), closes [#469](https://github.com/claudekit/claudekit-engineer/issues/469)
* **hooks:** add always-on diagnostics logging with crash wrappers ([#481](https://github.com/claudekit/claudekit-engineer/issues/481)) ([8b97ee0](https://github.com/claudekit/claudekit-engineer/commit/8b97ee06d2c79948b52ae582fd380a3b8d84c574)), closes [#478](https://github.com/claudekit/claudekit-engineer/issues/478)
* **plan:** integrate red-team review into plan workflow ([2ab6fa5](https://github.com/claudekit/claudekit-engineer/commit/2ab6fa5c7f2b923cd1fe75b0573a67c1cf3550a0))
* **skill:** convert `/bootstrap` command to skill ([bfd0480](https://github.com/claudekit/claudekit-engineer/commit/bfd0480590f2a8cb8923fc2f15a408a3cd2938f6))
* **skill:** convert `/plan:*` command to skill ([3d92e31](https://github.com/claudekit/claudekit-engineer/commit/3d92e3154bf46f94c2c8d595953fd6ca343d2e1e))
* **skills:** add `project-management` skill ([b492c80](https://github.com/claudekit/claudekit-engineer/commit/b492c8083b1be5db8574953ee849bb1afee078a9))
* **skills:** add Agent Teams orchestration skill ([#458](https://github.com/claudekit/claudekit-engineer/issues/458)) ([3542566](https://github.com/claudekit/claudekit-engineer/commit/35425666f1397f71dbf7c1df931c8836aeba5d28)), closes [#457](https://github.com/claudekit/claudekit-engineer/issues/457)
* **skills:** add tanstack skill for TanStack Start, Form, and AI ([f08b3e2](https://github.com/claudekit/claudekit-engineer/commit/f08b3e288cbb8bdf6f729ae45f65122b61101cc2))
* **team:** rewrite /team skill as CK-native imperative execution engine v2.0.0 ([5239d7a](https://github.com/claudekit/claudekit-engineer/commit/5239d7a94d9e6cb3a90a17efcf08fd0e666ac3f7))
* **team:** upgrade /team skill to v2.1.0 with event-driven hooks and agent memory ([5d3c9f6](https://github.com/claudekit/claudekit-engineer/commit/5d3c9f6483610367407abf5677aebd453d967b81))
* **team:** upgrade /team skill to v2.1.0 with event-driven hooks and agent memory ([0d7e3d1](https://github.com/claudekit/claudekit-engineer/commit/0d7e3d1eebfa231cd74f96df57646aaed542fb2f))


### 🐞 Bug Fixes

* **agents:** added skills to subagents ([158cd09](https://github.com/claudekit/claudekit-engineer/commit/158cd09251ca734aa02cde0f304fb48922ff2ec0))
* align skill SKILL.md names with directory names ([e354c07](https://github.com/claudekit/claudekit-engineer/commit/e354c076d24d86e461b8ae9db58232fa8d87a850))
* align skill SKILL.md names with directory names ([bfd9165](https://github.com/claudekit/claudekit-engineer/commit/bfd9165dfcd1190b31209f4801383694f87001d7))
* **chrome-devtools:** add OS-based headless detection and interactive OAuth login ([76a03b0](https://github.com/claudekit/claudekit-engineer/commit/76a03b0190c3eccd3abe1eaf609ed70565179618)), closes [#473](https://github.com/claudekit/claudekit-engineer/issues/473)
* **chrome-devtools:** address code review edge cases ([710a98f](https://github.com/claudekit/claudekit-engineer/commit/710a98fcb38441e5e11281cca5daf718f9c77fef))
* **ck-help:** update stale command syntax after command-to-skill migration ([4975fa0](https://github.com/claudekit/claudekit-engineer/commit/4975fa06e2ebd74ef44195aeb8cbbe3a504dc651))
* **command:** journal should follow writing styles if any ([57fccce](https://github.com/claudekit/claudekit-engineer/commit/57fccce6d509e5bb9ec6cb452087eb239998666a))
* **hooks:** align TaskCompleted/TeammateIdle handlers with official CC docs ([#466](https://github.com/claudekit/claudekit-engineer/issues/466)) ([5542a93](https://github.com/claudekit/claudekit-engineer/commit/5542a93955a3d9e7b88297f0361b10da3f9df9bd)), closes [#464](https://github.com/claudekit/claudekit-engineer/issues/464)
* **hooks:** context-aware path extraction with heredoc detection ([c8b1e4b](https://github.com/claudekit/claudekit-engineer/commit/c8b1e4bb8b6678a7d4638809a688b986470e7288))
* **hooks:** detect **/*.ext broad glob patterns ([599eaff](https://github.com/claudekit/claudekit-engineer/commit/599eaff8b9b457d54b1df3c6051ae0ab2edf04c8))
* **hooks:** normalize absolute and relative paths in scout-block matcher ([41f8df1](https://github.com/claudekit/claudekit-engineer/commit/41f8df1c435231f1e6ba3bc28dbf90a813585798))
* **hooks:** reduce session-init command failures ([0b631f2](https://github.com/claudekit/claudekit-engineer/commit/0b631f207f31e20b2bf1c36c87856f37f5a08119)), closes [#455](https://github.com/claudekit/claudekit-engineer/issues/455)
* **hooks:** remove invalid TaskCompleted/TeammateIdle hook events ([6012d42](https://github.com/claudekit/claudekit-engineer/commit/6012d42bf887a8b4cc72edca4f95b7794ae402c3))
* **hooks:** remove invalid TaskCompleted/TeammateIdle hook events ([d0545b5](https://github.com/claudekit/claudekit-engineer/commit/d0545b5f1c92280e1549f1b7f99de604770b9fae))
* **hooks:** resolve compound command and allowlist edge cases ([6db7d7b](https://github.com/claudekit/claudekit-engineer/commit/6db7d7b766e377b34cfc00d49d232b5c336f3707))
* **metadata:** add agent-teams to deletions for clean migration to team/ ([a64d5ac](https://github.com/claudekit/claudekit-engineer/commit/a64d5ace72569c78001c2eeb908555d888b84319))
* **metadata:** add missing deletions for deprecated plan commands ([cb15d31](https://github.com/claudekit/claudekit-engineer/commit/cb15d31d4cf62d6f54205805d4e124dbc1cb60bd)), closes [#451](https://github.com/claudekit/claudekit-engineer/issues/451)
* **plan:** apply red-team review findings from prompt architecture audit ([9ddecd3](https://github.com/claudekit/claudekit-engineer/commit/9ddecd3ff3366eae8c8fa40bb8e4ef6d2e675d26))
* **plan:** use explicit Skill tool invocation for red-team and validate ([5150974](https://github.com/claudekit/claudekit-engineer/commit/5150974e6ab42004aaf38652eff8062dc035587a))
* **preview:** add contextual path resolution for natural references ([04b60c2](https://github.com/claudekit/claudekit-engineer/commit/04b60c2192c9ff16e28b49bb5e110d46b5841923))
* **preview:** add contextual path resolution for natural references ([51aa751](https://github.com/claudekit/claudekit-engineer/commit/51aa751cede4deaa9bae7f6297e73262ea470eaf))
* **preview:** mermaid collapse button and code block scroll ([20abcac](https://github.com/claudekit/claudekit-engineer/commit/20abcac698db6f8b611618302f6bbc23ed13596f)), closes [#444](https://github.com/claudekit/claudekit-engineer/issues/444)
* **preview:** mermaid collapse button and code block scroll ([0c421ae](https://github.com/claudekit/claudekit-engineer/commit/0c421ae504a3e6e074d190be6360de5ae03e0bff)), closes [#444](https://github.com/claudekit/claudekit-engineer/issues/444)
* quote YAML frontmatter values containing colons and brackets ([71df90e](https://github.com/claudekit/claudekit-engineer/commit/71df90e6ca87a798c14e19130439657a13c31fea))
* reduce Windows terminal freeze from excessive process spawning ([#471](https://github.com/claudekit/claudekit-engineer/issues/471)) ([faab212](https://github.com/claudekit/claudekit-engineer/commit/faab212d32d4edfefa1d767da4af7587f958390f))
* **release:** add hotfix commit type for distinct release note visibility ([ff29d6f](https://github.com/claudekit/claudekit-engineer/commit/ff29d6f39a71e36b6f14891aa60eca074529a420))
* replace viewport-based expand with :has() selector for mermaid/code blocks ([4330861](https://github.com/claudekit/claudekit-engineer/commit/4330861ddc87fc9eba99cbe061ea276b8b9ca2e9)), closes [#504](https://github.com/claudekit/claudekit-engineer/issues/504)
* resolve merge conflicts between dev and main for v2.12.0 release ([bba37a7](https://github.com/claudekit/claudekit-engineer/commit/bba37a7a30740241c8adb72b0164fcdd6270abd5))
* restore ClaudeKit bot name in Discord notifications ([9c6fafc](https://github.com/claudekit/claudekit-engineer/commit/9c6fafc7263fe4dc12dca34b0c751cb3872f4031))
* **skills:** add [CK] prefix to skill descriptions for native command distinction ([1f5244e](https://github.com/claudekit/claudekit-engineer/commit/1f5244e20af9f041eae5dbcdd9ce8c1e88298edd)), closes [#453](https://github.com/claudekit/claudekit-engineer/issues/453)
* **skills:** add uv venv fallback for uv-managed Python installations ([fa26676](https://github.com/claudekit/claudekit-engineer/commit/fa2667643db0387bd746a84e74749bd75db5336b)), closes [#483](https://github.com/claudekit/claudekit-engineer/issues/483)
* **skills:** enhance `skill-creator` skill with `skillmark` ([8cdf309](https://github.com/claudekit/claudekit-engineer/commit/8cdf3093c3cf2828b9dcaaea7ec48480b6e886f1))
* **skills:** expand agent-teams references into comprehensive knowledge base ([a66bd77](https://github.com/claudekit/claudekit-engineer/commit/a66bd775001f99fd4b80b5c09b1dd6072b43e081))
* **skills:** rename agent-teams skill folder to team for command parity ([cd14c91](https://github.com/claudekit/claudekit-engineer/commit/cd14c91c4b902c3def654c3eafbbc105bcd865df))
* **team:** add pre-flight check to prevent subagent fallback ([e7ff1d7](https://github.com/claudekit/claudekit-engineer/commit/e7ff1d718b4be1224cace6ec2a48618e1071cb73))
* **team:** align cleanup docs with actual TeamCreate/TeamDelete API ([cd47905](https://github.com/claudekit/claudekit-engineer/commit/cd47905da9c4ab567dd75b90b47b1482295e9cdf))
* **team:** correct total task count and naming mismatch in hook handlers ([8b8ba3a](https://github.com/claudekit/claudekit-engineer/commit/8b8ba3af7af275c27f411f017256451e9cb99856))
* **team:** correct total task count and naming mismatch in hook handlers ([cbd4fe7](https://github.com/claudekit/claudekit-engineer/commit/cbd4fe7211204757bbefaeef6b4049e4dc2b4a29))
* **team:** rename /team implement to /team cook for CK consistency ([c6dc19e](https://github.com/claudekit/claudekit-engineer/commit/c6dc19e0bf2b0b3b93be8ef51eb2cf8b469ce3c9))
* **team:** reword pre-flight to prevent model self-check rejection ([953e437](https://github.com/claudekit/claudekit-engineer/commit/953e437a3e4224ecdd2f60948c8de3451a24c890))
* use absolute paths in buildRulesSection to prevent wrong plans/ directory creation ([#476](https://github.com/claudekit/claudekit-engineer/issues/476)) ([#477](https://github.com/claudekit/claudekit-engineer/issues/477)) ([ac1317a](https://github.com/claudekit/claudekit-engineer/commit/ac1317ab5f48ffc3f68203be1f9fd72a582e615d))
* use JS-computed layout for expand instead of :has() selector ([ac9c99c](https://github.com/claudekit/claudekit-engineer/commit/ac9c99ceb9eac137bd83e9c99a92d380bca80948))
* **viewer:** make mermaid diagrams scale responsively on expand ([#467](https://github.com/claudekit/claudekit-engineer/issues/467)) ([#468](https://github.com/claudekit/claudekit-engineer/issues/468)) ([5946ab4](https://github.com/claudekit/claudekit-engineer/commit/5946ab4b82142f9cd87058b4384f10b8f4109db3))


### 📚 Documentation

* add skill-native-task documentation ([a2a2be1](https://github.com/claudekit/claudekit-engineer/commit/a2a2be10abbea06831b51a050722c12a402792b2))
* **skills:** interconnection map ([f25c77d](https://github.com/claudekit/claudekit-engineer/commit/f25c77de11fb5f6879728889a0fe33a6415ed66e))
* **team:** update agent-teams-guide for v2.1.0 with ASCII visualizations ([32c00ce](https://github.com/claudekit/claudekit-engineer/commit/32c00ce9e2105561d1de58d601e448a51ff746d1))
* **team:** update agent-teams-guide for v2.1.0 with ASCII visualizations ([5a8aa32](https://github.com/claudekit/claudekit-engineer/commit/5a8aa328351e16742c5943c22302752abab0b08c))


### ♻️ Code Refactoring

* **rules:** decouple team mode from default orchestration workflow ([ecb01ed](https://github.com/claudekit/claudekit-engineer/commit/ecb01ed9800d1c5dc5a21057eca2e1e3d9cb23b7))


### ⚡ Performance Improvements

* **skill:** add `workflow-steps` to `cook` skill ([ee73b5e](https://github.com/claudekit/claudekit-engineer/commit/ee73b5e535c12d5a383c6e2014c40d2ca31525b9))
* **skill:** enhance `/fix` skill with native task orchestration ([9b98f48](https://github.com/claudekit/claudekit-engineer/commit/9b98f489ae3e91ee7155390d7129ec8711f0f0f7))
* **skill:** enhance `code-review` skill with task management ([f1d6a14](https://github.com/claudekit/claudekit-engineer/commit/f1d6a14680aa064a9fca43dcd79f037bbd110c63))
* **skill:** enhance `copywriting` skill with CRO content ([b47c756](https://github.com/claudekit/claudekit-engineer/commit/b47c756c3334ceb1700242f3da1ffd5d4b36277f))
* **skill:** enhance `debug` skill with task management ([0fb220f](https://github.com/claudekit/claudekit-engineer/commit/0fb220fb5177481088ca9a666115033bb778c42b))
* **skills:** enhance `scout` skill with task management ([18a61f6](https://github.com/claudekit/claudekit-engineer/commit/18a61f6749d5badf32a5c6e587d60cca055abdb0))
* **skills:** enhance `skill-creator` skill with `complete-guide-to-building-skills` ([794b881](https://github.com/claudekit/claudekit-engineer/commit/794b881b38d7947ceca2c5cadfc18f5bb1b518f9))
* **skills:** utilize claude chrome extension in `debug` and `test` skills ([ad3681a](https://github.com/claudekit/claudekit-engineer/commit/ad3681af516b954f807cd6480b1e5fbdb8675268))


### ✅ Tests

* **hooks:** add comprehensive test suite for project-detector ([5c3a982](https://github.com/claudekit/claudekit-engineer/commit/5c3a982c5005bc5f4941f77af250075c2a122581)), closes [#455](https://github.com/claudekit/claudekit-engineer/issues/455) [#455](https://github.com/claudekit/claudekit-engineer/issues/455)
* **hooks:** add exhaustive scout-block test suite (308 tests) ([0eb539f](https://github.com/claudekit/claudekit-engineer/commit/0eb539f8bf27ed8d43de578290cfa2dfe4c06dbd))
* **skills:** adjust some tests ([9e85afa](https://github.com/claudekit/claudekit-engineer/commit/9e85afad55720c16d775359ebd73532e38107b54))

## [2.12.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0-beta.8...v2.12.0-beta.9) (2026-02-24)


### 🐞 Bug Fixes

* resolve merge conflicts between dev and main for v2.12.0 release ([bba37a7](https://github.com/claudekit/claudekit-engineer/commit/bba37a7a30740241c8adb72b0164fcdd6270abd5))

## [2.12.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0-beta.7...v2.12.0-beta.8) (2026-02-24)


### 🚀 Features

* **skills:** add tanstack skill for TanStack Start, Form, and AI ([f08b3e2](https://github.com/claudekit/claudekit-engineer/commit/f08b3e288cbb8bdf6f729ae45f65122b61101cc2))


### 🐞 Bug Fixes

* **command:** journal should follow writing styles if any ([57fccce](https://github.com/claudekit/claudekit-engineer/commit/57fccce6d509e5bb9ec6cb452087eb239998666a))


### 📚 Documentation

* **skills:** interconnection map ([f25c77d](https://github.com/claudekit/claudekit-engineer/commit/f25c77de11fb5f6879728889a0fe33a6415ed66e))

## [2.12.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0-beta.6...v2.12.0-beta.7) (2026-02-23)


### 🐞 Bug Fixes

* replace viewport-based expand with :has() selector for mermaid/code blocks ([4330861](https://github.com/claudekit/claudekit-engineer/commit/4330861ddc87fc9eba99cbe061ea276b8b9ca2e9)), closes [#504](https://github.com/claudekit/claudekit-engineer/issues/504)
* use JS-computed layout for expand instead of :has() selector ([ac9c99c](https://github.com/claudekit/claudekit-engineer/commit/ac9c99ceb9eac137bd83e9c99a92d380bca80948))

## [2.12.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0-beta.5...v2.12.0-beta.6) (2026-02-21)


### 🚀 Features

* add portable-manifest.json with Codex AGENTS.md to TOML path migration ([2e7b29a](https://github.com/claudekit/claudekit-engineer/commit/2e7b29a337fe165bf980ce969dab5e0783d2c8f5)), closes [mrgoonie/claudekit-cli#433](https://github.com/mrgoonie/claudekit-cli/issues/433) [#494](https://github.com/claudekit/claudekit-engineer/issues/494) [#498](https://github.com/claudekit/claudekit-engineer/issues/498)

## [2.12.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0-beta.4...v2.12.0-beta.5) (2026-02-21)


### 🐞 Bug Fixes

* restore ClaudeKit bot name in Discord notifications ([9c6fafc](https://github.com/claudekit/claudekit-engineer/commit/9c6fafc7263fe4dc12dca34b0c751cb3872f4031))

## [2.12.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0-beta.3...v2.12.0-beta.4) (2026-02-21)


### 🔥 Hotfixes

* add Discord 25-field embed limit guard ([3f5e629](https://github.com/claudekit/claudekit-engineer/commit/3f5e629de10656c05ff3dbcfd44ab673e9cba472))
* add empty-changelog guard and fix console output ([106a542](https://github.com/claudekit/claudekit-engineer/commit/106a542252cfcc1f14930e4e7c6673c0977c507c))
* align Discord script with CLI fixes ([b915abe](https://github.com/claudekit/claudekit-engineer/commit/b915abef6512cb85776fb873ad50f0347a5ebecc))
* fix double-emoji in Discord release notification section headers ([35fb3f8](https://github.com/claudekit/claudekit-engineer/commit/35fb3f87cfaa76b9314d4be1c85e461f4c89f331))
* prevent double error log on timeout ([41ab992](https://github.com/claudekit/claudekit-engineer/commit/41ab992649de257d7791ddc8d0884ff8f4f70188))

## [2.12.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0-beta.2...v2.12.0-beta.3) (2026-02-21)


### 🔥 Hotfixes

* **ci:** allow hotfix branches to PR directly to main ([3f51659](https://github.com/claudekit/claudekit-engineer/commit/3f516593c01165b7199ed348d4e392126d4a807c))
* **hooks:** context-aware path extraction with heredoc detection ([08a1976](https://github.com/claudekit/claudekit-engineer/commit/08a197647a046d7f7c808941b9c81769c9b45e06))
* **hooks:** detect **/*.ext broad glob patterns ([5af5b5c](https://github.com/claudekit/claudekit-engineer/commit/5af5b5ced5d760ed7cb16bdf7e3c9f1c18d36224))
* **hooks:** normalize absolute and relative paths in scout-block matcher ([a6d25af](https://github.com/claudekit/claudekit-engineer/commit/a6d25af6e888e09b009a84b4a3e99e556c563d89))
* **hooks:** reduce session-init command failures ([5bd3287](https://github.com/claudekit/claudekit-engineer/commit/5bd32872da4e6decdc5f698e25bad1b5c81157a1))
* **hooks:** reduce Windows terminal freeze from excessive process spawning ([44e38b6](https://github.com/claudekit/claudekit-engineer/commit/44e38b65287c02f082d18f0be815479eded41294))
* **hooks:** resolve compound command and allowlist edge cases ([257f2c2](https://github.com/claudekit/claudekit-engineer/commit/257f2c217367c120b506954b44ec2d0ab22d1262))
* **hooks:** use absolute paths in buildRulesSection to prevent wrong plans/ directory ([88ef61a](https://github.com/claudekit/claudekit-engineer/commit/88ef61a31b9f5c98c87d75b44189d6762b6acbf6))


### 🐞 Bug Fixes

* **release:** add hotfix commit type for distinct release note visibility ([b9d1de2](https://github.com/claudekit/claudekit-engineer/commit/b9d1de259e52bd707cb83ea2ea0bb55261ac22a0))

## [2.12.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.12.0-beta.1...v2.12.0-beta.2) (2026-02-21)


## [2.11.2](https://github.com/claudekit/claudekit-engineer/compare/v2.11.1...v2.11.2) (2026-02-21)


### 🔥 Hotfixes

* **ci:** allow hotfix branches to PR directly to main ([3f51659](https://github.com/claudekit/claudekit-engineer/commit/3f516593c01165b7199ed348d4e392126d4a807c))
* **hooks:** context-aware path extraction with heredoc detection ([08a1976](https://github.com/claudekit/claudekit-engineer/commit/08a197647a046d7f7c808941b9c81769c9b45e06))
* **hooks:** detect **/*.ext broad glob patterns ([5af5b5c](https://github.com/claudekit/claudekit-engineer/commit/5af5b5ced5d760ed7cb16bdf7e3c9f1c18d36224))
* **hooks:** normalize absolute and relative paths in scout-block matcher ([a6d25af](https://github.com/claudekit/claudekit-engineer/commit/a6d25af6e888e09b009a84b4a3e99e556c563d89))
* **hooks:** reduce session-init command failures ([5bd3287](https://github.com/claudekit/claudekit-engineer/commit/5bd32872da4e6decdc5f698e25bad1b5c81157a1))
* **hooks:** reduce Windows terminal freeze from excessive process spawning ([44e38b6](https://github.com/claudekit/claudekit-engineer/commit/44e38b65287c02f082d18f0be815479eded41294))
* **hooks:** resolve compound command and allowlist edge cases ([257f2c2](https://github.com/claudekit/claudekit-engineer/commit/257f2c217367c120b506954b44ec2d0ab22d1262))
* **hooks:** use absolute paths in buildRulesSection to prevent wrong plans/ directory ([88ef61a](https://github.com/claudekit/claudekit-engineer/commit/88ef61a31b9f5c98c87d75b44189d6762b6acbf6))

## [2.11.1](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0...v2.11.1) (2026-02-21)


### 🐞 Bug Fixes

* **release:** add hotfix commit type for distinct release note visibility ([b9d1de2](https://github.com/claudekit/claudekit-engineer/commit/b9d1de259e52bd707cb83ea2ea0bb55261ac22a0))

## [2.11.0](https://github.com/claudekit/claudekit-engineer/compare/v2.10.1...v2.11.0) (2026-02-20)


### 🚀 Features

* **hooks:** add always-on diagnostics logging with crash wrappers ([#481](https://github.com/claudekit/claudekit-engineer/issues/481)) ([ca73800](https://github.com/claudekit/claudekit-engineer/commit/ca738003e0a94f293b7e4a97631f8abd095beb0e)), closes [#478](https://github.com/claudekit/claudekit-engineer/issues/478)

## [2.10.1](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0...v2.10.1) (2026-02-05)


### 🐞 Bug Fixes

* **release:** add hotfix commit type for distinct release note visibility ([ff29d6f](https://github.com/claudekit/claudekit-engineer/commit/ff29d6f39a71e36b6f14891aa60eca074529a420))

## [2.12.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0...v2.12.0-beta.1) (2026-02-20)


### ⚠ BREAKING CHANGES

* **team:** /team templates now auto-execute instead of providing
instructions for manual orchestration.

### 🚀 Features

* **agents:** update agent definitions and references for agent teams support ([cfa9950](https://github.com/claudekit/claudekit-engineer/commit/cfa99507b0c1714bff01567d2b4d790a56662ba8))
* **commands:** add /plan:red-team adversarial plan review ([0c187cc](https://github.com/claudekit/claudekit-engineer/commit/0c187ccccf704ef8ca1cb687304da01871862404)), closes [#469](https://github.com/claudekit/claudekit-engineer/issues/469)
* **hooks:** add always-on diagnostics logging with crash wrappers ([#481](https://github.com/claudekit/claudekit-engineer/issues/481)) ([8b97ee0](https://github.com/claudekit/claudekit-engineer/commit/8b97ee06d2c79948b52ae582fd380a3b8d84c574)), closes [#478](https://github.com/claudekit/claudekit-engineer/issues/478)
* **plan:** integrate red-team review into plan workflow ([2ab6fa5](https://github.com/claudekit/claudekit-engineer/commit/2ab6fa5c7f2b923cd1fe75b0573a67c1cf3550a0))
* **skill:** convert `/bootstrap` command to skill ([bfd0480](https://github.com/claudekit/claudekit-engineer/commit/bfd0480590f2a8cb8923fc2f15a408a3cd2938f6))
* **skill:** convert `/plan:*` command to skill ([3d92e31](https://github.com/claudekit/claudekit-engineer/commit/3d92e3154bf46f94c2c8d595953fd6ca343d2e1e))
* **skills:** add `project-management` skill ([b492c80](https://github.com/claudekit/claudekit-engineer/commit/b492c8083b1be5db8574953ee849bb1afee078a9))
* **skills:** add Agent Teams orchestration skill ([#458](https://github.com/claudekit/claudekit-engineer/issues/458)) ([3542566](https://github.com/claudekit/claudekit-engineer/commit/35425666f1397f71dbf7c1df931c8836aeba5d28)), closes [#457](https://github.com/claudekit/claudekit-engineer/issues/457)
* **team:** rewrite /team skill as CK-native imperative execution engine v2.0.0 ([5239d7a](https://github.com/claudekit/claudekit-engineer/commit/5239d7a94d9e6cb3a90a17efcf08fd0e666ac3f7))
* **team:** upgrade /team skill to v2.1.0 with event-driven hooks and agent memory ([5d3c9f6](https://github.com/claudekit/claudekit-engineer/commit/5d3c9f6483610367407abf5677aebd453d967b81))
* **team:** upgrade /team skill to v2.1.0 with event-driven hooks and agent memory ([0d7e3d1](https://github.com/claudekit/claudekit-engineer/commit/0d7e3d1eebfa231cd74f96df57646aaed542fb2f))


### 🐞 Bug Fixes

* **agents:** added skills to subagents ([158cd09](https://github.com/claudekit/claudekit-engineer/commit/158cd09251ca734aa02cde0f304fb48922ff2ec0))
* align skill SKILL.md names with directory names ([e354c07](https://github.com/claudekit/claudekit-engineer/commit/e354c076d24d86e461b8ae9db58232fa8d87a850))
* align skill SKILL.md names with directory names ([bfd9165](https://github.com/claudekit/claudekit-engineer/commit/bfd9165dfcd1190b31209f4801383694f87001d7))
* **chrome-devtools:** add OS-based headless detection and interactive OAuth login ([76a03b0](https://github.com/claudekit/claudekit-engineer/commit/76a03b0190c3eccd3abe1eaf609ed70565179618)), closes [#473](https://github.com/claudekit/claudekit-engineer/issues/473)
* **chrome-devtools:** address code review edge cases ([710a98f](https://github.com/claudekit/claudekit-engineer/commit/710a98fcb38441e5e11281cca5daf718f9c77fef))
* **ck-help:** update stale command syntax after command-to-skill migration ([4975fa0](https://github.com/claudekit/claudekit-engineer/commit/4975fa06e2ebd74ef44195aeb8cbbe3a504dc651))
* **hooks:** align TaskCompleted/TeammateIdle handlers with official CC docs ([#466](https://github.com/claudekit/claudekit-engineer/issues/466)) ([5542a93](https://github.com/claudekit/claudekit-engineer/commit/5542a93955a3d9e7b88297f0361b10da3f9df9bd)), closes [#464](https://github.com/claudekit/claudekit-engineer/issues/464)
* **hooks:** context-aware path extraction with heredoc detection ([c8b1e4b](https://github.com/claudekit/claudekit-engineer/commit/c8b1e4bb8b6678a7d4638809a688b986470e7288))
* **hooks:** detect **/*.ext broad glob patterns ([599eaff](https://github.com/claudekit/claudekit-engineer/commit/599eaff8b9b457d54b1df3c6051ae0ab2edf04c8))
* **hooks:** normalize absolute and relative paths in scout-block matcher ([41f8df1](https://github.com/claudekit/claudekit-engineer/commit/41f8df1c435231f1e6ba3bc28dbf90a813585798))
* **hooks:** reduce session-init command failures ([0b631f2](https://github.com/claudekit/claudekit-engineer/commit/0b631f207f31e20b2bf1c36c87856f37f5a08119)), closes [#455](https://github.com/claudekit/claudekit-engineer/issues/455)
* **hooks:** remove invalid TaskCompleted/TeammateIdle hook events ([6012d42](https://github.com/claudekit/claudekit-engineer/commit/6012d42bf887a8b4cc72edca4f95b7794ae402c3))
* **hooks:** remove invalid TaskCompleted/TeammateIdle hook events ([d0545b5](https://github.com/claudekit/claudekit-engineer/commit/d0545b5f1c92280e1549f1b7f99de604770b9fae))
* **hooks:** resolve compound command and allowlist edge cases ([6db7d7b](https://github.com/claudekit/claudekit-engineer/commit/6db7d7b766e377b34cfc00d49d232b5c336f3707))
* **metadata:** add agent-teams to deletions for clean migration to team/ ([a64d5ac](https://github.com/claudekit/claudekit-engineer/commit/a64d5ace72569c78001c2eeb908555d888b84319))
* **metadata:** add missing deletions for deprecated plan commands ([cb15d31](https://github.com/claudekit/claudekit-engineer/commit/cb15d31d4cf62d6f54205805d4e124dbc1cb60bd)), closes [#451](https://github.com/claudekit/claudekit-engineer/issues/451)
* **plan:** apply red-team review findings from prompt architecture audit ([9ddecd3](https://github.com/claudekit/claudekit-engineer/commit/9ddecd3ff3366eae8c8fa40bb8e4ef6d2e675d26))
* **plan:** use explicit Skill tool invocation for red-team and validate ([5150974](https://github.com/claudekit/claudekit-engineer/commit/5150974e6ab42004aaf38652eff8062dc035587a))
* **preview:** add contextual path resolution for natural references ([04b60c2](https://github.com/claudekit/claudekit-engineer/commit/04b60c2192c9ff16e28b49bb5e110d46b5841923))
* **preview:** add contextual path resolution for natural references ([51aa751](https://github.com/claudekit/claudekit-engineer/commit/51aa751cede4deaa9bae7f6297e73262ea470eaf))
* **preview:** mermaid collapse button and code block scroll ([20abcac](https://github.com/claudekit/claudekit-engineer/commit/20abcac698db6f8b611618302f6bbc23ed13596f)), closes [#444](https://github.com/claudekit/claudekit-engineer/issues/444)
* **preview:** mermaid collapse button and code block scroll ([0c421ae](https://github.com/claudekit/claudekit-engineer/commit/0c421ae504a3e6e074d190be6360de5ae03e0bff)), closes [#444](https://github.com/claudekit/claudekit-engineer/issues/444)
* quote YAML frontmatter values containing colons and brackets ([71df90e](https://github.com/claudekit/claudekit-engineer/commit/71df90e6ca87a798c14e19130439657a13c31fea))
* reduce Windows terminal freeze from excessive process spawning ([#471](https://github.com/claudekit/claudekit-engineer/issues/471)) ([faab212](https://github.com/claudekit/claudekit-engineer/commit/faab212d32d4edfefa1d767da4af7587f958390f))
* **skills:** add [CK] prefix to skill descriptions for native command distinction ([1f5244e](https://github.com/claudekit/claudekit-engineer/commit/1f5244e20af9f041eae5dbcdd9ce8c1e88298edd)), closes [#453](https://github.com/claudekit/claudekit-engineer/issues/453)
* **skills:** add uv venv fallback for uv-managed Python installations ([fa26676](https://github.com/claudekit/claudekit-engineer/commit/fa2667643db0387bd746a84e74749bd75db5336b)), closes [#483](https://github.com/claudekit/claudekit-engineer/issues/483)
* **skills:** enhance `skill-creator` skill with `skillmark` ([8cdf309](https://github.com/claudekit/claudekit-engineer/commit/8cdf3093c3cf2828b9dcaaea7ec48480b6e886f1))
* **skills:** expand agent-teams references into comprehensive knowledge base ([a66bd77](https://github.com/claudekit/claudekit-engineer/commit/a66bd775001f99fd4b80b5c09b1dd6072b43e081))
* **skills:** rename agent-teams skill folder to team for command parity ([cd14c91](https://github.com/claudekit/claudekit-engineer/commit/cd14c91c4b902c3def654c3eafbbc105bcd865df))
* **team:** add pre-flight check to prevent subagent fallback ([e7ff1d7](https://github.com/claudekit/claudekit-engineer/commit/e7ff1d718b4be1224cace6ec2a48618e1071cb73))
* **team:** align cleanup docs with actual TeamCreate/TeamDelete API ([cd47905](https://github.com/claudekit/claudekit-engineer/commit/cd47905da9c4ab567dd75b90b47b1482295e9cdf))
* **team:** correct total task count and naming mismatch in hook handlers ([8b8ba3a](https://github.com/claudekit/claudekit-engineer/commit/8b8ba3af7af275c27f411f017256451e9cb99856))
* **team:** correct total task count and naming mismatch in hook handlers ([cbd4fe7](https://github.com/claudekit/claudekit-engineer/commit/cbd4fe7211204757bbefaeef6b4049e4dc2b4a29))
* **team:** rename /team implement to /team cook for CK consistency ([c6dc19e](https://github.com/claudekit/claudekit-engineer/commit/c6dc19e0bf2b0b3b93be8ef51eb2cf8b469ce3c9))
* **team:** reword pre-flight to prevent model self-check rejection ([953e437](https://github.com/claudekit/claudekit-engineer/commit/953e437a3e4224ecdd2f60948c8de3451a24c890))
* use absolute paths in buildRulesSection to prevent wrong plans/ directory creation ([#476](https://github.com/claudekit/claudekit-engineer/issues/476)) ([#477](https://github.com/claudekit/claudekit-engineer/issues/477)) ([ac1317a](https://github.com/claudekit/claudekit-engineer/commit/ac1317ab5f48ffc3f68203be1f9fd72a582e615d))
* **viewer:** make mermaid diagrams scale responsively on expand ([#467](https://github.com/claudekit/claudekit-engineer/issues/467)) ([#468](https://github.com/claudekit/claudekit-engineer/issues/468)) ([5946ab4](https://github.com/claudekit/claudekit-engineer/commit/5946ab4b82142f9cd87058b4384f10b8f4109db3))


### 📚 Documentation

* add skill-native-task documentation ([a2a2be1](https://github.com/claudekit/claudekit-engineer/commit/a2a2be10abbea06831b51a050722c12a402792b2))
* **team:** update agent-teams-guide for v2.1.0 with ASCII visualizations ([32c00ce](https://github.com/claudekit/claudekit-engineer/commit/32c00ce9e2105561d1de58d601e448a51ff746d1))
* **team:** update agent-teams-guide for v2.1.0 with ASCII visualizations ([5a8aa32](https://github.com/claudekit/claudekit-engineer/commit/5a8aa328351e16742c5943c22302752abab0b08c))


### ♻️ Code Refactoring

* **rules:** decouple team mode from default orchestration workflow ([ecb01ed](https://github.com/claudekit/claudekit-engineer/commit/ecb01ed9800d1c5dc5a21057eca2e1e3d9cb23b7))


### ⚡ Performance Improvements

* **skill:** add `workflow-steps` to `cook` skill ([ee73b5e](https://github.com/claudekit/claudekit-engineer/commit/ee73b5e535c12d5a383c6e2014c40d2ca31525b9))
* **skill:** enhance `/fix` skill with native task orchestration ([9b98f48](https://github.com/claudekit/claudekit-engineer/commit/9b98f489ae3e91ee7155390d7129ec8711f0f0f7))
* **skill:** enhance `code-review` skill with task management ([f1d6a14](https://github.com/claudekit/claudekit-engineer/commit/f1d6a14680aa064a9fca43dcd79f037bbd110c63))
* **skill:** enhance `copywriting` skill with CRO content ([b47c756](https://github.com/claudekit/claudekit-engineer/commit/b47c756c3334ceb1700242f3da1ffd5d4b36277f))
* **skill:** enhance `debug` skill with task management ([0fb220f](https://github.com/claudekit/claudekit-engineer/commit/0fb220fb5177481088ca9a666115033bb778c42b))
* **skills:** enhance `scout` skill with task management ([18a61f6](https://github.com/claudekit/claudekit-engineer/commit/18a61f6749d5badf32a5c6e587d60cca055abdb0))
* **skills:** enhance `skill-creator` skill with `complete-guide-to-building-skills` ([794b881](https://github.com/claudekit/claudekit-engineer/commit/794b881b38d7947ceca2c5cadfc18f5bb1b518f9))
* **skills:** utilize claude chrome extension in `debug` and `test` skills ([ad3681a](https://github.com/claudekit/claudekit-engineer/commit/ad3681af516b954f807cd6480b1e5fbdb8675268))


### ✅ Tests

* **hooks:** add comprehensive test suite for project-detector ([5c3a982](https://github.com/claudekit/claudekit-engineer/commit/5c3a982c5005bc5f4941f77af250075c2a122581)), closes [#455](https://github.com/claudekit/claudekit-engineer/issues/455) [#455](https://github.com/claudekit/claudekit-engineer/issues/455)
* **hooks:** add exhaustive scout-block test suite (308 tests) ([0eb539f](https://github.com/claudekit/claudekit-engineer/commit/0eb539f8bf27ed8d43de578290cfa2dfe4c06dbd))
* **skills:** adjust some tests ([9e85afa](https://github.com/claudekit/claudekit-engineer/commit/9e85afad55720c16d775359ebd73532e38107b54))

## [2.11.0-beta.26](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.25...v2.11.0-beta.26) (2026-02-19)


### 🐞 Bug Fixes

* **hooks:** context-aware path extraction with heredoc detection ([c8b1e4b](https://github.com/claudekit/claudekit-engineer/commit/c8b1e4bb8b6678a7d4638809a688b986470e7288))
* **hooks:** detect **/*.ext broad glob patterns ([599eaff](https://github.com/claudekit/claudekit-engineer/commit/599eaff8b9b457d54b1df3c6051ae0ab2edf04c8))
* **hooks:** normalize absolute and relative paths in scout-block matcher ([41f8df1](https://github.com/claudekit/claudekit-engineer/commit/41f8df1c435231f1e6ba3bc28dbf90a813585798))
* **hooks:** resolve compound command and allowlist edge cases ([6db7d7b](https://github.com/claudekit/claudekit-engineer/commit/6db7d7b766e377b34cfc00d49d232b5c336f3707))


### ✅ Tests

* **hooks:** add exhaustive scout-block test suite (308 tests) ([0eb539f](https://github.com/claudekit/claudekit-engineer/commit/0eb539f8bf27ed8d43de578290cfa2dfe4c06dbd))

## [2.11.0-beta.25](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.24...v2.11.0-beta.25) (2026-02-13)


### 🐞 Bug Fixes

* quote YAML frontmatter values containing colons and brackets ([71df90e](https://github.com/claudekit/claudekit-engineer/commit/71df90e6ca87a798c14e19130439657a13c31fea))

## [2.11.0-beta.24](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.23...v2.11.0-beta.24) (2026-02-12)


### 🐞 Bug Fixes

* **skills:** add uv venv fallback for uv-managed Python installations ([fa26676](https://github.com/claudekit/claudekit-engineer/commit/fa2667643db0387bd746a84e74749bd75db5336b)), closes [#483](https://github.com/claudekit/claudekit-engineer/issues/483)

## [2.11.0-beta.23](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.22...v2.11.0-beta.23) (2026-02-12)


### 🚀 Features

* **team:** upgrade /team skill to v2.1.0 with event-driven hooks and agent memory ([5d3c9f6](https://github.com/claudekit/claudekit-engineer/commit/5d3c9f6483610367407abf5677aebd453d967b81))


### 🐞 Bug Fixes

* align skill SKILL.md names with directory names ([e354c07](https://github.com/claudekit/claudekit-engineer/commit/e354c076d24d86e461b8ae9db58232fa8d87a850))
* **hooks:** remove invalid TaskCompleted/TeammateIdle hook events ([6012d42](https://github.com/claudekit/claudekit-engineer/commit/6012d42bf887a8b4cc72edca4f95b7794ae402c3))
* **skills:** enhance `skill-creator` skill with `skillmark` ([8cdf309](https://github.com/claudekit/claudekit-engineer/commit/8cdf3093c3cf2828b9dcaaea7ec48480b6e886f1))
* **team:** correct total task count and naming mismatch in hook handlers ([8b8ba3a](https://github.com/claudekit/claudekit-engineer/commit/8b8ba3af7af275c27f411f017256451e9cb99856))


### 📚 Documentation

* add skill-native-task documentation ([a2a2be1](https://github.com/claudekit/claudekit-engineer/commit/a2a2be10abbea06831b51a050722c12a402792b2))
* **team:** update agent-teams-guide for v2.1.0 with ASCII visualizations ([32c00ce](https://github.com/claudekit/claudekit-engineer/commit/32c00ce9e2105561d1de58d601e448a51ff746d1))


### ⚡ Performance Improvements

* **skill:** enhance `/fix` skill with native task orchestration ([9b98f48](https://github.com/claudekit/claudekit-engineer/commit/9b98f489ae3e91ee7155390d7129ec8711f0f0f7))
* **skills:** enhance `skill-creator` skill with `complete-guide-to-building-skills` ([794b881](https://github.com/claudekit/claudekit-engineer/commit/794b881b38d7947ceca2c5cadfc18f5bb1b518f9))
* **skills:** utilize claude chrome extension in `debug` and `test` skills ([ad3681a](https://github.com/claudekit/claudekit-engineer/commit/ad3681af516b954f807cd6480b1e5fbdb8675268))

## [2.11.0-beta.22](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.21...v2.11.0-beta.22) (2026-02-11)


### 🚀 Features

* **hooks:** add always-on diagnostics logging with crash wrappers ([#481](https://github.com/claudekit/claudekit-engineer/issues/481)) ([8b97ee0](https://github.com/claudekit/claudekit-engineer/commit/8b97ee06d2c79948b52ae582fd380a3b8d84c574)), closes [#478](https://github.com/claudekit/claudekit-engineer/issues/478)

## [2.11.0-beta.21](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.20...v2.11.0-beta.21) (2026-02-10)


### 🐞 Bug Fixes

* use absolute paths in buildRulesSection to prevent wrong plans/ directory creation ([#476](https://github.com/claudekit/claudekit-engineer/issues/476)) ([#477](https://github.com/claudekit/claudekit-engineer/issues/477)) ([ac1317a](https://github.com/claudekit/claudekit-engineer/commit/ac1317ab5f48ffc3f68203be1f9fd72a582e615d))

## [2.11.0-beta.20](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.19...v2.11.0-beta.20) (2026-02-10)


### 🐞 Bug Fixes

* **chrome-devtools:** add OS-based headless detection and interactive OAuth login ([76a03b0](https://github.com/claudekit/claudekit-engineer/commit/76a03b0190c3eccd3abe1eaf609ed70565179618)), closes [#473](https://github.com/claudekit/claudekit-engineer/issues/473)
* **chrome-devtools:** address code review edge cases ([710a98f](https://github.com/claudekit/claudekit-engineer/commit/710a98fcb38441e5e11281cca5daf718f9c77fef))

## [2.11.0-beta.19](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.18...v2.11.0-beta.19) (2026-02-09)


### 🚀 Features

* **commands:** add /plan:red-team adversarial plan review ([0c187cc](https://github.com/claudekit/claudekit-engineer/commit/0c187ccccf704ef8ca1cb687304da01871862404)), closes [#469](https://github.com/claudekit/claudekit-engineer/issues/469)
* **plan:** integrate red-team review into plan workflow ([2ab6fa5](https://github.com/claudekit/claudekit-engineer/commit/2ab6fa5c7f2b923cd1fe75b0573a67c1cf3550a0))


### 🐞 Bug Fixes

* **plan:** apply red-team review findings from prompt architecture audit ([9ddecd3](https://github.com/claudekit/claudekit-engineer/commit/9ddecd3ff3366eae8c8fa40bb8e4ef6d2e675d26))
* **plan:** use explicit Skill tool invocation for red-team and validate ([5150974](https://github.com/claudekit/claudekit-engineer/commit/5150974e6ab42004aaf38652eff8062dc035587a))

## [2.11.0-beta.18](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.17...v2.11.0-beta.18) (2026-02-09)


### 🐞 Bug Fixes

* reduce Windows terminal freeze from excessive process spawning ([#471](https://github.com/claudekit/claudekit-engineer/issues/471)) ([faab212](https://github.com/claudekit/claudekit-engineer/commit/faab212d32d4edfefa1d767da4af7587f958390f))

## [2.11.0-beta.17](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.16...v2.11.0-beta.17) (2026-02-09)


### 🐞 Bug Fixes

* **viewer:** make mermaid diagrams scale responsively on expand ([#467](https://github.com/claudekit/claudekit-engineer/issues/467)) ([#468](https://github.com/claudekit/claudekit-engineer/issues/468)) ([5946ab4](https://github.com/claudekit/claudekit-engineer/commit/5946ab4b82142f9cd87058b4384f10b8f4109db3))

## [2.11.0-beta.16](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.15...v2.11.0-beta.16) (2026-02-07)


### 🐞 Bug Fixes

* **hooks:** align TaskCompleted/TeammateIdle handlers with official CC docs ([#466](https://github.com/claudekit/claudekit-engineer/issues/466)) ([5542a93](https://github.com/claudekit/claudekit-engineer/commit/5542a93955a3d9e7b88297f0361b10da3f9df9bd)), closes [#464](https://github.com/claudekit/claudekit-engineer/issues/464)

## [2.11.0-beta.15](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.14...v2.11.0-beta.15) (2026-02-07)


### 🐞 Bug Fixes

* **team:** align cleanup docs with actual TeamCreate/TeamDelete API ([cd47905](https://github.com/claudekit/claudekit-engineer/commit/cd47905da9c4ab567dd75b90b47b1482295e9cdf))

## [2.11.0-beta.14](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.13...v2.11.0-beta.14) (2026-02-06)


### 🐞 Bug Fixes

* **hooks:** remove invalid TaskCompleted/TeammateIdle hook events ([d0545b5](https://github.com/claudekit/claudekit-engineer/commit/d0545b5f1c92280e1549f1b7f99de604770b9fae))

## [2.11.0-beta.13](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.12...v2.11.0-beta.13) (2026-02-06)


### 🐞 Bug Fixes

* align skill SKILL.md names with directory names ([bfd9165](https://github.com/claudekit/claudekit-engineer/commit/bfd9165dfcd1190b31209f4801383694f87001d7))

## [2.11.0-beta.12](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.11...v2.11.0-beta.12) (2026-02-06)


### 🚀 Features

* **team:** upgrade /team skill to v2.1.0 with event-driven hooks and agent memory ([0d7e3d1](https://github.com/claudekit/claudekit-engineer/commit/0d7e3d1eebfa231cd74f96df57646aaed542fb2f))


### 🐞 Bug Fixes

* **team:** correct total task count and naming mismatch in hook handlers ([cbd4fe7](https://github.com/claudekit/claudekit-engineer/commit/cbd4fe7211204757bbefaeef6b4049e4dc2b4a29))


### 📚 Documentation

* **team:** update agent-teams-guide for v2.1.0 with ASCII visualizations ([5a8aa32](https://github.com/claudekit/claudekit-engineer/commit/5a8aa328351e16742c5943c22302752abab0b08c))

## [2.11.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.10...v2.11.0-beta.11) (2026-02-06)


### 🐞 Bug Fixes

* **ck-help:** update stale command syntax after command-to-skill migration ([4975fa0](https://github.com/claudekit/claudekit-engineer/commit/4975fa06e2ebd74ef44195aeb8cbbe3a504dc651))

## [2.11.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.9...v2.11.0-beta.10) (2026-02-05)


### 🐞 Bug Fixes

* **team:** rename /team implement to /team cook for CK consistency ([c6dc19e](https://github.com/claudekit/claudekit-engineer/commit/c6dc19e0bf2b0b3b93be8ef51eb2cf8b469ce3c9))
* **team:** reword pre-flight to prevent model self-check rejection ([953e437](https://github.com/claudekit/claudekit-engineer/commit/953e437a3e4224ecdd2f60948c8de3451a24c890))

## [2.11.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.8...v2.11.0-beta.9) (2026-02-05)


### ⚠ BREAKING CHANGES

* **team:** /team templates now auto-execute instead of providing
instructions for manual orchestration.

### 🚀 Features

* **agents:** update agent definitions and references for agent teams support ([cfa9950](https://github.com/claudekit/claudekit-engineer/commit/cfa99507b0c1714bff01567d2b4d790a56662ba8))
* **team:** rewrite /team skill as CK-native imperative execution engine v2.0.0 ([5239d7a](https://github.com/claudekit/claudekit-engineer/commit/5239d7a94d9e6cb3a90a17efcf08fd0e666ac3f7))


### 🐞 Bug Fixes

* **team:** add pre-flight check to prevent subagent fallback ([e7ff1d7](https://github.com/claudekit/claudekit-engineer/commit/e7ff1d718b4be1224cace6ec2a48618e1071cb73))


### ♻️ Code Refactoring

* **rules:** decouple team mode from default orchestration workflow ([ecb01ed](https://github.com/claudekit/claudekit-engineer/commit/ecb01ed9800d1c5dc5a21057eca2e1e3d9cb23b7))

## [2.11.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.7...v2.11.0-beta.8) (2026-02-05)


### 🐞 Bug Fixes

* **metadata:** add agent-teams to deletions for clean migration to team/ ([a64d5ac](https://github.com/claudekit/claudekit-engineer/commit/a64d5ace72569c78001c2eeb908555d888b84319))

## [2.11.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.6...v2.11.0-beta.7) (2026-02-05)


### 🐞 Bug Fixes

* **skills:** rename agent-teams skill folder to team for command parity ([cd14c91](https://github.com/claudekit/claudekit-engineer/commit/cd14c91c4b902c3def654c3eafbbc105bcd865df))

## [2.11.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.5...v2.11.0-beta.6) (2026-02-05)


### 🐞 Bug Fixes

* **skills:** expand agent-teams references into comprehensive knowledge base ([a66bd77](https://github.com/claudekit/claudekit-engineer/commit/a66bd775001f99fd4b80b5c09b1dd6072b43e081))

## [2.11.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.4...v2.11.0-beta.5) (2026-02-05)


### 🚀 Features

* **skills:** add Agent Teams orchestration skill ([#458](https://github.com/claudekit/claudekit-engineer/issues/458)) ([3542566](https://github.com/claudekit/claudekit-engineer/commit/35425666f1397f71dbf7c1df931c8836aeba5d28)), closes [#457](https://github.com/claudekit/claudekit-engineer/issues/457)

## [2.11.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.3...v2.11.0-beta.4) (2026-02-05)


### 🐞 Bug Fixes

* **hooks:** reduce session-init command failures ([0b631f2](https://github.com/claudekit/claudekit-engineer/commit/0b631f207f31e20b2bf1c36c87856f37f5a08119)), closes [#455](https://github.com/claudekit/claudekit-engineer/issues/455)


### ✅ Tests

* **hooks:** add comprehensive test suite for project-detector ([5c3a982](https://github.com/claudekit/claudekit-engineer/commit/5c3a982c5005bc5f4941f77af250075c2a122581)), closes [#455](https://github.com/claudekit/claudekit-engineer/issues/455) [#455](https://github.com/claudekit/claudekit-engineer/issues/455)

## [2.11.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.2...v2.11.0-beta.3) (2026-02-05)


### 🐞 Bug Fixes

* **skills:** add [CK] prefix to skill descriptions for native command distinction ([1f5244e](https://github.com/claudekit/claudekit-engineer/commit/1f5244e20af9f041eae5dbcdd9ce8c1e88298edd)), closes [#453](https://github.com/claudekit/claudekit-engineer/issues/453)

## [2.11.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.11.0-beta.1...v2.11.0-beta.2) (2026-02-05)


### 🐞 Bug Fixes

* **metadata:** add missing deletions for deprecated plan commands ([cb15d31](https://github.com/claudekit/claudekit-engineer/commit/cb15d31d4cf62d6f54205805d4e124dbc1cb60bd)), closes [#451](https://github.com/claudekit/claudekit-engineer/issues/451)

## [2.11.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.10.1...v2.11.0-beta.1) (2026-02-05)


### 🚀 Features

* **skill:** convert `/bootstrap` command to skill ([bfd0480](https://github.com/claudekit/claudekit-engineer/commit/bfd0480590f2a8cb8923fc2f15a408a3cd2938f6))
* **skill:** convert `/plan:*` command to skill ([3d92e31](https://github.com/claudekit/claudekit-engineer/commit/3d92e3154bf46f94c2c8d595953fd6ca343d2e1e))
* **skills:** add `project-management` skill ([b492c80](https://github.com/claudekit/claudekit-engineer/commit/b492c8083b1be5db8574953ee849bb1afee078a9))


### 🐞 Bug Fixes

* **agents:** added skills to subagents ([158cd09](https://github.com/claudekit/claudekit-engineer/commit/158cd09251ca734aa02cde0f304fb48922ff2ec0))
* **preview:** add contextual path resolution for natural references ([04b60c2](https://github.com/claudekit/claudekit-engineer/commit/04b60c2192c9ff16e28b49bb5e110d46b5841923))
* **preview:** add contextual path resolution for natural references ([51aa751](https://github.com/claudekit/claudekit-engineer/commit/51aa751cede4deaa9bae7f6297e73262ea470eaf))
* **preview:** mermaid collapse button and code block scroll ([20abcac](https://github.com/claudekit/claudekit-engineer/commit/20abcac698db6f8b611618302f6bbc23ed13596f)), closes [#444](https://github.com/claudekit/claudekit-engineer/issues/444)
* **preview:** mermaid collapse button and code block scroll ([0c421ae](https://github.com/claudekit/claudekit-engineer/commit/0c421ae504a3e6e074d190be6360de5ae03e0bff)), closes [#444](https://github.com/claudekit/claudekit-engineer/issues/444)


### ⚡ Performance Improvements

* **skill:** add `workflow-steps` to `cook` skill ([ee73b5e](https://github.com/claudekit/claudekit-engineer/commit/ee73b5e535c12d5a383c6e2014c40d2ca31525b9))
* **skill:** enhance `code-review` skill with task management ([f1d6a14](https://github.com/claudekit/claudekit-engineer/commit/f1d6a14680aa064a9fca43dcd79f037bbd110c63))
* **skill:** enhance `copywriting` skill with CRO content ([b47c756](https://github.com/claudekit/claudekit-engineer/commit/b47c756c3334ceb1700242f3da1ffd5d4b36277f))
* **skill:** enhance `debug` skill with task management ([0fb220f](https://github.com/claudekit/claudekit-engineer/commit/0fb220fb5177481088ca9a666115033bb778c42b))
* **skills:** enhance `scout` skill with task management ([18a61f6](https://github.com/claudekit/claudekit-engineer/commit/18a61f6749d5badf32a5c6e587d60cca055abdb0))


### ✅ Tests

* **skills:** adjust some tests ([9e85afa](https://github.com/claudekit/claudekit-engineer/commit/9e85afad55720c16d775359ebd73532e38107b54))

## [2.10.1-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.10.1-beta.2...v2.10.1-beta.3) (2026-02-05)


### 🐞 Bug Fixes

* **preview:** add contextual path resolution for natural references ([51aa751](https://github.com/claudekit/claudekit-engineer/commit/51aa751cede4deaa9bae7f6297e73262ea470eaf))

## [2.10.1-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.10.1-beta.1...v2.10.1-beta.2) (2026-02-05)


### 🐞 Bug Fixes

* **preview:** mermaid collapse button and code block scroll ([0c421ae](https://github.com/claudekit/claudekit-engineer/commit/0c421ae504a3e6e074d190be6360de5ae03e0bff)), closes [#444](https://github.com/claudekit/claudekit-engineer/issues/444)

## [2.10.1-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0...v2.10.1-beta.1) (2026-02-05)


### 🐞 Bug Fixes

* **hooks:** hotfix `descriptive-name` hook ([9cb59dd](https://github.com/claudekit/claudekit-engineer/commit/9cb59dd2c5d7a2cb5d267490e2c1a7de23dd211e))

## [2.10.0](https://github.com/claudekit/claudekit-engineer/compare/v2.9.1...v2.10.0) (2026-02-05)


### 🚀 Features

* **markdown-novel-viewer:** implement Focused Reader 2.0 ([#439](https://github.com/claudekit/claudekit-engineer/issues/439)) ([6a0135f](https://github.com/claudekit/claudekit-engineer/commit/6a0135f278a91386c7c24efd8e732589d1b21c96))
* **plan:** auto-propagate validation decisions to phase files ([#431](https://github.com/claudekit/claudekit-engineer/issues/431)) ([3005b94](https://github.com/claudekit/claudekit-engineer/commit/3005b94bce05e271aa755af3d74e0c5c03b3d72a))
* **preview:** add visual generation modes ([e62b0b6](https://github.com/claudekit/claudekit-engineer/commit/e62b0b6f36d05e099dead22dd5ccf1f318d39ec2)), closes [#433](https://github.com/claudekit/claudekit-engineer/issues/433)


### 🐞 Bug Fixes

* /docs:init stalls after Phase 1 ([#428](https://github.com/claudekit/claudekit-engineer/issues/428)) ([ef28c36](https://github.com/claudekit/claudekit-engineer/commit/ef28c361c5e6fb6333e12162355fd622f3a33803)), closes [#427](https://github.com/claudekit/claudekit-engineer/issues/427)
* empty local hooks config now inherits from global instead of resetting to defaults ([eee5ead](https://github.com/claudekit/claudekit-engineer/commit/eee5eade478536629862b1d52b7df0956612510f)), closes [#435](https://github.com/claudekit/claudekit-engineer/issues/435)
* **help:** update /preview usage hints with generation modes ([afa9709](https://github.com/claudekit/claudekit-engineer/commit/afa970962564a4961df5c4f3aefbb0f8c06c9ab9))
* **hooks:** add language-aware file naming guidance ([0718d91](https://github.com/claudekit/claudekit-engineer/commit/0718d91c7a787bf92555365c33d0f123e5f357fd)), closes [#440](https://github.com/claudekit/claudekit-engineer/issues/440)
* **novel-viewer:** improve UI/UX for reading experience ([086a393](https://github.com/claudekit/claudekit-engineer/commit/086a3937b90d37b159e7b671cdb2c07459e01167))
* output full absolute path in plan reminder for worktree support ([4021b77](https://github.com/claudekit/claudekit-engineer/commit/4021b77210cd0d615ec4e1dd57fc3ec41b091107))
* **preview:** add mermaidjs-v11 skill activation note ([12cc244](https://github.com/claudekit/claudekit-engineer/commit/12cc2444d9fbdc2285a025f685fab8d9c76b1586))
* **preview:** balance padding in ascii template ([ecc2a27](https://github.com/claudekit/claudekit-engineer/commit/ecc2a272c9fa4d946b9669fa2e59bba0ec906be6))
* **preview:** correct ASCII diagram alignment in templates ([ac6a3fc](https://github.com/claudekit/claudekit-engineer/commit/ac6a3fcf0522693f341587511232282c1618c406))
* **preview:** restore unicode box chars, fix arrow width issue ([8f547bf](https://github.com/claudekit/claudekit-engineer/commit/8f547bfbfe89c566bb7a50b127b9d3cd2998b529))
* **preview:** use proper skill invocation syntax for mermaidjs-v11 ([de6d0b9](https://github.com/claudekit/claudekit-engineer/commit/de6d0b9299754c7bc2ebd23081e6c90880c5bf8f))
* **preview:** use pure ASCII characters for diagram templates ([0792f6b](https://github.com/claudekit/claudekit-engineer/commit/0792f6bcafa8addb6121c411c78dd2666cc87a98))
* **worktree:** use internal worktrees/ for monorepos ([#429](https://github.com/claudekit/claudekit-engineer/issues/429)) ([a0a538a](https://github.com/claudekit/claudekit-engineer/commit/a0a538aa6b5c904bdc27676dc376b0f340851b0f))


### ⚡ Performance Improvements

* **hooks:** added `cook-after-plan-reminder` hook ([aea498d](https://github.com/claudekit/claudekit-engineer/commit/aea498df13be108098882f60de52353e7dcd8ec6))
* **skill:** optimize `code-review` skill with edge case scouting & token efficiency ([3aaae53](https://github.com/claudekit/claudekit-engineer/commit/3aaae531db5e2fc02be16e0bb6144d1f8a86e219))
* **skills:** enhance `/cook` skill to respect rules and subagents ([15ca501](https://github.com/claudekit/claudekit-engineer/commit/15ca501d7a715e005830b5277c391b29e2d73372))
* **skills:** enhance `/skill-creator` skill to respect rules and subagents ([c07a736](https://github.com/claudekit/claudekit-engineer/commit/c07a7365d549fa0f355fde69fea3d5d4ace4f8f7))
* **subagent:** optimize `code-reviewer` with edge case scouting after implementation ([2cda6d6](https://github.com/claudekit/claudekit-engineer/commit/2cda6d654f368b63b1bb92d426a150abecf14f5f))

## [2.10.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0-beta.6...v2.10.0-beta.7) (2026-02-05)


### 🐞 Bug Fixes

* **help:** update /preview usage hints with generation modes ([afa9709](https://github.com/claudekit/claudekit-engineer/commit/afa970962564a4961df5c4f3aefbb0f8c06c9ab9))

## [2.10.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0-beta.5...v2.10.0-beta.6) (2026-02-04)


### 🚀 Features

* **markdown-novel-viewer:** implement Focused Reader 2.0 ([#439](https://github.com/claudekit/claudekit-engineer/issues/439)) ([6a0135f](https://github.com/claudekit/claudekit-engineer/commit/6a0135f278a91386c7c24efd8e732589d1b21c96))


### 🐞 Bug Fixes

* **novel-viewer:** improve UI/UX for reading experience ([086a393](https://github.com/claudekit/claudekit-engineer/commit/086a3937b90d37b159e7b671cdb2c07459e01167))

## [2.10.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0-beta.4...v2.10.0-beta.5) (2026-02-04)


### 🐞 Bug Fixes

* **hooks:** add language-aware file naming guidance ([0718d91](https://github.com/claudekit/claudekit-engineer/commit/0718d91c7a787bf92555365c33d0f123e5f357fd)), closes [#440](https://github.com/claudekit/claudekit-engineer/issues/440)

## [2.10.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0-beta.3...v2.10.0-beta.4) (2026-02-04)


### ⚡ Performance Improvements

* **skill:** optimize `code-review` skill with edge case scouting & token efficiency ([3aaae53](https://github.com/claudekit/claudekit-engineer/commit/3aaae531db5e2fc02be16e0bb6144d1f8a86e219))
* **subagent:** optimize `code-reviewer` with edge case scouting after implementation ([2cda6d6](https://github.com/claudekit/claudekit-engineer/commit/2cda6d654f368b63b1bb92d426a150abecf14f5f))

## [2.10.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0-beta.2...v2.10.0-beta.3) (2026-02-04)


### 🐞 Bug Fixes

* empty local hooks config now inherits from global instead of resetting to defaults ([eee5ead](https://github.com/claudekit/claudekit-engineer/commit/eee5eade478536629862b1d52b7df0956612510f)), closes [#435](https://github.com/claudekit/claudekit-engineer/issues/435)
* output full absolute path in plan reminder for worktree support ([4021b77](https://github.com/claudekit/claudekit-engineer/commit/4021b77210cd0d615ec4e1dd57fc3ec41b091107))

## [2.10.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0-beta.2...v2.10.0-beta.3) (2026-02-04)


### 🐞 Bug Fixes

* empty local hooks config now inherits from global instead of resetting to defaults ([eee5ead](https://github.com/claudekit/claudekit-engineer/commit/eee5eade478536629862b1d52b7df0956612510f)), closes [#435](https://github.com/claudekit/claudekit-engineer/issues/435)

## [2.10.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.10.0-beta.1...v2.10.0-beta.2) (2026-02-03)


### 🚀 Features

* **preview:** add visual generation modes ([e62b0b6](https://github.com/claudekit/claudekit-engineer/commit/e62b0b6f36d05e099dead22dd5ccf1f318d39ec2)), closes [#433](https://github.com/claudekit/claudekit-engineer/issues/433)


### 🐞 Bug Fixes

* **preview:** add mermaidjs-v11 skill activation note ([12cc244](https://github.com/claudekit/claudekit-engineer/commit/12cc2444d9fbdc2285a025f685fab8d9c76b1586))
* **preview:** balance padding in ascii template ([ecc2a27](https://github.com/claudekit/claudekit-engineer/commit/ecc2a272c9fa4d946b9669fa2e59bba0ec906be6))
* **preview:** correct ASCII diagram alignment in templates ([ac6a3fc](https://github.com/claudekit/claudekit-engineer/commit/ac6a3fcf0522693f341587511232282c1618c406))
* **preview:** restore unicode box chars, fix arrow width issue ([8f547bf](https://github.com/claudekit/claudekit-engineer/commit/8f547bfbfe89c566bb7a50b127b9d3cd2998b529))
* **preview:** use proper skill invocation syntax for mermaidjs-v11 ([de6d0b9](https://github.com/claudekit/claudekit-engineer/commit/de6d0b9299754c7bc2ebd23081e6c90880c5bf8f))
* **preview:** use pure ASCII characters for diagram templates ([0792f6b](https://github.com/claudekit/claudekit-engineer/commit/0792f6bcafa8addb6121c411c78dd2666cc87a98))

## [2.10.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.9.1-beta.4...v2.10.0-beta.1) (2026-02-03)


### 🚀 Features

* **plan:** auto-propagate validation decisions to phase files ([#431](https://github.com/claudekit/claudekit-engineer/issues/431)) ([3005b94](https://github.com/claudekit/claudekit-engineer/commit/3005b94bce05e271aa755af3d74e0c5c03b3d72a))

## [2.9.1-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.9.1-beta.3...v2.9.1-beta.4) (2026-02-03)


### 🐞 Bug Fixes

* /docs:init stalls after Phase 1 ([#428](https://github.com/claudekit/claudekit-engineer/issues/428)) ([ef28c36](https://github.com/claudekit/claudekit-engineer/commit/ef28c361c5e6fb6333e12162355fd622f3a33803)), closes [#427](https://github.com/claudekit/claudekit-engineer/issues/427)
* **worktree:** use internal worktrees/ for monorepos ([#429](https://github.com/claudekit/claudekit-engineer/issues/429)) ([a0a538a](https://github.com/claudekit/claudekit-engineer/commit/a0a538aa6b5c904bdc27676dc376b0f340851b0f))

## [2.9.1-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.9.1-beta.2...v2.9.1-beta.3) (2026-02-03)


### ⚡ Performance Improvements

* **hooks:** added `cook-after-plan-reminder` hook ([aea498d](https://github.com/claudekit/claudekit-engineer/commit/aea498df13be108098882f60de52353e7dcd8ec6))
* **skills:** enhance `/cook` skill to respect rules and subagents ([15ca501](https://github.com/claudekit/claudekit-engineer/commit/15ca501d7a715e005830b5277c391b29e2d73372))
* **skills:** enhance `/skill-creator` skill to respect rules and subagents ([c07a736](https://github.com/claudekit/claudekit-engineer/commit/c07a7365d549fa0f355fde69fea3d5d4ace4f8f7))

## [2.9.1-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.9.1-beta.1...v2.9.1-beta.2) (2026-02-03)


### 🐞 Bug Fixes

* **metadata:** add .shadowed/ to deletions for user cleanup ([#422](https://github.com/claudekit/claudekit-engineer/issues/422)) ([d75e6de](https://github.com/claudekit/claudekit-engineer/commit/d75e6dea026db0494b8c6addb8b06d93307627a6))

## [2.9.1-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0...v2.9.1-beta.1) (2026-02-03)


### 🐞 Bug Fixes

* **hooks:** disable skill-dedup hook due to race condition ([#422](https://github.com/claudekit/claudekit-engineer/issues/422)) ([512bd30](https://github.com/claudekit/claudekit-engineer/commit/512bd302486966dea45d98458f3530d75b474bb9))

## [2.9.0](https://github.com/claudekit/claudekit-engineer/compare/v2.8.1...v2.9.0) (2026-02-03)


### 🚀 Features

* add --parallel flag to /fix skill ([77b34d7](https://github.com/claudekit/claudekit-engineer/commit/77b34d7e941bad41dabf4c91eacaeb410ee95ca0)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)
* add --parallel flag to /fix skill ([3b7ae4f](https://github.com/claudekit/claudekit-engineer/commit/3b7ae4f8a7503135edaf172238d99d6713cd161a)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)
* added new find-skill skill ([c08b276](https://github.com/claudekit/claudekit-engineer/commit/c08b276ddc382386da054d08d4083611f1b911fa))
* **ai-artist:** add mandatory validation workflow ([09636b9](https://github.com/claudekit/claudekit-engineer/commit/09636b9de8ee9958a2bb3dffbba0f8602c4561b8)), closes [#363](https://github.com/claudekit/claudekit-engineer/issues/363)
* **hooks:** add skill dedup hook for global/local overlap ([f418f3c](https://github.com/claudekit/claudekit-engineer/commit/f418f3cf78513f63458935ff2f6b1ab451194183)), closes [#417](https://github.com/claudekit/claudekit-engineer/issues/417)
* **payment-integration:** add Stripe CLI and SDK reference documentation ([a472d9d](https://github.com/claudekit/claudekit-engineer/commit/a472d9db66f5dac2148ae0c6889cb13c19f89d5a))
* **payment-integration:** add Stripe references for best practices and API upgrades ([57b3379](https://github.com/claudekit/claudekit-engineer/commit/57b3379c19ee7c0bf1bf43e36e9f381a4848659d))
* **skills:** update google-adk-python skill with v1.0.0+ features ([a1fcba2](https://github.com/claudekit/claudekit-engineer/commit/a1fcba2679153a0a33219ff0f302a82c5f8fc2e5)), closes [#396](https://github.com/claudekit/claudekit-engineer/issues/396)
* **skills:** update google-adk-python skill with v1.0.0+ features ([2effa64](https://github.com/claudekit/claudekit-engineer/commit/2effa640800afe4474d6fcc65c811e94c6aae61f)), closes [#396](https://github.com/claudekit/claudekit-engineer/issues/396)


### 🐞 Bug Fixes

* **.ck.json:** add descriptive name hook schema ([905162e](https://github.com/claudekit/claudekit-engineer/commit/905162edd18e007344c762f613a1f3c59d1bfe07))
* add deprecated debug.md to metadata deletions and archive ([d096ef9](https://github.com/claudekit/claudekit-engineer/commit/d096ef9ab440beeb9a51a24e273f1a37caa54433)), closes [#403](https://github.com/claudekit/claudekit-engineer/issues/403)
* add deprecated debug.md to metadata deletions and archive ([2abf65c](https://github.com/claudekit/claudekit-engineer/commit/2abf65cd4ca8d15a7a9a381783ecba5664303ad6)), closes [#403](https://github.com/claudekit/claudekit-engineer/issues/403)
* add Python <3.7 fallback and extend encoding fix to other skills ([a5549df](https://github.com/claudekit/claudekit-engineer/commit/a5549dfcacd8295dcefb6df027058ef5bb17522d)), closes [#415](https://github.com/claudekit/claudekit-engineer/issues/415)
* **ck-help:** remove stale CATEGORY_GUIDES for deleted commands ([#391](https://github.com/claudekit/claudekit-engineer/issues/391)) ([888b856](https://github.com/claudekit/claudekit-engineer/commit/888b856d945c2d6c804af98cd2d49c5c36890e72))
* clean up stale references to deleted agents and renamed skills ([#391](https://github.com/claudekit/claudekit-engineer/issues/391)) ([ef45c04](https://github.com/claudekit/claudekit-engineer/commit/ef45c04522a6e0ad493130ec6cb0af15df8522e2))
* **deletions:** add skills/debugging/** for renamed debug skill cleanup ([b2a2558](https://github.com/claudekit/claudekit-engineer/commit/b2a255882125add988ce8331e9ecbc87fdc5c618))
* deprecate commands/fix.md in favor of global fix skill ([6c44aa7](https://github.com/claudekit/claudekit-engineer/commit/6c44aa7f001327c991c4c66a36158dc738245c4c)), closes [#382](https://github.com/claudekit/claudekit-engineer/issues/382)
* enrich plan:validate Step 5 with detailed validation log template ([#405](https://github.com/claudekit/claudekit-engineer/issues/405)) ([105062c](https://github.com/claudekit/claudekit-engineer/commit/105062c1f424db31b7d01e4b5a658dac6e0abf7b)), closes [#402](https://github.com/claudekit/claudekit-engineer/issues/402)
* enrich plan:validate Step 5 with detailed validation log template ([#405](https://github.com/claudekit/claudekit-engineer/issues/405)) ([58ce22b](https://github.com/claudekit/claudekit-engineer/commit/58ce22b1cde9901c464efe818c14ab96173c651a)), closes [#402](https://github.com/claudekit/claudekit-engineer/issues/402)
* handle Windows cp1252 encoding in ui-ux-pro-max search scripts ([bc5c800](https://github.com/claudekit/claudekit-engineer/commit/bc5c80040f04d90e7f3a3f03965c68a5d8e907d9)), closes [#415](https://github.com/claudekit/claudekit-engineer/issues/415)
* **hooks:** add missing hooks property to getDefaultConfig ([cfce191](https://github.com/claudekit/claudekit-engineer/commit/cfce191e7cedb63dd072bbd7206b8175f7e1e658)), closes [#413](https://github.com/claudekit/claudekit-engineer/issues/413)
* **hooks:** allow Python venv creation and inject venv rules into subagents ([51d9324](https://github.com/claudekit/claudekit-engineer/commit/51d93244b2821d235d7184390735871a69ddceb7)), closes [#386](https://github.com/claudekit/claudekit-engineer/issues/386)
* **hooks:** exclude docs/plans from descriptive name hook ([e846d9d](https://github.com/claudekit/claudekit-engineer/commit/e846d9dcd2733dd975747736ac789716a43faa7c))
* **hooks:** respect hooks config for context/usage section injection ([7b0566c](https://github.com/claudekit/claudekit-engineer/commit/7b0566c896ff2d029abbf7aa58bf1f0c5ed87f06)), closes [#413](https://github.com/claudekit/claudekit-engineer/issues/413)
* **hooks:** skip paths after --exclude flags in path-extractor ([ca448db](https://github.com/claudekit/claudekit-engineer/commit/ca448db8452eb23b01e397b184958d1e3fdaf0c8)), closes [#388](https://github.com/claudekit/claudekit-engineer/issues/388)
* merge main into dev to resolve version conflicts ([be4a904](https://github.com/claudekit/claudekit-engineer/commit/be4a904ceaf703f52c2bd085dd98f0811659f49d))
* replace invalid gemini-3.0-flash model ID with gemini-3-flash-preview ([3715bdb](https://github.com/claudekit/claudekit-engineer/commit/3715bdb6a82ed20f32d1a283b2f61968bbc75816)), closes [#394](https://github.com/claudekit/claudekit-engineer/issues/394)
* replace invalid gemini-3.0-flash model ID with gemini-3-flash-preview ([44cf1e1](https://github.com/claudekit/claudekit-engineer/commit/44cf1e1eb537298d6db974ba125d8b34be77e80e)), closes [#394](https://github.com/claudekit/claudekit-engineer/issues/394)
* resolve merge conflict in CHANGELOG.md ([e98a0d9](https://github.com/claudekit/claudekit-engineer/commit/e98a0d965a7fbcb24958c42dc4fdab961805e0f3))
* **skills:** correct API inaccuracies in google-adk-python skill ([b09b97b](https://github.com/claudekit/claudekit-engineer/commit/b09b97b1861025a6850c305ef065c4c52d9b247f))
* **skills:** correct API inaccuracies in google-adk-python skill ([a81b756](https://github.com/claudekit/claudekit-engineer/commit/a81b756be91130b440ccff409723f1529606562b))
* **skills:** strengthen Finalize step execution in cook and fix ([#409](https://github.com/claudekit/claudekit-engineer/issues/409)) ([c62b847](https://github.com/claudekit/claudekit-engineer/commit/c62b847f9c7cf4505c6721e81b01e690864a12aa)), closes [#408](https://github.com/claudekit/claudekit-engineer/issues/408)
* **skills:** strengthen Finalize step execution in cook and fix ([#409](https://github.com/claudekit/claudekit-engineer/issues/409)) ([7bb3f34](https://github.com/claudekit/claudekit-engineer/commit/7bb3f340e3997e59ca1b60985ccdb3b0b735844d)), closes [#408](https://github.com/claudekit/claudekit-engineer/issues/408)
* **skills:** update gemini model refs to 2.5-flash, add gemini-3 preview ([a66a975](https://github.com/claudekit/claudekit-engineer/commit/a66a97585b6005ee1c880b3eb792415df9764e42))
* **skills:** update gemini model refs to 2.5-flash, add gemini-3 preview ([8bef76d](https://github.com/claudekit/claudekit-engineer/commit/8bef76d126884a77d2789f2c371c1ad557bc05f8))
* **statusline:** remove duplicate percent sign in usage display ([669fc04](https://github.com/claudekit/claudekit-engineer/commit/669fc04f6126cd62e3474b9f5ec0f6386463771d))
* **ui-ux-pro-max:** resolve f-string backslash syntax error ([08e104e](https://github.com/claudekit/claudekit-engineer/commit/08e104e504b6c452830f12edfcc5309474e9232e)), closes [#406](https://github.com/claudekit/claudekit-engineer/issues/406)
* **ui-ux-pro-max:** resolve f-string backslash syntax error ([41a2328](https://github.com/claudekit/claudekit-engineer/commit/41a23287af9bbdb6621fb7550c59ae9630dd75f9)), closes [#406](https://github.com/claudekit/claudekit-engineer/issues/406)
* update /fix:parallel syntax to /fix --parallel in review command ([cce4857](https://github.com/claudekit/claudekit-engineer/commit/cce4857c38360e0ddb1e4546d5852b0c63b1fd66)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)
* update /fix:parallel syntax to /fix --parallel in review command ([074ac52](https://github.com/claudekit/claudekit-engineer/commit/074ac52ca4e5eb2a3aaaed87dd8ad123b6f99301)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)
* use /fix instead of /fix --parallel (no such flag exists) ([6f05444](https://github.com/claudekit/claudekit-engineer/commit/6f05444da5e5beb50c9bf69d2e13fe068d23c6ee)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)
* use sibling directory for monorepo worktree location ([#411](https://github.com/claudekit/claudekit-engineer/issues/411)) ([2761244](https://github.com/claudekit/claudekit-engineer/commit/276124497b1e79f4f36f194f6b4112b5374f87c4))


### 📚 Documentation

* update stale agent, command, and skill references ([#391](https://github.com/claudekit/claudekit-engineer/issues/391)) ([2317887](https://github.com/claudekit/claudekit-engineer/commit/23178878dff5274cbab0114c375d7476ca37132d))


### ⚡ Performance Improvements

* **skill:** add `paddle` to `payment-integration` skill ([c1e40bd](https://github.com/claudekit/claudekit-engineer/commit/c1e40bdbb35ccf16aaaf7cdb3cb45225ca0762c1))
* **skills:** add `creem.io` to `payment-integration` skill ([346e4c3](https://github.com/claudekit/claudekit-engineer/commit/346e4c3a6e5ee25c4001e871f657bfbcf84e1939))
* **skills:** enhance `cook` skill with native claude tasks ([85de5b6](https://github.com/claudekit/claudekit-engineer/commit/85de5b6d45f55358034e3174bb51a76469ead3e0))
* **skills:** enhance `payment-integration` skill with best practices ([a0738a0](https://github.com/claudekit/claudekit-engineer/commit/a0738a0d709710e67606745c1f2e8ced5ccf364e))
* **skills:** enhance `skill-creator` skill with plugin marketplace ([aeee285](https://github.com/claudekit/claudekit-engineer/commit/aeee285cc87e53fbbb07436fda75a2efb5d24d73))


### ✅ Tests

* **hooks:** add comprehensive test suite for skill-dedup hook ([87a0ed8](https://github.com/claudekit/claudekit-engineer/commit/87a0ed8f7213dfdcd531ae44050619c2fdd3e194))
* **hooks:** add tests for hooks config behavior ([7249150](https://github.com/claudekit/claudekit-engineer/commit/72491503b103da143aae9bde25a28f4bb32c153f)), closes [#413](https://github.com/claudekit/claudekit-engineer/issues/413)
* **hooks:** add venv creation command tests for Issue [#386](https://github.com/claudekit/claudekit-engineer/issues/386) ([57766ef](https://github.com/claudekit/claudekit-engineer/commit/57766effe9a7488f3d18416f39c981b80fc13306))


### 👷 CI

* add workflow to sync dev to main after release ([2babf98](https://github.com/claudekit/claudekit-engineer/commit/2babf98733c65d938ccfbead3d974c7ad18a9e25))
* add workflow to sync dev to main after release ([b93f548](https://github.com/claudekit/claudekit-engineer/commit/b93f5485b7fbb5811c0959ce8c420d1666020db1))

## [2.9.0-beta.17](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.16...v2.9.0-beta.17) (2026-02-03)


### 🐞 Bug Fixes

* merge main into dev to resolve version conflicts ([be4a904](https://github.com/claudekit/claudekit-engineer/commit/be4a904ceaf703f52c2bd085dd98f0811659f49d))

## [2.9.0-beta.16](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.15...v2.9.0-beta.16) (2026-02-03)


### 🐞 Bug Fixes

* **.ck.json:** add descriptive name hook schema ([905162e](https://github.com/claudekit/claudekit-engineer/commit/905162edd18e007344c762f613a1f3c59d1bfe07))

## [2.9.0-beta.15](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.14...v2.9.0-beta.15) (2026-02-03)


### 🚀 Features

* **hooks:** add skill dedup hook for global/local overlap ([f418f3c](https://github.com/claudekit/claudekit-engineer/commit/f418f3cf78513f63458935ff2f6b1ab451194183)), closes [#417](https://github.com/claudekit/claudekit-engineer/issues/417)


### ✅ Tests

* **hooks:** add comprehensive test suite for skill-dedup hook ([87a0ed8](https://github.com/claudekit/claudekit-engineer/commit/87a0ed8f7213dfdcd531ae44050619c2fdd3e194))

## [2.9.0-beta.14](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.13...v2.9.0-beta.14) (2026-02-03)


### 🐞 Bug Fixes

* add Python <3.7 fallback and extend encoding fix to other skills ([a5549df](https://github.com/claudekit/claudekit-engineer/commit/a5549dfcacd8295dcefb6df027058ef5bb17522d)), closes [#415](https://github.com/claudekit/claudekit-engineer/issues/415)
* handle Windows cp1252 encoding in ui-ux-pro-max search scripts ([bc5c800](https://github.com/claudekit/claudekit-engineer/commit/bc5c80040f04d90e7f3a3f03965c68a5d8e907d9)), closes [#415](https://github.com/claudekit/claudekit-engineer/issues/415)
* **hooks:** add missing hooks property to getDefaultConfig ([cfce191](https://github.com/claudekit/claudekit-engineer/commit/cfce191e7cedb63dd072bbd7206b8175f7e1e658)), closes [#413](https://github.com/claudekit/claudekit-engineer/issues/413)
* **hooks:** respect hooks config for context/usage section injection ([7b0566c](https://github.com/claudekit/claudekit-engineer/commit/7b0566c896ff2d029abbf7aa58bf1f0c5ed87f06)), closes [#413](https://github.com/claudekit/claudekit-engineer/issues/413)


### ✅ Tests

* **hooks:** add tests for hooks config behavior ([7249150](https://github.com/claudekit/claudekit-engineer/commit/72491503b103da143aae9bde25a28f4bb32c153f)), closes [#413](https://github.com/claudekit/claudekit-engineer/issues/413)

## [2.9.0-beta.13](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.12...v2.9.0-beta.13) (2026-02-02)


### 🐞 Bug Fixes

* use sibling directory for monorepo worktree location ([#411](https://github.com/claudekit/claudekit-engineer/issues/411)) ([2761244](https://github.com/claudekit/claudekit-engineer/commit/276124497b1e79f4f36f194f6b4112b5374f87c4))

## [2.9.0-beta.12](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.11...v2.9.0-beta.12) (2026-02-02)


### 🚀 Features

* add --parallel flag to /fix skill ([77b34d7](https://github.com/claudekit/claudekit-engineer/commit/77b34d7e941bad41dabf4c91eacaeb410ee95ca0)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)
* **payment-integration:** add Stripe CLI and SDK reference documentation ([a472d9d](https://github.com/claudekit/claudekit-engineer/commit/a472d9db66f5dac2148ae0c6889cb13c19f89d5a))
* **skills:** update google-adk-python skill with v1.0.0+ features ([a1fcba2](https://github.com/claudekit/claudekit-engineer/commit/a1fcba2679153a0a33219ff0f302a82c5f8fc2e5)), closes [#396](https://github.com/claudekit/claudekit-engineer/issues/396)


### 🐞 Bug Fixes

* add deprecated debug.md to metadata deletions and archive ([d096ef9](https://github.com/claudekit/claudekit-engineer/commit/d096ef9ab440beeb9a51a24e273f1a37caa54433)), closes [#403](https://github.com/claudekit/claudekit-engineer/issues/403)
* enrich plan:validate Step 5 with detailed validation log template ([#405](https://github.com/claudekit/claudekit-engineer/issues/405)) ([105062c](https://github.com/claudekit/claudekit-engineer/commit/105062c1f424db31b7d01e4b5a658dac6e0abf7b)), closes [#402](https://github.com/claudekit/claudekit-engineer/issues/402)
* **hooks:** exclude docs/plans from descriptive name hook ([e846d9d](https://github.com/claudekit/claudekit-engineer/commit/e846d9dcd2733dd975747736ac789716a43faa7c))
* replace invalid gemini-3.0-flash model ID with gemini-3-flash-preview ([3715bdb](https://github.com/claudekit/claudekit-engineer/commit/3715bdb6a82ed20f32d1a283b2f61968bbc75816)), closes [#394](https://github.com/claudekit/claudekit-engineer/issues/394)
* **skills:** correct API inaccuracies in google-adk-python skill ([b09b97b](https://github.com/claudekit/claudekit-engineer/commit/b09b97b1861025a6850c305ef065c4c52d9b247f))
* **skills:** strengthen Finalize step execution in cook and fix ([#409](https://github.com/claudekit/claudekit-engineer/issues/409)) ([c62b847](https://github.com/claudekit/claudekit-engineer/commit/c62b847f9c7cf4505c6721e81b01e690864a12aa)), closes [#408](https://github.com/claudekit/claudekit-engineer/issues/408)
* **skills:** update gemini model refs to 2.5-flash, add gemini-3 preview ([a66a975](https://github.com/claudekit/claudekit-engineer/commit/a66a97585b6005ee1c880b3eb792415df9764e42))
* **ui-ux-pro-max:** resolve f-string backslash syntax error ([08e104e](https://github.com/claudekit/claudekit-engineer/commit/08e104e504b6c452830f12edfcc5309474e9232e)), closes [#406](https://github.com/claudekit/claudekit-engineer/issues/406)
* update /fix:parallel syntax to /fix --parallel in review command ([cce4857](https://github.com/claudekit/claudekit-engineer/commit/cce4857c38360e0ddb1e4546d5852b0c63b1fd66)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)
* use /fix instead of /fix --parallel (no such flag exists) ([6f05444](https://github.com/claudekit/claudekit-engineer/commit/6f05444da5e5beb50c9bf69d2e13fe068d23c6ee)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)


### ⚡ Performance Improvements

* **skill:** add `paddle` to `payment-integration` skill ([c1e40bd](https://github.com/claudekit/claudekit-engineer/commit/c1e40bdbb35ccf16aaaf7cdb3cb45225ca0762c1))
* **skills:** add `creem.io` to `payment-integration` skill ([346e4c3](https://github.com/claudekit/claudekit-engineer/commit/346e4c3a6e5ee25c4001e871f657bfbcf84e1939))
* **skills:** enhance `payment-integration` skill with best practices ([a0738a0](https://github.com/claudekit/claudekit-engineer/commit/a0738a0d709710e67606745c1f2e8ced5ccf364e))

## [2.9.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.10...v2.9.0-beta.11) (2026-02-01)


### 🐞 Bug Fixes

* **skills:** strengthen Finalize step execution in cook and fix ([#409](https://github.com/claudekit/claudekit-engineer/issues/409)) ([7bb3f34](https://github.com/claudekit/claudekit-engineer/commit/7bb3f340e3997e59ca1b60985ccdb3b0b735844d)), closes [#408](https://github.com/claudekit/claudekit-engineer/issues/408)

## [2.9.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.9...v2.9.0-beta.10) (2026-02-01)


### 🐞 Bug Fixes

* **ui-ux-pro-max:** resolve f-string backslash syntax error ([41a2328](https://github.com/claudekit/claudekit-engineer/commit/41a23287af9bbdb6621fb7550c59ae9630dd75f9)), closes [#406](https://github.com/claudekit/claudekit-engineer/issues/406)

## [2.9.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.8...v2.9.0-beta.9) (2026-01-31)


### 🐞 Bug Fixes

* enrich plan:validate Step 5 with detailed validation log template ([#405](https://github.com/claudekit/claudekit-engineer/issues/405)) ([58ce22b](https://github.com/claudekit/claudekit-engineer/commit/58ce22b1cde9901c464efe818c14ab96173c651a)), closes [#402](https://github.com/claudekit/claudekit-engineer/issues/402)

## [2.9.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.7...v2.9.0-beta.8) (2026-01-31)


### 🐞 Bug Fixes

* add deprecated debug.md to metadata deletions and archive ([2abf65c](https://github.com/claudekit/claudekit-engineer/commit/2abf65cd4ca8d15a7a9a381783ecba5664303ad6)), closes [#403](https://github.com/claudekit/claudekit-engineer/issues/403)

## [2.9.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.6...v2.9.0-beta.7) (2026-01-30)


### 🚀 Features

* add --parallel flag to /fix skill ([3b7ae4f](https://github.com/claudekit/claudekit-engineer/commit/3b7ae4f8a7503135edaf172238d99d6713cd161a)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)


### 🐞 Bug Fixes

* update /fix:parallel syntax to /fix --parallel in review command ([074ac52](https://github.com/claudekit/claudekit-engineer/commit/074ac52ca4e5eb2a3aaaed87dd8ad123b6f99301)), closes [#400](https://github.com/claudekit/claudekit-engineer/issues/400)

## [2.9.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.5...v2.9.0-beta.6) (2026-01-29)


### 🚀 Features

* **skills:** update google-adk-python skill with v1.0.0+ features ([2effa64](https://github.com/claudekit/claudekit-engineer/commit/2effa640800afe4474d6fcc65c811e94c6aae61f)), closes [#396](https://github.com/claudekit/claudekit-engineer/issues/396)


### 🐞 Bug Fixes

* **skills:** correct API inaccuracies in google-adk-python skill ([a81b756](https://github.com/claudekit/claudekit-engineer/commit/a81b756be91130b440ccff409723f1529606562b))
* **skills:** update gemini model refs to 2.5-flash, add gemini-3 preview ([8bef76d](https://github.com/claudekit/claudekit-engineer/commit/8bef76d126884a77d2789f2c371c1ad557bc05f8))

## [2.9.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.4...v2.9.0-beta.5) (2026-01-29)


### 🐞 Bug Fixes

* replace invalid gemini-3.0-flash model ID with gemini-3-flash-preview ([44cf1e1](https://github.com/claudekit/claudekit-engineer/commit/44cf1e1eb537298d6db974ba125d8b34be77e80e)), closes [#394](https://github.com/claudekit/claudekit-engineer/issues/394)

## [2.9.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.3...v2.9.0-beta.4) (2026-01-29)


### ⚡ Performance Improvements

* **skills:** enhance `skill-creator` skill with plugin marketplace ([aeee285](https://github.com/claudekit/claudekit-engineer/commit/aeee285cc87e53fbbb07436fda75a2efb5d24d73))

## [2.9.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.2...v2.9.0-beta.3) (2026-01-29)


### 🐞 Bug Fixes

* **ck-help:** remove stale CATEGORY_GUIDES for deleted commands ([#391](https://github.com/claudekit/claudekit-engineer/issues/391)) ([888b856](https://github.com/claudekit/claudekit-engineer/commit/888b856d945c2d6c804af98cd2d49c5c36890e72))
* clean up stale references to deleted agents and renamed skills ([#391](https://github.com/claudekit/claudekit-engineer/issues/391)) ([ef45c04](https://github.com/claudekit/claudekit-engineer/commit/ef45c04522a6e0ad493130ec6cb0af15df8522e2))


### 📚 Documentation

* update stale agent, command, and skill references ([#391](https://github.com/claudekit/claudekit-engineer/issues/391)) ([2317887](https://github.com/claudekit/claudekit-engineer/commit/23178878dff5274cbab0114c375d7476ca37132d))

## [2.9.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.9.0-beta.1...v2.9.0-beta.2) (2026-01-29)


### 🐞 Bug Fixes

* **deletions:** add skills/debugging/** for renamed debug skill cleanup ([b2a2558](https://github.com/claudekit/claudekit-engineer/commit/b2a255882125add988ce8331e9ecbc87fdc5c618))

## [2.9.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.8.1-beta.1...v2.9.0-beta.1) (2026-01-28)


### 🚀 Features

* added new find-skill skill ([c08b276](https://github.com/claudekit/claudekit-engineer/commit/c08b276ddc382386da054d08d4083611f1b911fa))
* **ai-artist:** add mandatory validation workflow ([09636b9](https://github.com/claudekit/claudekit-engineer/commit/09636b9de8ee9958a2bb3dffbba0f8602c4561b8)), closes [#363](https://github.com/claudekit/claudekit-engineer/issues/363)
* **payment-integration:** add Stripe references for best practices and API upgrades ([57b3379](https://github.com/claudekit/claudekit-engineer/commit/57b3379c19ee7c0bf1bf43e36e9f381a4848659d))


### 🐞 Bug Fixes

* deprecate commands/fix.md in favor of global fix skill ([6c44aa7](https://github.com/claudekit/claudekit-engineer/commit/6c44aa7f001327c991c4c66a36158dc738245c4c)), closes [#382](https://github.com/claudekit/claudekit-engineer/issues/382)
* **hooks:** allow Python venv creation and inject venv rules into subagents ([51d9324](https://github.com/claudekit/claudekit-engineer/commit/51d93244b2821d235d7184390735871a69ddceb7)), closes [#386](https://github.com/claudekit/claudekit-engineer/issues/386)
* **hooks:** skip paths after --exclude flags in path-extractor ([ca448db](https://github.com/claudekit/claudekit-engineer/commit/ca448db8452eb23b01e397b184958d1e3fdaf0c8)), closes [#388](https://github.com/claudekit/claudekit-engineer/issues/388)
* resolve merge conflict in CHANGELOG.md ([e98a0d9](https://github.com/claudekit/claudekit-engineer/commit/e98a0d965a7fbcb24958c42dc4fdab961805e0f3))
* **statusline:** remove duplicate percent sign in usage display ([669fc04](https://github.com/claudekit/claudekit-engineer/commit/669fc04f6126cd62e3474b9f5ec0f6386463771d))


### ⚡ Performance Improvements

* **skills:** enhance `cook` skill with native claude tasks ([85de5b6](https://github.com/claudekit/claudekit-engineer/commit/85de5b6d45f55358034e3174bb51a76469ead3e0))


### ✅ Tests

* **hooks:** add venv creation command tests for Issue [#386](https://github.com/claudekit/claudekit-engineer/issues/386) ([57766ef](https://github.com/claudekit/claudekit-engineer/commit/57766effe9a7488f3d18416f39c981b80fc13306))


### 👷 CI

* add workflow to sync dev to main after release ([2babf98](https://github.com/claudekit/claudekit-engineer/commit/2babf98733c65d938ccfbead3d974c7ad18a9e25))
* add workflow to sync dev to main after release ([b93f548](https://github.com/claudekit/claudekit-engineer/commit/b93f5485b7fbb5811c0959ce8c420d1666020db1))

## [2.8.1-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.8.0...v2.8.1-beta.1) (2026-01-27)


### 🐞 Bug Fixes

* **hooks:** allow Python venv creation and inject venv rules into subagents ([412822b](https://github.com/claudekit/claudekit-engineer/commit/412822b1a1d9d42d9280569833db64c2259f6c8e)), closes [#386](https://github.com/claudekit/claudekit-engineer/issues/386)
* **hooks:** skip paths after --exclude flags in path-extractor ([6479d41](https://github.com/claudekit/claudekit-engineer/commit/6479d411f49146c1f9df60457b4918ced2d6cfc0)), closes [#388](https://github.com/claudekit/claudekit-engineer/issues/388)


### ✅ Tests

* **hooks:** add venv creation command tests for Issue [#386](https://github.com/claudekit/claudekit-engineer/issues/386) ([b3c62a6](https://github.com/claudekit/claudekit-engineer/commit/b3c62a697cce1b381f5c8c7ccd02008c279be052))

## [2.8.0](https://github.com/claudekit/claudekit-engineer/compare/v2.7.0...v2.8.0) (2026-01-27)


### 🚀 Features

* **ai-artist:** add mandatory validation workflow ([c56d80f](https://github.com/claudekit/claudekit-engineer/commit/c56d80f143a6231173fa256d9eda53111338e0a0)), closes [#363](https://github.com/claudekit/claudekit-engineer/issues/363)


### 🐞 Bug Fixes

* deprecate commands/fix.md in favor of global fix skill ([81ab712](https://github.com/claudekit/claudekit-engineer/commit/81ab71268c21b45edd12780246f02dce8a0d913f)), closes [#382](https://github.com/claudekit/claudekit-engineer/issues/382)
* **statusline:** remove duplicate percent sign in usage display ([f80b9fe](https://github.com/claudekit/claudekit-engineer/commit/f80b9fecc8865cd300a19b1c16394426ea453d7f))

## [2.8.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.7.0...v2.8.0-beta.1) (2026-01-27)


### 🚀 Features

* **ai-artist:** add mandatory validation workflow ([c56d80f](https://github.com/claudekit/claudekit-engineer/commit/c56d80f143a6231173fa256d9eda53111338e0a0)), closes [#363](https://github.com/claudekit/claudekit-engineer/issues/363)


### 🐞 Bug Fixes

* deprecate commands/fix.md in favor of global fix skill ([81ab712](https://github.com/claudekit/claudekit-engineer/commit/81ab71268c21b45edd12780246f02dce8a0d913f)), closes [#382](https://github.com/claudekit/claudekit-engineer/issues/382)
* **statusline:** remove duplicate percent sign in usage display ([f80b9fe](https://github.com/claudekit/claudekit-engineer/commit/f80b9fecc8865cd300a19b1c16394426ea453d7f))

## [2.7.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.7.0-beta.3...v2.7.0-beta.4) (2026-01-27)


### 🚀 Features

* **ai-artist:** add mandatory validation workflow ([c56d80f](https://github.com/claudekit/claudekit-engineer/commit/c56d80f143a6231173fa256d9eda53111338e0a0)), closes [#363](https://github.com/claudekit/claudekit-engineer/issues/363)

## [2.7.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.7.0-beta.2...v2.7.0-beta.3) (2026-01-27)


### 🐞 Bug Fixes

* deprecate commands/fix.md in favor of global fix skill ([81ab712](https://github.com/claudekit/claudekit-engineer/commit/81ab71268c21b45edd12780246f02dce8a0d913f)), closes [#382](https://github.com/claudekit/claudekit-engineer/issues/382)

## [2.7.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.7.0-beta.1...v2.7.0-beta.2) (2026-01-27)


### 🐞 Bug Fixes

* **statusline:** remove duplicate percent sign in usage display ([f80b9fe](https://github.com/claudekit/claudekit-engineer/commit/f80b9fecc8865cd300a19b1c16394426ea453d7f))

## [2.7.0](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0...v2.7.0) (2026-01-26)


### 🚀 Features

* **git:** improve commit standards and workflow notes ([836c81f](https://github.com/claudekit/claudekit-engineer/commit/836c81fee7a3e0ac45c630fbce91078a5a31b162))
* **shader:** add GLSL fragment shader skill ([83ca0cd](https://github.com/claudekit/claudekit-engineer/commit/83ca0cd517119393259ab7bb68ca2f173111398b))


### 🐞 Bug Fixes

* **hooks:** avoid stuck at descriptive name hook ([35e960e](https://github.com/claudekit/claudekit-engineer/commit/35e960e2950ac7908c08fb449cc38dfbc656309c))
* **release:** pump v2.6.1-beta.0 ([0fed02e](https://github.com/claudekit/claudekit-engineer/commit/0fed02e9fe99e81b0878700f71db195bd40654bf))
* resolve merge conflict in package.json version ([e435700](https://github.com/claudekit/claudekit-engineer/commit/e435700500e3957fcf0b4e7b83ed8cb5d045fcb4))
* resolve merge conflicts from main into dev ([7074a60](https://github.com/claudekit/claudekit-engineer/commit/7074a609a3f30cb1827ab91e5c5e4e8d3c6ad819))
## [2.7.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0...v2.7.0-beta.1) (2026-01-26)


### 🚀 Features

* **git:** improve commit standards and workflow notes ([836c81f](https://github.com/claudekit/claudekit-engineer/commit/836c81fee7a3e0ac45c630fbce91078a5a31b162))
* **shader:** add GLSL fragment shader skill ([83ca0cd](https://github.com/claudekit/claudekit-engineer/commit/83ca0cd517119393259ab7bb68ca2f173111398b))


### 🐞 Bug Fixes

* **hooks:** avoid stuck at descriptive name hook ([35e960e](https://github.com/claudekit/claudekit-engineer/commit/35e960e2950ac7908c08fb449cc38dfbc656309c))
* **release:** pump v2.6.1-beta.0 ([0fed02e](https://github.com/claudekit/claudekit-engineer/commit/0fed02e9fe99e81b0878700f71db195bd40654bf))
* resolve merge conflict in package.json version ([e435700](https://github.com/claudekit/claudekit-engineer/commit/e435700500e3957fcf0b4e7b83ed8cb5d045fcb4))
* resolve merge conflicts from main into dev ([7074a60](https://github.com/claudekit/claudekit-engineer/commit/7074a609a3f30cb1827ab91e5c5e4e8d3c6ad819))

## [2.6.0-beta.12](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.11...v2.6.0-beta.12) (2026-01-26)


### 🐞 Bug Fixes

* **release:** pump v2.6.1-beta.0 ([0fed02e](https://github.com/claudekit/claudekit-engineer/commit/0fed02e9fe99e81b0878700f71db195bd40654bf))
* resolve merge conflict in package.json version ([e435700](https://github.com/claudekit/claudekit-engineer/commit/e435700500e3957fcf0b4e7b83ed8cb5d045fcb4))

## [2.6.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.10...v2.6.0-beta.11) (2026-01-26)


### 🚀 Features

* **git:** improve commit standards and workflow notes ([836c81f](https://github.com/claudekit/claudekit-engineer/commit/836c81fee7a3e0ac45c630fbce91078a5a31b162))
* **shader:** add GLSL fragment shader skill ([83ca0cd](https://github.com/claudekit/claudekit-engineer/commit/83ca0cd517119393259ab7bb68ca2f173111398b))


### 🐞 Bug Fixes

* **hooks:** avoid stuck at descriptive name hook ([35e960e](https://github.com/claudekit/claudekit-engineer/commit/35e960e2950ac7908c08fb449cc38dfbc656309c))


### 📚 Documentation

* **git:** add merge-main-first reminder to PR and merge workflows ([04677c7](https://github.com/claudekit/claudekit-engineer/commit/04677c75433a09d25e49fa5082e2470994e71dae))
* **git:** add note to search GitHub issues for commit context ([21823de](https://github.com/claudekit/claudekit-engineer/commit/21823de822a261e824eae47f89ad5fa66261c3ef))
* simplify primary workflow instructions ([11329c7](https://github.com/claudekit/claudekit-engineer/commit/11329c712edbbc973f8a94f61d58d07577e4d9e5))

## [2.6.0](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0...v2.6.0) (2026-01-26)


### 🚀 Features

* **hooks:** add config toggle for enabling/disabling hooks ([7544d87](https://github.com/claudekit/claudekit-engineer/commit/7544d87ba84b577bd35174dd29da2ab17e3ea8de)), closes [#367](https://github.com/claudekit/claudekit-engineer/issues/367)
* **metadata:** add deletions array for archived commands cleanup ([947b891](https://github.com/claudekit/claudekit-engineer/commit/947b891154b5e44089a6de28f48469fdd5e1497f))
* **metadata:** add deletions array for archived commands cleanup ([5125bd5](https://github.com/claudekit/claudekit-engineer/commit/5125bd5262228268d4fab3be33020f8b116a22a4))
* **skills:** add agent-browser skill for AI-optimized browser automation ([a4ae50e](https://github.com/claudekit/claudekit-engineer/commit/a4ae50e15bc570f528f2a104f5977236af169efc))
* **skills:** add agent-browser skill for AI-optimized browser automation ([429a2e7](https://github.com/claudekit/claudekit-engineer/commit/429a2e79bd99bc739898f2457cca9b5d22662247))
* **statusline:** add configurable display modes [#368](https://github.com/claudekit/claudekit-engineer/issues/368) ([ab12ee2](https://github.com/claudekit/claudekit-engineer/commit/ab12ee212a194c6b5782f865d7aea40c53e33dfe))


### 🐞 Bug Fixes

* **deletions:** add removed agents (copywriter, database-admin, scout, scout-external) ([0cb28a1](https://github.com/claudekit/claudekit-engineer/commit/0cb28a1218875a9aea3de247d32a521a9dc4e0d0))
* **deletions:** add removed agents (copywriter, database-admin, scout, scout-external) ([e0a3e9b](https://github.com/claudekit/claudekit-engineer/commit/e0a3e9bcf49a7b0b9751d291a6ae5ccbf0cf7585))
* **deletions:** add skills/brainstorming/** (renamed to brainstorm) ([702ceb3](https://github.com/claudekit/claudekit-engineer/commit/702ceb387e296f4faeed1e1d3c870acd13401a8f))
* **deletions:** add skills/brainstorming/** (renamed to brainstorm) ([39c4522](https://github.com/claudekit/claudekit-engineer/commit/39c45225f0eb2b3b3090e410caafd81dc8f73b4e))
* **deletions:** add verified deprecated commands and skills ([3fe04ee](https://github.com/claudekit/claudekit-engineer/commit/3fe04ee66f1303510b0efc1ea1f0c60567de2f8e))
* **deletions:** add verified deprecated commands and skills ([cc28253](https://github.com/claudekit/claudekit-engineer/commit/cc28253b5ba788736854893efb9ad9d3ec6674e5))
* **hooks:** add fallback for usage API when OAuth unavailable ([4d10d70](https://github.com/claudekit/claudekit-engineer/commit/4d10d70b5a23c3c6c2294841973c03f9ed6fa588)), closes [#369](https://github.com/claudekit/claudekit-engineer/issues/369)
* **metadata:** restore deletions array lost during rebase conflict ([4499a6b](https://github.com/claudekit/claudekit-engineer/commit/4499a6b56de158179a8f75ecff1fd96521b912ae))
* **metadata:** restore deletions array lost during rebase conflict ([1a25b83](https://github.com/claudekit/claudekit-engineer/commit/1a25b83d0688123f1701ff1c08ad602730218a96))
* **release:** include only plans/templates in release assets ([685a120](https://github.com/claudekit/claudekit-engineer/commit/685a12007064a3a70d1f2668a3310011dccfff91))
* **release:** preserve deletions array in metadata.json during releases ([2be49b7](https://github.com/claudekit/claudekit-engineer/commit/2be49b7b2882fdf083193b055e112aa5470238f8))
* **release:** preserve deletions array in metadata.json during releases ([2d729e7](https://github.com/claudekit/claudekit-engineer/commit/2d729e74f5c860555fd2d24579031ba859aa5839))
* **release:** prevent data loss in release scripts ([ad4a151](https://github.com/claudekit/claudekit-engineer/commit/ad4a151a06fa17ed9c3590c52b92af5a2eed433b))
* **release:** prevent data loss in release scripts ([58f17ab](https://github.com/claudekit/claudekit-engineer/commit/58f17ab3afbdd66d22e27a062992af54bc72d85c))


### 📚 Documentation

* **git:** add merge-main-first reminder to PR and merge workflows ([04677c7](https://github.com/claudekit/claudekit-engineer/commit/04677c75433a09d25e49fa5082e2470994e71dae))
* **git:** add note to search GitHub issues for commit context ([21823de](https://github.com/claudekit/claudekit-engineer/commit/21823de822a261e824eae47f89ad5fa66261c3ef))
* simplify primary workflow instructions ([11329c7](https://github.com/claudekit/claudekit-engineer/commit/11329c712edbbc973f8a94f61d58d07577e4d9e5))


### ♻️ Code Refactoring

* **deletions:** use glob patterns instead of explicit paths ([9c4a8ed](https://github.com/claudekit/claudekit-engineer/commit/9c4a8ed860b35c143f9e05bb5eb179c397c89d22))
* **deletions:** use glob patterns instead of explicit paths ([6a8407a](https://github.com/claudekit/claudekit-engineer/commit/6a8407a491c644b66d067b85fda3c04ff69932e5))


### 👷 CI

* add auto-sync workflow to merge main back to dev after releases ([cd45b07](https://github.com/claudekit/claudekit-engineer/commit/cd45b07e5626fc1ee7c455d278edd22522444f7d))
* add auto-sync workflow to merge main back to dev after releases ([658d09a](https://github.com/claudekit/claudekit-engineer/commit/658d09aee5f5ff4924210fa7b83d2f88a91184bb))

## [2.6.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.9...v2.6.0-beta.10) (2026-01-25)


### 🚀 Features

* **hooks:** add config toggle for enabling/disabling hooks ([7544d87](https://github.com/claudekit/claudekit-engineer/commit/7544d87ba84b577bd35174dd29da2ab17e3ea8de)), closes [#367](https://github.com/claudekit/claudekit-engineer/issues/367)
* **statusline:** add configurable display modes [#368](https://github.com/claudekit/claudekit-engineer/issues/368) ([ab12ee2](https://github.com/claudekit/claudekit-engineer/commit/ab12ee212a194c6b5782f865d7aea40c53e33dfe))


### 🐞 Bug Fixes

* **release:** include only plans/templates in release assets ([685a120](https://github.com/claudekit/claudekit-engineer/commit/685a12007064a3a70d1f2668a3310011dccfff91))

## [2.6.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.8...v2.6.0-beta.9) (2026-01-25)


### 🚀 Features

* **metadata:** add deletions array for archived commands cleanup ([947b891](https://github.com/claudekit/claudekit-engineer/commit/947b891154b5e44089a6de28f48469fdd5e1497f))
* **skills:** add agent-browser skill for AI-optimized browser automation ([a4ae50e](https://github.com/claudekit/claudekit-engineer/commit/a4ae50e15bc570f528f2a104f5977236af169efc))


### 🐞 Bug Fixes

* **deletions:** add removed agents (copywriter, database-admin, scout, scout-external) ([0cb28a1](https://github.com/claudekit/claudekit-engineer/commit/0cb28a1218875a9aea3de247d32a521a9dc4e0d0))
* **deletions:** add skills/brainstorming/** (renamed to brainstorm) ([702ceb3](https://github.com/claudekit/claudekit-engineer/commit/702ceb387e296f4faeed1e1d3c870acd13401a8f))
* **deletions:** add verified deprecated commands and skills ([3fe04ee](https://github.com/claudekit/claudekit-engineer/commit/3fe04ee66f1303510b0efc1ea1f0c60567de2f8e))
* **hooks:** add fallback for usage API when OAuth unavailable ([4d10d70](https://github.com/claudekit/claudekit-engineer/commit/4d10d70b5a23c3c6c2294841973c03f9ed6fa588)), closes [#369](https://github.com/claudekit/claudekit-engineer/issues/369)
* **metadata:** restore deletions array lost during rebase conflict ([4499a6b](https://github.com/claudekit/claudekit-engineer/commit/4499a6b56de158179a8f75ecff1fd96521b912ae))
* **release:** preserve deletions array in metadata.json during releases ([2be49b7](https://github.com/claudekit/claudekit-engineer/commit/2be49b7b2882fdf083193b055e112aa5470238f8))
* **release:** prevent data loss in release scripts ([ad4a151](https://github.com/claudekit/claudekit-engineer/commit/ad4a151a06fa17ed9c3590c52b92af5a2eed433b))


### ♻️ Code Refactoring

* **deletions:** use glob patterns instead of explicit paths ([9c4a8ed](https://github.com/claudekit/claudekit-engineer/commit/9c4a8ed860b35c143f9e05bb5eb179c397c89d22))


### 👷 CI

* add auto-sync workflow to merge main back to dev after releases ([cd45b07](https://github.com/claudekit/claudekit-engineer/commit/cd45b07e5626fc1ee7c455d278edd22522444f7d))

## [2.6.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.7...v2.6.0-beta.8) (2026-01-24)


### 🐞 Bug Fixes

* **deletions:** add removed agents (copywriter, database-admin, scout, scout-external) ([e0a3e9b](https://github.com/claudekit/claudekit-engineer/commit/e0a3e9bcf49a7b0b9751d291a6ae5ccbf0cf7585))

## [2.6.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.6...v2.6.0-beta.7) (2026-01-24)


### 🐞 Bug Fixes

* **deletions:** add skills/brainstorming/** (renamed to brainstorm) ([39c4522](https://github.com/claudekit/claudekit-engineer/commit/39c45225f0eb2b3b3090e410caafd81dc8f73b4e))

## [2.6.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.5...v2.6.0-beta.6) (2026-01-24)


### 🐞 Bug Fixes

* **deletions:** add verified deprecated commands and skills ([cc28253](https://github.com/claudekit/claudekit-engineer/commit/cc28253b5ba788736854893efb9ad9d3ec6674e5))

## [2.6.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.4...v2.6.0-beta.5) (2026-01-24)


### ♻️ Code Refactoring

* **deletions:** use glob patterns instead of explicit paths ([6a8407a](https://github.com/claudekit/claudekit-engineer/commit/6a8407a491c644b66d067b85fda3c04ff69932e5))

## [2.6.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.3...v2.6.0-beta.4) (2026-01-24)


### 🐞 Bug Fixes

* **release:** prevent data loss in release scripts ([58f17ab](https://github.com/claudekit/claudekit-engineer/commit/58f17ab3afbdd66d22e27a062992af54bc72d85c))

## [2.6.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.2...v2.6.0-beta.3) (2026-01-24)


### 🐞 Bug Fixes

* **metadata:** restore deletions array lost during rebase conflict ([1a25b83](https://github.com/claudekit/claudekit-engineer/commit/1a25b83d0688123f1701ff1c08ad602730218a96))

## [2.6.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.6.0-beta.1...v2.6.0-beta.2) (2026-01-24)


### 🐞 Bug Fixes

* **release:** preserve deletions array in metadata.json during releases ([2d729e7](https://github.com/claudekit/claudekit-engineer/commit/2d729e74f5c860555fd2d24579031ba859aa5839))

## [2.6.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0...v2.6.0-beta.1) (2026-01-24)


### 🚀 Features

* **metadata:** add deletions array for archived commands cleanup ([5125bd5](https://github.com/claudekit/claudekit-engineer/commit/5125bd5262228268d4fab3be33020f8b116a22a4))
* **skills:** add agent-browser skill for AI-optimized browser automation ([429a2e7](https://github.com/claudekit/claudekit-engineer/commit/429a2e79bd99bc739898f2457cca9b5d22662247))


### 👷 CI

* add auto-sync workflow to merge main back to dev after releases ([658d09a](https://github.com/claudekit/claudekit-engineer/commit/658d09aee5f5ff4924210fa7b83d2f88a91184bb))

## [2.5.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.10...v2.5.0-beta.11) (2026-01-24)


### 🚀 Features

* **metadata:** add deletions array for archived commands cleanup ([5125bd5](https://github.com/claudekit/claudekit-engineer/commit/5125bd5262228268d4fab3be33020f8b116a22a4))

## [2.5.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.9...v2.5.0-beta.10) (2026-01-23)


### 🚀 Features

* **skills:** add agent-browser skill for AI-optimized browser automation ([429a2e7](https://github.com/claudekit/claudekit-engineer/commit/429a2e79bd99bc739898f2457cca9b5d22662247))

## [2.5.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.8...v2.5.0-beta.9) (2026-01-23)


### 🚀 Features

* **chrome-devtools:** add authentication and cookie management features ([4206332](https://github.com/claudekit/claudekit-engineer/commit/420633266f0b352d0ceacd322b9476d7d87c9efb))


### ♻️ Code Refactoring

* **agents:** simplify git-manager agent prompt ([e3c6da3](https://github.com/claudekit/claudekit-engineer/commit/e3c6da3c7788e905738d9ff538b37b273f395309))

## [2.5.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.7...v2.5.0-beta.8) (2026-01-23)


### 🚀 Features

* integrate native Claude Code Tasks API ([#362](https://github.com/claudekit/claudekit-engineer/issues/362)) ([215adb1](https://github.com/claudekit/claudekit-engineer/commit/215adb12b777b611cc9b680579e590edf8e7a8cf))

## [2.5.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.6...v2.5.0-beta.7) (2026-01-22)


### 🚀 Features

* **beads:** integrate beads as core workflow component ([#208](https://github.com/claudekit/claudekit-engineer/issues/208)) ([0c7c9c3](https://github.com/claudekit/claudekit-engineer/commit/0c7c9c31c2547710dafec3b7a2f70652525f461a)), closes [#176](https://github.com/claudekit/claudekit-engineer/issues/176)

## [2.5.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.5...v2.5.0-beta.6) (2026-01-21)


### 🚀 Features

* **ai-artist:** add data assets and prompt generation scripts ([3f958b0](https://github.com/claudekit/claudekit-engineer/commit/3f958b0dcc5fd116af317c0a0bcb36e689ed37c2))
* **threejs:** add data processing and search capabilities for Three.js API documentation ([91c2d9d](https://github.com/claudekit/claudekit-engineer/commit/91c2d9dec1b143be2d524fdaa716597a60b6ce13))


### 🐞 Bug Fixes

* **skills:** typo in 3d ref of `frontend-design` skill ([2382b00](https://github.com/claudekit/claudekit-engineer/commit/2382b004beec1ad104e284568b9734a4b8db19ab))


### 📚 Documentation

* add cpg marketing 2026 infographics ([fc250b7](https://github.com/claudekit/claudekit-engineer/commit/fc250b7135e4a81c4a85af25a2b61876977c09f0))
* **ai-artist:** add comprehensive nano banana prompts and skill documentation ([9d05673](https://github.com/claudekit/claudekit-engineer/commit/9d056739f5527712458a3b5f96432369f6745489))
* **skills:** add remotion skill with comprehensive references ([c5106b3](https://github.com/claudekit/claudekit-engineer/commit/c5106b34710ecb350e4539676df2fd62b7ef717a))
* **threejs:** add references for fundamentals, materials, shaders, and geometry ([c67cc55](https://github.com/claudekit/claudekit-engineer/commit/c67cc55720686c7bd3bec0c03df9bb8686d273dd))
* **threejs:** update skill documentation with enhanced examples and API reference ([bd5ccdd](https://github.com/claudekit/claudekit-engineer/commit/bd5ccddbb90e6e88d0e7befa25a44d0140bad70f))

## [2.5.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.4...v2.5.0-beta.5) (2026-01-20)


### 🚀 Features

* **skills:** add cook skill for task orchestration ([458b32f](https://github.com/claudekit/claudekit-engineer/commit/458b32f1d6742bfbee300b431b47241a88e793c6))
* **skills:** add gkg skill for semantic code analysis ([b3c2767](https://github.com/claudekit/claudekit-engineer/commit/b3c2767fcd49e392c7bb9af2a0d248c54ce067cc))
* **skills:** add scout skill for codebase file discovery ([18e0274](https://github.com/claudekit/claudekit-engineer/commit/18e0274e68a1104c98672631146077ef47dd0f7a))
* **web-testing:** add Playwright test automation scripts ([e56728a](https://github.com/claudekit/claudekit-engineer/commit/e56728ac157ee7444f44a20937f453bdae0eb92c))


### 📚 Documentation

* **commands:** update docs commands with improved instructions ([bc29733](https://github.com/claudekit/claudekit-engineer/commit/bc2973301e10ae15d5152aad6a369ec33eae42b7))
* **mcp:** update Gemini CLI integration reference ([654f03c](https://github.com/claudekit/claudekit-engineer/commit/654f03cd66f0511ef861ff8b307922319dc13ae9))
* **skill-creator:** add quality criteria reference documentation ([b448fa3](https://github.com/claudekit/claudekit-engineer/commit/b448fa39cb9421ae397cd9484039fd63d87a982f))
* **skills:** add frontend-design workflow references ([64af261](https://github.com/claudekit/claudekit-engineer/commit/64af26179e0a03ba7db893014c318a161c82e225))
* **skills:** update skill-creator with improved guidelines ([c06a3c8](https://github.com/claudekit/claudekit-engineer/commit/c06a3c8d520c343ed7211404c79f9c366b48a2fa))
* **web-testing:** add comprehensive testing framework references and guidelines ([d356cbb](https://github.com/claudekit/claudekit-engineer/commit/d356cbb89f2788fac43eebbe1b1988c6c7de521a))


### ♻️ Code Refactoring

* **agents:** remove deprecated scout agent definitions ([e07a855](https://github.com/claudekit/claudekit-engineer/commit/e07a855ddff4d32ae2070d13739f3a8acad024cc))
* **commands:** archive deprecated commands to commands-archived ([a7fec39](https://github.com/claudekit/claudekit-engineer/commit/a7fec391576ea7446053094b52f89495544556a2))
* **skills:** rename brainstorming to brainstorm ([7ef3c20](https://github.com/claudekit/claudekit-engineer/commit/7ef3c205f7002291d459008b586e9f9b34e1a994))

## [2.5.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.3...v2.5.0-beta.4) (2026-01-19)


### 🚀 Features

* **worktree:** add --worktree-root flag for Claude-driven decisions ([003cd43](https://github.com/claudekit/claudekit-engineer/commit/003cd4350293941b03bc6d12787f1170d02471d2))


### 🐞 Bug Fixes

* **worktree:** add validation, safety limits, and tests for robustness ([cb05c3f](https://github.com/claudekit/claudekit-engineer/commit/cb05c3fef595556615ff3056e3bba18d11b57466))
* **worktree:** consistent location via superproject detection ([cadb65a](https://github.com/claudekit/claudekit-engineer/commit/cadb65a8b32d80a0415c65680a5af447ce038991)), closes [#345](https://github.com/claudekit/claudekit-engineer/issues/345)


### 📚 Documentation

* **worktree:** restore detailed dependency install examples ([eeeba94](https://github.com/claudekit/claudekit-engineer/commit/eeeba9405850eff95589ecdff14cda42a6976817))


### ✅ Tests

* **worktree:** add comprehensive edge case and user scenario tests ([e52dd54](https://github.com/claudekit/claudekit-engineer/commit/e52dd54bb91f807342a47c8043eef6b55a555e7c))

## [2.5.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.2...v2.5.0-beta.3) (2026-01-19)


### 🚀 Features

* **mcp:** add MCP manager agent and CLI integration support ([5bf9a9d](https://github.com/claudekit/claudekit-engineer/commit/5bf9a9de040b2fab608e5d4aaf91f663e54130ee))


### 📚 Documentation

* **web-testing:** add comprehensive testing references and guidelines ([a45da0a](https://github.com/claudekit/claudekit-engineer/commit/a45da0a6512f1331d2855166e7b50960a84f9bc2))

## [2.5.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.5.0-beta.1...v2.5.0-beta.2) (2026-01-18)


### 🚀 Features

* **commands:** add mandatory /clear reminder after planning workflow ([c89478c](https://github.com/claudekit/claudekit-engineer/commit/c89478cd91e45db8a39b99bc072793201e0660a1)), closes [#355](https://github.com/claudekit/claudekit-engineer/issues/355)

## [2.5.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.4.0...v2.5.0-beta.1) (2026-01-18)


### 🚀 Features

* **release:** add explicit release rules for minor/patch version bumps ([24706fb](https://github.com/claudekit/claudekit-engineer/commit/24706fb1f5db73ca0c6cf4b06f186c42de438f0a))
* **skill:** add web-testing skill for comprehensive test automation ([bc42ca3](https://github.com/claudekit/claudekit-engineer/commit/bc42ca3a068ee4ce6a7ae8e2264cc1e16233945d))
* **skill:** add web-testing skill with comprehensive testing workflows ([34cd3c1](https://github.com/claudekit/claudekit-engineer/commit/34cd3c12328dd01bf2b1f4dd93becbf6298a16a8))


### 🐞 Bug Fixes

* **opencode:** use plural folder names for OpenCode compatibility ([7b7f177](https://github.com/claudekit/claudekit-engineer/commit/7b7f17755d6a7df95de283e660def0c5fe18f1e3))


### 📚 Documentation

* **skill:** enhance devops skill with kubernetes reference documentation ([14f6e7b](https://github.com/claudekit/claudekit-engineer/commit/14f6e7b85101894005d0c8f2150dbf9f32e4d6b0))

## [2.4.0](https://github.com/claudekit/claudekit-engineer/compare/v2.3.2...v2.4.0) (2026-01-17)


### 🚀 Features

* **config:** add skills.research.useGemini toggle for Gemini CLI ([0659ae6](https://github.com/claudekit/claudekit-engineer/commit/0659ae6adecdfba5729ceafb68b2f7de396b876b))
* **hooks:** add context and usage section builders to context-builder ([865649c](https://github.com/claudekit/claudekit-engineer/commit/865649cc5860d559f3360536164b00ebc97ab173))
* **hooks:** add usage-context-awareness hook for limit monitoring ([1944a0c](https://github.com/claudekit/claudekit-engineer/commit/1944a0c72f5963624660fac7cb510fa9bbe3c2e1))
* integrate code-simplifier agent with PostToolUse hook ([d8adf1a](https://github.com/claudekit/claudekit-engineer/commit/d8adf1a5303bdefe894963d0e3918b99edbe2915))
* **opencode:** add opencode configuration and skills ([0adfd45](https://github.com/claudekit/claudekit-engineer/commit/0adfd456fc46abfc2e2ebccf0f25f9a3e6c1d197))
* **rules:** add mandatory delegation context for cross-project work ([4fd2c34](https://github.com/claudekit/claudekit-engineer/commit/4fd2c34994f4e9edac6515d3877ad91290c40169)), closes [#342](https://github.com/claudekit/claudekit-engineer/issues/342)
* **skill:** add copywriting skill with comprehensive references and utilities ([86be847](https://github.com/claudekit/claudekit-engineer/commit/86be8478941c60e7ef0a30b64b0378d1043a841c))
* **skill:** add git operations skill with comprehensive workflow references ([e84c1b0](https://github.com/claudekit/claudekit-engineer/commit/e84c1b0523da1310a01fa71baa5bc34d3ef77229))
* **skill:** expand ui-ux-pro-max with design patterns and component stacks ([0094348](https://github.com/claudekit/claudekit-engineer/commit/0094348bed048d650c5b970a18fbd20e243bdb59))
* **skill:** implement design system generator for ui-ux-pro-max ([64ce03a](https://github.com/claudekit/claudekit-engineer/commit/64ce03a230df93d44076c6adfddf271ad280328b))
* **skills:** add fixing skill for bug classification and resolution ([1745741](https://github.com/claudekit/claudekit-engineer/commit/17457417cffea18016d4b4dc15bb34723630ad1b))
* **skills:** add runtime awareness to context-engineering skill ([aa65316](https://github.com/claudekit/claudekit-engineer/commit/aa653161ca34f8d53c4642f2043323c478a948e4))
* **skills:** added `react-best-practices` from Vercel ([61626a4](https://github.com/claudekit/claudekit-engineer/commit/61626a4fdcdd703b149e22a939a202c22f6443b0))
* **skills:** added `web-design-guidelines` skill (Vercel) ([05920da](https://github.com/claudekit/claudekit-engineer/commit/05920dab2aa23ff0c1126fec4d0ca82ea1be29ea))
* **statusline:** export context data for hooks consumption ([bb5057c](https://github.com/claudekit/claudekit-engineer/commit/bb5057c365ba5b4510dbd2d9faa59504507ccbce))


### 🐞 Bug Fixes

* **hooks:** read session_id from hook input in dev-rules-reminder ([c9c9e3f](https://github.com/claudekit/claudekit-engineer/commit/c9c9e3ff6b216261057a790be28dd38c1f794251))


### 📚 Documentation

* add Claude CLI usage limits API reference ([8347b13](https://github.com/claudekit/claudekit-engineer/commit/8347b131a0b795e00fb94a3e1dce9f7c9d2b5b97))
* **skill:** document design system generation in ui-ux-pro-max skill.md ([ebbad52](https://github.com/claudekit/claudekit-engineer/commit/ebbad52c8a95c8443fdf7b63798e73072e8d3641))


### ♻️ Code Refactoring

* **hooks:** simplify usage-context-awareness to cache-only writer ([5f44968](https://github.com/claudekit/claudekit-engineer/commit/5f449686d422aed4401e942a580dc9eb5894be9b))
* **skill:** optimize ui-ux-pro-max search and core utilities ([6ded438](https://github.com/claudekit/claudekit-engineer/commit/6ded43835862e7ae5f02fcfef53b2a4e12820532))
* **skills:** shorten skill descriptions for token efficiency ([632411b](https://github.com/claudekit/claudekit-engineer/commit/632411b91e77ca45e6dc9ae1174814e87ae5c533))
* **statusline:** prioritize session info on line 1 for claude code readability ([06e5b94](https://github.com/claudekit/claudekit-engineer/commit/06e5b949650478030f558a19188c7d155ce700a3))


### ⚡ Performance Improvements

* **skill:** enhance context-engineering and git documentation ([ae5469e](https://github.com/claudekit/claudekit-engineer/commit/ae5469e00d5f4a6eed4f8b6ac494acc796612c6c))
* **skill:** upgrade `db-design` skill from Viet's contribution ([51cc63a](https://github.com/claudekit/claudekit-engineer/commit/51cc63a7b62f57ffafdc9eba8f8c937081312164))

## [2.4.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.4.0-beta.5...v2.4.0-beta.6) (2026-01-16)


### 🚀 Features

* **config:** add skills.research.useGemini toggle for Gemini CLI ([0659ae6](https://github.com/claudekit/claudekit-engineer/commit/0659ae6adecdfba5729ceafb68b2f7de396b876b))
* **skill:** add copywriting skill with comprehensive references and utilities ([86be847](https://github.com/claudekit/claudekit-engineer/commit/86be8478941c60e7ef0a30b64b0378d1043a841c))
* **skill:** add git operations skill with comprehensive workflow references ([e84c1b0](https://github.com/claudekit/claudekit-engineer/commit/e84c1b0523da1310a01fa71baa5bc34d3ef77229))
* **skill:** implement design system generator for ui-ux-pro-max ([64ce03a](https://github.com/claudekit/claudekit-engineer/commit/64ce03a230df93d44076c6adfddf271ad280328b))
* **skills:** added `web-design-guidelines` skill (Vercel) ([05920da](https://github.com/claudekit/claudekit-engineer/commit/05920dab2aa23ff0c1126fec4d0ca82ea1be29ea))


### 📚 Documentation

* **skill:** document design system generation in ui-ux-pro-max skill.md ([ebbad52](https://github.com/claudekit/claudekit-engineer/commit/ebbad52c8a95c8443fdf7b63798e73072e8d3641))


### ⚡ Performance Improvements

* **skill:** enhance context-engineering and git documentation ([ae5469e](https://github.com/claudekit/claudekit-engineer/commit/ae5469e00d5f4a6eed4f8b6ac494acc796612c6c))

## [2.4.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.4.0-beta.4...v2.4.0-beta.5) (2026-01-15)


### 🚀 Features

* **hooks:** add context and usage section builders to context-builder ([865649c](https://github.com/claudekit/claudekit-engineer/commit/865649cc5860d559f3360536164b00ebc97ab173))


### 🐞 Bug Fixes

* **hooks:** read session_id from hook input in dev-rules-reminder ([c9c9e3f](https://github.com/claudekit/claudekit-engineer/commit/c9c9e3ff6b216261057a790be28dd38c1f794251))


### ♻️ Code Refactoring

* **hooks:** simplify usage-context-awareness to cache-only writer ([5f44968](https://github.com/claudekit/claudekit-engineer/commit/5f449686d422aed4401e942a580dc9eb5894be9b))
* **statusline:** prioritize session info on line 1 for claude code readability ([06e5b94](https://github.com/claudekit/claudekit-engineer/commit/06e5b949650478030f558a19188c7d155ce700a3))

## [2.4.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.4.0-beta.3...v2.4.0-beta.4) (2026-01-15)


### 🚀 Features

* **skill:** expand ui-ux-pro-max with design patterns and component stacks ([0094348](https://github.com/claudekit/claudekit-engineer/commit/0094348bed048d650c5b970a18fbd20e243bdb59))
* **skills:** added `react-best-practices` from Vercel ([61626a4](https://github.com/claudekit/claudekit-engineer/commit/61626a4fdcdd703b149e22a939a202c22f6443b0))


### ♻️ Code Refactoring

* **skill:** optimize ui-ux-pro-max search and core utilities ([6ded438](https://github.com/claudekit/claudekit-engineer/commit/6ded43835862e7ae5f02fcfef53b2a4e12820532))

## [2.4.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.4.0-beta.2...v2.4.0-beta.3) (2026-01-15)


### 🚀 Features

* **hooks:** add usage-context-awareness hook for limit monitoring ([1944a0c](https://github.com/claudekit/claudekit-engineer/commit/1944a0c72f5963624660fac7cb510fa9bbe3c2e1))
* **opencode:** add opencode configuration and skills ([0adfd45](https://github.com/claudekit/claudekit-engineer/commit/0adfd456fc46abfc2e2ebccf0f25f9a3e6c1d197))
* **skills:** add fixing skill for bug classification and resolution ([1745741](https://github.com/claudekit/claudekit-engineer/commit/17457417cffea18016d4b4dc15bb34723630ad1b))
* **skills:** add runtime awareness to context-engineering skill ([aa65316](https://github.com/claudekit/claudekit-engineer/commit/aa653161ca34f8d53c4642f2043323c478a948e4))
* **statusline:** export context data for hooks consumption ([bb5057c](https://github.com/claudekit/claudekit-engineer/commit/bb5057c365ba5b4510dbd2d9faa59504507ccbce))


### 📚 Documentation

* add Claude CLI usage limits API reference ([8347b13](https://github.com/claudekit/claudekit-engineer/commit/8347b131a0b795e00fb94a3e1dce9f7c9d2b5b97))


### ♻️ Code Refactoring

* **skills:** shorten skill descriptions for token efficiency ([632411b](https://github.com/claudekit/claudekit-engineer/commit/632411b91e77ca45e6dc9ae1174814e87ae5c533))


### ⚡ Performance Improvements

* **skill:** upgrade `db-design` skill from Viet's contribution ([51cc63a](https://github.com/claudekit/claudekit-engineer/commit/51cc63a7b62f57ffafdc9eba8f8c937081312164))

## [2.4.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.4.0-beta.1...v2.4.0-beta.2) (2026-01-14)


### 🚀 Features

* **rules:** add mandatory delegation context for cross-project work ([4fd2c34](https://github.com/claudekit/claudekit-engineer/commit/4fd2c34994f4e9edac6515d3877ad91290c40169)), closes [#342](https://github.com/claudekit/claudekit-engineer/issues/342)

## [2.4.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.3.2...v2.4.0-beta.1) (2026-01-13)


### 🚀 Features

* integrate code-simplifier agent with PostToolUse hook ([d8adf1a](https://github.com/claudekit/claudekit-engineer/commit/d8adf1a5303bdefe894963d0e3918b99edbe2915))

## [2.3.2](https://github.com/claudekit/claudekit-engineer/compare/v2.3.1...v2.3.2) (2026-01-12)


### 🐞 Bug Fixes

* **manifest:** strip .claude/ prefix from manifest paths ([db35217](https://github.com/claudekit/claudekit-engineer/commit/db35217521e079c7d86ff3e293ad1c6833f5f6e2))

## [2.3.2-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.3.1...v2.3.2-beta.1) (2026-01-12)


### 🐞 Bug Fixes

* **manifest:** strip .claude/ prefix from manifest paths ([db35217](https://github.com/claudekit/claudekit-engineer/commit/db35217521e079c7d86ff3e293ad1c6833f5f6e2))

## [2.3.1](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0...v2.3.1) (2026-01-12)


### 🐞 Bug Fixes

* add backward compat for workflows/ in hooks ([6227d62](https://github.com/claudekit/claudekit-engineer/commit/6227d62e60089c840f55d1b473760945a689d4eb))


### ♻️ Code Refactoring

* rename workflows/ to rules/ ([#337](https://github.com/claudekit/claudekit-engineer/issues/337)) ([d54d0c4](https://github.com/claudekit/claudekit-engineer/commit/d54d0c42a0b8a9936cff1e105dae968d348a1823))


### ✅ Tests

* add comprehensive context-builder tests for rules/workflows compat ([3add387](https://github.com/claudekit/claudekit-engineer/commit/3add387c59527edaf245ffccf96a6ebba49a9e40))

## [2.3.1-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0...v2.3.1-beta.1) (2026-01-12)


### 🐞 Bug Fixes

* add backward compat for workflows/ in hooks ([6227d62](https://github.com/claudekit/claudekit-engineer/commit/6227d62e60089c840f55d1b473760945a689d4eb))


### ♻️ Code Refactoring

* rename workflows/ to rules/ ([#337](https://github.com/claudekit/claudekit-engineer/issues/337)) ([d54d0c4](https://github.com/claudekit/claudekit-engineer/commit/d54d0c42a0b8a9936cff1e105dae968d348a1823))


### ✅ Tests

* add comprehensive context-builder tests for rules/workflows compat ([3add387](https://github.com/claudekit/claudekit-engineer/commit/3add387c59527edaf245ffccf96a6ebba49a9e40))

## [2.3.0](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0...v2.3.0) (2026-01-12)


### 🚀 Features

* **ck-help:** add fuzzy matching, synonyms, and disambiguation ([255a211](https://github.com/claudekit/claudekit-engineer/commit/255a2115516581bb890e3218e7ab65174b867d55))
* **ck-help:** improve intent detection with positional weighting ([310cfe8](https://github.com/claudekit/claudekit-engineer/commit/310cfe8ecca9bb4eb463ce3974f1041b6339bcbf)), closes [#299](https://github.com/claudekit/claudekit-engineer/issues/299)
* **opencode:** add flattened commands for OpenCode compatibility ([f3e3da4](https://github.com/claudekit/claudekit-engineer/commit/f3e3da48c0f31ae45db9cfb2814a259df68e8b32))
* **opencode:** add plugin generation with shared libraries and test suite ([03df0ea](https://github.com/claudekit/claudekit-engineer/commit/03df0ea8c77e36bb6d465b26c5d88d83f29164ed))
* **release:** add OpenCode support to release scripts ([587c316](https://github.com/claudekit/claudekit-engineer/commit/587c3165efeedc150ea559efae714ba72248a01a))
* **scripts:** add OpenCode configuration generator ([74a998e](https://github.com/claudekit/claudekit-engineer/commit/74a998ecc0d77dca8c8d9da14d37a4de53cc3b31))
* **skills:** add PreferPackageManager parameter to install.ps1 ([4fda946](https://github.com/claudekit/claudekit-engineer/commit/4fda9464c51ace0027eab526958b6763d5a7bf39)), closes [#303](https://github.com/claudekit/claudekit-engineer/issues/303)
* **statusline:** add git staged/ahead and active plan indicators ([daeb5f1](https://github.com/claudekit/claudekit-engineer/commit/daeb5f1b7d91a05a81185855aa05b9a7c2063de7))
* **statusline:** add responsive width-based line wrapping ([c0f70ac](https://github.com/claudekit/claudekit-engineer/commit/c0f70ac2f99183eda66c2b716d6fb18d30775e6f))
* **statusline:** collapse duplicate agents + fix edge cases ([30c2490](https://github.com/claudekit/claudekit-engineer/commit/30c24902247388149aff434dbec2f6b0d3393f81))
* **statusline:** enhance with ANSI colors, transcript parsing, multi-line output ([1783f26](https://github.com/claudekit/claudekit-engineer/commit/1783f2619fbb7c2178b7d9e2edada279341b0bcb))
* **statusline:** refine visual presentation with compact agent flow ([d9ccf7b](https://github.com/claudekit/claudekit-engineer/commit/d9ccf7bdcc38266698da15797909d299dd337c12))
* **statusline:** show last 3 completed agents for better flow context ([f2a02ec](https://github.com/claudekit/claudekit-engineer/commit/f2a02eca2878e230b670c6823c48cb2a7050c25e))
* **statusline:** show last completed agent's description when no running agent ([967b8ff](https://github.com/claudekit/claudekit-engineer/commit/967b8ffcaaa93f1e86cfaa142dde9f94d59e560e))
* **worktree:** auto-env templates + AI-guided dependency install ([#307](https://github.com/claudekit/claudekit-engineer/issues/307)) ([b8d34c5](https://github.com/claudekit/claudekit-engineer/commit/b8d34c54ef46872748155bbf096828d6be30cf32))


### 🐞 Bug Fixes

* Alpine Linux sudo cannot find pkg_update/pkg_install functions ([428282e](https://github.com/claudekit/claudekit-engineer/commit/428282e1ff6525a15fd7ac7c922c1a5fac3586af)), closes [claudekit/claudekit-engineer#331](https://github.com/claudekit/claudekit-engineer/issues/331)
* **brainstorm:** remove incorrect Skill tool reference ([#315](https://github.com/claudekit/claudekit-engineer/issues/315)) ([4bf7ccf](https://github.com/claudekit/claudekit-engineer/commit/4bf7ccf083a6b23c5601b19da7a3089a4b823cfc))
* **chrome-devtools:** add process.exit(1) to error handlers ([966048a](https://github.com/claudekit/claudekit-engineer/commit/966048a7e94113f8719770135643aaba5ecbac4c))
* **ck-help:** add action verb detection for imperative sentences ([105a258](https://github.com/claudekit/claudekit-engineer/commit/105a2580f93a12e1acc769e72e57fbb0b2b744ea))
* **ck-help:** add service-specific compound phrases for notifications ([40e930c](https://github.com/claudekit/claudekit-engineer/commit/40e930cd4f674b7c44cf83ea1a7133b1433273ce))
* **claude:** add fixing skills rule ([f4f44b5](https://github.com/claudekit/claudekit-engineer/commit/f4f44b5b946e927052ccf5fdd6f9618944b8553a))
* **command:** `/code:auto` should finish all phases and verify implementation at the end ([58b4587](https://github.com/claudekit/claudekit-engineer/commit/58b4587854db68cc2de2ebfadabdd93ed8251f99))
* **context-engineering:** add UTF-8 encoding and error handling ([9947138](https://github.com/claudekit/claudekit-engineer/commit/9947138d15f0270e64ec84d02eafa1023c3fd8ca))
* **docs:** sync /docs:init structure with /docs:update ([445b9f2](https://github.com/claudekit/claudekit-engineer/commit/445b9f2b5f258ae8766ff44476d61b47179ba003)), closes [#317](https://github.com/claudekit/claudekit-engineer/issues/317)
* **hooks:** propagate plan context to subagents ([a5b1a9e](https://github.com/claudekit/claudekit-engineer/commit/a5b1a9ee816dbc9ee7d87778fb539932f4011dc4)), closes [#321](https://github.com/claudekit/claudekit-engineer/issues/321)
* **hooks:** propagate plan context to subagents ([45eadde](https://github.com/claudekit/claudekit-engineer/commit/45eaddeb54c6de4aca4b93d5decf8abff58d8f4a)), closes [#321](https://github.com/claudekit/claudekit-engineer/issues/321)
* **hooks:** propagate plan context to subagents ([41f2fba](https://github.com/claudekit/claudekit-engineer/commit/41f2fba5fddc4b1b2339a59835da4594b28e1e63)), closes [#321](https://github.com/claudekit/claudekit-engineer/issues/321)
* **hooks:** resolve plan paths correctly in brownfield projects ([#335](https://github.com/claudekit/claudekit-engineer/issues/335)) ([f154534](https://github.com/claudekit/claudekit-engineer/commit/f154534c47bc84f7d2870a5b2c4b1fd080c46762))
* **hooks:** use CWD for path resolution instead of git root ([#327](https://github.com/claudekit/claudekit-engineer/issues/327)) ([1b27cac](https://github.com/claudekit/claudekit-engineer/commit/1b27cac35b3ec725ea40d835a1d6ad1ca9ae19c3))
* **hooks:** use CWD for path resolution instead of git root ([#327](https://github.com/claudekit/claudekit-engineer/issues/327)) ([f121f34](https://github.com/claudekit/claudekit-engineer/commit/f121f348d406d8c72067ab9316e5e025f81394d7))
* remove broken refs after context-tracker cleanup ([a5b6228](https://github.com/claudekit/claudekit-engineer/commit/a5b62287113bbe06e0932db1f18d3423378ce48b))
* remove broken refs after context-tracker cleanup ([4cc0065](https://github.com/claudekit/claudekit-engineer/commit/4cc00650a3ac89149475b65a90b9a5807b6d9a81))
* remove broken refs after context-tracker cleanup ([cf6e177](https://github.com/claudekit/claudekit-engineer/commit/cf6e1776f616ce926ae83f5bf8a35718b36d719e))
* rename hook .js files to .cjs for CommonJS compatibility ([c067f15](https://github.com/claudekit/claudekit-engineer/commit/c067f150971c77790eba1a3127051244a1e5776b)), closes [#309](https://github.com/claudekit/claudekit-engineer/issues/309)
* **skills:** `claude-code` skiill deprecated, use `claude-code-guide` subagent instead ([d5aa797](https://github.com/claudekit/claudekit-engineer/commit/d5aa7973258c71064cb9de1641c986a8dafb67af))
* **skills:** improve install.ps1 package manager validation ([61b2fc2](https://github.com/claudekit/claudekit-engineer/commit/61b2fc249bc1c1c3298526f9b4f8840686fc264b))
* **statusline:** add 3-level responsive layout for narrow terminals ([75c23c8](https://github.com/claudekit/claudekit-engineer/commit/75c23c89d34b12a96e87d6f22c37049220ed9b68))
* **statusline:** collapse agents BEFORE slicing to preserve type variety ([286e25e](https://github.com/claudekit/claudekit-engineer/commit/286e25ea8b67b237159ef0099445b42b5b916ddd))
* **statusline:** harden edge case handling ([a1bf687](https://github.com/claudekit/claudekit-engineer/commit/a1bf6876e1c62041d9d8f436abc9ed378303ecda))
* **statusline:** improve UI with detailed agents/todos, remove tools display ([6eefd4c](https://github.com/claudekit/claudekit-engineer/commit/6eefd4c58cdab25e52ac578e28d56e2651e61e94))
* **statusline:** include plan in narrow layout mode ([8d41db9](https://github.com/claudekit/claudekit-engineer/commit/8d41db9b52dbbaa17c59d98a1e5987645907859d))
* **statusline:** merge session+stats when they fit together ([e59c860](https://github.com/claudekit/claudekit-engineer/commit/e59c86097eb457400a17bd84c28aeeecb59cfbcd))
* **statusline:** read activePlan from session temp file ([4ac5459](https://github.com/claudekit/claudekit-engineer/commit/4ac5459f6e264d4e8f2e0113ea24c6f952eb1c34))
* **statusline:** remove agent type truncation for better readability ([9cda0ed](https://github.com/claudekit/claudekit-engineer/commit/9cda0ed7196af513c0b917a3830bf995d0c1fde2))
* **statusline:** show full model name without truncation ([e693875](https://github.com/claudekit/claudekit-engineer/commit/e6938757a2cf73f5ba73c297c15e76c7bc0323f2))
* use relative paths for skills to support project-scope installs ([dfd220a](https://github.com/claudekit/claudekit-engineer/commit/dfd220af8449b360128927ae3ffcc34009dd38c2)), closes [#311](https://github.com/claudekit/claudekit-engineer/issues/311)


### 📚 Documentation

* **git-commands:** improve commit and merge instructions ([abc37f4](https://github.com/claudekit/claudekit-engineer/commit/abc37f43debdfbdd8a8bf7d74991ad01f766ec09))
* **skill-commands:** replace claude-code skill with claude-code-guide subagent ([a7d9ea2](https://github.com/claudekit/claudekit-engineer/commit/a7d9ea227d72f7c5cb2331fcf065b6a0a25ebbee))
* **skill:** enhance claude-code skill documentation with SDK and built-in tools ([3950d7a](https://github.com/claudekit/claudekit-engineer/commit/3950d7ab93e0494ac6e21c3dcae6d6f4071c8e80))
* **skill:** update planning skill with minor additions ([b5b5b60](https://github.com/claudekit/claudekit-engineer/commit/b5b5b60bd979b3b4a886e7f7711ee4334f50e245))


### ♻️ Code Refactoring

* **ck-help:** generalize intent validation with pattern-based heuristics ([2f23b74](https://github.com/claudekit/claudekit-engineer/commit/2f23b74a2c4fe3134a5ea0682fce930bd9fab432))
* **hooks:** extract shared library modules for reusability ([bfe75ea](https://github.com/claudekit/claudekit-engineer/commit/bfe75eaba958f5a7bed70901d4cb42f2354a64b2))
* **hooks:** migrate to shared library modules and reduce duplication ([d828cac](https://github.com/claudekit/claudekit-engineer/commit/d828cacc17daaa91fc660bcbbaa880af4fe45031))
* **scripts:** move generate-opencode.py and generate_catalogs.py to root scripts ([bcca1b1](https://github.com/claudekit/claudekit-engineer/commit/bcca1b124345c7c2aab4fc062014f1f38de19abf))


### ✅ Tests

* **ck-help:** add comprehensive test suite with 57 test cases ([b5794d0](https://github.com/claudekit/claudekit-engineer/commit/b5794d03ac9da3e3c6796dc85266931e6f503ac1)), closes [#299](https://github.com/claudekit/claudekit-engineer/issues/299)
* **edge-cases:** add comprehensive test suites for PR [#304](https://github.com/claudekit/claudekit-engineer/issues/304) ([080b206](https://github.com/claudekit/claudekit-engineer/commit/080b206983498e87c9848e32908e712a8940c1d5))
* **hooks:** add comprehensive tests for path resolution and utilities ([c1258f9](https://github.com/claudekit/claudekit-engineer/commit/c1258f9310393dada45f1ab55bcd27e02ce3995d)), closes [#327](https://github.com/claudekit/claudekit-engineer/issues/327)
* **hooks:** add comprehensive tests for path resolution and utilities ([8dcd272](https://github.com/claudekit/claudekit-engineer/commit/8dcd27253f560fa47aaf9905612434617aa66dc0)), closes [#327](https://github.com/claudekit/claudekit-engineer/issues/327)
* **statusline:** add comprehensive test plan coverage ([a323dfd](https://github.com/claudekit/claudekit-engineer/commit/a323dfdb9e2e49fa5fbecbbfb33952c77ede86ae)), closes [#302](https://github.com/claudekit/claudekit-engineer/issues/302)


### 👷 CI

* **release:** add Python setup for OpenCode generation ([63e1c29](https://github.com/claudekit/claudekit-engineer/commit/63e1c29b794b1928a697f69853899f6d083477bd))

## [2.3.0-beta.19](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.18...v2.3.0-beta.19) (2026-01-11)


### 🐞 Bug Fixes

* **hooks:** resolve plan paths correctly in brownfield projects ([#335](https://github.com/claudekit/claudekit-engineer/issues/335)) ([f154534](https://github.com/claudekit/claudekit-engineer/commit/f154534c47bc84f7d2870a5b2c4b1fd080c46762))

## [2.3.0-beta.18](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.17...v2.3.0-beta.18) (2026-01-11)


### 🚀 Features

* **skills:** add PreferPackageManager parameter to install.ps1 ([4fda946](https://github.com/claudekit/claudekit-engineer/commit/4fda9464c51ace0027eab526958b6763d5a7bf39)), closes [#303](https://github.com/claudekit/claudekit-engineer/issues/303)


### 🐞 Bug Fixes

* **skills:** improve install.ps1 package manager validation ([61b2fc2](https://github.com/claudekit/claudekit-engineer/commit/61b2fc249bc1c1c3298526f9b4f8840686fc264b))

## [2.3.0-beta.17](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.16...v2.3.0-beta.17) (2026-01-11)


### 🐞 Bug Fixes

* Alpine Linux sudo cannot find pkg_update/pkg_install functions ([428282e](https://github.com/claudekit/claudekit-engineer/commit/428282e1ff6525a15fd7ac7c922c1a5fac3586af)), closes [claudekit/claudekit-engineer#331](https://github.com/claudekit/claudekit-engineer/issues/331)

## [2.3.0-beta.16](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.15...v2.3.0-beta.16) (2026-01-11)


### 🐞 Bug Fixes

* **claude:** add fixing skills rule ([f4f44b5](https://github.com/claudekit/claudekit-engineer/commit/f4f44b5b946e927052ccf5fdd6f9618944b8553a))
* **hooks:** propagate plan context to subagents ([a5b1a9e](https://github.com/claudekit/claudekit-engineer/commit/a5b1a9ee816dbc9ee7d87778fb539932f4011dc4)), closes [#321](https://github.com/claudekit/claudekit-engineer/issues/321)
* **hooks:** propagate plan context to subagents ([45eadde](https://github.com/claudekit/claudekit-engineer/commit/45eaddeb54c6de4aca4b93d5decf8abff58d8f4a)), closes [#321](https://github.com/claudekit/claudekit-engineer/issues/321)
* **hooks:** use CWD for path resolution instead of git root ([#327](https://github.com/claudekit/claudekit-engineer/issues/327)) ([1b27cac](https://github.com/claudekit/claudekit-engineer/commit/1b27cac35b3ec725ea40d835a1d6ad1ca9ae19c3))
* remove broken refs after context-tracker cleanup ([a5b6228](https://github.com/claudekit/claudekit-engineer/commit/a5b62287113bbe06e0932db1f18d3423378ce48b))
* remove broken refs after context-tracker cleanup ([4cc0065](https://github.com/claudekit/claudekit-engineer/commit/4cc00650a3ac89149475b65a90b9a5807b6d9a81))


### ✅ Tests

* **hooks:** add comprehensive tests for path resolution and utilities ([c1258f9](https://github.com/claudekit/claudekit-engineer/commit/c1258f9310393dada45f1ab55bcd27e02ce3995d)), closes [#327](https://github.com/claudekit/claudekit-engineer/issues/327)

## [2.3.0-beta.15](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.14...v2.3.0-beta.15) (2026-01-11)


### 🐞 Bug Fixes

* **hooks:** use CWD for path resolution instead of git root ([#327](https://github.com/claudekit/claudekit-engineer/issues/327)) ([f121f34](https://github.com/claudekit/claudekit-engineer/commit/f121f348d406d8c72067ab9316e5e025f81394d7))


### ✅ Tests

* **hooks:** add comprehensive tests for path resolution and utilities ([8dcd272](https://github.com/claudekit/claudekit-engineer/commit/8dcd27253f560fa47aaf9905612434617aa66dc0)), closes [#327](https://github.com/claudekit/claudekit-engineer/issues/327)

## [2.3.0-beta.14](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.13...v2.3.0-beta.14) (2026-01-11)


### 🚀 Features

* **opencode:** add flattened commands for OpenCode compatibility ([f3e3da4](https://github.com/claudekit/claudekit-engineer/commit/f3e3da48c0f31ae45db9cfb2814a259df68e8b32))
* **opencode:** add plugin generation with shared libraries and test suite ([03df0ea](https://github.com/claudekit/claudekit-engineer/commit/03df0ea8c77e36bb6d465b26c5d88d83f29164ed))
* **release:** add OpenCode support to release scripts ([587c316](https://github.com/claudekit/claudekit-engineer/commit/587c3165efeedc150ea559efae714ba72248a01a))
* **scripts:** add OpenCode configuration generator ([74a998e](https://github.com/claudekit/claudekit-engineer/commit/74a998ecc0d77dca8c8d9da14d37a4de53cc3b31))


### 📚 Documentation

* **skill:** update planning skill with minor additions ([b5b5b60](https://github.com/claudekit/claudekit-engineer/commit/b5b5b60bd979b3b4a886e7f7711ee4334f50e245))


### ♻️ Code Refactoring

* **hooks:** extract shared library modules for reusability ([bfe75ea](https://github.com/claudekit/claudekit-engineer/commit/bfe75eaba958f5a7bed70901d4cb42f2354a64b2))
* **hooks:** migrate to shared library modules and reduce duplication ([d828cac](https://github.com/claudekit/claudekit-engineer/commit/d828cacc17daaa91fc660bcbbaa880af4fe45031))
* **scripts:** move generate-opencode.py and generate_catalogs.py to root scripts ([bcca1b1](https://github.com/claudekit/claudekit-engineer/commit/bcca1b124345c7c2aab4fc062014f1f38de19abf))


### 👷 CI

* **release:** add Python setup for OpenCode generation ([63e1c29](https://github.com/claudekit/claudekit-engineer/commit/63e1c29b794b1928a697f69853899f6d083477bd))

## [2.3.0-beta.13](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.12...v2.3.0-beta.13) (2026-01-11)


### 🐞 Bug Fixes

* remove broken refs after context-tracker cleanup ([cf6e177](https://github.com/claudekit/claudekit-engineer/commit/cf6e1776f616ce926ae83f5bf8a35718b36d719e))

## [2.3.0-beta.12](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.11...v2.3.0-beta.12) (2026-01-11)


### 🐞 Bug Fixes

* **hooks:** propagate plan context to subagents ([41f2fba](https://github.com/claudekit/claudekit-engineer/commit/41f2fba5fddc4b1b2339a59835da4594b28e1e63)), closes [#321](https://github.com/claudekit/claudekit-engineer/issues/321)


### 📚 Documentation

* **git-commands:** improve commit and merge instructions ([abc37f4](https://github.com/claudekit/claudekit-engineer/commit/abc37f43debdfbdd8a8bf7d74991ad01f766ec09))
* **skill-commands:** replace claude-code skill with claude-code-guide subagent ([a7d9ea2](https://github.com/claudekit/claudekit-engineer/commit/a7d9ea227d72f7c5cb2331fcf065b6a0a25ebbee))

## [2.3.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.10...v2.3.0-beta.11) (2026-01-08)


### 🐞 Bug Fixes

* **docs:** sync /docs:init structure with /docs:update ([445b9f2](https://github.com/claudekit/claudekit-engineer/commit/445b9f2b5f258ae8766ff44476d61b47179ba003)), closes [#317](https://github.com/claudekit/claudekit-engineer/issues/317)

## [2.3.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.9...v2.3.0-beta.10) (2026-01-08)


### 🐞 Bug Fixes

* **brainstorm:** remove incorrect Skill tool reference ([#315](https://github.com/claudekit/claudekit-engineer/issues/315)) ([4bf7ccf](https://github.com/claudekit/claudekit-engineer/commit/4bf7ccf083a6b23c5601b19da7a3089a4b823cfc))

## [2.3.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.8...v2.3.0-beta.9) (2026-01-08)


### 🐞 Bug Fixes

* **command:** `/code:auto` should finish all phases and verify implementation at the end ([58b4587](https://github.com/claudekit/claudekit-engineer/commit/58b4587854db68cc2de2ebfadabdd93ed8251f99))
* **skills:** `claude-code` skiill deprecated, use `claude-code-guide` subagent instead ([d5aa797](https://github.com/claudekit/claudekit-engineer/commit/d5aa7973258c71064cb9de1641c986a8dafb67af))


### 📚 Documentation

* **skill:** enhance claude-code skill documentation with SDK and built-in tools ([3950d7a](https://github.com/claudekit/claudekit-engineer/commit/3950d7ab93e0494ac6e21c3dcae6d6f4071c8e80))

## [2.3.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.7...v2.3.0-beta.8) (2026-01-08)


### 🐞 Bug Fixes

* use relative paths for skills to support project-scope installs ([dfd220a](https://github.com/claudekit/claudekit-engineer/commit/dfd220af8449b360128927ae3ffcc34009dd38c2)), closes [#311](https://github.com/claudekit/claudekit-engineer/issues/311)

## [2.3.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.6...v2.3.0-beta.7) (2026-01-07)


### 🐞 Bug Fixes

* rename hook .js files to .cjs for CommonJS compatibility ([c067f15](https://github.com/claudekit/claudekit-engineer/commit/c067f150971c77790eba1a3127051244a1e5776b)), closes [#309](https://github.com/claudekit/claudekit-engineer/issues/309)

## [2.3.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.5...v2.3.0-beta.6) (2026-01-07)


### 🚀 Features

* **worktree:** auto-env templates + AI-guided dependency install ([#307](https://github.com/claudekit/claudekit-engineer/issues/307)) ([b8d34c5](https://github.com/claudekit/claudekit-engineer/commit/b8d34c54ef46872748155bbf096828d6be30cf32))

## [2.3.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.4...v2.3.0-beta.5) (2026-01-06)


### 🚀 Features

* **statusline:** add git staged/ahead and active plan indicators ([daeb5f1](https://github.com/claudekit/claudekit-engineer/commit/daeb5f1b7d91a05a81185855aa05b9a7c2063de7))
* **statusline:** collapse duplicate agents + fix edge cases ([30c2490](https://github.com/claudekit/claudekit-engineer/commit/30c24902247388149aff434dbec2f6b0d3393f81))
* **statusline:** refine visual presentation with compact agent flow ([d9ccf7b](https://github.com/claudekit/claudekit-engineer/commit/d9ccf7bdcc38266698da15797909d299dd337c12))
* **statusline:** show last 3 completed agents for better flow context ([f2a02ec](https://github.com/claudekit/claudekit-engineer/commit/f2a02eca2878e230b670c6823c48cb2a7050c25e))
* **statusline:** show last completed agent's description when no running agent ([967b8ff](https://github.com/claudekit/claudekit-engineer/commit/967b8ffcaaa93f1e86cfaa142dde9f94d59e560e))


### 🐞 Bug Fixes

* **statusline:** collapse agents BEFORE slicing to preserve type variety ([286e25e](https://github.com/claudekit/claudekit-engineer/commit/286e25ea8b67b237159ef0099445b42b5b916ddd))
* **statusline:** include plan in narrow layout mode ([8d41db9](https://github.com/claudekit/claudekit-engineer/commit/8d41db9b52dbbaa17c59d98a1e5987645907859d))
* **statusline:** read activePlan from session temp file ([4ac5459](https://github.com/claudekit/claudekit-engineer/commit/4ac5459f6e264d4e8f2e0113ea24c6f952eb1c34))
* **statusline:** remove agent type truncation for better readability ([9cda0ed](https://github.com/claudekit/claudekit-engineer/commit/9cda0ed7196af513c0b917a3830bf995d0c1fde2))

## [2.3.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.3...v2.3.0-beta.4) (2026-01-06)


### 🐞 Bug Fixes

* **chrome-devtools:** add process.exit(1) to error handlers ([966048a](https://github.com/claudekit/claudekit-engineer/commit/966048a7e94113f8719770135643aaba5ecbac4c))
* **context-engineering:** add UTF-8 encoding and error handling ([9947138](https://github.com/claudekit/claudekit-engineer/commit/9947138d15f0270e64ec84d02eafa1023c3fd8ca))


### ✅ Tests

* **edge-cases:** add comprehensive test suites for PR [#304](https://github.com/claudekit/claudekit-engineer/issues/304) ([080b206](https://github.com/claudekit/claudekit-engineer/commit/080b206983498e87c9848e32908e712a8940c1d5))

## [2.3.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.2...v2.3.0-beta.3) (2026-01-06)


### 🐞 Bug Fixes

* **statusline:** show full model name without truncation ([e693875](https://github.com/claudekit/claudekit-engineer/commit/e6938757a2cf73f5ba73c297c15e76c7bc0323f2))

## [2.3.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.3.0-beta.1...v2.3.0-beta.2) (2026-01-06)


### 🚀 Features

* **statusline:** add responsive width-based line wrapping ([c0f70ac](https://github.com/claudekit/claudekit-engineer/commit/c0f70ac2f99183eda66c2b716d6fb18d30775e6f))
* **statusline:** enhance with ANSI colors, transcript parsing, multi-line output ([1783f26](https://github.com/claudekit/claudekit-engineer/commit/1783f2619fbb7c2178b7d9e2edada279341b0bcb))


### 🐞 Bug Fixes

* **statusline:** add 3-level responsive layout for narrow terminals ([75c23c8](https://github.com/claudekit/claudekit-engineer/commit/75c23c89d34b12a96e87d6f22c37049220ed9b68))
* **statusline:** harden edge case handling ([a1bf687](https://github.com/claudekit/claudekit-engineer/commit/a1bf6876e1c62041d9d8f436abc9ed378303ecda))
* **statusline:** improve UI with detailed agents/todos, remove tools display ([6eefd4c](https://github.com/claudekit/claudekit-engineer/commit/6eefd4c58cdab25e52ac578e28d56e2651e61e94))
* **statusline:** merge session+stats when they fit together ([e59c860](https://github.com/claudekit/claudekit-engineer/commit/e59c86097eb457400a17bd84c28aeeecb59cfbcd))


### ✅ Tests

* **statusline:** add comprehensive test plan coverage ([a323dfd](https://github.com/claudekit/claudekit-engineer/commit/a323dfdb9e2e49fa5fbecbbfb33952c77ede86ae)), closes [#302](https://github.com/claudekit/claudekit-engineer/issues/302)

## [2.3.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0...v2.3.0-beta.1) (2026-01-05)


### 🚀 Features

* **ck-help:** add fuzzy matching, synonyms, and disambiguation ([255a211](https://github.com/claudekit/claudekit-engineer/commit/255a2115516581bb890e3218e7ab65174b867d55))
* **ck-help:** improve intent detection with positional weighting ([310cfe8](https://github.com/claudekit/claudekit-engineer/commit/310cfe8ecca9bb4eb463ce3974f1041b6339bcbf)), closes [#299](https://github.com/claudekit/claudekit-engineer/issues/299)


### 🐞 Bug Fixes

* **ck-help:** add action verb detection for imperative sentences ([105a258](https://github.com/claudekit/claudekit-engineer/commit/105a2580f93a12e1acc769e72e57fbb0b2b744ea))
* **ck-help:** add service-specific compound phrases for notifications ([40e930c](https://github.com/claudekit/claudekit-engineer/commit/40e930cd4f674b7c44cf83ea1a7133b1433273ce))


### ♻️ Code Refactoring

* **ck-help:** generalize intent validation with pattern-based heuristics ([2f23b74](https://github.com/claudekit/claudekit-engineer/commit/2f23b74a2c4fe3134a5ea0682fce930bd9fab432))


### ✅ Tests

* **ck-help:** add comprehensive test suite with 57 test cases ([b5794d0](https://github.com/claudekit/claudekit-engineer/commit/b5794d03ac9da3e3c6796dc85266931e6f503ac1)), closes [#299](https://github.com/claudekit/claudekit-engineer/issues/299)

## [2.2.0](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0...v2.2.0) (2026-01-05)


### 🚀 Features

* add Alpine Linux support to install.sh ([319de45](https://github.com/claudekit/claudekit-engineer/commit/319de45f225ceb209cdc8404a39b2a2cdeb20d37)), closes [#290](https://github.com/claudekit/claudekit-engineer/issues/290)
* add Arch Linux and Windows/WSL detection ([5fec573](https://github.com/claudekit/claudekit-engineer/commit/5fec57369239408529bfa6e2481649816bbd5e95))
* **agents:** add accuracy protocol and proactive size management to docs-manager ([0a0a25c](https://github.com/claudekit/claudekit-engineer/commit/0a0a25c2cde060daba7aeee1dbfcad62d4561414)), closes [#264](https://github.com/claudekit/claudekit-engineer/issues/264)
* **ck-help:** add 6 missing category workflow guides ([cb8362e](https://github.com/claudekit/claudekit-engineer/commit/cb8362ef5652712969e9f4257014207de9b14e2c))
* **ck-help:** add tips for preview and parallel commands ([ddf4b14](https://github.com/claudekit/claudekit-engineer/commit/ddf4b14b4b56e35f23fb0c31af3a8ee8728ccb79))
* **code:** add interactive code review cycle with user confirmation ([69690cc](https://github.com/claudekit/claudekit-engineer/commit/69690ccf7c44dc1a24da9b160e55139bff43e485)), closes [#273](https://github.com/claudekit/claudekit-engineer/issues/273)
* **commands:** add /review:codebase:parallel slash command ([ad09be3](https://github.com/claudekit/claudekit-engineer/commit/ad09be35106cf5d40f61a875b7b08cbaa4db7f44)), closes [#262](https://github.com/claudekit/claudekit-engineer/issues/262)
* **docs:** add size limits, parallel reading, and validation for /docs:* commands ([d0c65d2](https://github.com/claudekit/claudekit-engineer/commit/d0c65d26390d75648a677eff90fdd42fe5377e5d)), closes [#264](https://github.com/claudekit/claudekit-engineer/issues/264)
* **hooks:** add AskUserQuestion JSON marker to privacy-block ([ff1ade8](https://github.com/claudekit/claudekit-engineer/commit/ff1ade8226b4fd14f9d5788a1d4a11096e03d2c9)), closes [#279](https://github.com/claudekit/claudekit-engineer/issues/279)
* **hooks:** add session context info to dev-rules-reminder ([220a602](https://github.com/claudekit/claudekit-engineer/commit/220a6027cce24d101b53b0d1449ebddafeffc96b))
* **hooks:** add subagent resource management reminders ([62258ee](https://github.com/claudekit/claudekit-engineer/commit/62258eece45a2d40cdb63d7c14465084872341d8))
* **release:** add git timestamps to release manifest ([96b2e6e](https://github.com/claudekit/claudekit-engineer/commit/96b2e6e341bc0e10a61c52098b9053a9a99300af))
* **skill:** add context-engineering skill ([8db3dfa](https://github.com/claudekit/claudekit-engineer/commit/8db3dfa83d7f1aedc5edb3b570c7a1c205d3f01e))
* **skill:** add mermaidjs-v11 diagram generation skill ([36ba714](https://github.com/claudekit/claudekit-engineer/commit/36ba714cc6d99920ff1c263f92a0392f0867bec1))
* **skill:** add WebSocket debugging scripts to chrome-devtools ([0dfc628](https://github.com/claudekit/claudekit-engineer/commit/0dfc6283186e5df8b5fe1b37e37c8f35cf42b27c))
* **skill:** improve markdown-novel-viewer with mermaid support and XSS protection ([1a1272e](https://github.com/claudekit/claudekit-engineer/commit/1a1272ee3b0cb5b45e422006b29ead8c08afb07e))


### 🐞 Bug Fixes

* **#288:** add Windows UTF-8 encoding support across skill scripts ([a9b66d1](https://github.com/claudekit/claudekit-engineer/commit/a9b66d19fcc2a958914129c15dfc5d3492b49a97)), closes [#288](https://github.com/claudekit/claudekit-engineer/issues/288) [#288](https://github.com/claudekit/claudekit-engineer/issues/288)
* **chrome-devtools:** add process.exit(0) for clean script termination ([7cea5a6](https://github.com/claudekit/claudekit-engineer/commit/7cea5a6e722376039b291c94d4a3eea2e251afba))
* **ck-help:** improve intent detection and add workflow guidance ([669d235](https://github.com/claudekit/claudekit-engineer/commit/669d235f826aa5cd928db8b6eade208290e6873e))
* **command:** add merge step to git:pr workflow ([3e34833](https://github.com/claudekit/claudekit-engineer/commit/3e348339a45c7cbe17277a2ddab43930bcc59aaf))
* **commands:** update scout subagent spawning logic ([bd9f3af](https://github.com/claudekit/claudekit-engineer/commit/bd9f3af4b50dfa6f6434a7419207dce924ac3598))
* correct shebang/executable permissions in .claude folder ([53acbfd](https://github.com/claudekit/claudekit-engineer/commit/53acbfd081e34561099faa85e5ae6a58c9c853d4)), closes [#268](https://github.com/claudekit/claudekit-engineer/issues/268)
* ensure plans from /brainstorm have YAML frontmatter with status ([2b74e15](https://github.com/claudekit/claudekit-engineer/commit/2b74e15664dc19eec6eecc820b72a339a1f7ba2d)), closes [#260](https://github.com/claudekit/claudekit-engineer/issues/260)
* **env:** add context7 api key to .env.example ([7655a99](https://github.com/claudekit/claudekit-engineer/commit/7655a99b41fa33ee0b4094badfcd24b77d81edc1))
* **hooks:** add approval state warning on context compact ([6ef7bd3](https://github.com/claudekit/claudekit-engineer/commit/6ef7bd3f4aea8899164b6c2df1f7a146e775e7bc)), closes [#277](https://github.com/claudekit/claudekit-engineer/issues/277)
* **hooks:** allow bash commands for .env after AskUserQuestion approval ([71cb74b](https://github.com/claudekit/claudekit-engineer/commit/71cb74b16b0f594fcc9c8fdc561a5c467e92b1bd))
* **hooks:** allow venv executable paths in scout-block ([8bbc5b2](https://github.com/claudekit/claudekit-engineer/commit/8bbc5b2cba20f4b3207e83915ce284a56b7d3bb1)), closes [#265](https://github.com/claudekit/claudekit-engineer/issues/265)
* **hooks:** allow venv executable paths in scout-block ([9bfbfb8](https://github.com/claudekit/claudekit-engineer/commit/9bfbfb86bd34b14ac98e85235adc910647ed86a2)), closes [#265](https://github.com/claudekit/claudekit-engineer/issues/265)
* **hooks:** comprehensive edge case handling and monorepo support ([#291](https://github.com/claudekit/claudekit-engineer/issues/291)) ([7991230](https://github.com/claudekit/claudekit-engineer/commit/7991230acd4049d7019fff5b07b300fb11b48bb8))
* **hooks:** use absolute paths based on git root ([#291](https://github.com/claudekit/claudekit-engineer/issues/291)) ([14e8977](https://github.com/claudekit/claudekit-engineer/commit/14e8977790ff75c8246efe2aa0bd1b40733c6b6d))
* **notifications:** deprecate jq-based bash scripts, add ck-help guide ([58aa509](https://github.com/claudekit/claudekit-engineer/commit/58aa509b4e30b069db6f8e7b14abbbbbca5ffed2)), closes [#297](https://github.com/claudekit/claudekit-engineer/issues/297)
* **release:** harden manifest scripts for edge cases ([08dfc61](https://github.com/claudekit/claudekit-engineer/commit/08dfc618659ca49db8833565f32a17bf3cd66edd))


### 📚 Documentation

* **skill:** add Context7 API key URL to env example ([1ef523f](https://github.com/claudekit/claudekit-engineer/commit/1ef523f5e67d4ec9aba858f813b83a7c8a608d46))
* update documentation and agent descriptions ([0fbe288](https://github.com/claudekit/claudekit-engineer/commit/0fbe28849ce05143e563a7205e634504d2e769d3))
* **workflow:** clarify docs-seeker and debugging skill usage ([db960f3](https://github.com/claudekit/claudekit-engineer/commit/db960f3089b023264af6131dd6ca2b410338f1e8))


### ♻️ Code Refactoring

* **chrome-devtools:** remove unnecessary cd, use full paths ([7046363](https://github.com/claudekit/claudekit-engineer/commit/704636347ffa6f59daaaed4d882978463c77bda3)), closes [#275](https://github.com/claudekit/claudekit-engineer/issues/275)
* **code:** merge review+approval steps, optimize no-test UX ([392b5e3](https://github.com/claudekit/claudekit-engineer/commit/392b5e32e288596601d9b6761f9ee6b784dcb90e))
* **docs:** remove split script, use LLM-driven splitting guidelines ([c61fea0](https://github.com/claudekit/claudekit-engineer/commit/c61fea0483524df8c6f113498a1a6b51be5e3fdd)), closes [#264](https://github.com/claudekit/claudekit-engineer/issues/264)
* remove auto-push and phase-based commits from /code workflows ([cbfcc0a](https://github.com/claudekit/claudekit-engineer/commit/cbfcc0a759b844cd67ee4437f81a36911d13f2c5)), closes [#283](https://github.com/claudekit/claudekit-engineer/issues/283)


### ✅ Tests

* **#291:** add comprehensive edge case tests for git root resolution ([c78b111](https://github.com/claudekit/claudekit-engineer/commit/c78b111b01340ec9dea1ca0f6d981b2b873cc557)), closes [#291](https://github.com/claudekit/claudekit-engineer/issues/291)
* **ck-help:** add comprehensive test suite with 19 tests ([2d6ac6a](https://github.com/claudekit/claudekit-engineer/commit/2d6ac6a1e47ba91d9126bfc2e3a05896fa24538a))
* **hooks:** add comprehensive test suite for privacy-block ([2d88049](https://github.com/claudekit/claudekit-engineer/commit/2d880494e5e1ad2f84752a5d57a162ffef2b50c7))
* **hooks:** add comprehensive tests for session-init compact mitigation ([0335b38](https://github.com/claudekit/claudekit-engineer/commit/0335b385c1bae1bed5aedc4f71289973befd33d6)), closes [#277](https://github.com/claudekit/claudekit-engineer/issues/277)

## [2.2.0-beta.19](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.18...v2.2.0-beta.19) (2026-01-05)


### 🐞 Bug Fixes

* **notifications:** deprecate jq-based bash scripts, add ck-help guide ([58aa509](https://github.com/claudekit/claudekit-engineer/commit/58aa509b4e30b069db6f8e7b14abbbbbca5ffed2)), closes [#297](https://github.com/claudekit/claudekit-engineer/issues/297)

## [2.2.0-beta.18](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.17...v2.2.0-beta.18) (2026-01-03)


### 🐞 Bug Fixes

* **#288:** add Windows UTF-8 encoding support across skill scripts ([a9b66d1](https://github.com/claudekit/claudekit-engineer/commit/a9b66d19fcc2a958914129c15dfc5d3492b49a97)), closes [#288](https://github.com/claudekit/claudekit-engineer/issues/288) [#288](https://github.com/claudekit/claudekit-engineer/issues/288)

## [2.2.0-beta.17](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.16...v2.2.0-beta.17) (2026-01-03)


### 🚀 Features

* add Alpine Linux support to install.sh ([319de45](https://github.com/claudekit/claudekit-engineer/commit/319de45f225ceb209cdc8404a39b2a2cdeb20d37)), closes [#290](https://github.com/claudekit/claudekit-engineer/issues/290)
* add Arch Linux and Windows/WSL detection ([5fec573](https://github.com/claudekit/claudekit-engineer/commit/5fec57369239408529bfa6e2481649816bbd5e95))

## [2.2.0-beta.16](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.15...v2.2.0-beta.16) (2026-01-03)


### 🐞 Bug Fixes

* **hooks:** comprehensive edge case handling and monorepo support ([#291](https://github.com/claudekit/claudekit-engineer/issues/291)) ([7991230](https://github.com/claudekit/claudekit-engineer/commit/7991230acd4049d7019fff5b07b300fb11b48bb8))
* **hooks:** use absolute paths based on git root ([#291](https://github.com/claudekit/claudekit-engineer/issues/291)) ([14e8977](https://github.com/claudekit/claudekit-engineer/commit/14e8977790ff75c8246efe2aa0bd1b40733c6b6d))


### ✅ Tests

* **#291:** add comprehensive edge case tests for git root resolution ([c78b111](https://github.com/claudekit/claudekit-engineer/commit/c78b111b01340ec9dea1ca0f6d981b2b873cc557)), closes [#291](https://github.com/claudekit/claudekit-engineer/issues/291)

## [2.2.0-beta.15](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.14...v2.2.0-beta.15) (2026-01-03)


### 🚀 Features

* **agents:** add accuracy protocol and proactive size management to docs-manager ([0a0a25c](https://github.com/claudekit/claudekit-engineer/commit/0a0a25c2cde060daba7aeee1dbfcad62d4561414)), closes [#264](https://github.com/claudekit/claudekit-engineer/issues/264)
* **docs:** add size limits, parallel reading, and validation for /docs:* commands ([d0c65d2](https://github.com/claudekit/claudekit-engineer/commit/d0c65d26390d75648a677eff90fdd42fe5377e5d)), closes [#264](https://github.com/claudekit/claudekit-engineer/issues/264)


### ♻️ Code Refactoring

* **docs:** remove split script, use LLM-driven splitting guidelines ([c61fea0](https://github.com/claudekit/claudekit-engineer/commit/c61fea0483524df8c6f113498a1a6b51be5e3fdd)), closes [#264](https://github.com/claudekit/claudekit-engineer/issues/264)

## [2.2.0-beta.14](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.13...v2.2.0-beta.14) (2025-12-31)


### ♻️ Code Refactoring

* remove auto-push and phase-based commits from /code workflows ([cbfcc0a](https://github.com/claudekit/claudekit-engineer/commit/cbfcc0a759b844cd67ee4437f81a36911d13f2c5)), closes [#283](https://github.com/claudekit/claudekit-engineer/issues/283)

## [2.2.0-beta.13](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.12...v2.2.0-beta.13) (2025-12-31)


### 🚀 Features

* **release:** add git timestamps to release manifest ([96b2e6e](https://github.com/claudekit/claudekit-engineer/commit/96b2e6e341bc0e10a61c52098b9053a9a99300af))


### 🐞 Bug Fixes

* **release:** harden manifest scripts for edge cases ([08dfc61](https://github.com/claudekit/claudekit-engineer/commit/08dfc618659ca49db8833565f32a17bf3cd66edd))


### ✅ Tests

* **hooks:** add comprehensive tests for session-init compact mitigation ([0335b38](https://github.com/claudekit/claudekit-engineer/commit/0335b385c1bae1bed5aedc4f71289973befd33d6)), closes [#277](https://github.com/claudekit/claudekit-engineer/issues/277)

## [2.2.0-beta.12](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.11...v2.2.0-beta.12) (2025-12-31)


### 🚀 Features

* **hooks:** add AskUserQuestion JSON marker to privacy-block ([ff1ade8](https://github.com/claudekit/claudekit-engineer/commit/ff1ade8226b4fd14f9d5788a1d4a11096e03d2c9)), closes [#279](https://github.com/claudekit/claudekit-engineer/issues/279)


### 🐞 Bug Fixes

* **hooks:** allow bash commands for .env after AskUserQuestion approval ([71cb74b](https://github.com/claudekit/claudekit-engineer/commit/71cb74b16b0f594fcc9c8fdc561a5c467e92b1bd))


### ✅ Tests

* **hooks:** add comprehensive test suite for privacy-block ([2d88049](https://github.com/claudekit/claudekit-engineer/commit/2d880494e5e1ad2f84752a5d57a162ffef2b50c7))

## [2.2.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.10...v2.2.0-beta.11) (2025-12-30)


### 🐞 Bug Fixes

* **hooks:** add approval state warning on context compact ([6ef7bd3](https://github.com/claudekit/claudekit-engineer/commit/6ef7bd3f4aea8899164b6c2df1f7a146e775e7bc)), closes [#277](https://github.com/claudekit/claudekit-engineer/issues/277)

## [2.2.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.9...v2.2.0-beta.10) (2025-12-29)


### 🐞 Bug Fixes

* **chrome-devtools:** add process.exit(0) for clean script termination ([7cea5a6](https://github.com/claudekit/claudekit-engineer/commit/7cea5a6e722376039b291c94d4a3eea2e251afba))


### ♻️ Code Refactoring

* **chrome-devtools:** remove unnecessary cd, use full paths ([7046363](https://github.com/claudekit/claudekit-engineer/commit/704636347ffa6f59daaaed4d882978463c77bda3)), closes [#275](https://github.com/claudekit/claudekit-engineer/issues/275)

## [2.2.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.8...v2.2.0-beta.9) (2025-12-29)


### 🚀 Features

* **code:** add interactive code review cycle with user confirmation ([69690cc](https://github.com/claudekit/claudekit-engineer/commit/69690ccf7c44dc1a24da9b160e55139bff43e485)), closes [#273](https://github.com/claudekit/claudekit-engineer/issues/273)


### ♻️ Code Refactoring

* **code:** merge review+approval steps, optimize no-test UX ([392b5e3](https://github.com/claudekit/claudekit-engineer/commit/392b5e32e288596601d9b6761f9ee6b784dcb90e))

## [2.2.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.7...v2.2.0-beta.8) (2025-12-29)


### 🐞 Bug Fixes

* correct shebang/executable permissions in .claude folder ([53acbfd](https://github.com/claudekit/claudekit-engineer/commit/53acbfd081e34561099faa85e5ae6a58c9c853d4)), closes [#268](https://github.com/claudekit/claudekit-engineer/issues/268)

## [2.2.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.6...v2.2.0-beta.7) (2025-12-29)


### 🚀 Features

* **hooks:** add session context info to dev-rules-reminder ([220a602](https://github.com/claudekit/claudekit-engineer/commit/220a6027cce24d101b53b0d1449ebddafeffc96b))
* **hooks:** add subagent resource management reminders ([62258ee](https://github.com/claudekit/claudekit-engineer/commit/62258eece45a2d40cdb63d7c14465084872341d8))
* **skill:** add context-engineering skill ([8db3dfa](https://github.com/claudekit/claudekit-engineer/commit/8db3dfa83d7f1aedc5edb3b570c7a1c205d3f01e))
* **skill:** add mermaidjs-v11 diagram generation skill ([36ba714](https://github.com/claudekit/claudekit-engineer/commit/36ba714cc6d99920ff1c263f92a0392f0867bec1))

## [2.2.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.5...v2.2.0-beta.6) (2025-12-28)


### 🚀 Features

* **skill:** add WebSocket debugging scripts to chrome-devtools ([0dfc628](https://github.com/claudekit/claudekit-engineer/commit/0dfc6283186e5df8b5fe1b37e37c8f35cf42b27c))


### 🐞 Bug Fixes

* **command:** add merge step to git:pr workflow ([3e34833](https://github.com/claudekit/claudekit-engineer/commit/3e348339a45c7cbe17277a2ddab43930bcc59aaf))
* **commands:** update scout subagent spawning logic ([bd9f3af](https://github.com/claudekit/claudekit-engineer/commit/bd9f3af4b50dfa6f6434a7419207dce924ac3598))
* **env:** add context7 api key to .env.example ([7655a99](https://github.com/claudekit/claudekit-engineer/commit/7655a99b41fa33ee0b4094badfcd24b77d81edc1))
* **hooks:** allow venv executable paths in scout-block ([8bbc5b2](https://github.com/claudekit/claudekit-engineer/commit/8bbc5b2cba20f4b3207e83915ce284a56b7d3bb1)), closes [#265](https://github.com/claudekit/claudekit-engineer/issues/265)


### 📚 Documentation

* **skill:** add Context7 API key URL to env example ([1ef523f](https://github.com/claudekit/claudekit-engineer/commit/1ef523f5e67d4ec9aba858f813b83a7c8a608d46))
* update documentation and agent descriptions ([0fbe288](https://github.com/claudekit/claudekit-engineer/commit/0fbe28849ce05143e563a7205e634504d2e769d3))
* **workflow:** clarify docs-seeker and debugging skill usage ([db960f3](https://github.com/claudekit/claudekit-engineer/commit/db960f3089b023264af6131dd6ca2b410338f1e8))

## [2.2.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.4...v2.2.0-beta.5) (2025-12-28)


### 🐞 Bug Fixes

* **hooks:** allow venv executable paths in scout-block ([9bfbfb8](https://github.com/claudekit/claudekit-engineer/commit/9bfbfb86bd34b14ac98e85235adc910647ed86a2)), closes [#265](https://github.com/claudekit/claudekit-engineer/issues/265)

## [2.2.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.3...v2.2.0-beta.4) (2025-12-27)


### 🚀 Features

* **commands:** add /review:codebase:parallel slash command ([ad09be3](https://github.com/claudekit/claudekit-engineer/commit/ad09be35106cf5d40f61a875b7b08cbaa4db7f44)), closes [#262](https://github.com/claudekit/claudekit-engineer/issues/262)

## [2.2.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.2...v2.2.0-beta.3) (2025-12-26)


### 🐞 Bug Fixes

* ensure plans from /brainstorm have YAML frontmatter with status ([2b74e15](https://github.com/claudekit/claudekit-engineer/commit/2b74e15664dc19eec6eecc820b72a339a1f7ba2d)), closes [#260](https://github.com/claudekit/claudekit-engineer/issues/260)

## [2.2.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.2.0-beta.1...v2.2.0-beta.2) (2025-12-25)


### 🚀 Features

* **ck-help:** add 6 missing category workflow guides ([cb8362e](https://github.com/claudekit/claudekit-engineer/commit/cb8362ef5652712969e9f4257014207de9b14e2c))
* **ck-help:** add tips for preview and parallel commands ([ddf4b14](https://github.com/claudekit/claudekit-engineer/commit/ddf4b14b4b56e35f23fb0c31af3a8ee8728ccb79))


### 🐞 Bug Fixes

* **ck-help:** improve intent detection and add workflow guidance ([669d235](https://github.com/claudekit/claudekit-engineer/commit/669d235f826aa5cd928db8b6eade208290e6873e))


### ✅ Tests

* **ck-help:** add comprehensive test suite with 19 tests ([2d6ac6a](https://github.com/claudekit/claudekit-engineer/commit/2d6ac6a1e47ba91d9126bfc2e3a05896fa24538a))

## [2.2.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0...v2.2.0-beta.1) (2025-12-25)


### 🚀 Features

* **skill:** improve markdown-novel-viewer with mermaid support and XSS protection ([1a1272e](https://github.com/claudekit/claudekit-engineer/commit/1a1272ee3b0cb5b45e422006b29ead8c08afb07e))

## [2.1.0](https://github.com/claudekit/claudekit-engineer/compare/v2.0.0...v2.1.0) (2025-12-25)


### 🚀 Features

* add Gemini API key rotation for rate limit handling ([9a4c3f4](https://github.com/claudekit/claudekit-engineer/commit/9a4c3f448bab5c148ceed068c25dfd128b69a8f7)), closes [#253](https://github.com/claudekit/claudekit-engineer/issues/253)
* run /kanban as Claude Code background task for better visibility ([4d79864](https://github.com/claudekit/claudekit-engineer/commit/4d79864874de1a743811d3d86c74ccbc323f94f0)), closes [#240](https://github.com/claudekit/claudekit-engineer/issues/240)
* **skill:** add ai-artist prompt engineering skill ([374eea1](https://github.com/claudekit/claudekit-engineer/commit/374eea1aa2e82aff79836ab48167856a958dc24b))
* **skill:** add Lyria RealTime music generation reference ([3024a54](https://github.com/claudekit/claudekit-engineer/commit/3024a546eb2e080eeb59fb33ea2a245a6db26b10))


### 🐞 Bug Fixes

* /plan:archive journal creation - correct tool usage and directory path ([c64b24c](https://github.com/claudekit/claudekit-engineer/commit/c64b24c67fdc0c7920f3c801cf879d1a202948fe)), closes [#251](https://github.com/claudekit/claudekit-engineer/issues/251)
* **hooks:** add docker/k8s/terraform to build command allowlist ([fe3a24b](https://github.com/claudekit/claudekit-engineer/commit/fe3a24b81624b908daad4a2224163d01a5e919a7))
* **hooks:** add wrapper scripts and additional build tools to allowlist ([cfef5d1](https://github.com/claudekit/claudekit-engineer/commit/cfef5d17aa7ec0df2816418cbf2987fba7aaafcb))
* **hooks:** allow go/cargo/make/mvn/gradle/dotnet build commands ([b5f8dbd](https://github.com/claudekit/claudekit-engineer/commit/b5f8dbdcd228e3637675f909bf666faedbaef92d))
* install .claude/scripts/requirements.txt and fix scan_commands output ([67f3738](https://github.com/claudekit/claudekit-engineer/commit/67f373808332606861bfdea241abf72c0443b5a6)), closes [#247](https://github.com/claudekit/claudekit-engineer/issues/247)
* navbar now respects sidebar width in markdown viewer ([2985742](https://github.com/claudekit/claudekit-engineer/commit/298574228299c31108b3ce24220b8bae59b92ee8)), closes [#245](https://github.com/claudekit/claudekit-engineer/issues/245)
* **skill:** improve markdown-novel-viewer Windows path handling ([7b30640](https://github.com/claudekit/claudekit-engineer/commit/7b30640eb32c1dc0af8ab44bb882baaa61747f57))
* **skill:** use os.tmpdir() for cross-platform PID file storage ([1105d91](https://github.com/claudekit/claudekit-engineer/commit/1105d9113606df4c263bee2b1aa035dfc554304c))


### ♻️ Code Refactoring

* **skill:** update ai-multimodal to use Nano Banana Flash default ([2399ad1](https://github.com/claudekit/claudekit-engineer/commit/2399ad1558808824ef8667142da21b72cc68d6ab))


### ⚡ Performance Improvements

* **command:** enhance `/brainstorm` command ([1bf26a5](https://github.com/claudekit/claudekit-engineer/commit/1bf26a516a1b60171e12d5ddcfdb32b4b82cc949))

## [2.1.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.9...v2.1.0-beta.10) (2025-12-24)


### 🐞 Bug Fixes

* **hooks:** add wrapper scripts and additional build tools to allowlist ([cfef5d1](https://github.com/claudekit/claudekit-engineer/commit/cfef5d17aa7ec0df2816418cbf2987fba7aaafcb))

## [2.1.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.8...v2.1.0-beta.9) (2025-12-24)


### 🐞 Bug Fixes

* **hooks:** add docker/k8s/terraform to build command allowlist ([fe3a24b](https://github.com/claudekit/claudekit-engineer/commit/fe3a24b81624b908daad4a2224163d01a5e919a7))
* **hooks:** allow go/cargo/make/mvn/gradle/dotnet build commands ([b5f8dbd](https://github.com/claudekit/claudekit-engineer/commit/b5f8dbdcd228e3637675f909bf666faedbaef92d))

## [2.1.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.7...v2.1.0-beta.8) (2025-12-24)


### 🚀 Features

* add Gemini API key rotation for rate limit handling ([9a4c3f4](https://github.com/claudekit/claudekit-engineer/commit/9a4c3f448bab5c148ceed068c25dfd128b69a8f7)), closes [#253](https://github.com/claudekit/claudekit-engineer/issues/253)

## [2.1.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.6...v2.1.0-beta.7) (2025-12-24)


### 🐞 Bug Fixes

* /plan:archive journal creation - correct tool usage and directory path ([c64b24c](https://github.com/claudekit/claudekit-engineer/commit/c64b24c67fdc0c7920f3c801cf879d1a202948fe)), closes [#251](https://github.com/claudekit/claudekit-engineer/issues/251)

## [2.1.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.5...v2.1.0-beta.6) (2025-12-24)


### 🐞 Bug Fixes

* **skill:** use os.tmpdir() for cross-platform PID file storage ([1105d91](https://github.com/claudekit/claudekit-engineer/commit/1105d9113606df4c263bee2b1aa035dfc554304c))

## [2.1.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.4...v2.1.0-beta.5) (2025-12-24)


### 🐞 Bug Fixes

* navbar now respects sidebar width in markdown viewer ([2985742](https://github.com/claudekit/claudekit-engineer/commit/298574228299c31108b3ce24220b8bae59b92ee8)), closes [#245](https://github.com/claudekit/claudekit-engineer/issues/245)

## [2.1.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.3...v2.1.0-beta.4) (2025-12-24)


### 🐞 Bug Fixes

* install .claude/scripts/requirements.txt and fix scan_commands output ([67f3738](https://github.com/claudekit/claudekit-engineer/commit/67f373808332606861bfdea241abf72c0443b5a6)), closes [#247](https://github.com/claudekit/claudekit-engineer/issues/247)

## [2.1.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.2...v2.1.0-beta.3) (2025-12-23)


### 🚀 Features

* **skill:** add ai-artist prompt engineering skill ([374eea1](https://github.com/claudekit/claudekit-engineer/commit/374eea1aa2e82aff79836ab48167856a958dc24b))
* **skill:** add Lyria RealTime music generation reference ([3024a54](https://github.com/claudekit/claudekit-engineer/commit/3024a546eb2e080eeb59fb33ea2a245a6db26b10))


### ♻️ Code Refactoring

* **skill:** update ai-multimodal to use Nano Banana Flash default ([2399ad1](https://github.com/claudekit/claudekit-engineer/commit/2399ad1558808824ef8667142da21b72cc68d6ab))


### ⚡ Performance Improvements

* **command:** enhance `/brainstorm` command ([1bf26a5](https://github.com/claudekit/claudekit-engineer/commit/1bf26a516a1b60171e12d5ddcfdb32b4b82cc949))

## [2.1.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v2.1.0-beta.1...v2.1.0-beta.2) (2025-12-23)


### 🐞 Bug Fixes

* **skill:** improve markdown-novel-viewer Windows path handling ([7b30640](https://github.com/claudekit/claudekit-engineer/commit/7b30640eb32c1dc0af8ab44bb882baaa61747f57))

## [2.1.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v2.0.0...v2.1.0-beta.1) (2025-12-23)


### 🚀 Features

* run /kanban as Claude Code background task for better visibility ([4d79864](https://github.com/claudekit/claudekit-engineer/commit/4d79864874de1a743811d3d86c74ccbc323f94f0)), closes [#240](https://github.com/claudekit/claudekit-engineer/issues/240)

## [2.0.0](https://github.com/claudekit/claudekit-engineer/compare/v1.20.1...v2.0.0) (2025-12-23)


### ⚠ BREAKING CHANGES

* Major Platform Update - Dashboard, Notifications, Worktree & Privacy (#239)

### 🚀 Features

* ✨ new command `/plan:archive` to write journals & archive plans ([9fe973c](https://github.com/claudekit/claudekit-engineer/commit/9fe973cd7c0412df7124a057f1c1949f4658db54))
* add centralized Windows UTF-8 compatibility utility ([a19e157](https://github.com/claudekit/claudekit-engineer/commit/a19e157bf4b1d7e2ed599d0f32acf72145e5a05a)), closes [#187](https://github.com/claudekit/claudekit-engineer/issues/187)
* add clarifying notes to hook block messages ([2865124](https://github.com/claudekit/claudekit-engineer/commit/2865124866022aaf8906f5d8e726dfc5e4e9057f)), closes [#228](https://github.com/claudekit/claudekit-engineer/issues/228)
* **chrome-devtools:** add auth session persistence for inject-auth script ([252e1c5](https://github.com/claudekit/claudekit-engineer/commit/252e1c5a15e5221fb02f97729e508d30b76c0b81))
* **ck-help:** add codingLevel documentation and brainstorm integration ([5de45fb](https://github.com/claudekit/claudekit-engineer/commit/5de45fbd07af139749246d8ea14705c51524a8a9))
* **coding-level:** add -1 as disabled default for token efficiency ([d16c889](https://github.com/claudekit/claudekit-engineer/commit/d16c889f886d48d4277d1127ff0a72f1f40d21a3))
* **hooks:** add broad pattern detection and privacy-block hook ([17ef8b4](https://github.com/claudekit/claudekit-engineer/commit/17ef8b4f6574efab08e6ff374d5f53d5d7bfd666)), closes [#184](https://github.com/claudekit/claudekit-engineer/issues/184)
* **hooks:** add codingLevel config for adaptive communication ([35a030f](https://github.com/claudekit/claudekit-engineer/commit/35a030fd7dd515979ffa1f077f7265e738c0f593)), closes [#158](https://github.com/claudekit/claudekit-engineer/issues/158)
* **hooks:** configure notification hooks for Stop, SubagentStop, Notification ([9b8ebf8](https://github.com/claudekit/claudekit-engineer/commit/9b8ebf85678b52642123b320039f527caa3e56f0))
* **hooks:** exempt example/sample/template files from privacy-block ([faf6f5f](https://github.com/claudekit/claudekit-engineer/commit/faf6f5f96de8ca3f18ea785a4bf7af3b83cb06e3)), closes [#200](https://github.com/claudekit/claudekit-engineer/issues/200)
* **locale:** add thinkingLanguage for dual-language support ([90b3eb8](https://github.com/claudekit/claudekit-engineer/commit/90b3eb8f6139f3bd70d646e294005f30ae11a42d)), closes [#180](https://github.com/claudekit/claudekit-engineer/issues/180)
* Major Platform Update - Dashboard, Notifications, Worktree & Privacy ([#239](https://github.com/claudekit/claudekit-engineer/issues/239)) ([1457c16](https://github.com/claudekit/claudekit-engineer/commit/1457c16238c241a7eda613343d946833da9aefdf))
* **markdown-novel-viewer:** add sidebar anchor navigation and inline section styling ([231fc52](https://github.com/claudekit/claudekit-engineer/commit/231fc52c493ddef27b4786b546d0020ffe2e6726))
* **nav:** add back-to-dashboard link in plan detail header ([3aeac74](https://github.com/claudekit/claudekit-engineer/commit/3aeac743aa54c07a752e71858148b4d5cda36116))
* **nav:** show planned vs implemented phases in sidebar ([f0362ec](https://github.com/claudekit/claudekit-engineer/commit/f0362ec4305cdee5ae0991c1affa508b5bf72bb2))
* **notifications:** add Telegram, Discord, and Slack providers ([be3faab](https://github.com/claudekit/claudekit-engineer/commit/be3faab00c7342e362d12fb7b5527b4ab7a6932c))
* **notifications:** add unified Node.js notification router ([8948b39](https://github.com/claudekit/claudekit-engineer/commit/8948b395683198446958c4e089937bb482b31e41))
* **output-styles:** comprehensive rewrite with MUST/NEVER rules ([4e2dbf5](https://github.com/claudekit/claudekit-engineer/commit/4e2dbf537ede36cbc29858f666e24ff45254178d))
* **plan-validation:** add /plan:validate command for interview-based plan validation ([26e58d6](https://github.com/claudekit/claudekit-engineer/commit/26e58d667436c6a7a3e6d7f26e4d1f4e233aa3ec))
* **planning:** add YAML frontmatter support for plan files ([a5c894c](https://github.com/claudekit/claudekit-engineer/commit/a5c894c1603f58ff7da2f05a8c9a2bd3e66b407c))
* **plans-kanban:** add kanban board view with enhanced dashboard ([fea08a2](https://github.com/claudekit/claudekit-engineer/commit/fea08a22db6b01e7aaadecef78a1493a77185079))
* **plans-kanban:** enhance kanban cards and add favicon ([873ef6a](https://github.com/claudekit/claudekit-engineer/commit/873ef6af9edf3ddeff2bb168752f8f1003dba281))
* **preview:** add dashboard UI and plan scanner ([05471af](https://github.com/claudekit/claudekit-engineer/commit/05471af55e0d45ea157e70a29923baac64741680))
* **preview:** add plan-scanner utility for dashboard ([5beb0d0](https://github.com/claudekit/claudekit-engineer/commit/5beb0d0da64109d062ca78b0fc44ac6cde406c3a))
* **preview:** add timeline, activity heatmap, and rich metadata ([52dd593](https://github.com/claudekit/claudekit-engineer/commit/52dd593807a9a8bfcfa71c07e215b23844def109))
* **preview:** redesign dashboard with refined monochrome theme ([0c8c6cb](https://github.com/claudekit/claudekit-engineer/commit/0c8c6cb534be590e28c56e1b45a087ed7ebb846c))
* **preview:** redesign timeline as Layered Gantt chart ([5e781d9](https://github.com/claudekit/claudekit-engineer/commit/5e781d946f1a7adaa509f63f3ad7ec56e87997ff))
* **preview:** run as CC background task with auto-open browser ([7d5dd1a](https://github.com/claudekit/claudekit-engineer/commit/7d5dd1a1cd005f9fc7c6c07d0a18f7915878efbe)), closes [#234](https://github.com/claudekit/claudekit-engineer/issues/234)
* **privacy-block:** improve robustness and testability of privacy hook ([c399b0c](https://github.com/claudekit/claudekit-engineer/commit/c399b0cf2188267a655f74fb4603e687d8a00186))
* **skills:** add navigation and theme persistence improvements ([0b9d8fb](https://github.com/claudekit/claudekit-engineer/commit/0b9d8fb793b916a8a4ebdc2a22edfc884d991836))
* **statusline:** add compact detection with PreCompact hook ([1fd4376](https://github.com/claudekit/claudekit-engineer/commit/1fd4376e8c5e9daddca75f73f61543f58ea569f4))
* **worktree:** add cross-platform worktree workflow command ([cfb6fc9](https://github.com/claudekit/claudekit-engineer/commit/cfb6fc98657eb8e3bcd22447c0bd24611c21c49e))
* **worktree:** improve workflow with remove command and dry-run ([fc2b2ca](https://github.com/claudekit/claudekit-engineer/commit/fc2b2cae23c0920d82b2bbb458b8006ac70f825a))


### 🐞 Bug Fixes

* `/code:auto` should finish all phases by default ([6c528a8](https://github.com/claudekit/claudekit-engineer/commit/6c528a802832836a36d104d813dc70d3b7c31d06))
* `chrome-devtools` skill should run in headed mode for better debugging ([52cecc6](https://github.com/claudekit/claudekit-engineer/commit/52cecc65c49116646ae1d1d6dd331f7f5d68d312))
* `frontend-design-pro` skill deprecated ([b8b6de3](https://github.com/claudekit/claudekit-engineer/commit/b8b6de325c9aa6e2dd5beb6f75251ca9e09fe544))
* add local/global venv resolution for skills Python path ([63d9918](https://github.com/claudekit/claudekit-engineer/commit/63d991822da65ecf4f3de3a92f7c73e8abd567c5))
* add venv Python instruction for skills scripts ([afc045c](https://github.com/claudekit/claudekit-engineer/commit/afc045c5150f688fe246e763b8e6f7614509e045)), closes [#212](https://github.com/claudekit/claudekit-engineer/issues/212)
* **ai-multimodal:** prevent LLM hallucination of non-existent scripts ([f58ffb8](https://github.com/claudekit/claudekit-engineer/commit/f58ffb8517018cce8c8261601fa67e8ce643b728)), closes [#226](https://github.com/claudekit/claudekit-engineer/issues/226)
* **ai-multimodal:** transcript output requirements ([e9b9a29](https://github.com/claudekit/claudekit-engineer/commit/e9b9a2945c4c971d1e971d759e4b3a8b5694d534))
* **ai-multimodal:** truncate when transcripting an audio with length is longer than 15 mins ([754774e](https://github.com/claudekit/claudekit-engineer/commit/754774ebe61064eb8f8c24a2f4e5b6dbf03b3f3f))
* **chrome-devtools:** auto-create output directory in screenshot.js ([a2a8d53](https://github.com/claudekit/claudekit-engineer/commit/a2a8d535218f82e93c45a38c3abdb7fecf970565)), closes [#206](https://github.com/claudekit/claudekit-engineer/issues/206)
* correct design commands after `aesthetic` skill deprecated ([fccf473](https://github.com/claudekit/claudekit-engineer/commit/fccf4738f121fb87438433fa4a2502027671a10d))
* **dashboard:** completed plans end at today, add top margin to timeline ([2043272](https://github.com/claudekit/claudekit-engineer/commit/20432722a6eff89532ef2c040bf481d9e1913002))
* **dashboard:** completed plans now stop at correct date + minimal timeline header ([cb87d7b](https://github.com/claudekit/claudekit-engineer/commit/cb87d7b6dbca675a01c3fdf3e19485cf36439af6))
* **dashboard:** handle YYYYMMDD date format in plan names ([7b16265](https://github.com/claudekit/claudekit-engineer/commit/7b162655cb212fd51614c20bc8bc24bbef187292))
* **dashboard:** improve gantt bar contrast and prevent overflow ([f7edc9e](https://github.com/claudekit/claudekit-engineer/commit/f7edc9e159bc089b92fb7ab2700fc829a28805d0))
* **dashboard:** remove decorative h2 lines from timeline title ([520da09](https://github.com/claudekit/claudekit-engineer/commit/520da097db4f524aa291709dc31c002f8e3d5347))
* **dashboard:** remove height cap, add scrollbar for many layers ([1c8c718](https://github.com/claudekit/claudekit-engineer/commit/1c8c718829a7ff7e698255b78b9330b9047cfb34))
* **dashboard:** resolve layered gantt staircase effect ([6fc8576](https://github.com/claudekit/claudekit-engineer/commit/6fc8576e2d7625d80f2d0e3ead1fbdfdf3c29251))
* **dashboard:** timeline bar now uses durationDays for consistency with card ([17eff55](https://github.com/claudekit/claudekit-engineer/commit/17eff559cbcf0a8be9f70ee0ce65958410ce7a6b))
* define now variable in assignLayers scope ([b04f01f](https://github.com/claudekit/claudekit-engineer/commit/b04f01fa3c602e63d05a7b21b86766437812ddf1))
* **git-manager:** add release number exclusion to fallback and pr.md ([ba28edf](https://github.com/claudekit/claudekit-engineer/commit/ba28edf549464442c52fdea8ffde233083773464))
* **git-manager:** exclude release numbers from PR titles ([5647218](https://github.com/claudekit/claudekit-engineer/commit/5647218126428044d90c41ac2856c848f3e9c792)), closes [#220](https://github.com/claudekit/claudekit-engineer/issues/220)
* **git:** use remote tracking branch in merge and add PR error handling ([4025a55](https://github.com/claudekit/claudekit-engineer/commit/4025a5593dcf5f999faa63e9556c47d8ce608c25))
* **hooks:** improve context-tracker robustness and documentation ([2755030](https://github.com/claudekit/claudekit-engineer/commit/2755030c062b21236c969218e979ee2cbff94f1d)), closes [#179](https://github.com/claudekit/claudekit-engineer/issues/179)
* **hooks:** normalize paths and handle edge cases in .ck.json config ([018d832](https://github.com/claudekit/claudekit-engineer/commit/018d832bd18a85f0ba2bc1c368e88cb6670810a7))
* **hooks:** resolve context tracker race condition and consolidate temp files ([7c507c8](https://github.com/claudekit/claudekit-engineer/commit/7c507c87e6b78826f45bc5f374a38ec604e5d125)), closes [#177](https://github.com/claudekit/claudekit-engineer/issues/177) [#178](https://github.com/claudekit/claudekit-engineer/issues/178)
* **hooks:** use correct snake_case field names in telegram notification hook ([e07f355](https://github.com/claudekit/claudekit-engineer/commit/e07f35533a13e48eb97a82bcd2234e8e4ab04f25))
* **hooks:** wire up validateNamingPattern and fix docs ([5063d69](https://github.com/claudekit/claudekit-engineer/commit/5063d698b71c03794ae6272102e642060644e9b9))
* implement 3-layer self-healing context reset detection ([503034e](https://github.com/claudekit/claudekit-engineer/commit/503034e78dc7f00187039a160153ec60f17a5692)), closes [#177](https://github.com/claudekit/claudekit-engineer/issues/177)
* inject agent naming patterns via hooks instead of env vars ([ecd3bb7](https://github.com/claudekit/claudekit-engineer/commit/ecd3bb73b803318201c198180a11122bacb5de12))
* inject pre-computed naming template to subagents ([e8511d3](https://github.com/claudekit/claudekit-engineer/commit/e8511d3627a22c9748f22e0a83e587cc575c08f2))
* inject venv Python path in dev-rules-reminder hook ([06773f6](https://github.com/claudekit/claudekit-engineer/commit/06773f66c88ae800df228c7faa588769a2c8739a))
* **install:** add viewer skills npm deps to install.ps1 ([d65153e](https://github.com/claudekit/claudekit-engineer/commit/d65153e2864761f796c7a9944a0f78a01b069797))
* **install:** strip inline comments from requirements.txt lines ([20a2980](https://github.com/claudekit/claudekit-engineer/commit/20a29807b76a0b683a39e401d08e849d1187cf40)), closes [#162](https://github.com/claudekit/claudekit-engineer/issues/162)
* make writing journal optional in `/plan:archive` command ([50eda56](https://github.com/claudekit/claudekit-engineer/commit/50eda5688027a9000ddbaa43085432be13f9cba5))
* **markdown-novel-viewer:** add missing template placeholder replacements ([2bee026](https://github.com/claudekit/claudekit-engineer/commit/2bee026165fae2d81f8558c068f83e3653d22626))
* **markdown-viewer:** resolve reference-style image paths in preview ([35cf870](https://github.com/claudekit/claudekit-engineer/commit/35cf870f0e51616c857adbe1471104856d5c33e2)), closes [#210](https://github.com/claudekit/claudekit-engineer/issues/210)
* **preview:** check claude directory for script execution ([71d1853](https://github.com/claudekit/claudekit-engineer/commit/71d18531dc1516d4596244301a7ab5e91ad0f44f))
* **preview:** hide inline sections from sidebar navigation ([4610369](https://github.com/claudekit/claudekit-engineer/commit/4610369459facfffb65e90ebfc702b192b244b36))
* **privacy-block:** add URL decoding, bash variable detection, path traversal warning ([6df91cb](https://github.com/claudekit/claudekit-engineer/commit/6df91cbe75e9469ece5acd312e933dbc4d2748d5))
* resolve UnicodeEncodeError on Windows for ui-ux-pro-max search ([7d86c15](https://github.com/claudekit/claudekit-engineer/commit/7d86c15d810084fb8c0a19f9278b63933d8b8acf)), closes [#187](https://github.com/claudekit/claudekit-engineer/issues/187)
* **scout-block:** block subfolder paths in monorepo structures ([#174](https://github.com/claudekit/claudekit-engineer/issues/174)) ([ff38a87](https://github.com/claudekit/claudekit-engineer/commit/ff38a878c2e8f56c27296892c37e6cebbe0211c9))
* **skills:** resolve kanban/preview separation issues ([e2c7832](https://github.com/claudekit/claudekit-engineer/commit/e2c783260f2eea2cc82a13fa2061df6cac804286))
* **skills:** trigger release for viewer skill install instructions ([220cfcc](https://github.com/claudekit/claudekit-engineer/commit/220cfcc2170910a946bcda5bea66d871d469ef46))
* **statusline:** calculate context percentage against compact threshold ([#172](https://github.com/claudekit/claudekit-engineer/issues/172)) ([ebf68a0](https://github.com/claudekit/claudekit-engineer/commit/ebf68a0a21bda4f116e53ab77b5a87028ce804a5))
* **statusline:** improve context window display with progress bar and emoji ([357d317](https://github.com/claudekit/claudekit-engineer/commit/357d31764454a44c539d8812e6061c77541c6a80)), closes [#159](https://github.com/claudekit/claudekit-engineer/issues/159)


### 📚 Documentation

* **chrome-devtools:** document inject-auth script and update gitignore rules ([83d3f0c](https://github.com/claudekit/claudekit-engineer/commit/83d3f0cc9649e6bb4fb208bb5808b51b85b62e9f))
* fix Quick Start CLI commands in README ([382e98d](https://github.com/claudekit/claudekit-engineer/commit/382e98d3196e2d787e385fae900cabf1d62f9898)), closes [#237](https://github.com/claudekit/claudekit-engineer/issues/237)
* **git-manager:** improve PR workflow with remote diff guidance ([23b99bb](https://github.com/claudekit/claudekit-engineer/commit/23b99bb577b9419e9cd3edbf91ccab6fbfb346f3))
* **notifications:** add provider setup guides and update hooks README ([7be8916](https://github.com/claudekit/claudekit-engineer/commit/7be891623fc59cb01393604324647e1198e650f4))
* **notifications:** update .env.example with all providers ([b8f22ea](https://github.com/claudekit/claudekit-engineer/commit/b8f22ea658ca4447560b5a0952cb37f1796a58c1))
* **readme:** update project structure and integration capabilities ([cd47529](https://github.com/claudekit/claudekit-engineer/commit/cd475295b9bc4e1a1b5dbc8a71f2798a92b32892))
* **skills:** add installation instructions for viewer skills ([a41b2eb](https://github.com/claudekit/claudekit-engineer/commit/a41b2eb86428d352c5268894ecea323421198711))
* update architecture and roadmap for preview dashboard ([626a1bd](https://github.com/claudekit/claudekit-engineer/commit/626a1bdecc913d5589489f2521a82891639036bb))


### ♻️ Code Refactoring

* centralize file naming pattern via CK_NAME_PATTERN env var ([ecd5525](https://github.com/claudekit/claudekit-engineer/commit/ecd5525e37347be048798314bdc92b42666650b2))
* **hooks:** address code review feedback ([052959a](https://github.com/claudekit/claudekit-engineer/commit/052959a058423175b768151b8017f60c182f1531))
* **notifications:** make hooks opt-in instead of default ([308f6d2](https://github.com/claudekit/claudekit-engineer/commit/308f6d26e21045f4abf75d0f1eadceb37f47f764))
* separate kanban and preview functionality with enhanced features ([96a1232](https://github.com/claudekit/claudekit-engineer/commit/96a1232e4bbba4d92fa777cf947866d727530545))
* **statusline:** simplify context display logic ([5caee57](https://github.com/claudekit/claudekit-engineer/commit/5caee57a41603bf9420e9006398c7fdb364db81c))


### ⚡ Performance Improvements

* `/code:auto` should ask for onboarding assist if needed ([809b19a](https://github.com/claudekit/claudekit-engineer/commit/809b19ae2e7be9fb0e65c82a6b4deeda6ac10887))
* ✨ new command -> `/test:ui` for running UI testing of an input URL ([f0736ff](https://github.com/claudekit/claudekit-engineer/commit/f0736ff94523c8a0c7e89acf678c17cd9012175e))
* add `/preview` command with `novel-markdown-viewer` skill ([ad51d59](https://github.com/claudekit/claudekit-engineer/commit/ad51d599b57b04a8343c7cdcfb6578ff70c1462b))
* add `/skill:plan` command ([b74b036](https://github.com/claudekit/claudekit-engineer/commit/b74b0365df2eae59b274542e64e87b2904431cec))
* add more stats to summary of `/plan:archive` ([7365f0c](https://github.com/claudekit/claudekit-engineer/commit/7365f0c2afe266cfcdd50677e3af4e615e8f0e10))
* add Windows Python paths for cross-platform support ([89a2a9a](https://github.com/claudekit/claudekit-engineer/commit/89a2a9a2c8efe6c2752376a7166ddc3ba866569c))
* fix slow Python version detection in session-init hook ([efd9205](https://github.com/claudekit/claudekit-engineer/commit/efd92055eda2cebb313557a2f64afd5e5fb60dfa))
* **statusline:** add context window usage percentage display ([20f8ed7](https://github.com/claudekit/claudekit-engineer/commit/20f8ed798572933586ad2a40a975fc37faf98d2a)), closes [#159](https://github.com/claudekit/claudekit-engineer/issues/159)


### ✅ Tests

* **hooks:** add unit tests for ck-config edge case handling ([673b400](https://github.com/claudekit/claudekit-engineer/commit/673b4002b115e09a8e91823561389c037839f048))
* **preview:** add comprehensive dashboard test suite ([631b0af](https://github.com/claudekit/claudekit-engineer/commit/631b0af4ad3bdaff6a89ba63657c1b34f943d061))
* **worktree:** add comprehensive test suite ([ed712e9](https://github.com/claudekit/claudekit-engineer/commit/ed712e9b2891add724c11231a093637560bd275d))


### 👷 CI

* add branch protection workflow for main branch ([6fb7083](https://github.com/claudekit/claudekit-engineer/commit/6fb70836639e86193020833e22c798676585c8cf))

## [1.21.0-beta.38](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.37...v1.21.0-beta.38) (2025-12-22)


### 🚀 Features

* **hooks:** configure notification hooks for Stop, SubagentStop, Notification ([9b8ebf8](https://github.com/claudekit/claudekit-engineer/commit/9b8ebf85678b52642123b320039f527caa3e56f0))
* **notifications:** add Telegram, Discord, and Slack providers ([be3faab](https://github.com/claudekit/claudekit-engineer/commit/be3faab00c7342e362d12fb7b5527b4ab7a6932c))
* **notifications:** add unified Node.js notification router ([8948b39](https://github.com/claudekit/claudekit-engineer/commit/8948b395683198446958c4e089937bb482b31e41))


### 📚 Documentation

* **notifications:** add provider setup guides and update hooks README ([7be8916](https://github.com/claudekit/claudekit-engineer/commit/7be891623fc59cb01393604324647e1198e650f4))
* **notifications:** update .env.example with all providers ([b8f22ea](https://github.com/claudekit/claudekit-engineer/commit/b8f22ea658ca4447560b5a0952cb37f1796a58c1))
* **readme:** update project structure and integration capabilities ([cd47529](https://github.com/claudekit/claudekit-engineer/commit/cd475295b9bc4e1a1b5dbc8a71f2798a92b32892))


### ♻️ Code Refactoring

* **notifications:** make hooks opt-in instead of default ([308f6d2](https://github.com/claudekit/claudekit-engineer/commit/308f6d26e21045f4abf75d0f1eadceb37f47f764))

## [1.21.0-beta.37](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.36...v1.21.0-beta.37) (2025-12-22)


### 🚀 Features

* **preview:** run as CC background task with auto-open browser ([7d5dd1a](https://github.com/claudekit/claudekit-engineer/commit/7d5dd1a1cd005f9fc7c6c07d0a18f7915878efbe)), closes [#234](https://github.com/claudekit/claudekit-engineer/issues/234)

## [1.21.0-beta.36](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.35...v1.21.0-beta.36) (2025-12-21)


### 🚀 Features

* **worktree:** add cross-platform worktree workflow command ([cfb6fc9](https://github.com/claudekit/claudekit-engineer/commit/cfb6fc98657eb8e3bcd22447c0bd24611c21c49e))
* **worktree:** improve workflow with remove command and dry-run ([fc2b2ca](https://github.com/claudekit/claudekit-engineer/commit/fc2b2cae23c0920d82b2bbb458b8006ac70f825a))


### ✅ Tests

* **worktree:** add comprehensive test suite ([ed712e9](https://github.com/claudekit/claudekit-engineer/commit/ed712e9b2891add724c11231a093637560bd275d))

## [1.21.0-beta.35](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.34...v1.21.0-beta.35) (2025-12-19)


### 🚀 Features

* **ck-help:** add codingLevel documentation and brainstorm integration ([5de45fb](https://github.com/claudekit/claudekit-engineer/commit/5de45fbd07af139749246d8ea14705c51524a8a9))
* **coding-level:** add -1 as disabled default for token efficiency ([d16c889](https://github.com/claudekit/claudekit-engineer/commit/d16c889f886d48d4277d1127ff0a72f1f40d21a3))
* **hooks:** add codingLevel config for adaptive communication ([35a030f](https://github.com/claudekit/claudekit-engineer/commit/35a030fd7dd515979ffa1f077f7265e738c0f593)), closes [#158](https://github.com/claudekit/claudekit-engineer/issues/158)
* **output-styles:** comprehensive rewrite with MUST/NEVER rules ([4e2dbf5](https://github.com/claudekit/claudekit-engineer/commit/4e2dbf537ede36cbc29858f666e24ff45254178d))

## [1.21.0-beta.34](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.33...v1.21.0-beta.34) (2025-12-18)


### 🚀 Features

* add clarifying notes to hook block messages ([2865124](https://github.com/claudekit/claudekit-engineer/commit/2865124866022aaf8906f5d8e726dfc5e4e9057f)), closes [#228](https://github.com/claudekit/claudekit-engineer/issues/228)

## [1.21.0-beta.33](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.32...v1.21.0-beta.33) (2025-12-18)


### 🐞 Bug Fixes

* **ai-multimodal:** prevent LLM hallucination of non-existent scripts ([f58ffb8](https://github.com/claudekit/claudekit-engineer/commit/f58ffb8517018cce8c8261601fa67e8ce643b728)), closes [#226](https://github.com/claudekit/claudekit-engineer/issues/226)

## [1.21.0-beta.32](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.31...v1.21.0-beta.32) (2025-12-18)


### 🚀 Features

* **chrome-devtools:** add auth session persistence for inject-auth script ([252e1c5](https://github.com/claudekit/claudekit-engineer/commit/252e1c5a15e5221fb02f97729e508d30b76c0b81))


### 📚 Documentation

* **chrome-devtools:** document inject-auth script and update gitignore rules ([83d3f0c](https://github.com/claudekit/claudekit-engineer/commit/83d3f0cc9649e6bb4fb208bb5808b51b85b62e9f))

## [1.21.0-beta.31](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.30...v1.21.0-beta.31) (2025-12-18)


### 🐞 Bug Fixes

* **git-manager:** add release number exclusion to fallback and pr.md ([ba28edf](https://github.com/claudekit/claudekit-engineer/commit/ba28edf549464442c52fdea8ffde233083773464))
* **git-manager:** exclude release numbers from PR titles ([5647218](https://github.com/claudekit/claudekit-engineer/commit/5647218126428044d90c41ac2856c848f3e9c792)), closes [#220](https://github.com/claudekit/claudekit-engineer/issues/220)

## [1.21.0-beta.30](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.29...v1.21.0-beta.30) (2025-12-18)


### 🐞 Bug Fixes

* **hooks:** use correct snake_case field names in telegram notification hook ([e07f355](https://github.com/claudekit/claudekit-engineer/commit/e07f35533a13e48eb97a82bcd2234e8e4ab04f25))

## [1.21.0-beta.29](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.28...v1.21.0-beta.29) (2025-12-18)


### 🐞 Bug Fixes

* add local/global venv resolution for skills Python path ([63d9918](https://github.com/claudekit/claudekit-engineer/commit/63d991822da65ecf4f3de3a92f7c73e8abd567c5))
* add venv Python instruction for skills scripts ([afc045c](https://github.com/claudekit/claudekit-engineer/commit/afc045c5150f688fe246e763b8e6f7614509e045)), closes [#212](https://github.com/claudekit/claudekit-engineer/issues/212)
* inject venv Python path in dev-rules-reminder hook ([06773f6](https://github.com/claudekit/claudekit-engineer/commit/06773f66c88ae800df228c7faa588769a2c8739a))

## [1.21.0-beta.28](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.27...v1.21.0-beta.28) (2025-12-17)


### 🐞 Bug Fixes

* **markdown-viewer:** resolve reference-style image paths in preview ([35cf870](https://github.com/claudekit/claudekit-engineer/commit/35cf870f0e51616c857adbe1471104856d5c33e2)), closes [#210](https://github.com/claudekit/claudekit-engineer/issues/210)

## [1.21.0-beta.27](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.26...v1.21.0-beta.27) (2025-12-17)


### 🐞 Bug Fixes

* **markdown-novel-viewer:** add missing template placeholder replacements ([2bee026](https://github.com/claudekit/claudekit-engineer/commit/2bee026165fae2d81f8558c068f83e3653d22626))

## [1.21.0-beta.26](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.25...v1.21.0-beta.26) (2025-12-17)


### 🐞 Bug Fixes

* **chrome-devtools:** auto-create output directory in screenshot.js ([a2a8d53](https://github.com/claudekit/claudekit-engineer/commit/a2a8d535218f82e93c45a38c3abdb7fecf970565)), closes [#206](https://github.com/claudekit/claudekit-engineer/issues/206)

## [1.21.0-beta.25](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.24...v1.21.0-beta.25) (2025-12-17)


### 🐞 Bug Fixes

* `/code:auto` should finish all phases by default ([6c528a8](https://github.com/claudekit/claudekit-engineer/commit/6c528a802832836a36d104d813dc70d3b7c31d06))


### ⚡ Performance Improvements

* `/code:auto` should ask for onboarding assist if needed ([809b19a](https://github.com/claudekit/claudekit-engineer/commit/809b19ae2e7be9fb0e65c82a6b4deeda6ac10887))

## [1.21.0-beta.24](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.23...v1.21.0-beta.24) (2025-12-17)


### 🐞 Bug Fixes

* **hooks:** normalize paths and handle edge cases in .ck.json config ([018d832](https://github.com/claudekit/claudekit-engineer/commit/018d832bd18a85f0ba2bc1c368e88cb6670810a7))
* **hooks:** wire up validateNamingPattern and fix docs ([5063d69](https://github.com/claudekit/claudekit-engineer/commit/5063d698b71c03794ae6272102e642060644e9b9))


### ✅ Tests

* **hooks:** add unit tests for ck-config edge case handling ([673b400](https://github.com/claudekit/claudekit-engineer/commit/673b4002b115e09a8e91823561389c037839f048))

## [1.21.0-beta.23](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.22...v1.21.0-beta.23) (2025-12-17)


### 🐞 Bug Fixes

* make writing journal optional in `/plan:archive` command ([50eda56](https://github.com/claudekit/claudekit-engineer/commit/50eda5688027a9000ddbaa43085432be13f9cba5))


### ⚡ Performance Improvements

* add more stats to summary of `/plan:archive` ([7365f0c](https://github.com/claudekit/claudekit-engineer/commit/7365f0c2afe266cfcdd50677e3af4e615e8f0e10))

## [1.21.0-beta.22](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.21...v1.21.0-beta.22) (2025-12-17)


### 🚀 Features

* ✨ new command `/plan:archive` to write journals & archive plans ([9fe973c](https://github.com/claudekit/claudekit-engineer/commit/9fe973cd7c0412df7124a057f1c1949f4658db54))

## [1.21.0-beta.21](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.20...v1.21.0-beta.21) (2025-12-17)


### 🚀 Features

* **hooks:** exempt example/sample/template files from privacy-block ([faf6f5f](https://github.com/claudekit/claudekit-engineer/commit/faf6f5f96de8ca3f18ea785a4bf7af3b83cb06e3)), closes [#200](https://github.com/claudekit/claudekit-engineer/issues/200)
* **privacy-block:** improve robustness and testability of privacy hook ([c399b0c](https://github.com/claudekit/claudekit-engineer/commit/c399b0cf2188267a655f74fb4603e687d8a00186))

## [1.21.0-beta.20](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.19...v1.21.0-beta.20) (2025-12-17)


### 🚀 Features

* **plan-validation:** add /plan:validate command for interview-based plan validation ([26e58d6](https://github.com/claudekit/claudekit-engineer/commit/26e58d667436c6a7a3e6d7f26e4d1f4e233aa3ec))

## [1.21.0-beta.19](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.18...v1.21.0-beta.19) (2025-12-16)


### 🐞 Bug Fixes

* **install:** add viewer skills npm deps to install.ps1 ([d65153e](https://github.com/claudekit/claudekit-engineer/commit/d65153e2864761f796c7a9944a0f78a01b069797))

## [1.21.0-beta.18](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.17...v1.21.0-beta.18) (2025-12-16)


### 🐞 Bug Fixes

* **skills:** trigger release for viewer skill install instructions ([220cfcc](https://github.com/claudekit/claudekit-engineer/commit/220cfcc2170910a946bcda5bea66d871d469ef46))


### 📚 Documentation

* **skills:** add installation instructions for viewer skills ([a41b2eb](https://github.com/claudekit/claudekit-engineer/commit/a41b2eb86428d352c5268894ecea323421198711))

## [1.21.0-beta.17](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.16...v1.21.0-beta.17) (2025-12-16)


### 🚀 Features

* **markdown-novel-viewer:** add sidebar anchor navigation and inline section styling ([231fc52](https://github.com/claudekit/claudekit-engineer/commit/231fc52c493ddef27b4786b546d0020ffe2e6726))
* **planning:** add YAML frontmatter support for plan files ([a5c894c](https://github.com/claudekit/claudekit-engineer/commit/a5c894c1603f58ff7da2f05a8c9a2bd3e66b407c))
* **plans-kanban:** add kanban board view with enhanced dashboard ([fea08a2](https://github.com/claudekit/claudekit-engineer/commit/fea08a22db6b01e7aaadecef78a1493a77185079))
* **plans-kanban:** enhance kanban cards and add favicon ([873ef6a](https://github.com/claudekit/claudekit-engineer/commit/873ef6af9edf3ddeff2bb168752f8f1003dba281))
* **skills:** add navigation and theme persistence improvements ([0b9d8fb](https://github.com/claudekit/claudekit-engineer/commit/0b9d8fb793b916a8a4ebdc2a22edfc884d991836))


### 🐞 Bug Fixes

* **preview:** hide inline sections from sidebar navigation ([4610369](https://github.com/claudekit/claudekit-engineer/commit/4610369459facfffb65e90ebfc702b192b244b36))
* **skills:** resolve kanban/preview separation issues ([e2c7832](https://github.com/claudekit/claudekit-engineer/commit/e2c783260f2eea2cc82a13fa2061df6cac804286))


### ♻️ Code Refactoring

* separate kanban and preview functionality with enhanced features ([96a1232](https://github.com/claudekit/claudekit-engineer/commit/96a1232e4bbba4d92fa777cf947866d727530545))

## [1.21.0-beta.16](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.15...v1.21.0-beta.16) (2025-12-16)


### 🐞 Bug Fixes

* `frontend-design-pro` skill deprecated ([b8b6de3](https://github.com/claudekit/claudekit-engineer/commit/b8b6de325c9aa6e2dd5beb6f75251ca9e09fe544))
* correct design commands after `aesthetic` skill deprecated ([fccf473](https://github.com/claudekit/claudekit-engineer/commit/fccf4738f121fb87438433fa4a2502027671a10d))
* **preview:** check claude directory for script execution ([71d1853](https://github.com/claudekit/claudekit-engineer/commit/71d18531dc1516d4596244301a7ab5e91ad0f44f))


### ⚡ Performance Improvements

* ✨ new command -> `/test:ui` for running UI testing of an input URL ([f0736ff](https://github.com/claudekit/claudekit-engineer/commit/f0736ff94523c8a0c7e89acf678c17cd9012175e))

## [1.21.0-beta.15](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.14...v1.21.0-beta.15) (2025-12-16)


### ⚡ Performance Improvements

* add Windows Python paths for cross-platform support ([89a2a9a](https://github.com/claudekit/claudekit-engineer/commit/89a2a9a2c8efe6c2752376a7166ddc3ba866569c))
* fix slow Python version detection in session-init hook ([efd9205](https://github.com/claudekit/claudekit-engineer/commit/efd92055eda2cebb313557a2f64afd5e5fb60dfa))

## [1.21.0-beta.14](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.13...v1.21.0-beta.14) (2025-12-16)


### 🐞 Bug Fixes

* **git:** use remote tracking branch in merge and add PR error handling ([4025a55](https://github.com/claudekit/claudekit-engineer/commit/4025a5593dcf5f999faa63e9556c47d8ce608c25))


### 📚 Documentation

* **git-manager:** improve PR workflow with remote diff guidance ([23b99bb](https://github.com/claudekit/claudekit-engineer/commit/23b99bb577b9419e9cd3edbf91ccab6fbfb346f3))

## [1.21.0-beta.13](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.12...v1.21.0-beta.13) (2025-12-15)


### 🚀 Features

* add centralized Windows UTF-8 compatibility utility ([a19e157](https://github.com/claudekit/claudekit-engineer/commit/a19e157bf4b1d7e2ed599d0f32acf72145e5a05a)), closes [#187](https://github.com/claudekit/claudekit-engineer/issues/187)


### 🐞 Bug Fixes

* resolve UnicodeEncodeError on Windows for ui-ux-pro-max search ([7d86c15](https://github.com/claudekit/claudekit-engineer/commit/7d86c15d810084fb8c0a19f9278b63933d8b8acf)), closes [#187](https://github.com/claudekit/claudekit-engineer/issues/187)

## [1.21.0-beta.12](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.11...v1.21.0-beta.12) (2025-12-15)


### 🐞 Bug Fixes

* **ai-multimodal:** transcript output requirements ([e9b9a29](https://github.com/claudekit/claudekit-engineer/commit/e9b9a2945c4c971d1e971d759e4b3a8b5694d534))
* **ai-multimodal:** truncate when transcripting an audio with length is longer than 15 mins ([754774e](https://github.com/claudekit/claudekit-engineer/commit/754774ebe61064eb8f8c24a2f4e5b6dbf03b3f3f))

## [1.21.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.10...v1.21.0-beta.11) (2025-12-15)


### 🚀 Features

* **hooks:** add broad pattern detection and privacy-block hook ([17ef8b4](https://github.com/claudekit/claudekit-engineer/commit/17ef8b4f6574efab08e6ff374d5f53d5d7bfd666)), closes [#184](https://github.com/claudekit/claudekit-engineer/issues/184)


### 🐞 Bug Fixes

* **privacy-block:** add URL decoding, bash variable detection, path traversal warning ([6df91cb](https://github.com/claudekit/claudekit-engineer/commit/6df91cbe75e9469ece5acd312e933dbc4d2748d5))

## [1.21.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.9...v1.21.0-beta.10) (2025-12-15)


### 🐞 Bug Fixes

* **hooks:** resolve context tracker race condition and consolidate temp files ([7c507c8](https://github.com/claudekit/claudekit-engineer/commit/7c507c87e6b78826f45bc5f374a38ec604e5d125)), closes [#177](https://github.com/claudekit/claudekit-engineer/issues/177) [#178](https://github.com/claudekit/claudekit-engineer/issues/178)


### ♻️ Code Refactoring

* **hooks:** address code review feedback ([052959a](https://github.com/claudekit/claudekit-engineer/commit/052959a058423175b768151b8017f60c182f1531))

## [1.21.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.8...v1.21.0-beta.9) (2025-12-15)


### 🚀 Features

* **locale:** add thinkingLanguage for dual-language support ([90b3eb8](https://github.com/claudekit/claudekit-engineer/commit/90b3eb8f6139f3bd70d646e294005f30ae11a42d)), closes [#180](https://github.com/claudekit/claudekit-engineer/issues/180)

## [1.21.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.7...v1.21.0-beta.8) (2025-12-15)


### 🐞 Bug Fixes

* **hooks:** improve context-tracker robustness and documentation ([2755030](https://github.com/claudekit/claudekit-engineer/commit/2755030c062b21236c969218e979ee2cbff94f1d)), closes [#179](https://github.com/claudekit/claudekit-engineer/issues/179)
* implement 3-layer self-healing context reset detection ([503034e](https://github.com/claudekit/claudekit-engineer/commit/503034e78dc7f00187039a160153ec60f17a5692)), closes [#177](https://github.com/claudekit/claudekit-engineer/issues/177)

## [1.21.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.6...v1.21.0-beta.7) (2025-12-14)


### 🐞 Bug Fixes

* **scout-block:** block subfolder paths in monorepo structures ([#174](https://github.com/claudekit/claudekit-engineer/issues/174)) ([ff38a87](https://github.com/claudekit/claudekit-engineer/commit/ff38a878c2e8f56c27296892c37e6cebbe0211c9))

## [1.21.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.5...v1.21.0-beta.6) (2025-12-14)


### 🐞 Bug Fixes

* **statusline:** calculate context percentage against compact threshold ([#172](https://github.com/claudekit/claudekit-engineer/issues/172)) ([ebf68a0](https://github.com/claudekit/claudekit-engineer/commit/ebf68a0a21bda4f116e53ab77b5a87028ce804a5))

## [1.21.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.4...v1.21.0-beta.5) (2025-12-14)


### 🐞 Bug Fixes

* inject agent naming patterns via hooks instead of env vars ([ecd3bb7](https://github.com/claudekit/claudekit-engineer/commit/ecd3bb73b803318201c198180a11122bacb5de12))
* inject pre-computed naming template to subagents ([e8511d3](https://github.com/claudekit/claudekit-engineer/commit/e8511d3627a22c9748f22e0a83e587cc575c08f2))


### ♻️ Code Refactoring

* centralize file naming pattern via CK_NAME_PATTERN env var ([ecd5525](https://github.com/claudekit/claudekit-engineer/commit/ecd5525e37347be048798314bdc92b42666650b2))

## [1.21.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.3...v1.21.0-beta.4) (2025-12-13)

## [1.21.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.2...v1.21.0-beta.3) (2025-12-12)


### ♻️ Code Refactoring

* centralize file naming pattern via CK_NAME_PATTERN env var ([e379abe](https://github.com/claudekit/claudekit-engineer/commit/e379abe7d762770379d5318bb104a70824a5335e))

## [1.21.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v1.21.0-beta.1...v1.21.0-beta.2) (2025-12-12)


### 🚀 Features

* **nav:** add back-to-dashboard link in plan detail header ([3aeac74](https://github.com/claudekit/claudekit-engineer/commit/3aeac743aa54c07a752e71858148b4d5cda36116))
* **nav:** show planned vs implemented phases in sidebar ([f0362ec](https://github.com/claudekit/claudekit-engineer/commit/f0362ec4305cdee5ae0991c1affa508b5bf72bb2))
* **preview:** add dashboard UI and plan scanner ([05471af](https://github.com/claudekit/claudekit-engineer/commit/05471af55e0d45ea157e70a29923baac64741680))
* **preview:** add plan-scanner utility for dashboard ([5beb0d0](https://github.com/claudekit/claudekit-engineer/commit/5beb0d0da64109d062ca78b0fc44ac6cde406c3a))
* **preview:** add timeline, activity heatmap, and rich metadata ([52dd593](https://github.com/claudekit/claudekit-engineer/commit/52dd593807a9a8bfcfa71c07e215b23844def109))
* **preview:** redesign dashboard with refined monochrome theme ([0c8c6cb](https://github.com/claudekit/claudekit-engineer/commit/0c8c6cb534be590e28c56e1b45a087ed7ebb846c))
* **preview:** redesign timeline as Layered Gantt chart ([5e781d9](https://github.com/claudekit/claudekit-engineer/commit/5e781d946f1a7adaa509f63f3ad7ec56e87997ff))


### 🐞 Bug Fixes

* **dashboard:** completed plans end at today, add top margin to timeline ([2043272](https://github.com/claudekit/claudekit-engineer/commit/20432722a6eff89532ef2c040bf481d9e1913002))
* **dashboard:** completed plans now stop at correct date + minimal timeline header ([cb87d7b](https://github.com/claudekit/claudekit-engineer/commit/cb87d7b6dbca675a01c3fdf3e19485cf36439af6))
* **dashboard:** handle YYYYMMDD date format in plan names ([7b16265](https://github.com/claudekit/claudekit-engineer/commit/7b162655cb212fd51614c20bc8bc24bbef187292))
* **dashboard:** improve gantt bar contrast and prevent overflow ([f7edc9e](https://github.com/claudekit/claudekit-engineer/commit/f7edc9e159bc089b92fb7ab2700fc829a28805d0))
* **dashboard:** remove decorative h2 lines from timeline title ([520da09](https://github.com/claudekit/claudekit-engineer/commit/520da097db4f524aa291709dc31c002f8e3d5347))
* **dashboard:** remove height cap, add scrollbar for many layers ([1c8c718](https://github.com/claudekit/claudekit-engineer/commit/1c8c718829a7ff7e698255b78b9330b9047cfb34))
* **dashboard:** resolve layered gantt staircase effect ([6fc8576](https://github.com/claudekit/claudekit-engineer/commit/6fc8576e2d7625d80f2d0e3ead1fbdfdf3c29251))
* **dashboard:** timeline bar now uses durationDays for consistency with card ([17eff55](https://github.com/claudekit/claudekit-engineer/commit/17eff559cbcf0a8be9f70ee0ce65958410ce7a6b))
* define now variable in assignLayers scope ([b04f01f](https://github.com/claudekit/claudekit-engineer/commit/b04f01fa3c602e63d05a7b21b86766437812ddf1))


### 📚 Documentation

* update architecture and roadmap for preview dashboard ([626a1bd](https://github.com/claudekit/claudekit-engineer/commit/626a1bdecc913d5589489f2521a82891639036bb))


### ✅ Tests

* **preview:** add comprehensive dashboard test suite ([631b0af](https://github.com/claudekit/claudekit-engineer/commit/631b0af4ad3bdaff6a89ba63657c1b34f943d061))

## [1.21.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.20.2-beta.4...v1.21.0-beta.1) (2025-12-12)


### 🚀 Features

* **statusline:** add compact detection with PreCompact hook ([1fd4376](https://github.com/claudekit/claudekit-engineer/commit/1fd4376e8c5e9daddca75f73f61543f58ea569f4))


### 🐞 Bug Fixes

* **statusline:** improve context window display with progress bar and emoji ([357d317](https://github.com/claudekit/claudekit-engineer/commit/357d31764454a44c539d8812e6061c77541c6a80)), closes [#159](https://github.com/claudekit/claudekit-engineer/issues/159)


### ♻️ Code Refactoring

* **statusline:** simplify context display logic ([5caee57](https://github.com/claudekit/claudekit-engineer/commit/5caee57a41603bf9420e9006398c7fdb364db81c))

## [1.20.2-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v1.20.2-beta.3...v1.20.2-beta.4) (2025-12-11)


### ⚡ Performance Improvements

* **statusline:** add context window usage percentage display ([20f8ed7](https://github.com/claudekit/claudekit-engineer/commit/20f8ed798572933586ad2a40a975fc37faf98d2a)), closes [#159](https://github.com/claudekit/claudekit-engineer/issues/159)

## [1.20.2-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v1.20.2-beta.2...v1.20.2-beta.3) (2025-12-11)


### 🐞 Bug Fixes

* **install:** strip inline comments from requirements.txt lines ([20a2980](https://github.com/claudekit/claudekit-engineer/commit/20a29807b76a0b683a39e401d08e849d1187cf40)), closes [#162](https://github.com/claudekit/claudekit-engineer/issues/162)

## [1.20.2-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v1.20.2-beta.1...v1.20.2-beta.2) (2025-12-11)


### ⚡ Performance Improvements

* add `/preview` command with `novel-markdown-viewer` skill ([ad51d59](https://github.com/claudekit/claudekit-engineer/commit/ad51d599b57b04a8343c7cdcfb6578ff70c1462b))
* add `/skill:plan` command ([b74b036](https://github.com/claudekit/claudekit-engineer/commit/b74b0365df2eae59b274542e64e87b2904431cec))

## [1.20.2-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.20.1...v1.20.2-beta.1) (2025-12-11)


### 🐞 Bug Fixes

* `chrome-devtools` skill should run in headed mode for better debugging ([52cecc6](https://github.com/claudekit/claudekit-engineer/commit/52cecc65c49116646ae1d1d6dd331f7f5d68d312))


### 👷 CI

* add branch protection workflow for main branch ([6fb7083](https://github.com/claudekit/claudekit-engineer/commit/6fb70836639e86193020833e22c798676585c8cf))

## [1.20.1](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0...v1.20.1) (2025-12-11)


### 🐞 Bug Fixes

* **skill:** improve ui-ux-pro-max activation for frontend work ([0ffc7dc](https://github.com/claudekit/claudekit-engineer/commit/0ffc7dcdbae422ce89145565cc1c75b4e86b2c07)), closes [#153](https://github.com/claudekit/claudekit-engineer/issues/153)

## [1.20.1-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0...v1.20.1-beta.1) (2025-12-11)


### 🐞 Bug Fixes

* **skill:** improve ui-ux-pro-max activation for frontend work ([0ffc7dc](https://github.com/claudekit/claudekit-engineer/commit/0ffc7dcdbae422ce89145565cc1c75b4e86b2c07)), closes [#153](https://github.com/claudekit/claudekit-engineer/issues/153)

## [1.20.0](https://github.com/claudekit/claudekit-engineer/compare/v1.19.0...v1.20.0) (2025-12-11)


### 🚀 Features

* add hybrid output-type detection for /ck-help ([480ec1c](https://github.com/claudekit/claudekit-engineer/commit/480ec1c2e9f5fe4107964d4f48418d9f408d506b))
* implement cascading config resolution (global → local) ([9a826c8](https://github.com/claudekit/claudekit-engineer/commit/9a826c8f3accf54e1a8cbe2c4948999f364a806e))
* implement hook consolidation with plan name config ([#134](https://github.com/claudekit/claudekit-engineer/issues/134)) ([764e962](https://github.com/claudekit/claudekit-engineer/commit/764e96220b65554affef83459c98fb64c219518e)), closes [#88](https://github.com/claudekit/claudekit-engineer/issues/88)
* **install:** implement bulletproof skills installation with error tracking ([6d47df0](https://github.com/claudekit/claudekit-engineer/commit/6d47df017dd2268cdce94e43eb046b5cce40cf3e))
* **skills:** integrate ui-ux-pro-max as primary frontend skill ([3c3a5c4](https://github.com/claudekit/claudekit-engineer/commit/3c3a5c46a071f5b2b7dd9eab5d8ac946dea71dc4)), closes [#142](https://github.com/claudekit/claudekit-engineer/issues/142)


### 🐞 Bug Fixes

* **hooks:** correct .ckignore path calculation in scout-block ([fd09f6f](https://github.com/claudekit/claudekit-engineer/commit/fd09f6f4d33531a0090571d8684c734ddb358760)), closes [#144](https://github.com/claudekit/claudekit-engineer/issues/144)
* **hooks:** prevent stale plan pollution on fresh sessions ([bd17c53](https://github.com/claudekit/claudekit-engineer/commit/bd17c53daa2d2de499d6e3d284d2ba5d9c402aba)), closes [#146](https://github.com/claudekit/claudekit-engineer/issues/146)
* **install:** add bulletproof error handling and state persistence ([8b1628d](https://github.com/claudekit/claudekit-engineer/commit/8b1628df9ee09ca2bc3e2288a68dc853ad9e7f68))
* **install:** resolve Windows PowerShell detection and state errors ([c4b2c10](https://github.com/claudekit/claudekit-engineer/commit/c4b2c10ec0c6e9e29fee973a66761503054c4d14)), closes [#148](https://github.com/claudekit/claudekit-engineer/issues/148)
* resolve workflow paths from global ~/.claude when local files missing ([9a66e21](https://github.com/claudekit/claudekit-engineer/commit/9a66e21f77375b91ce4e7a8ce5df93245119010b)), closes [#117](https://github.com/claudekit/claudekit-engineer/issues/117)
* **skill:** improve ui-ux-pro-max activation for frontend work ([0ffc7dc](https://github.com/claudekit/claudekit-engineer/commit/0ffc7dcdbae422ce89145565cc1c75b4e86b2c07)), closes [#153](https://github.com/claudekit/claudekit-engineer/issues/153)


### 📚 Documentation

* fix YANGI typo to YAGNI across documentation ([2403f12](https://github.com/claudekit/claudekit-engineer/commit/2403f12c362792084b0d892d29df38752589db7c)), closes [#138](https://github.com/claudekit/claudekit-engineer/issues/138)
* revert documentation changes and restore original content ([bf114ed](https://github.com/claudekit/claudekit-engineer/commit/bf114ed2ae5b24ce2f956a3ac021dd02e6f5b615))


### ♻️ Code Refactoring

* migrate active-plan storage to session state ([942a074](https://github.com/claudekit/claudekit-engineer/commit/942a074980f21bbbbf0868c303aeb04d68b6239e))
* remove opencode for now ([f0b1fba](https://github.com/claudekit/claudekit-engineer/commit/f0b1fba46938ab59621018ce2cbb41c9307efd7b))
* replace hardcoded date formats with {date} placeholder ([fdf035a](https://github.com/claudekit/claudekit-engineer/commit/fdf035a83d21bac55f9322399d2a853ed93be960)), closes [#140](https://github.com/claudekit/claudekit-engineer/issues/140)


### ⚡ Performance Improvements

* **hooks:** optimize token consumption in hook system ([f0007bc](https://github.com/claudekit/claudekit-engineer/commit/f0007bc52b64032c7692576109d7a35a91977f4e)), closes [#150](https://github.com/claudekit/claudekit-engineer/issues/150)
* new command -> `/code:auto` with auto-approval mode activated ([3622168](https://github.com/claudekit/claudekit-engineer/commit/36221682dd0f215b688cb806c7d1172b4b6c3ae7))
* **skill:** enhance chrome-devtools with aria snapshot and ref selection ([d50489f](https://github.com/claudekit/claudekit-engineer/commit/d50489f5ee6d5d3f6c1f331df3dc89aa7f380a98))

## [1.20.0-beta.13](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.12...v1.20.0-beta.13) (2025-12-11)


### 🐞 Bug Fixes

* **skill:** improve ui-ux-pro-max activation for frontend work ([0ffc7dc](https://github.com/claudekit/claudekit-engineer/commit/0ffc7dcdbae422ce89145565cc1c75b4e86b2c07)), closes [#153](https://github.com/claudekit/claudekit-engineer/issues/153)


### 📚 Documentation

* revert documentation changes and restore original content ([bf114ed](https://github.com/claudekit/claudekit-engineer/commit/bf114ed2ae5b24ce2f956a3ac021dd02e6f5b615))

## [1.20.0-beta.12](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.11...v1.20.0-beta.12) (2025-12-10)


### ⚡ Performance Improvements

* **hooks:** optimize token consumption in hook system ([f0007bc](https://github.com/claudekit/claudekit-engineer/commit/f0007bc52b64032c7692576109d7a35a91977f4e)), closes [#150](https://github.com/claudekit/claudekit-engineer/issues/150)

## [1.20.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.10...v1.20.0-beta.11) (2025-12-09)


### 🐞 Bug Fixes

* **install:** resolve Windows PowerShell detection and state errors ([c4b2c10](https://github.com/claudekit/claudekit-engineer/commit/c4b2c10ec0c6e9e29fee973a66761503054c4d14)), closes [#148](https://github.com/claudekit/claudekit-engineer/issues/148)

## [1.20.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.9...v1.20.0-beta.10) (2025-12-08)


### 🐞 Bug Fixes

* **hooks:** prevent stale plan pollution on fresh sessions ([bd17c53](https://github.com/claudekit/claudekit-engineer/commit/bd17c53daa2d2de499d6e3d284d2ba5d9c402aba)), closes [#146](https://github.com/claudekit/claudekit-engineer/issues/146)

## [1.20.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.8...v1.20.0-beta.9) (2025-12-08)


### 🐞 Bug Fixes

* **hooks:** correct .ckignore path calculation in scout-block ([fd09f6f](https://github.com/claudekit/claudekit-engineer/commit/fd09f6f4d33531a0090571d8684c734ddb358760)), closes [#144](https://github.com/claudekit/claudekit-engineer/issues/144)

## [1.20.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.7...v1.20.0-beta.8) (2025-12-08)


### 🚀 Features

* **skills:** integrate ui-ux-pro-max as primary frontend skill ([3c3a5c4](https://github.com/claudekit/claudekit-engineer/commit/3c3a5c46a071f5b2b7dd9eab5d8ac946dea71dc4)), closes [#142](https://github.com/claudekit/claudekit-engineer/issues/142)

## [1.20.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.6...v1.20.0-beta.7) (2025-12-07)


### 📚 Documentation

* fix YANGI typo to YAGNI across documentation ([2403f12](https://github.com/claudekit/claudekit-engineer/commit/2403f12c362792084b0d892d29df38752589db7c)), closes [#138](https://github.com/claudekit/claudekit-engineer/issues/138)


### ♻️ Code Refactoring

* replace hardcoded date formats with {date} placeholder ([fdf035a](https://github.com/claudekit/claudekit-engineer/commit/fdf035a83d21bac55f9322399d2a853ed93be960)), closes [#140](https://github.com/claudekit/claudekit-engineer/issues/140)

## [1.20.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.5...v1.20.0-beta.6) (2025-12-07)


### ♻️ Code Refactoring

* migrate active-plan storage to session state ([942a074](https://github.com/claudekit/claudekit-engineer/commit/942a074980f21bbbbf0868c303aeb04d68b6239e))

## [1.20.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.4...v1.20.0-beta.5) (2025-12-07)


### 🚀 Features

* **install:** implement bulletproof skills installation with error tracking ([6d47df0](https://github.com/claudekit/claudekit-engineer/commit/6d47df017dd2268cdce94e43eb046b5cce40cf3e))


### 🐞 Bug Fixes

* **install:** add bulletproof error handling and state persistence ([8b1628d](https://github.com/claudekit/claudekit-engineer/commit/8b1628df9ee09ca2bc3e2288a68dc853ad9e7f68))

## [1.20.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.3...v1.20.0-beta.4) (2025-12-06)


### 🚀 Features

* add hybrid output-type detection for /ck-help ([480ec1c](https://github.com/claudekit/claudekit-engineer/commit/480ec1c2e9f5fe4107964d4f48418d9f408d506b))

## [1.20.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.2...v1.20.0-beta.3) (2025-12-06)


### 🚀 Features

* implement cascading config resolution (global → local) ([9a826c8](https://github.com/claudekit/claudekit-engineer/commit/9a826c8f3accf54e1a8cbe2c4948999f364a806e))

## [1.20.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v1.20.0-beta.1...v1.20.0-beta.2) (2025-12-06)


### 🐞 Bug Fixes

* resolve workflow paths from global ~/.claude when local files missing ([9a66e21](https://github.com/claudekit/claudekit-engineer/commit/9a66e21f77375b91ce4e7a8ce5df93245119010b)), closes [#117](https://github.com/claudekit/claudekit-engineer/issues/117)

## [1.20.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.19.1-beta.1...v1.20.0-beta.1) (2025-12-06)


### 🚀 Features

* implement hook consolidation with plan name config ([#134](https://github.com/claudekit/claudekit-engineer/issues/134)) ([764e962](https://github.com/claudekit/claudekit-engineer/commit/764e96220b65554affef83459c98fb64c219518e)), closes [#88](https://github.com/claudekit/claudekit-engineer/issues/88)

## [1.19.1-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.19.0...v1.19.1-beta.1) (2025-12-06)


### ⚡ Performance Improvements

* new command -> `/code:auto` with auto-approval mode activated ([3622168](https://github.com/claudekit/claudekit-engineer/commit/36221682dd0f215b688cb806c7d1172b4b6c3ae7))

## [1.19.0](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0...v1.19.0) (2025-12-05)


### 🚀 Features

* **ai-multimodal:** add stdin support for piped file input ([#123](https://github.com/claudekit/claudekit-engineer/issues/123)) ([76c65b4](https://github.com/claudekit/claudekit-engineer/commit/76c65b4d7603d2ecc4259ab777933f3216dddf78)), closes [#122](https://github.com/claudekit/claudekit-engineer/issues/122)


### 🐞 Bug Fixes

* `/fix:hard` should utilize `/code` ([f673977](https://github.com/claudekit/claudekit-engineer/commit/f673977c9548cfe216edf417efa09737909c1820))
* `aesthetic` skills is deprecated due to inefficiency ([8592d07](https://github.com/claudekit/claudekit-engineer/commit/8592d07bb43b576fbd07b1636fe9ff4d07b3aa98))
* add proper sudo handling for Linux package installation ([#119](https://github.com/claudekit/claudekit-engineer/issues/119)) ([dac980b](https://github.com/claudekit/claudekit-engineer/commit/dac980b220b4b775048905d07b591f1bca2fd039)), closes [#118](https://github.com/claudekit/claudekit-engineer/issues/118)
* added more env context to `dev-rules-reminder` hook ([0bd3e06](https://github.com/claudekit/claudekit-engineer/commit/0bd3e067552aec82388b01d2e2609931d7d8d1dc))
* **ai-multimodal:** print results to stdout and default to free-tier model ([#126](https://github.com/claudekit/claudekit-engineer/issues/126)) ([317c647](https://github.com/claudekit/claudekit-engineer/commit/317c64737690b9115763941e404b7967b0ffc702)), closes [#124](https://github.com/claudekit/claudekit-engineer/issues/124) [#125](https://github.com/claudekit/claudekit-engineer/issues/125)
* **ck-help:** resolve Windows console UTF-8 encoding issue ([acb64ae](https://github.com/claudekit/claudekit-engineer/commit/acb64ae65da4f535d502c034239ea16823ab2b70))


### 📚 Documentation

* shorten descriptions of docs-manager and fullstack-dev agents ([bffdc79](https://github.com/claudekit/claudekit-engineer/commit/bffdc794cfef7ea685c56bf64ee1e8ac817fe7ec))

## [1.19.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v1.19.0-beta.2...v1.19.0-beta.3) (2025-12-04)


### 🐞 Bug Fixes

* `/fix:hard` should utilize `/code` ([f673977](https://github.com/claudekit/claudekit-engineer/commit/f673977c9548cfe216edf417efa09737909c1820))
* `aesthetic` skills is deprecated due to inefficiency ([8592d07](https://github.com/claudekit/claudekit-engineer/commit/8592d07bb43b576fbd07b1636fe9ff4d07b3aa98))
* add proper sudo handling for Linux package installation ([#119](https://github.com/claudekit/claudekit-engineer/issues/119)) ([dac980b](https://github.com/claudekit/claudekit-engineer/commit/dac980b220b4b775048905d07b591f1bca2fd039)), closes [#118](https://github.com/claudekit/claudekit-engineer/issues/118)
* added more env context to `dev-rules-reminder` hook ([0bd3e06](https://github.com/claudekit/claudekit-engineer/commit/0bd3e067552aec82388b01d2e2609931d7d8d1dc))

## [1.19.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v1.19.0-beta.1...v1.19.0-beta.2) (2025-12-03)


### 🐞 Bug Fixes

* **ai-multimodal:** print results to stdout and default to free-tier model ([#126](https://github.com/claudekit/claudekit-engineer/issues/126)) ([317c647](https://github.com/claudekit/claudekit-engineer/commit/317c64737690b9115763941e404b7967b0ffc702)), closes [#124](https://github.com/claudekit/claudekit-engineer/issues/124) [#125](https://github.com/claudekit/claudekit-engineer/issues/125)

## [1.19.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0...v1.19.0-beta.1) (2025-12-03)


### 🚀 Features

* **ai-multimodal:** add stdin support for piped file input ([#123](https://github.com/claudekit/claudekit-engineer/issues/123)) ([76c65b4](https://github.com/claudekit/claudekit-engineer/commit/76c65b4d7603d2ecc4259ab777933f3216dddf78)), closes [#122](https://github.com/claudekit/claudekit-engineer/issues/122)

## [1.18.0-beta.13](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.12...v1.18.0-beta.13) (2025-12-03)


### 🚀 Features

* **ai-multimodal:** add stdin support for piped file input ([#123](https://github.com/claudekit/claudekit-engineer/issues/123)) ([76c65b4](https://github.com/claudekit/claudekit-engineer/commit/76c65b4d7603d2ecc4259ab777933f3216dddf78)), closes [#122](https://github.com/claudekit/claudekit-engineer/issues/122)

## [1.18.0](https://github.com/claudekit/claudekit-engineer/compare/v1.17.1...v1.18.0) (2025-12-03)


### 🚀 Features

* **commands:** add /ck-help command for ClaudeKit usage guide ([#114](https://github.com/claudekit/claudekit-engineer/issues/114)) ([8234cf3](https://github.com/claudekit/claudekit-engineer/commit/8234cf30caf13b1bb012f2aa9d2ff9e7d327d034)), closes [#99](https://github.com/claudekit/claudekit-engineer/issues/99)
* new command: `/git:merge <to> <from>` ([79e45f4](https://github.com/claudekit/claudekit-engineer/commit/79e45f4f3429b6d6907627a07e2468b9d85023df))


### 🐞 Bug Fixes

* `/fix:hard` should ask user for clarifications ([605f6b2](https://github.com/claudekit/claudekit-engineer/commit/605f6b28bf0fa22dc267c6bfae1e1437e14a05b4))
* `/fix:hard` should utilize `/code` ([b144ad9](https://github.com/claudekit/claudekit-engineer/commit/b144ad91e7a9434b3e4fb29b04f9e69407b30486))
* add proper sudo handling for Linux package installation ([#119](https://github.com/claudekit/claudekit-engineer/issues/119)) ([6453335](https://github.com/claudekit/claudekit-engineer/commit/6453335b80d10dc05e60543b17603296d47fae9b)), closes [#118](https://github.com/claudekit/claudekit-engineer/issues/118)
* **ai-multimodal:** auto-detect task from file extension ([#102](https://github.com/claudekit/claudekit-engineer/issues/102)) ([#113](https://github.com/claudekit/claudekit-engineer/issues/113)) ([230d04c](https://github.com/claudekit/claudekit-engineer/commit/230d04cb3f5e61a65089fb3c4605c7c1a1aa3699))
* allow research in `/skill:add` & `/skill:fix` ([3c7d27f](https://github.com/claudekit/claudekit-engineer/commit/3c7d27f19a35060bb554e7c9552c46cb95983c6c))
* detect and warn about broken UV Python installation ([7f58766](https://github.com/claudekit/claudekit-engineer/commit/7f5876649189f21a206591af07da022ad6f9d056))
* handle corrupted venv in skills install script ([b90928f](https://github.com/claudekit/claudekit-engineer/commit/b90928fd71ea0d9038521a358074559d71e53cf0))
* **hooks:** convert ES6 imports to CommonJS for hook compatibility ([#103](https://github.com/claudekit/claudekit-engineer/issues/103)) ([9cd2e08](https://github.com/claudekit/claudekit-engineer/commit/9cd2e082477328bf175af9b198bb6c66a2af2755)), closes [#86](https://github.com/claudekit/claudekit-engineer/issues/86)
* **install:** use command-first detection for npm packages ([#101](https://github.com/claudekit/claudekit-engineer/issues/101)) ([e162508](https://github.com/claudekit/claudekit-engineer/commit/e1625087dd832e136ce0f73aff635c9b930454d9))
* robust venv creation with ensurepip fallback and validation ([b2b81c5](https://github.com/claudekit/claudekit-engineer/commit/b2b81c5846cdc8d8db140ad09259498cd78973dd))
* skills install script fails due to bash arithmetic exit code ([#111](https://github.com/claudekit/claudekit-engineer/issues/111)) ([b498d35](https://github.com/claudekit/claudekit-engineer/commit/b498d35c9f2004388728e77e3c93a80bd5567ed0))
* skills installation fails on macOS and hides pip errors ([#109](https://github.com/claudekit/claudekit-engineer/issues/109)) ([3c83e22](https://github.com/claudekit/claudekit-engineer/commit/3c83e22784ee3c1c9b61f8f82b72144f4192493e)), closes [#108](https://github.com/claudekit/claudekit-engineer/issues/108)
* skills installation fails on macOS and hides pip errors ([#110](https://github.com/claudekit/claudekit-engineer/issues/110)) ([c33167b](https://github.com/claudekit/claudekit-engineer/commit/c33167b26ef8220ebded794f57896fd773c5fb53)), closes [#108](https://github.com/claudekit/claudekit-engineer/issues/108)


### 📚 Documentation

* fix discord link in readme ([049151f](https://github.com/claudekit/claudekit-engineer/commit/049151f5bba097f8728398aaae72f902598c8fcc)), closes [#112](https://github.com/claudekit/claudekit-engineer/issues/112)


### ⚡ Performance Improvements

* `/skill:create` can ask for clarifications ([7f447eb](https://github.com/claudekit/claudekit-engineer/commit/7f447eb267f8115edd0d1b5eb9a1f1c390820ce9))
* new command: `/code:no-test` ([0cf49e4](https://github.com/claudekit/claudekit-engineer/commit/0cf49e4a0f6058de274344228bc8372b817e6358))
* use native `AskUserQuestion` tool for clarifications ([d342b8b](https://github.com/claudekit/claudekit-engineer/commit/d342b8bfb87c3a162870b4f35c794fafc10edd31))

## [1.18.0-beta.12](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.11...v1.18.0-beta.12) (2025-12-02)


### 🐞 Bug Fixes

* add proper sudo handling for Linux package installation ([#119](https://github.com/claudekit/claudekit-engineer/issues/119)) ([6453335](https://github.com/claudekit/claudekit-engineer/commit/6453335b80d10dc05e60543b17603296d47fae9b)), closes [#118](https://github.com/claudekit/claudekit-engineer/issues/118)

## [1.18.0-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.10...v1.18.0-beta.11) (2025-12-01)


### 🐞 Bug Fixes

* `/fix:hard` should utilize `/code` ([b144ad9](https://github.com/claudekit/claudekit-engineer/commit/b144ad91e7a9434b3e4fb29b04f9e69407b30486))

## [1.18.0-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.9...v1.18.0-beta.10) (2025-12-01)


### 🐞 Bug Fixes

* `/fix:hard` should ask user for clarifications ([605f6b2](https://github.com/claudekit/claudekit-engineer/commit/605f6b28bf0fa22dc267c6bfae1e1437e14a05b4))
* allow research in `/skill:add` & `/skill:fix` ([3c7d27f](https://github.com/claudekit/claudekit-engineer/commit/3c7d27f19a35060bb554e7c9552c46cb95983c6c))


### 📚 Documentation

* fix discord link in readme ([049151f](https://github.com/claudekit/claudekit-engineer/commit/049151f5bba097f8728398aaae72f902598c8fcc)), closes [#112](https://github.com/claudekit/claudekit-engineer/issues/112)


### ⚡ Performance Improvements

* `/skill:create` can ask for clarifications ([7f447eb](https://github.com/claudekit/claudekit-engineer/commit/7f447eb267f8115edd0d1b5eb9a1f1c390820ce9))
* new command: `/code:no-test` ([0cf49e4](https://github.com/claudekit/claudekit-engineer/commit/0cf49e4a0f6058de274344228bc8372b817e6358))

## [1.18.0-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.8...v1.18.0-beta.9) (2025-12-01)


### 🚀 Features

* **commands:** add /ck-help command for ClaudeKit usage guide ([#114](https://github.com/claudekit/claudekit-engineer/issues/114)) ([8234cf3](https://github.com/claudekit/claudekit-engineer/commit/8234cf30caf13b1bb012f2aa9d2ff9e7d327d034)), closes [#99](https://github.com/claudekit/claudekit-engineer/issues/99)

## [1.18.0-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.7...v1.18.0-beta.8) (2025-12-01)


### 🐞 Bug Fixes

* detect and warn about broken UV Python installation ([7f58766](https://github.com/claudekit/claudekit-engineer/commit/7f5876649189f21a206591af07da022ad6f9d056))

## [1.18.0-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.6...v1.18.0-beta.7) (2025-12-01)


### 🐞 Bug Fixes

* robust venv creation with ensurepip fallback and validation ([b2b81c5](https://github.com/claudekit/claudekit-engineer/commit/b2b81c5846cdc8d8db140ad09259498cd78973dd))

## [1.18.0-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.5...v1.18.0-beta.6) (2025-12-01)


### 🐞 Bug Fixes

* **ai-multimodal:** auto-detect task from file extension ([#102](https://github.com/claudekit/claudekit-engineer/issues/102)) ([#113](https://github.com/claudekit/claudekit-engineer/issues/113)) ([230d04c](https://github.com/claudekit/claudekit-engineer/commit/230d04cb3f5e61a65089fb3c4605c7c1a1aa3699))

## [1.18.0-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.4...v1.18.0-beta.5) (2025-12-01)


### 🐞 Bug Fixes

* handle corrupted venv in skills install script ([b90928f](https://github.com/claudekit/claudekit-engineer/commit/b90928fd71ea0d9038521a358074559d71e53cf0))

## [1.18.0-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.3...v1.18.0-beta.4) (2025-12-01)


### 🐞 Bug Fixes

* skills install script fails due to bash arithmetic exit code ([#111](https://github.com/claudekit/claudekit-engineer/issues/111)) ([b498d35](https://github.com/claudekit/claudekit-engineer/commit/b498d35c9f2004388728e77e3c93a80bd5567ed0))

## [1.18.0-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.2...v1.18.0-beta.3) (2025-12-01)


### 🐞 Bug Fixes

* skills installation fails on macOS and hides pip errors ([#110](https://github.com/claudekit/claudekit-engineer/issues/110)) ([c33167b](https://github.com/claudekit/claudekit-engineer/commit/c33167b26ef8220ebded794f57896fd773c5fb53)), closes [#108](https://github.com/claudekit/claudekit-engineer/issues/108)

## [1.18.0-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v1.18.0-beta.1...v1.18.0-beta.2) (2025-12-01)


### 🐞 Bug Fixes

* skills installation fails on macOS and hides pip errors ([#109](https://github.com/claudekit/claudekit-engineer/issues/109)) ([3c83e22](https://github.com/claudekit/claudekit-engineer/commit/3c83e22784ee3c1c9b61f8f82b72144f4192493e)), closes [#108](https://github.com/claudekit/claudekit-engineer/issues/108)

## [1.18.0-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.17.1...v1.18.0-beta.1) (2025-12-01)


### 🚀 Features

* new command: `/git:merge <to> <from>` ([79e45f4](https://github.com/claudekit/claudekit-engineer/commit/79e45f4f3429b6d6907627a07e2468b9d85023df))


### 🐞 Bug Fixes

* **hooks:** convert ES6 imports to CommonJS for hook compatibility ([#103](https://github.com/claudekit/claudekit-engineer/issues/103)) ([9cd2e08](https://github.com/claudekit/claudekit-engineer/commit/9cd2e082477328bf175af9b198bb6c66a2af2755)), closes [#86](https://github.com/claudekit/claudekit-engineer/issues/86)
* **install:** use command-first detection for npm packages ([#101](https://github.com/claudekit/claudekit-engineer/issues/101)) ([e162508](https://github.com/claudekit/claudekit-engineer/commit/e1625087dd832e136ce0f73aff635c9b930454d9))


### ⚡ Performance Improvements

* use native `AskUserQuestion` tool for clarifications ([d342b8b](https://github.com/claudekit/claudekit-engineer/commit/d342b8bfb87c3a162870b4f35c794fafc10edd31))

## [1.17.1](https://github.com/claudekit/claudekit-engineer/compare/v1.17.0...v1.17.1) (2025-12-01)


### 🐞 Bug Fixes

* correct license ([f260430](https://github.com/claudekit/claudekit-engineer/commit/f2604303037f80d018ea1e0c1890b708c29b0847))

## [1.17.0](https://github.com/claudekit/claudekit-engineer/compare/v1.16.3...v1.17.0) (2025-12-01)


### 🚀 Features

* **skills:** add ui-ux-pro-max design intelligence skill ([01d7ed1](https://github.com/claudekit/claudekit-engineer/commit/01d7ed133071cf040dfbf3faa39566e15cd6d0fe))

## [1.16.3](https://github.com/claudekit/claudekit-engineer/compare/v1.16.2...v1.16.3) (2025-12-01)


### 🐞 Bug Fixes

* **hooks:** add dev-rules-reminder and scout-block hooks for improved development workflow ([fe004a0](https://github.com/claudekit/claudekit-engineer/commit/fe004a01168482f9bd44f104909e25cbccd8effd))

## [1.16.3-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.16.2...v1.16.3-beta.1) (2025-12-01)


### 🐞 Bug Fixes

* **hooks:** convert ES6 imports to CommonJS for hook compatibility ([#103](https://github.com/claudekit/claudekit-engineer/issues/103)) ([9cd2e08](https://github.com/claudekit/claudekit-engineer/commit/9cd2e082477328bf175af9b198bb6c66a2af2755)), closes [#86](https://github.com/claudekit/claudekit-engineer/issues/86)
* **install:** use command-first detection for npm packages ([#101](https://github.com/claudekit/claudekit-engineer/issues/101)) ([e162508](https://github.com/claudekit/claudekit-engineer/commit/e1625087dd832e136ce0f73aff635c9b930454d9))

## [1.16.2](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1...v1.16.2) (2025-11-30)


### 🐞 Bug Fixes

* correct module hooks ([b0b5a3b](https://github.com/claudekit/claudekit-engineer/commit/b0b5a3b27140d64e229aa0cda99db19d70e324ef))

## [1.16.1](https://github.com/claudekit/claudekit-engineer/compare/v1.16.0...v1.16.1) (2025-11-29)


### 🐞 Bug Fixes

* `/code` enhancement ([805c503](https://github.com/claudekit/claudekit-engineer/commit/805c503f068be2b13820db6e3baf0c2a58551187))
* **active-plan:** use WORKING-DIR prefix to bypass CLI transformer ([2cd71c3](https://github.com/claudekit/claudekit-engineer/commit/2cd71c3ff02c30b4efa2e369cc10f5be53e9cb2e))
* **active-plan:** use WORKING-DIR prefix to bypass CLI transformer ([869a3b8](https://github.com/claudekit/claudekit-engineer/commit/869a3b8b94a7e62898851b1b2f03692af43aa3f6))
* **active-plan:** use WORKING-DIR prefix to bypass CLI transformer ([3875b31](https://github.com/claudekit/claudekit-engineer/commit/3875b31e83a8b497b885d22d5550aa176c118df2))
* **agents:** add active-plan awareness for report output coordination ([95a47f3](https://github.com/claudekit/claudekit-engineer/commit/95a47f340f73094dae015cda703d0d4fdd3f49bd))
* **agents:** add active-plan awareness for report output coordination ([d46f64e](https://github.com/claudekit/claudekit-engineer/commit/d46f64e32fe006e238fbab47d130637242057da6))
* **agents:** add active-plan awareness for report output coordination ([b5d8f9c](https://github.com/claudekit/claudekit-engineer/commit/b5d8f9c997c29e7b28b86ecd40dc873535c0d53f))
* **agents:** add large file handling guidance to scout and planner agents ([#73](https://github.com/claudekit/claudekit-engineer/issues/73)) ([7142429](https://github.com/claudekit/claudekit-engineer/commit/71424298f5093132c90c0a0d16222303181cceee)), closes [#66](https://github.com/claudekit/claudekit-engineer/issues/66)
* **agents:** extend active-plan awareness to 8 doc-producing agents ([e252544](https://github.com/claudekit/claudekit-engineer/commit/e252544f579d7d19a475c1610f64e11c7094fa50)), closes [#91](https://github.com/claudekit/claudekit-engineer/issues/91)
* **agents:** extend active-plan awareness to 8 doc-producing agents ([609e279](https://github.com/claudekit/claudekit-engineer/commit/609e279896d8987c99c11480add59b1020f9facb)), closes [#91](https://github.com/claudekit/claudekit-engineer/issues/91)
* **agents:** prevent subagents from spawning subagents in docs commands ([7af8924](https://github.com/claudekit/claudekit-engineer/commit/7af89249822e6006beb2b5d51692f0e10cd3869f)), closes [#68](https://github.com/claudekit/claudekit-engineer/issues/68)
* **agents:** prevent subagents from spawning subagents in docs commands ([7730212](https://github.com/claudekit/claudekit-engineer/commit/7730212345e87668ca0e1853bb5596f63631e37c)), closes [#68](https://github.com/claudekit/claudekit-engineer/issues/68)
* **catalog-generation:** resolve .claude paths relative to home directory ([ae017a8](https://github.com/claudekit/claudekit-engineer/commit/ae017a8d8de10ef736eae60aaf54071d9af0460d))
* **commands:** add active-plan state check to prevent duplicate plan folders ([c81cc8d](https://github.com/claudekit/claudekit-engineer/commit/c81cc8de33884a11a8c2f60e76160479655b2922)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **commands:** add active-plan state check to prevent duplicate plan folders ([f2a8c22](https://github.com/claudekit/claudekit-engineer/commit/f2a8c22e65b20a108aeef60d691a933f9a5be6dc)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **commands:** add active-plan state check to prevent duplicate plan folders ([2096047](https://github.com/claudekit/claudekit-engineer/commit/209604760a24178919636731e451193e2b18f611)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* enhance `/code` command (thanks [@dta](https://github.com/dta).teks) ([f7b1c3c](https://github.com/claudekit/claudekit-engineer/commit/f7b1c3cef87d5523506262413d6e53b6820ae65b))
* enhance `ai-multimodal` skills with detailed instructions & descriptions ([a36b2bc](https://github.com/claudekit/claudekit-engineer/commit/a36b2bcd0263f74673f9f616d7a338b317b9e620))
* **env:** resolve GEMINI_API_KEY detection without python-dotenv ([#94](https://github.com/claudekit/claudekit-engineer/issues/94)) ([bf8ad35](https://github.com/claudekit/claudekit-engineer/commit/bf8ad355c60110c13241ba41cb90a373b9d26753)), closes [#92](https://github.com/claudekit/claudekit-engineer/issues/92)
* **env:** resolve GEMINI_API_KEY detection without python-dotenv ([#94](https://github.com/claudekit/claudekit-engineer/issues/94)) ([4080442](https://github.com/claudekit/claudekit-engineer/commit/4080442c96257b2cc990c9e4e18369f730515b37)), closes [#92](https://github.com/claudekit/claudekit-engineer/issues/92)
* **hooks:** respect .ckignore patterns in scout-block hook ([#64](https://github.com/claudekit/claudekit-engineer/issues/64)) ([#70](https://github.com/claudekit/claudekit-engineer/issues/70)) ([c0b73d7](https://github.com/claudekit/claudekit-engineer/commit/c0b73d7df0c76fd4e80163a9d51f0bc545c2fd1b))
* issue of `ai-multimodal` skill generate video with start/end frame ([e7e74d5](https://github.com/claudekit/claudekit-engineer/commit/e7e74d5c9a90fd1d0d778ed6fe047796983f61bb))
* **planning:** add active-plan state tracking to prevent version proliferation ([13a19f6](https://github.com/claudekit/claudekit-engineer/commit/13a19f62d74552afb2998ed62e011f1c860d1006)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **planning:** add active-plan state tracking to prevent version proliferation ([572769b](https://github.com/claudekit/claudekit-engineer/commit/572769b82b36b02af19434ca9931f464e146c9e2)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **planning:** add active-plan state tracking to prevent version proliferation ([95625ad](https://github.com/claudekit/claudekit-engineer/commit/95625ad3ded678865762f108e804c0110906c626)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **scripts:** resolve path issues in generate_catalogs.py ([#75](https://github.com/claudekit/claudekit-engineer/issues/75)) ([#89](https://github.com/claudekit/claudekit-engineer/issues/89)) ([adbfc17](https://github.com/claudekit/claudekit-engineer/commit/adbfc17992cbdaf96f7d09e0d9a18957fd090388))
* **scripts:** resolve path issues in generate_catalogs.py ([#75](https://github.com/claudekit/claudekit-engineer/issues/75)) ([#89](https://github.com/claudekit/claudekit-engineer/issues/89)) ([1a0281b](https://github.com/claudekit/claudekit-engineer/commit/1a0281bc260453029b8ec1aa1d47b4c57f72b1a9))
* **skills:** resolve PowerShell install script failures on Windows ([#90](https://github.com/claudekit/claudekit-engineer/issues/90)) ([361b947](https://github.com/claudekit/claudekit-engineer/commit/361b9479d19ec0f476bb4ab8fcb539d15dff69a5)), closes [#71](https://github.com/claudekit/claudekit-engineer/issues/71) [#71](https://github.com/claudekit/claudekit-engineer/issues/71)
* **skills:** resolve PowerShell install script failures on Windows ([#90](https://github.com/claudekit/claudekit-engineer/issues/90)) ([ac23b6f](https://github.com/claudekit/claudekit-engineer/commit/ac23b6f4355b954382a0a8548de3593ab18733c5)), closes [#71](https://github.com/claudekit/claudekit-engineer/issues/71) [#71](https://github.com/claudekit/claudekit-engineer/issues/71)
* use `gemini` command (free) to analyze images first ([40971c1](https://github.com/claudekit/claudekit-engineer/commit/40971c18b3ae1bde95b67c1cc224493e05160dd6))


### ♻️ Code Refactoring

* **.claude:** rename hook files to .cjs extension ([4de71d2](https://github.com/claudekit/claudekit-engineer/commit/4de71d2e93cc4cb911fd892705dc6ccb8a0f1462))


### ⚡ Performance Improvements

* **fix-logs:** optimize log reading with Grep head_limit and permanent piping ([#72](https://github.com/claudekit/claudekit-engineer/issues/72)) ([18d4a24](https://github.com/claudekit/claudekit-engineer/commit/18d4a2425a156ad6f979fcc299585bd4ce615ccd)), closes [#65](https://github.com/claudekit/claudekit-engineer/issues/65)
* use `haiku` for `docs-manager`, `journal`, `tester` and `opus` for `planner` ([e486124](https://github.com/claudekit/claudekit-engineer/commit/e4861243aea1d41acd7d85903eaf5718357e774a))

## [1.16.1-beta.11](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.10...v1.16.1-beta.11) (2025-11-29)


### 🐞 Bug Fixes

* **active-plan:** use WORKING-DIR prefix to bypass CLI transformer ([2cd71c3](https://github.com/claudekit/claudekit-engineer/commit/2cd71c3ff02c30b4efa2e369cc10f5be53e9cb2e))
* **active-plan:** use WORKING-DIR prefix to bypass CLI transformer ([869a3b8](https://github.com/claudekit/claudekit-engineer/commit/869a3b8b94a7e62898851b1b2f03692af43aa3f6))
* **agents:** add active-plan awareness for report output coordination ([95a47f3](https://github.com/claudekit/claudekit-engineer/commit/95a47f340f73094dae015cda703d0d4fdd3f49bd))
* **agents:** add active-plan awareness for report output coordination ([d46f64e](https://github.com/claudekit/claudekit-engineer/commit/d46f64e32fe006e238fbab47d130637242057da6))
* **agents:** extend active-plan awareness to 8 doc-producing agents ([e252544](https://github.com/claudekit/claudekit-engineer/commit/e252544f579d7d19a475c1610f64e11c7094fa50)), closes [#91](https://github.com/claudekit/claudekit-engineer/issues/91)
* **agents:** prevent subagents from spawning subagents in docs commands ([7af8924](https://github.com/claudekit/claudekit-engineer/commit/7af89249822e6006beb2b5d51692f0e10cd3869f)), closes [#68](https://github.com/claudekit/claudekit-engineer/issues/68)
* **catalog-generation:** resolve .claude paths relative to home directory ([ae017a8](https://github.com/claudekit/claudekit-engineer/commit/ae017a8d8de10ef736eae60aaf54071d9af0460d))
* **commands:** add active-plan state check to prevent duplicate plan folders ([c81cc8d](https://github.com/claudekit/claudekit-engineer/commit/c81cc8de33884a11a8c2f60e76160479655b2922)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **commands:** add active-plan state check to prevent duplicate plan folders ([f2a8c22](https://github.com/claudekit/claudekit-engineer/commit/f2a8c22e65b20a108aeef60d691a933f9a5be6dc)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **env:** resolve GEMINI_API_KEY detection without python-dotenv ([#94](https://github.com/claudekit/claudekit-engineer/issues/94)) ([bf8ad35](https://github.com/claudekit/claudekit-engineer/commit/bf8ad355c60110c13241ba41cb90a373b9d26753)), closes [#92](https://github.com/claudekit/claudekit-engineer/issues/92)
* issue of `ai-multimodal` skill generate video with start/end frame ([e7e74d5](https://github.com/claudekit/claudekit-engineer/commit/e7e74d5c9a90fd1d0d778ed6fe047796983f61bb))
* **planning:** add active-plan state tracking to prevent version proliferation ([13a19f6](https://github.com/claudekit/claudekit-engineer/commit/13a19f62d74552afb2998ed62e011f1c860d1006)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **planning:** add active-plan state tracking to prevent version proliferation ([572769b](https://github.com/claudekit/claudekit-engineer/commit/572769b82b36b02af19434ca9931f464e146c9e2)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **scripts:** resolve path issues in generate_catalogs.py ([#75](https://github.com/claudekit/claudekit-engineer/issues/75)) ([#89](https://github.com/claudekit/claudekit-engineer/issues/89)) ([adbfc17](https://github.com/claudekit/claudekit-engineer/commit/adbfc17992cbdaf96f7d09e0d9a18957fd090388))
* **skills:** resolve PowerShell install script failures on Windows ([#90](https://github.com/claudekit/claudekit-engineer/issues/90)) ([361b947](https://github.com/claudekit/claudekit-engineer/commit/361b9479d19ec0f476bb4ab8fcb539d15dff69a5)), closes [#71](https://github.com/claudekit/claudekit-engineer/issues/71) [#71](https://github.com/claudekit/claudekit-engineer/issues/71)


### ♻️ Code Refactoring

* **.claude:** rename hook files to .cjs extension ([4de71d2](https://github.com/claudekit/claudekit-engineer/commit/4de71d2e93cc4cb911fd892705dc6ccb8a0f1462))


### ⚡ Performance Improvements

* use `haiku` for `docs-manager`, `journal`, `tester` and `opus` for `planner` ([e486124](https://github.com/claudekit/claudekit-engineer/commit/e4861243aea1d41acd7d85903eaf5718357e774a))

## [1.16.1-beta.10](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.9...v1.16.1-beta.10) (2025-11-29)


### 🐞 Bug Fixes

* **env:** resolve GEMINI_API_KEY detection without python-dotenv ([#94](https://github.com/claudekit/claudekit-engineer/issues/94)) ([4080442](https://github.com/claudekit/claudekit-engineer/commit/4080442c96257b2cc990c9e4e18369f730515b37)), closes [#92](https://github.com/claudekit/claudekit-engineer/issues/92)

## [1.16.1-beta.9](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.8...v1.16.1-beta.9) (2025-11-29)


### 🐞 Bug Fixes

* **agents:** extend active-plan awareness to 8 doc-producing agents ([609e279](https://github.com/claudekit/claudekit-engineer/commit/609e279896d8987c99c11480add59b1020f9facb)), closes [#91](https://github.com/claudekit/claudekit-engineer/issues/91)

## [1.16.1-beta.8](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.7...v1.16.1-beta.8) (2025-11-29)


### 🐞 Bug Fixes

* **active-plan:** use WORKING-DIR prefix to bypass CLI transformer ([3875b31](https://github.com/claudekit/claudekit-engineer/commit/3875b31e83a8b497b885d22d5550aa176c118df2))
* **agents:** add active-plan awareness for report output coordination ([b5d8f9c](https://github.com/claudekit/claudekit-engineer/commit/b5d8f9c997c29e7b28b86ecd40dc873535c0d53f))
* **commands:** add active-plan state check to prevent duplicate plan folders ([2096047](https://github.com/claudekit/claudekit-engineer/commit/209604760a24178919636731e451193e2b18f611)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)
* **planning:** add active-plan state tracking to prevent version proliferation ([95625ad](https://github.com/claudekit/claudekit-engineer/commit/95625ad3ded678865762f108e804c0110906c626)), closes [#74](https://github.com/claudekit/claudekit-engineer/issues/74)

## [1.16.1-beta.7](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.6...v1.16.1-beta.7) (2025-11-28)


### 🐞 Bug Fixes

* **skills:** resolve PowerShell install script failures on Windows ([#90](https://github.com/claudekit/claudekit-engineer/issues/90)) ([ac23b6f](https://github.com/claudekit/claudekit-engineer/commit/ac23b6f4355b954382a0a8548de3593ab18733c5)), closes [#71](https://github.com/claudekit/claudekit-engineer/issues/71) [#71](https://github.com/claudekit/claudekit-engineer/issues/71)

## [1.16.1-beta.6](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.5...v1.16.1-beta.6) (2025-11-28)


### 🐞 Bug Fixes

* **scripts:** resolve path issues in generate_catalogs.py ([#75](https://github.com/claudekit/claudekit-engineer/issues/75)) ([#89](https://github.com/claudekit/claudekit-engineer/issues/89)) ([1a0281b](https://github.com/claudekit/claudekit-engineer/commit/1a0281bc260453029b8ec1aa1d47b4c57f72b1a9))

## [1.16.1-beta.5](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.4...v1.16.1-beta.5) (2025-11-27)


### 🐞 Bug Fixes

* **agents:** prevent subagents from spawning subagents in docs commands ([7730212](https://github.com/claudekit/claudekit-engineer/commit/7730212345e87668ca0e1853bb5596f63631e37c)), closes [#68](https://github.com/claudekit/claudekit-engineer/issues/68)

## [1.16.1-beta.4](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.3...v1.16.1-beta.4) (2025-11-27)


### 🐞 Bug Fixes

* **agents:** add large file handling guidance to scout and planner agents ([#73](https://github.com/claudekit/claudekit-engineer/issues/73)) ([7142429](https://github.com/claudekit/claudekit-engineer/commit/71424298f5093132c90c0a0d16222303181cceee)), closes [#66](https://github.com/claudekit/claudekit-engineer/issues/66)

## [1.16.1-beta.3](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.2...v1.16.1-beta.3) (2025-11-26)


### ⚡ Performance Improvements

* **fix-logs:** optimize log reading with Grep head_limit and permanent piping ([#72](https://github.com/claudekit/claudekit-engineer/issues/72)) ([18d4a24](https://github.com/claudekit/claudekit-engineer/commit/18d4a2425a156ad6f979fcc299585bd4ce615ccd)), closes [#65](https://github.com/claudekit/claudekit-engineer/issues/65)

## [1.16.1-beta.2](https://github.com/claudekit/claudekit-engineer/compare/v1.16.1-beta.1...v1.16.1-beta.2) (2025-11-26)


### 🐞 Bug Fixes

* **hooks:** respect .ckignore patterns in scout-block hook ([#64](https://github.com/claudekit/claudekit-engineer/issues/64)) ([#70](https://github.com/claudekit/claudekit-engineer/issues/70)) ([c0b73d7](https://github.com/claudekit/claudekit-engineer/commit/c0b73d7df0c76fd4e80163a9d51f0bc545c2fd1b))

## [1.16.1-beta.1](https://github.com/claudekit/claudekit-engineer/compare/v1.16.0...v1.16.1-beta.1) (2025-11-26)


### 🐞 Bug Fixes

* `/code` enhancement ([805c503](https://github.com/claudekit/claudekit-engineer/commit/805c503f068be2b13820db6e3baf0c2a58551187))
* enhance `/code` command (thanks [@dta](https://github.com/dta).teks) ([f7b1c3c](https://github.com/claudekit/claudekit-engineer/commit/f7b1c3cef87d5523506262413d6e53b6820ae65b))
* enhance `ai-multimodal` skills with detailed instructions & descriptions ([a36b2bc](https://github.com/claudekit/claudekit-engineer/commit/a36b2bcd0263f74673f9f616d7a338b317b9e620))
* use `gemini` command (free) to analyze images first ([40971c1](https://github.com/claudekit/claudekit-engineer/commit/40971c18b3ae1bde95b67c1cc224493e05160dd6))

## [1.16.0](https://github.com/claudekit/claudekit-engineer/compare/v1.15.2...v1.16.0) (2025-11-26)


### 🚀 Features

* `dev-rules-reminder` hook (fully tested) ([d335aee](https://github.com/claudekit/claudekit-engineer/commit/d335aee82d3163148d0965ca52650201416e46ad))
* **ci:** use Discord embeds for consistent release notifications ([380d03b](https://github.com/claudekit/claudekit-engineer/commit/380d03beb977def325c4e904294f69561b2c2605))


### 🐞 Bug Fixes

* `/code` enhancement ([a301455](https://github.com/claudekit/claudekit-engineer/commit/a3014552f9199f6c32218cc046ccd1782f035698))
* **ci:** correct config file priority for dynamic loading ([fdafbb0](https://github.com/claudekit/claudekit-engineer/commit/fdafbb08ecfbb97aa5509873f8a687c0e232d34f))
* **ci:** embed config directly in .releaserc.cjs ([6845dc6](https://github.com/claudekit/claudekit-engineer/commit/6845dc63ba2a31e312f879f3210d516a23ad7de4))
* **ci:** include main branch in beta config ([0dfed73](https://github.com/claudekit/claudekit-engineer/commit/0dfed73f7b3f3bcf5073de91fb02bfdda2072919))
* **ci:** use dynamic config loader for semantic-release ([ef21662](https://github.com/claudekit/claudekit-engineer/commit/ef216628e32845ecbca7edac4b7c318b0e88054c))
* enhance `/code` command (thanks [@dta](https://github.com/dta).teks) ([3b06c00](https://github.com/claudekit/claudekit-engineer/commit/3b06c005ad70624c3ee8bcf232f3af885e28add4))
* enhance `ai-multimodal` skills with detailed instructions & descriptions ([18cb2f9](https://github.com/claudekit/claudekit-engineer/commit/18cb2f91fb6ec002692b0b7771ed65cf476b2272))
* enhance `dev-rules-reminder` hook ([bd0b059](https://github.com/claudekit/claudekit-engineer/commit/bd0b059abc71466a92ed31e5a16bba01d22a3678))
* **hooks:** convert dev-rules-reminder to ES module syntax ([fdc8b12](https://github.com/claudekit/claudekit-engineer/commit/fdc8b120afe7ef829de3acfa2d9baa55e43d5607))
* **hooks:** convert dev-rules-reminder to ES module syntax ([c4b12ad](https://github.com/claudekit/claudekit-engineer/commit/c4b12add0ecdf4ba5ab1da3ca1ff8b37242475cd))
* **hooks:** convert scout-block to ES module syntax ([27a3d39](https://github.com/claudekit/claudekit-engineer/commit/27a3d39cd6470502868cadc74b14e25ebd8fe79e))
* organize report files ([bf71157](https://github.com/claudekit/claudekit-engineer/commit/bf71157914732339acc086b75075136f64c05169))
* skill installation script hanging on windows powershell ([67b0792](https://github.com/claudekit/claudekit-engineer/commit/67b07921528aa8707be667add8bd2e4f7ee92625))
* skills installation script hanging issue ([ae2b60c](https://github.com/claudekit/claudekit-engineer/commit/ae2b60c2b64a501308bc8a85d8b5e43c273786eb))
* stop creating random markdown files ([8c8ae60](https://github.com/claudekit/claudekit-engineer/commit/8c8ae60c0d6da46054c042dbbc1f94919f3bd6ff))
* use `gemini` command (free) to analyze images first ([0f62fc2](https://github.com/claudekit/claudekit-engineer/commit/0f62fc2bba8d1945a1daf92af9084a2eec6d6fb9))


### 📚 Documentation

* **agents:** enhance git-manager & add fullstack-developer specs ([e828757](https://github.com/claudekit/claudekit-engineer/commit/e82875799e513b2f4999e8be985fe5b7504546b0))
* **agents:** enhance git-manager & add fullstack-developer specs ([4b751aa](https://github.com/claudekit/claudekit-engineer/commit/4b751aa6f4384788c8d9f339c266d4a34b39de6e))
* **commands:** add parallel execution definitions ([c7b6c6a](https://github.com/claudekit/claudekit-engineer/commit/c7b6c6a83dfa28e101f96a705c019c0866550a3b))
* **commands:** add parallel execution definitions ([5eff2b2](https://github.com/claudekit/claudekit-engineer/commit/5eff2b2a16f99374d22061afdb157a286414df94))
* **commands:** enhance fix command specs and add parallel execution ([9eb7b91](https://github.com/claudekit/claudekit-engineer/commit/9eb7b91eb078df0a5c2d2b2aeece4b57f096dcb3))
* **release:** add JSON schema to semantic-release configs ([2299428](https://github.com/claudekit/claudekit-engineer/commit/22994285c626aead8f15357eac001b6f5a52f0bb))


### ♻️ Code Refactoring

* migrate command/skill data to YAML format and enhance catalog generation ([5995159](https://github.com/claudekit/claudekit-engineer/commit/5995159943e77dc57988a2ac47ed8718204138a4))


### ⚡ Performance Improvements

* enhance debugging skills ([fa54ca4](https://github.com/claudekit/claudekit-engineer/commit/fa54ca463cf49e0703c2aac9035a39830d4c798b))
* enhance plan organization rules ([dc588a2](https://github.com/claudekit/claudekit-engineer/commit/dc588a2878c34e5e65411625d2f5d0e632b7a021))
* improve `ai-multimodal` skill ([cf4bd54](https://github.com/claudekit/claudekit-engineer/commit/cf4bd5471af5cde7297226ffa4e489c3729278e0))


### 👷 CI

* **release:** add beta release workflow with semantic-release ([2efeb6c](https://github.com/claudekit/claudekit-engineer/commit/2efeb6c18a9d7f735b18b71dfed16d246cdbae9d))
* **release:** add logging to semantic-release config loader ([6313b35](https://github.com/claudekit/claudekit-engineer/commit/6313b35ecbe403245464e0e2b7a78dbf2394d888))
