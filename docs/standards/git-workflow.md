# HealthOS — Git Workflow

## Branch naming

```
main                        # production-ready, protected
feature/<scope>/<short-name>
fix/<scope>/<short-name>
chore/<short-name>
docs/<short-name>

Examples:
feature/be/meal-api
feature/fe/nutrition-chart
fix/bff/auth-session-refresh
chore/infra/update-docker-compose
docs/standards/add-api-conventions
```

## Flow tổng quát

```
main ←── feature/*
     ←── fix/*
```

1. Từ `main`, tạo branch `feature/<scope>/<name>`.
2. Commit theo Conventional Commits (xem [code-style.md](./code-style.md)).
3. Khi xong: mở PR target vào `main`.
4. PR cần ít nhất **1 reviewer** approve.
5. Sau khi merge, theo dõi CI và smoke test môi trường mục tiêu.

## Kích thước PR

- **Khuyến nghị**: ≤ 400 dòng diff (không tính file tự sinh).
- PR lớn hơn → chia thành nhiều PR nhỏ có liên kết.
- File tự sinh (`.next/`, `__pycache__/`, `*.lock`) **không đưa vào diff**.

## Commit thường gặp

```bash
# WIP (work-in-progress), dùng để sync nhưng không merge trực tiếp
git commit -m "chore(wip): [fe] nutrition chart layout"

# Khi xong một unit nhỏ
git commit -m "feat(fe): render nutrition macros chart"
git commit -m "feat(be): POST /v1/meals endpoint with DB persist"
git commit -m "fix(bff): forward auth header to core BE"
```

## Code review checklist

- [ ] PR title theo Conventional Commits format
- [ ] Code đặt đúng layer/folder (theo folder-convention.md)
- [ ] Không có hardcode URL, secret, magic number
- [ ] Có unit test hoặc lý do hợp lý khi bỏ qua
- [ ] Contract YAML cập nhật nếu thêm endpoint mới
- [ ] `.env.example` cập nhật nếu thêm biến mới

## Protected branch rules (GitHub)

| Branch | Rules |
|--------|-------|
| `main` | Require PR + 1 review + CI pass. No force push. |
