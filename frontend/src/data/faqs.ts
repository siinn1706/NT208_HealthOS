import { FAQ, FAQCategory } from "@/types";

export const faqCategories: FAQCategory[] = [
  { id: "general", label: { vi: "Chung", en: "General" } },
  { id: "privacy", label: { vi: "B\u1ea3o m\u1eadt", en: "Privacy" } },
  { id: "wearable", label: { vi: "Wearable", en: "Wearable" } },
  { id: "plans", label: { vi: "G\u00f3i d\u1ecbch v\u1ee5", en: "Plans" } },
  { id: "data", label: { vi: "D\u1eef li\u1ec7u", en: "Data" } },
];

export const faqs: FAQ[] = [
  {
    id: "1",
    question: { vi: "HealthOS l\u00e0 g\u00ec?", en: "What is HealthOS?" },
    answer: {
      vi: "HealthOS l\u00e0 h\u1ec7 th\u1ed1ng \u201cb\u00e1c s\u0129 c\u00e1 nh\u00e2n \u1ea3o\u201d gi\u00fap b\u1ea1n ch\u1ee7 \u0111\u1ed9ng b\u1ea3o v\u1ec7 s\u1ee9c kh\u1ecfe. N\u1ec1n t\u1ea3ng t\u00edch h\u1ee3p qu\u1ea3n l\u00fd h\u1ed3 s\u01a1 y t\u1ebf \u0111i\u1ec7n t\u1eed, nh\u1eadt k\u00fd dinh d\u01b0\u1ee1ng, ph\u00e2n t\u00edch \u1ea3nh b\u1eefa \u0103n b\u1eb1ng AI, k\u1ebft n\u1ed1i thi\u1ebft b\u1ecb \u0111eo th\u00f4ng minh v\u00e0 c\u1ea3nh b\u00e1o s\u1ee9c kh\u1ecfe realtime.",
      en: "HealthOS is a \"virtual personal doctor\" system that helps you proactively protect your health. The platform integrates medical records, nutrition diary, AI meal analysis, wearable connectivity and realtime health alerts.",
    },
    categoryId: "general",
  },
  {
    id: "2",
    question: { vi: "AI ph\u00e2n t\u00edch b\u1eefa \u0103n (Meal Scan) ho\u1ea1t \u0111\u1ed9ng nh\u01b0 th\u1ebf n\u00e0o?", en: "How does the AI Meal Scan work?" },
    answer: {
      vi: "B\u1ea1n ch\u1ec9 c\u1ea7n ch\u1ee5p \u1ea3nh b\u1eefa \u0103n b\u1eb1ng camera \u0111i\u1ec7n tho\u1ea1i. AI c\u1ee7a HealthOS s\u1eed d\u1ee5ng computer vision v\u00e0 deep learning \u0111\u1ec3 nh\u1eadn di\u1ec7n th\u1ef1c ph\u1ea9m, \u01b0\u1edbc t\u00ednh calo, protein, carbohydrate v\u00e0 ch\u1ea5t b\u00e9o ch\u1ec9 trong v\u00e0i gi\u00e2y. \u0110\u1ed9 ch\u00ednh x\u00e1c trung b\u00ecnh \u0111\u1ea1t 98.7%.",
      en: "Simply take a photo of your meal with your phone camera. HealthOS AI uses computer vision and deep learning to identify foods and estimate calories, protein, carbs and fat within seconds. Average accuracy reaches 98.7%.",
    },
    categoryId: "general",
  },
  {
    id: "3",
    question: { vi: "D\u1eef li\u1ec7u y t\u1ebf c\u1ee7a t\u00f4i c\u00f3 \u0111\u01b0\u1ee3c b\u1ea3o m\u1eadt kh\u00f4ng?", en: "Is my medical data secure?" },
    answer: {
      vi: "C\u00f3. HealthOS s\u1eed d\u1ee5ng m\u00e3 h\u00f3a AES-256 cho to\u00e0n b\u1ed9 d\u1eef li\u1ec7u l\u01b0u tr\u1eef v\u00e0 truy\u1ec1n t\u1ea3i. Ch\u00fang t\u00f4i tu\u00e2n th\u1ee7 nghi\u00eam ng\u1eb7t c\u00e1c quy \u0111\u1ecbnh b\u1ea3o v\u1ec7 d\u1eef li\u1ec7u c\u00e1 nh\u00e2n t\u1ea1i Vi\u1ec7t Nam v\u00e0 ti\u00eau chu\u1ea9n qu\u1ed1c t\u1ebf. D\u1eef li\u1ec7u c\u1ee7a b\u1ea1n kh\u00f4ng bao gi\u1edd \u0111\u01b0\u1ee3c b\u00e1n ho\u1eb7c chia s\u1ebb m\u00e0 kh\u00f4ng c\u00f3 s\u1ef1 \u0111\u1ed3ng \u00fd r\u00f5 r\u00e0ng c\u1ee7a b\u1ea1n.",
      en: "Yes. HealthOS uses AES-256 encryption for all stored and transmitted data. We comply with Vietnam personal data protection regulations and international standards. Your data is never sold or shared without your explicit consent.",
    },
    categoryId: "privacy",
  },
  {
    id: "4",
    question: { vi: "HealthOS k\u1ebft n\u1ed1i v\u1edbi nh\u1eefng thi\u1ebft b\u1ecb \u0111eo n\u00e0o?", en: "Which wearable devices does HealthOS support?" },
    answer: {
      vi: "HealthOS h\u1ed7 tr\u1ee3 Apple Health, Google Fit, Garmin Connect, Fitbit, Samsung Health, Xiaomi Mi Health v\u00e0 nhi\u1ec1u thi\u1ebft b\u1ecb kh\u00e1c. Danh s\u00e1ch thi\u1ebft b\u1ecb li\u00ean t\u1ee5c \u0111\u01b0\u1ee3c m\u1edf r\u1ed9ng. B\u1ea1n c\u00f3 th\u1ec3 k\u1ebft n\u1ed1i trong \u1ee9ng d\u1ee5ng qua C\u00e0i \u0111\u1eb7t > Thi\u1ebft b\u1ecb \u0111eo.",
      en: "HealthOS supports Apple Health, Google Fit, Garmin Connect, Fitbit, Samsung Health, Xiaomi Mi Health and many more. The supported device list is continuously expanding. Connect in the app via Settings > Wearables.",
    },
    categoryId: "wearable",
  },
  {
    id: "5",
    question: { vi: "S\u1ef1 kh\u00e1c bi\u1ec7t gi\u1eefa c\u00e1c g\u00f3i d\u1ecbch v\u1ee5 l\u00e0 g\u00ec?", en: "What are the differences between plans?" },
    answer: {
      vi: "G\u00f3i Mi\u1ec5n ph\u00ed cho ph\u00e9p qu\u1ea3n l\u00fd h\u1ed3 s\u01a1 c\u01a1 b\u1ea3n v\u00e0 nh\u1eadt k\u00fd dinh d\u01b0\u1ee1ng gi\u1edbi h\u1ea1n. G\u00f3i C\u01a1 b\u1ea3n (99.000\u20ab/th\u00e1ng) m\u1edf ra AI Meal Scan \u0111\u1ea7y \u0111\u1ee7. G\u00f3i Gia \u0111\u00ecnh (199.000\u20ab/th\u00e1ng) h\u1ed7 tr\u1ee3 l\u00ean \u0111\u1ebfn 5 th\u00e0nh vi\u00ean. G\u00f3i Chuy\u00ean nghi\u1ec7p (299.000\u20ab/th\u00e1ng) b\u1ed5 sung t\u01b0 v\u1ea5n b\u00e1c s\u0129 tr\u1ef1c tuy\u1ebfn v\u00e0 AI n\u00e2ng cao.",
      en: "The Free plan allows basic records and limited nutrition diary. Basic (99,000\u20ab/month) unlocks full AI Meal Scan. Family (199,000\u20ab/month) supports up to 5 members. Professional (299,000\u20ab/month) adds online doctor consultations and advanced AI.",
    },
    categoryId: "plans",
  },
  {
    id: "6",
    question: { vi: "T\u00f4i c\u00f3 th\u1ec3 chia s\u1ebb d\u1eef li\u1ec7u s\u1ee9c kh\u1ecfe v\u1edbi b\u00e1c s\u0129 kh\u00f4ng?", en: "Can I share my health data with my doctor?" },
    answer: {
      vi: "C\u00f3. T\u1ea5t c\u1ea3 c\u00e1c g\u00f3i \u0111\u1ec1u cho ph\u00e9p chia s\u1ebb h\u1ed3 s\u01a1 s\u1ee9c kh\u1ecfe v\u1edbi b\u00e1c s\u0129. B\u1ea1n c\u00f3 th\u1ec3 t\u1ea1o link truy c\u1eadp t\u1ea1m th\u1eddi ho\u1eb7c th\u00eam b\u00e1c s\u0129 v\u00e0o danh s\u00e1ch tin c\u1eady. B\u00e1c s\u0129 c\u00f3 th\u1ec3 xem h\u1ed3 s\u01a1, k\u1ebft qu\u1ea3 x\u00e9t nghi\u1ec7m v\u00e0 d\u1eef li\u1ec7u wearable.",
      en: "Yes. All plans allow sharing health records with doctors. Create a temporary access link or add a doctor to your trusted list. Doctors can view records, test results and wearable data for more accurate consultations.",
    },
    categoryId: "data",
  },
];
