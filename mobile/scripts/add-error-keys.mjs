import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/i18n/locales');

const enErrors = {
  invalid_credentials: 'Invalid username or password.',
  account_locked: 'Account temporarily locked. Please try again later.',
  account_not_found_email: 'No account found with this email.',
  account_deleted: 'This account has been deleted.',
  unauthorized: 'Authentication required. Please log in.',
  otp_invalid: 'Incorrect OTP code.',
  otp_locked: 'Too many incorrect OTP attempts. Please request a new code.',
  otp_required: 'Please verify your OTP before continuing.',
  session_expired: 'Your session has expired. Please log in again.',
  password_breached: 'This password was found in a data breach. Please choose a different one.',
  mfa_already_enabled: 'Two-factor authentication is already enabled.',
  mfa_not_enabled: 'Two-factor authentication is not enabled.',
  mfa_not_setup: 'Please complete two-factor authentication setup first.',
  mfa_challenge_invalid: 'Invalid verification challenge.',
  mfa_challenge_locked: 'Too many failed verification attempts. Please try again later.',
  invalid_totp_code: 'Invalid authenticator code.',
  email_taken: 'This email is already in use.',
  username_taken: 'This username is already taken.',
  conflict: 'A conflict occurred. Please try again.',
  not_found: 'The requested resource was not found.',
  forbidden: 'You do not have permission to perform this action.',
  validation_failed: 'Please check your input and try again.',
  rate_limit_exceeded: 'Too many requests. Please try again later.',
  no_active_subscription: 'An active subscription is required for this feature.',
  upstream_error: 'An external service error occurred. Please try again.',
  internal_error: 'An unexpected error occurred.',
  internal_server_error: 'An unexpected server error occurred.',
};

const viErrors = {
  invalid_credentials: 'Tên đăng nhập hoặc mật khẩu không đúng.',
  account_locked: 'Tài khoản tạm thời bị khóa. Vui lòng thử lại sau.',
  account_not_found_email: 'Không tìm thấy tài khoản với email này.',
  account_deleted: 'Tài khoản này đã bị xóa.',
  unauthorized: 'Vui lòng đăng nhập để tiếp tục.',
  otp_invalid: 'Mã OTP không đúng.',
  otp_locked: 'Nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.',
  otp_required: 'Vui lòng xác thực OTP trước khi tiếp tục.',
  session_expired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  password_breached: 'Mật khẩu này đã bị lộ trong các vụ vi phạm dữ liệu. Vui lòng chọn mật khẩu khác.',
  mfa_already_enabled: 'Xác thực hai yếu tố đã được bật.',
  mfa_not_enabled: 'Xác thực hai yếu tố chưa được bật.',
  mfa_not_setup: 'Vui lòng hoàn tất cài đặt xác thực hai yếu tố trước.',
  mfa_challenge_invalid: 'Thách thức xác thực không hợp lệ.',
  mfa_challenge_locked: 'Quá nhiều lần xác thực thất bại. Vui lòng thử lại sau.',
  invalid_totp_code: 'Mã xác thực không hợp lệ.',
  email_taken: 'Email này đã được sử dụng.',
  username_taken: 'Tên người dùng này đã được sử dụng.',
  conflict: 'Đã xảy ra xung đột. Vui lòng thử lại.',
  not_found: 'Không tìm thấy tài nguyên yêu cầu.',
  forbidden: 'Bạn không có quyền thực hiện hành động này.',
  validation_failed: 'Vui lòng kiểm tra lại thông tin và thử lại.',
  rate_limit_exceeded: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  no_active_subscription: 'Tính năng này yêu cầu gói đăng ký đang hoạt động.',
  upstream_error: 'Lỗi dịch vụ bên ngoài. Vui lòng thử lại.',
  internal_error: 'Đã xảy ra lỗi không mong muốn.',
  internal_server_error: 'Lỗi máy chủ không mong muốn.',
};

for (const [locale, errors] of [['en', enErrors], ['vi', viErrors]]) {
  const path = join(localesDir, `${locale}.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (!data.api) data.api = {};
  data.api.error = errors;
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${locale}.json`);
}
