# HealthOS - Tests

## Structure

```text
tests/
|- integration/    # Pytest tests against API behavior
|- contract/       # OpenAPI contract checks (schemathesis)
`- e2e/            # Playwright browser tests
```

## Install Test Dependencies

```bash
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
cd ..
npm install --save-dev @playwright/test
```

## Run Tests

```bash
# Integration
.\backend\.venv\Scripts\python.exe -m pytest tests/integration/ -v

# Contract
.\backend\.venv\Scripts\python.exe -m schemathesis run contracts/openapi/core-api.yaml --base-url=http://localhost:8000

# E2E
npx playwright test tests/e2e/
```

## Rules

- Every new endpoint must include at least one integration test.
- Contract tests should run when `contracts/openapi/*.yaml` changes.
- E2E tests should cover happy paths of main user stories.
- Prefer behavior-driven tests over implementation-detail tests.
