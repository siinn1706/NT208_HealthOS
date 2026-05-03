# Phase 01 reference → screen mapping

**Status:** Heuristic only — `mobile-ref-*.png` files were not present in the repository at implementation time. When you add artifacts under `_design/cursor-phases/phase-01-mobile-refs-000-014/mobile/`, replace the **Likely route** column with confirmed labels.

| Ref        | Likely route / screen              | Notes                                      |
| ---------- | ---------------------------------- | ------------------------------------------ |
| mobile-000 | `app/index` or `auth/welcome`      | Entry / splash / welcome                   |
| mobile-001 | `auth/sign-in`                     | Sign-in shell                              |
| mobile-002 | `auth/sign-up`                     | Sign-up shell                              |
| mobile-003 | `auth/otp`                         | OTP / verification                         |
| mobile-004 | `auth/setup` or `auth/forgot`      | Profile setup or recovery                  |
| mobile-005 | `onboarding/*` or `auth/setup`     | Permissions / onboarding step              |
| mobile-006 | `(tabs)/home`                      | Home tab root                              |
| mobile-007 | `(tabs)/care`                      | Care tab root                              |
| mobile-008 | `(tabs)/chat`                      | Chat tab root                              |
| mobile-009 | `(tabs)/meds`                      | Meds tab root                              |
| mobile-010 | `(tabs)/me`                        | Me tab root                                |
| mobile-011 | `meals` or `insights` hub          | Stack hub with `TopBar`                    |
| mobile-012 | `reminders` or `care/appointments` | Second hub / list                          |
| mobile-013 | Detail / form screen               | e.g. `meds/[id]`, `care/appointment/[id]`  |
| mobile-014 | Detail / secondary flow          | Confirm against design                     |

**Full-page overview:** `_design/cursor-phases/00_fullpage_reference` — use for global spacing, chrome, and background language when PNGs are available.
