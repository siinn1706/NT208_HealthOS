"""i18n strings for the emergency wallet-card PDF template.

Kept inline (matching `templates/reports/i18n.py`) — the wallet card is a
small, slow-changing surface; mirroring next-intl JSON would add
synchronization risk for no real benefit.
"""
from __future__ import annotations

from typing import Mapping


_BASE = {
    "title": "EMERGENCY HEALTH CARD",
    "blood": "Blood",
    "blood_na": "Not provided",
    "age": "Age",
    "allergies": "Allergies",
    "nkda": "NKDA — No known drug allergies",
    "conditions": "Conditions",
    "medications": "Medications",
    "ice": "Emergency contacts (ICE)",
    "equipment": "Equipment",
    "communication": "Communication",
    "assistance": "Assistance",
    "scan_to_view": "Scan QR to view full card",
    "host": "HealthOS",
    "footer": "For emergency reference only. Patient-controlled, revocable.",
    "card_id_label": "Card",
    "updated_label": "Updated",
}

_VI_OVERRIDES = {
    "title": "THẺ Y TẾ KHẨN CẤP",
    "blood": "Nhóm máu",
    "blood_na": "Chưa cung cấp",
    "age": "Tuổi",
    "allergies": "Dị ứng",
    "nkda": "Không có dị ứng thuốc đã biết (NKDA)",
    "conditions": "Bệnh nền",
    "medications": "Thuốc",
    "ice": "Liên hệ khẩn cấp (ICE)",
    "equipment": "Thiết bị",
    "communication": "Giao tiếp",
    "assistance": "Hỗ trợ",
    "scan_to_view": "Quét QR để xem đầy đủ",
    "host": "HealthOS",
    "footer": "Chỉ dùng cho cấp cứu. Bệnh nhân kiểm soát, có thể thu hồi.",
    "card_id_label": "Thẻ",
    "updated_label": "Cập nhật",
}


def i18n_for(locale: str) -> Mapping[str, str]:
    if locale.lower().startswith("vi"):
        return {**_BASE, **_VI_OVERRIDES}
    return _BASE
