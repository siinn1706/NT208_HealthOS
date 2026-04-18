# HealthOS - Tests

## Structure

```text
tests/
|- integration/    # Pytest tests against API behavior
`- contract/       # OpenAPI contract checks (schemathesis)

frontend/e2e/       # Playwright browser tests (run via `cd frontend && npm run test:e2e`)
```

## Install Test Dependencies

```bash
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
cd ..\frontend
npm ci
npx playwright install chromium
```

## Run Tests

```bash
# Integration
.\backend\.venv\Scripts\python.exe -m pytest tests/integration/ -v

# Contract
.\backend\.venv\Scripts\python.exe -m schemathesis run contracts/openapi/core-api.yaml --base-url=http://localhost:8000

# E2E (starts Next dev server automatically; use admin/admin dev bypass on login tests)
cd frontend
npm run test:e2e
```

## Rules

- Every new endpoint must include at least one integration test.
- Contract tests should run when `contracts/openapi/*.yaml` changes.
- E2E tests should cover happy paths of main user stories.
- Prefer behavior-driven tests over implementation-detail tests.
