# HealthOS — Tests

## Cấu trúc

```
tests/
├── integration/      # Pytest tests gọi HTTP endpoint thật
├── contract/         # Validate response vs OpenAPI spec (schemathesis)
└── e2e/              # Playwright browser tests
```

## Cài dependencies test

```bash
pip install pytest pytest-asyncio httpx schemathesis
npm install --save-dev @playwright/test
```

## Chạy tests

```bash
# Integration
pytest tests/integration/ -v

# Contract  
schemathesis run contracts/openapi/core-api.yaml --base-url=http://localhost:8000

# E2E
npx playwright test tests/e2e/
```

## Quy tắc

- Mỗi endpoint mới **phải** có ít nhất 1 integration test.
- Contract tests chạy tự động trong CI mỗi khi `contracts/openapi/*.yaml` thay đổi.
- E2E test cover happy path của các user story chính.
- Không test implementation detail — test hành vi từ ngoài vào.
