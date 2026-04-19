"""B7 P10 — i18n strings used by the WeasyPrint health-report template.

Kept inline (rather than mirroring next-intl) because the PDF template is a
small, slow-changing surface. Any change here should be cross-checked with
`frontend/messages/{en,vi}.json` for consistency.
"""
from __future__ import annotations

from typing import Mapping


_BASE = {
    "status_labels": {
        "normal": "Normal",
        "warning": "Needs attention",
        "critical": "Action recommended",
    },
    "period_labels": {"7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days"},
    "category_labels": {
        "vitals": "Vitals",
        "nutrition": "Nutrition",
        "activity": "Activity",
        "sleep": "Sleep",
        "bmi": "BMI & weight",
        "medication": "Medication adherence",
    },
    "sensitive_categories": ["medication"],
    "stat_average": "Average",
    "stat_min": "Min",
    "stat_max": "Max",
    "alerts_heading": "Alerts",
    "title": "HealthOS — Personal health report",
    "subtitle": "Generated for your records.",
    "generated_at": "Generated",
    "period_label": "Period",
    "phi_title": "Confidential health information",
    "phi_body": (
        "This document contains personal health information (PHI). Treat it as "
        "confidential. Do not share via email or unencrypted channels."
    ),
    "disclaimer": (
        "This report is informational only and does not replace professional medical advice. "
        "Consult a qualified clinician for any health decisions."
    ),
    "footer_brand": "HealthOS",
    "page": "Page",
    "audit_label": "Audit ID",
}

_VI_OVERRIDES = {
    "status_labels": {
        "normal": "Bình thường",
        "warning": "Cần chú ý",
        "critical": "Cần can thiệp",
    },
    "period_labels": {"7d": "7 ngày qua", "30d": "30 ngày qua", "90d": "90 ngày qua"},
    "category_labels": {
        "vitals": "Chỉ số sinh tồn",
        "nutrition": "Dinh dưỡng",
        "activity": "Hoạt động",
        "sleep": "Giấc ngủ",
        "bmi": "BMI & cân nặng",
        "medication": "Tuân thủ thuốc",
    },
    "stat_average": "Trung bình",
    "stat_min": "Thấp nhất",
    "stat_max": "Cao nhất",
    "alerts_heading": "Cảnh báo",
    "title": "HealthOS — Báo cáo sức khoẻ cá nhân",
    "subtitle": "Tạo riêng cho hồ sơ của bạn.",
    "generated_at": "Tạo lúc",
    "period_label": "Kỳ",
    "phi_title": "Thông tin sức khoẻ cá nhân",
    "phi_body": (
        "Tài liệu này chứa thông tin sức khoẻ cá nhân (PHI). Vui lòng giữ bảo mật. "
        "Không gửi qua email hay các kênh không mã hoá."
    ),
    "disclaimer": (
        "Báo cáo này chỉ mang tính tham khảo và không thay thế tư vấn y khoa chuyên nghiệp. "
        "Hãy tham khảo ý kiến bác sĩ trước khi đưa ra quyết định sức khoẻ."
    ),
    "footer_brand": "HealthOS",
    "page": "Trang",
    "audit_label": "Mã kiểm tra",
}


def i18n_for(locale: str) -> Mapping[str, object]:
    if locale.lower().startswith("vi"):
        merged = {**_BASE, **_VI_OVERRIDES}
        # Nested dicts also need merging.
        merged["status_labels"] = {**_BASE["status_labels"], **_VI_OVERRIDES["status_labels"]}
        merged["period_labels"] = {**_BASE["period_labels"], **_VI_OVERRIDES["period_labels"]}
        merged["category_labels"] = {**_BASE["category_labels"], **_VI_OVERRIDES["category_labels"]}
        return merged
    return _BASE
