import { Article, ArticleCategory } from "@/types";

export const articleCategories: ArticleCategory[] = [
  { id: "all", label: { vi: "Tất cả", en: "All" } },
  { id: "nutrition", label: { vi: "Dinh dưỡng", en: "Nutrition" } },
  { id: "wearable", label: { vi: "Wearable", en: "Wearable" } },
  { id: "ai-health", label: { vi: "AI & Sức khỏe", en: "AI & Health" } },
  { id: "records", label: { vi: "Hồ sơ y tế", en: "Medical Records" } },
  { id: "lifestyle", label: { vi: "Lối sống", en: "Lifestyle" } },
];

export const articles: Article[] = [
  {
    id: "1",
    title: {
      vi: "5 cách HealthOS giúp bạn kiểm soát đường huyết hiệu quả",
      en: "5 Ways HealthOS Helps You Control Blood Sugar Effectively",
    },
    excerpt: {
      vi: "Nhật ký dinh dưỡng, cảnh báo thực phẩm, theo dõi chỉ số glycemic và phân tích bữa ăn AI giúp người bệnh tiểu đường sống khỏe hơn mỗi ngày.",
      en: "Nutrition diary, food alerts, glycemic index tracking and AI meal analysis help people with diabetes live healthier every day.",
    },
    author: "BS. Nguyễn Thị Lan",
    date: "2026-02-15",
    categoryId: "nutrition",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&h=400&fit=crop",
    readingMinutes: 6,
  },
  {
    id: "2",
    title: {
      vi: "Tại sao đồng hồ thông minh không thể thay thế hồ sơ y tế số?",
      en: "Why Smartwatches Cannot Replace Digital Medical Records?",
    },
    excerpt: {
      vi: "Dữ liệu từ wearable rất có giá trị, nhưng chỉ thực sự hữu ích khi kết hợp với hồ sơ y tế đầy đủ. HealthOS là cầu nối giúp bạn tận dụng tối đa cả hai nguồn dữ liệu.",
      en: "Wearable data is valuable, but only truly useful when combined with comprehensive medical records. HealthOS bridges both data sources.",
    },
    author: "Trần Minh Khoa",
    date: "2026-02-08",
    categoryId: "wearable",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
    readingMinutes: 5,
  },
  {
    id: "3",
    title: {
      vi: "Nhật ký dinh dưỡng số: Bí quyết duy trì sức khỏe lâu dài",
      en: "Digital Nutrition Diary: The Secret to Long-Term Health",
    },
    excerpt: {
      vi: "Nghiên cứu cho thấy những người ghi nhật ký dinh dưỡng thường xuyên có tỷ lệ đạt mục tiêu sức khỏe cao hơn 50%.",
      en: "Studies show people who regularly keep a nutrition diary are 50% more likely to achieve their health goals.",
    },
    author: "BS. Phạm Thu Hà",
    date: "2026-01-28",
    categoryId: "nutrition",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop",
    readingMinutes: 4,
  },
  {
    id: "4",
    title: {
      vi: "Cảnh báo sớm: AI phát hiện bất thường nhịp tim như thế nào?",
      en: "Early Warning: How AI Detects Heart Rate Anomalies?",
    },
    excerpt: {
      vi: "Thuật toán phát hiện bất thường của HealthOS phân tích hàng nghìn điểm dữ liệu nhịp tim mỗi ngày để cảnh báo sớm trước khi vấn đề trở nên nghiêm trọng.",
      en: "HealthOS anomaly detection analyzes thousands of heart rate data points daily to provide early warnings before issues become serious.",
    },
    author: "Lê Văn Hùng",
    date: "2026-01-20",
    categoryId: "ai-health",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=400&fit=crop",
    readingMinutes: 7,
  },
  {
    id: "5",
    title: {
      vi: "Hồ sơ y tế điện tử: Lợi ích thiết thực cho bệnh nhân và bác sĩ",
      en: "Electronic Medical Records: Practical Benefits for Patients and Doctors",
    },
    excerpt: {
      vi: "Hồ sơ y tế điện tử không chỉ tiết kiệm giấy tờ mà còn thực sự cải thiện chất lượng chăm sóc y tế, giảm sai sót và giúp bác sĩ đưa ra quyết định chính xác hơn.",
      en: "Electronic medical records improve care quality, reduce errors and help doctors make more accurate decisions.",
    },
    author: "BS. Maria Saria",
    date: "2026-01-10",
    categoryId: "records",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop",
    readingMinutes: 8,
  },
  {
    id: "6",
    title: {
      vi: "Meal Scan: Chụp ảnh bữa ăn, AI lo phần còn lại",
      en: "Meal Scan: Photograph Your Meal, AI Does the Rest",
    },
    excerpt: {
      vi: "Tính năng Meal Scan của HealthOS sử dụng computer vision và deep learning để nhận diện hàng nghìn món ăn Việt Nam và quốc tế, ước tính dinh dưỡng chính xác trong dưới 3 giây.",
      en: "HealthOS Meal Scan uses computer vision and deep learning to recognize dishes and estimate nutrition accurately in under 3 seconds.",
    },
    author: "Geras Indive",
    date: "2025-12-28",
    categoryId: "ai-health",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
    readingMinutes: 5,
  },
];
