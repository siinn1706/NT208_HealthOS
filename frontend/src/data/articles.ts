import { Article, ArticleCategory } from "@/types";

export const articleCategories: ArticleCategory[] = [
  { id: "all", label: { vi: "T\u1ea5t c\u1ea3", en: "All" } },
  { id: "nutrition", label: { vi: "Dinh d\u01b0\u1ee1ng", en: "Nutrition" } },
  { id: "wearable", label: { vi: "Wearable", en: "Wearable" } },
  { id: "ai-health", label: { vi: "AI & S\u1ee9c kh\u1ecfe", en: "AI & Health" } },
  { id: "records", label: { vi: "H\u1ed3 s\u01a1 y t\u1ebf", en: "Medical Records" } },
  { id: "lifestyle", label: { vi: "L\u1ed1i s\u1ed1ng", en: "Lifestyle" } },
];

export const articles: Article[] = [
  {
    id: "1",
    title: {
      vi: "5 c\u00e1ch HealthOS gi\u00fap b\u1ea1n ki\u1ec3m so\u00e1t \u0111\u01b0\u1eddng huy\u1ebft hi\u1ec7u qu\u1ea3",
      en: "5 Ways HealthOS Helps You Control Blood Sugar Effectively",
    },
    excerpt: {
      vi: "Nh\u1eadt k\u00fd dinh d\u01b0\u1ee1ng, c\u1ea3nh b\u00e1o th\u1ef1c ph\u1ea9m, theo d\u00f5i ch\u1ec9 s\u1ed1 glycemic v\u00e0 ph\u00e2n t\u00edch b\u1eefa \u0103n AI gi\u00fap ng\u01b0\u1eddi b\u1ec7nh ti\u1ec3u \u0111\u01b0\u1eddng s\u1ed1ng kh\u1ecfe h\u01a1n m\u1ed7i ng\u00e0y.",
      en: "Nutrition diary, food alerts, glycemic index tracking and AI meal analysis help people with diabetes live healthier every day.",
    },
    author: "BS. Nguy\u1ec5n Th\u1ecb Lan",
    date: "2026-02-15",
    categoryId: "nutrition",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&h=400&fit=crop",
  },
  {
    id: "2",
    title: {
      vi: "T\u1ea1i sao \u0111\u1ed3ng h\u1ed3 th\u00f4ng minh kh\u00f4ng th\u1ec3 thay th\u1ebf h\u1ed3 s\u01a1 y t\u1ebf s\u1ed1?",
      en: "Why Smartwatches Cannot Replace Digital Medical Records?",
    },
    excerpt: {
      vi: "D\u1eef li\u1ec7u t\u1eeb wearable r\u1ea5t c\u00f3 gi\u00e1 tr\u1ecb, nh\u01b0ng ch\u1ec9 th\u1ef1c s\u1ef1 h\u1eefu \u00edch khi k\u1ebft h\u1ee3p v\u1edbi h\u1ed3 s\u01a1 y t\u1ebf \u0111\u1ea7y \u0111\u1ee7. HealthOS l\u00e0 c\u1ea7u n\u1ed1i gi\u00fap b\u1ea1n t\u1eadn d\u1ee5ng t\u1ed1i \u0111a c\u1ea3 hai ngu\u1ed3n d\u1eef li\u1ec7u.",
      en: "Wearable data is valuable, but only truly useful when combined with comprehensive medical records. HealthOS bridges both data sources.",
    },
    author: "Tr\u1ea7n Minh Khoa",
    date: "2026-02-08",
    categoryId: "wearable",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
  },
  {
    id: "3",
    title: {
      vi: "Nh\u1eadt k\u00fd dinh d\u01b0\u1ee1ng s\u1ed1: B\u00ed quy\u1ebft duy tr\u00ec s\u1ee9c kh\u1ecfe l\u00e2u d\u00e0i",
      en: "Digital Nutrition Diary: The Secret to Long-Term Health",
    },
    excerpt: {
      vi: "Nghi\u00ean c\u1ee9u cho th\u1ea5y nh\u1eefng ng\u01b0\u1eddi ghi nh\u1eadt k\u00fd dinh d\u01b0\u1ee1ng th\u01b0\u1eddng xuy\u00ean c\u00f3 t\u1ef7 l\u1ec7 \u0111\u1ea1t m\u1ee5c ti\u00eau s\u1ee9c kh\u1ecfe cao h\u01a1n 50%.",
      en: "Studies show people who regularly keep a nutrition diary are 50% more likely to achieve their health goals.",
    },
    author: "BS. Ph\u1ea1m Thu H\u00e0",
    date: "2026-01-28",
    categoryId: "nutrition",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop",
  },
  {
    id: "4",
    title: {
      vi: "C\u1ea3nh b\u00e1o s\u1edbm: AI ph\u00e1t hi\u1ec7n b\u1ea5t th\u01b0\u1eddng nh\u1ecbp tim nh\u01b0 th\u1ebf n\u00e0o?",
      en: "Early Warning: How AI Detects Heart Rate Anomalies?",
    },
    excerpt: {
      vi: "Thu\u1eadt to\u00e1n ph\u00e1t hi\u1ec7n b\u1ea5t th\u01b0\u1eddng c\u1ee7a HealthOS ph\u00e2n t\u00edch h\u00e0ng ngh\u00ecn \u0111i\u1ec3m d\u1eef li\u1ec7u nh\u1ecbp tim m\u1ed7i ng\u00e0y \u0111\u1ec3 c\u1ea3nh b\u00e1o s\u1edbm tr\u01b0\u1edbc khi v\u1ea5n \u0111\u1ec1 tr\u1edf n\u00ean nghi\u00eam tr\u1ecdng.",
      en: "HealthOS anomaly detection analyzes thousands of heart rate data points daily to provide early warnings before issues become serious.",
    },
    author: "L\u00ea V\u0103n H\u00f9ng",
    date: "2026-01-20",
    categoryId: "ai-health",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=400&fit=crop",
  },
  {
    id: "5",
    title: {
      vi: "H\u1ed3 s\u01a1 y t\u1ebf \u0111i\u1ec7n t\u1eed: L\u1ee3i \u00edch thi\u1ebft th\u1ef1c cho b\u1ec7nh nh\u00e2n v\u00e0 b\u00e1c s\u0129",
      en: "Electronic Medical Records: Practical Benefits for Patients and Doctors",
    },
    excerpt: {
      vi: "H\u1ed3 s\u01a1 y t\u1ebf \u0111i\u1ec7n t\u1eed kh\u00f4ng ch\u1ec9 ti\u1ebft ki\u1ec7m gi\u1ea5y t\u1edd m\u00e0 c\u00f2n th\u1ef1c s\u1ef1 c\u1ea3i thi\u1ec7n ch\u1ea5t l\u01b0\u1ee3ng ch\u0103m s\u00f3c y t\u1ebf, gi\u1ea3m sai s\u00f3t v\u00e0 gi\u00fap b\u00e1c s\u0129 \u0111\u01b0a ra quy\u1ebft \u0111\u1ecbnh ch\u00ednh x\u00e1c h\u01a1n.",
      en: "Electronic medical records improve care quality, reduce errors and help doctors make more accurate decisions.",
    },
    author: "BS. Maria Saria",
    date: "2026-01-10",
    categoryId: "records",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop",
  },
  {
    id: "6",
    title: {
      vi: "Meal Scan: Ch\u1ee5p \u1ea3nh b\u1eefa \u0103n, AI lo ph\u1ea7n c\u00f2n l\u1ea1i",
      en: "Meal Scan: Photograph Your Meal, AI Does the Rest",
    },
    excerpt: {
      vi: "T\u00ednh n\u0103ng Meal Scan c\u1ee7a HealthOS s\u1eed d\u1ee5ng computer vision v\u00e0 deep learning \u0111\u1ec3 nh\u1eadn di\u1ec7n h\u00e0ng ngh\u00ecn m\u00f3n \u0103n Vi\u1ec7t Nam v\u00e0 qu\u1ed1c t\u1ebf, \u01b0\u1edbc t\u00ednh dinh d\u01b0\u1ee1ng ch\u00ednh x\u00e1c trong d\u01b0\u1edbi 3 gi\u00e2y.",
      en: "HealthOS Meal Scan uses computer vision and deep learning to recognize dishes and estimate nutrition accurately in under 3 seconds.",
    },
    author: "Geras Indive",
    date: "2025-12-28",
    categoryId: "ai-health",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
  },
];
