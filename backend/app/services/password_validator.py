"""Password validation service with complexity requirements and blacklist checking."""
from __future__ import annotations

import re
from typing import Tuple, List, Set

# ─── Common Password Blacklist ────────────────────────────────────────────────
# Vietnamese + English common passwords (top ~500)
PASSWORD_BLACKLIST: Set[str] = {
    # Most common
    "password", "123456", "12345678", "123456789", "1234567", "1234567890",
    "qwerty", "abc123", "monkey", "master", "dragon", "111111", "baseball",
    "iloveyou", "trustno1", "sunshine", "princess", "welcome", "shadow",
    "superman", "michael", "football", "password1", "password123",
    # Vietnamese common
    "matkhau", "matkhau123", "vietnam", "saigon", "hanoi", "vietnam123",
    "saigon123", "hanoi123", "healthos", "health", "benhhan", "bacsi",
    # Year patterns
    "2020", "2021", "2022", "2023", "2024", "2025", "2026", "1234",
    # Simple patterns
    "letmein", "admin", "login", "passw0rd", "hello", "charlie", "donald",
    "admin123", "root", "test", "guest", "master123", "qwerty123",
    # Health-related (for health app)
    "medical", "doctor", "patient", "hospital", "health123", "medicine",
}

# ─── Password Requirements ────────────────────────────────────────────────────
class PasswordRequirements:
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"


def validate_password_strength(password: str) -> Tuple[bool, List[str]]:
    """Validate password against complexity requirements.

    Args:
        password: The password to validate

    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors: List[str] = []

    # Length checks
    if len(password) < PasswordRequirements.MIN_LENGTH:
        errors.append(f"Mật khẩu phải có ít nhất {PasswordRequirements.MIN_LENGTH} ký tự")
    elif len(password) > PasswordRequirements.MAX_LENGTH:
        errors.append(f"Mật khẩu không được quá {PasswordRequirements.MAX_LENGTH} ký tự")

    # Character type checks
    if PasswordRequirements.REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
        errors.append("Cần ít nhất 1 chữ hoa (A-Z)")

    if PasswordRequirements.REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
        errors.append("Cần ít nhất 1 chữ thường (a-z)")

    if PasswordRequirements.REQUIRE_DIGIT and not re.search(r"\d", password):
        errors.append("Cần ít nhất 1 số (0-9)")

    if PasswordRequirements.REQUIRE_SPECIAL and not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", password):
        errors.append(f"Cần ít nhất 1 ký tự đặc biệt ({PasswordRequirements.SPECIAL_CHARS})")

    return len(errors) == 0, errors


def is_password_blacklisted(password: str) -> bool:
    """Check if password is in the blacklist.

    Args:
        password: The password to check

    Returns:
        True if password is blacklisted
    """
    return password.lower() in PASSWORD_BLACKLIST


def get_password_strength_score(password: str) -> int:
    """Calculate password strength score (0-5).

    Args:
        password: The password to score

    Returns:
        Score from 0 (weak) to 5 (strong)
    """
    if not password:
        return 0

    score = 0

    # Length scoring
    if len(password) >= 8:
        score += 1
    if len(password) >= 12:
        score += 1
    if len(password) >= 16:
        score += 1

    # Character diversity
    if re.search(r"[a-z]", password):
        score += 1
    if re.search(r"[A-Z]", password):
        score += 1
    if re.search(r"\d", password):
        score += 1
    if re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", password):
        score += 1

    # Penalties
    if re.search(r"(.)\1{2,}", password):  # Repeated characters
        score -= 1
    if re.search(r"^[a-z]+$", password):  # Only letters
        score -= 1
    if re.search(r"^[0-9]+$", password):  # Only numbers
        score -= 1

    return max(0, min(5, score))


def get_password_strength_label(score: int) -> str:
    """Get Vietnamese label for strength score."""
    labels = {
        0: "Yếu",
        1: "Yếu",
        2: "Trung bình",
        3: "Khá",
        4: "Mạnh",
        5: "Rất mạnh",
    }
    return labels.get(score, "Yếu")


def validate_password(password: str) -> Tuple[bool, List[str]]:
    """Full password validation including blacklist.

    Args:
        password: The password to validate

    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors: List[str] = []

    # Check blacklist first
    if is_password_blacklisted(password):
        errors.append("Mật khẩu này quá phổ biến. Vui lòng chọn mật khẩu khác")

    # Check complexity
    is_valid, complexity_errors = validate_password_strength(password)
    errors.extend(complexity_errors)

    return len(errors) == 0, errors
