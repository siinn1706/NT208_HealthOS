# HealthOS — Code Style Guide

## TypeScript / Next.js (Frontend + BFF)

### Formatter & Linter

- **Formatter**: Prettier (cấu hình trong `.prettierrc`)
- **Linter**: ESLint (`eslint-config-next`)
- Chạy trước khi commit: `npm run lint`
- Auto-fix: `npm run lint -- --fix`

### TypeScript

```ts
// ✅ Always type props explicitly
interface ArticleCardProps {
  title: string;
  excerpt: string;
  publishedAt: Date;
}

// ✅ Return type rõ ràng cho function có side-effect
async function fetchHealthData(userId: string): Promise<HealthData[]> { ... }

// ❌ Không dùng any
const data: any = await fetch(...);  // WRONG
const data: HealthData[] = await fetch(...);  // OK
```

### Components

```tsx
// ✅ Server Component mặc định (không có "use client")
export default function ArticleList({ articles }: { articles: Article[] }) {
  return <ul>...</ul>;
}

// ✅ Client Component chỉ khi cần hook / event / browser API
"use client";
import { useState } from "react";
export function ContactForm() { ... }
```

### BFF Route Handlers

```ts
// frontend/src/app/api/v1/health-data/route.ts
import { NextRequest, NextResponse } from "next/server";

// ✅ Luôn validate session trước khi forward
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Forward tới Core BE
  const res = await fetch(`${process.env.CORE_API_URL}/v1/health-metrics`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const data = await res.json();
  return NextResponse.json(data);
}

// ✅ Response envelope chuẩn
// { data: T, error: null } | { data: null, error: { code, message } }
```

---

## Python / FastAPI (Backend + Workers)

### Formatter & Linter

- **Formatter**: `ruff format` (thay black)
- **Linter**: `ruff check`
- **Type checker**: `mypy --strict`
- Chạy: `ruff format . && ruff check . && mypy app`

### Pydantic Settings — bắt buộc

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    debug: bool = False

    model_config = {"env_file": ".env"}

settings = Settings()
```

### Endpoint Convention

```python
# ✅ Dùng response_model, status_code rõ ràng
@router.post("/meals", response_model=MealResponse, status_code=201)
async def create_meal(body: MealCreate, db: AsyncSession = Depends(get_db)):
    ...

# ✅ HTTPException với detail có cấu trúc
raise HTTPException(status_code=404, detail={"code": "MEAL_NOT_FOUND", "message": "..."})

# ❌ Không return dict trực tiếp khi có Pydantic model
return {"id": meal.id, ...}  # WRONG — thiếu type safety
return MealResponse.model_validate(meal)  # OK
```

### Layering — không được vi phạm

```
api/v1/endpoints/*.py   →  chỉ gọi services/
services/*.py           →  chỉ gọi domain/ và adapters/
adapters/*.py           →  I/O thực tế (DB, Redis, S3, HTTP)
domain/*.py             →  logic thuần Python, không import sqlalchemy/pydantic
```

---

## Git Commit Convention

Tuân theo [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

Types: feat | fix | chore | docs | refactor | test | ci | perf | style
Scope: fe | be | bff | ai-worker | queue | infra | contracts | docs

Examples:
feat(be): add /v1/meals endpoint
fix(fe): correct nutrition chart data binding
docs(standards): update folder convention for BFF
chore(infra): add redis service to docker-compose.dev
```

**PR title** phải theo cùng format.

---

## Env Variables

- **Không commit `.env` thật** — chỉ commit `.env.example`.
- Mọi secret đặt dưới dạng `SECRET_*` hoặc `*_KEY`, không hardcode vào code.
- Biến bắt buộc per service xem `infra/env/*.env.example`.
