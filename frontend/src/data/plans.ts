import { Plan } from "@/types";

export const planCategories = [
  { id: "all", label: { vi: "Tất cả", en: "All" } },
  { id: "free", label: { vi: "Miễn phí", en: "Free" } },
  { id: "personal", label: { vi: "Cá nhân", en: "Personal" } },
  { id: "family", label: { vi: "Gia đình", en: "Family" } },
  { id: "pro", label: { vi: "Chuyên nghiệp", en: "Professional" } },
];

export const plans: Plan[] = [
  {
    id: "plan-free",
    tierKey: "free",
    categoryId: "free",
    name: { vi: "Miễn phí", en: "Free" },
    price: 0,
    popular: false,
    description: {
      vi: "Bắt đầu hành trình sức khỏe với các tính năng cơ bản. Không cần thẻ tín dụng.",
      en: "Start your health journey with essential features. No credit card required.",
    },
    features: [
      { vi: "Hồ sơ y tế cơ bản (20 hồ sơ)", en: "Basic medical records (20 records)" },
      { vi: "Nhật ký dinh dưỡng (30 ngày lịch sử)", en: "Nutrition diary (30-day history)" },
      { vi: "Theo dõi bước chân & calo", en: "Step & calorie tracking" },
      { vi: "Cảnh báo thuốc (3 nhắc nhở)", en: "Medication reminders (3 reminders)" },
      { vi: "Kết nối 1 wearable", en: "Connect 1 wearable" },
    ],
  },
  {
    id: "plan-basic",
    tierKey: "personal",
    categoryId: "personal",
    name: { vi: "Cơ bản", en: "Basic" },
    price: 99000,
    popular: true,
    description: {
      vi: "Đủ mạnh cho nhu cầu theo dõi sức khỏe cá nhân toàn diện với AI Meal Scan.",
      en: "Powerful enough for comprehensive personal health monitoring with AI Meal Scan.",
    },
    features: [
      { vi: "Hồ sơ y tế không giới hạn", en: "Unlimited medical records" },
      { vi: "Nhật ký dinh dưỡng (lịch sử 1 năm)", en: "Nutrition diary (1-year history)" },
      { vi: "AI Meal Scan (50 lần/tháng)", en: "AI Meal Scan (50 scans/month)" },
      { vi: "Phân tích dinh dưỡng AI", en: "AI nutrition analysis" },
      { vi: "Cảnh báo thuốc không giới hạn", en: "Unlimited medication reminders" },
      { vi: "Kết nối 2 wearable", en: "Connect 2 wearables" },
      { vi: "Báo cáo sức khỏe tuần", en: "Weekly health reports" },
    ],
  },
  {
    id: "plan-family",
    tierKey: "family",
    categoryId: "family",
    name: { vi: "Gia đình", en: "Family" },
    price: 199000,
    popular: false,
    description: {
      vi: "Bảo vệ sức khỏe cho cả gia đình với tính năng chia sẻ hồ sơ và theo dõi đa thành viên.",
      en: "Protect your whole family's health with record sharing and multi-member tracking.",
    },
    features: [
      { vi: "Tất cả tính năng Cơ bản", en: "All Basic plan features" },
      { vi: "Lên đến 5 thành viên gia đình", en: "Up to 5 family members" },
      { vi: "Chia sẻ hồ sơ gia đình", en: "Family health record sharing" },
      { vi: "AI Meal Scan không giới hạn", en: "Unlimited AI Meal Scans" },
      { vi: "Kết nối không giới hạn wearable", en: "Unlimited wearable connections" },
      { vi: "Cảnh báo realtime cho toàn gia đình", en: "Realtime alerts for all family members" },
      { vi: "Dashboard gia đình", en: "Family dashboard" },
    ],
  },
  {
    id: "plan-pro",
    tierKey: "pro",
    categoryId: "pro",
    name: { vi: "Chuyên nghiệp", en: "Professional" },
    price: 299000,
    popular: false,
    description: {
      vi: "Giải pháp toàn diện nhất với AI nâng cao, tư vấn bác sĩ trực tuyến và tích hợp đầy đủ.",
      en: "The most comprehensive solution with advanced AI, online doctor consultations and full integrations.",
    },
    features: [
      { vi: "Tất cả tính năng Gia đình", en: "All Family plan features" },
      { vi: "Tư vấn bác sĩ trực tuyến (4 lần/tháng)", en: "Online doctor consultations (4/month)" },
      { vi: "AI nâng cao & dự báo rủi ro", en: "Advanced AI & risk prediction" },
      { vi: "Phân tích giấc ngủ chi tiết", en: "Detailed sleep analysis" },
      { vi: "Lịch sử dữ liệu không giới hạn", en: "Unlimited data history" },
      { vi: "Xuất báo cáo PDF chuyên nghiệp", en: "Export professional PDF reports" },
      { vi: "API tích hợp hệ thống bệnh viện", en: "Hospital system API integration" },
      { vi: "Hỗ trợ ưu tiên 24/7", en: "Priority 24/7 support" },
    ],
  },
];
