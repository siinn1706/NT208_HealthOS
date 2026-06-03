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
    body: {
      vi: "HealthOS cung cấp tính năng nhật ký dinh dưỡng thông minh giúp người dùng ghi lại mọi bữa ăn một cách dễ dàng. Với hơn 50.000 loại thực phẩm trong cơ sở dữ liệu, bao gồm đặc sản Việt Nam, người dùng có thể theo dõi chính xác lượng carbohydrate, đường và glycemic index của từng bữa ăn.\n\nHệ thống cảnh báo thông minh phân tích pattern dinh dưỡng và gửi thông báo kịp thời khi phát hiện chế độ ăn có nguy cơ gây tăng đường huyết. Tính năng AI meal recognition cho phép chụp ảnh món ăn để nhận diện tự động trong vòng 3 giây.\n\nKết hợp với dữ liệu từ thiết bị đeo tay, HealthOS có thể dự đoán phản ứng đường huyết cá nhân hóa, giúp người bệnh tiểu đường đưa ra quyết định dinh dưỡng tốt hơn mỗi ngày.",
      en: "HealthOS provides an intelligent nutrition diary that makes logging every meal effortless. With over 50,000 food items in the database — including Vietnamese specialty dishes — users can accurately track carbohydrates, sugar content, and glycemic index for every meal.\n\nThe smart alert system analyzes nutrition patterns and sends timely notifications when it detects habits that risk sudden blood sugar spikes. The AI meal recognition feature lets users photograph a dish for automatic identification within 3 seconds.\n\nCombined with wearable device data, HealthOS delivers personalized blood glucose response predictions, helping people with diabetes make better nutritional decisions every day.",
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
    body: {
      vi: "Đồng hồ thông minh và vòng đeo sức khỏe đang ngày càng phổ biến, nhưng chúng chỉ đo được các chỉ số sinh lý tức thời như nhịp tim, bước chân và giấc ngủ. Những dữ liệu này thiếu bối cảnh y tế cần thiết để đưa ra chẩn đoán hoặc quyết định điều trị.\n\nHồ sơ y tế số bao gồm lịch sử bệnh, kết quả xét nghiệm, đơn thuốc và ghi chú của bác sĩ — những thông tin mà không một thiết bị đeo tay nào có thể thu thập được. HealthOS tích hợp cả hai nguồn dữ liệu, tạo ra bức tranh sức khỏe toàn diện cho từng người dùng.\n\nKhi dữ liệu wearable được đặt cạnh hồ sơ y tế đầy đủ, bác sĩ có thể nhận ra các xu hướng quan trọng và đưa ra lời khuyên cá nhân hóa chính xác hơn nhiều so với chỉ dựa vào một nguồn thông tin duy nhất.",
      en: "Smartwatches and fitness trackers are increasingly popular, but they only measure instantaneous physiological signals — heart rate, steps, and sleep — without the medical context needed for diagnosis or treatment decisions.\n\nDigital medical records capture medical history, lab results, prescriptions, and physician notes — information no wearable can collect. HealthOS integrates both data sources, creating a comprehensive health picture for every user.\n\nWhen wearable data sits alongside a complete medical record, physicians can spot important trends and provide far more accurate personalized guidance than relying on a single data source alone.",
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
    body: {
      vi: "Ghi nhật ký dinh dưỡng là một trong những thói quen lành mạnh được các chuyên gia dinh dưỡng khuyến nghị nhiều nhất. Khi bạn ghi lại mọi thứ bạn ăn, bạn trở nên ý thức hơn về các lựa chọn thực phẩm và dễ dàng nhận ra các pattern không lành mạnh.\n\nHealthOS biến việc ghi nhật ký dinh dưỡng trở nên cực kỳ đơn giản với tính năng quét mã vạch thực phẩm, nhận diện ảnh và thư viện công thức nấu ăn tích hợp. Mỗi mục nhập tự động tính toán calories, macronutrients và vi chất dinh dưỡng.\n\nDữ liệu dinh dưỡng được tổng hợp thành báo cáo tuần/tháng trực quan, giúp người dùng và bác sĩ dễ dàng đánh giá xu hướng dinh dưỡng và điều chỉnh kế hoạch ăn uống phù hợp với mục tiêu sức khỏe cá nhân.",
      en: "Keeping a nutrition diary is one of the most frequently recommended healthy habits among nutrition experts. When you log everything you eat, you become more aware of your food choices and can more easily spot unhealthy patterns.\n\nHealthOS makes nutrition logging effortless with barcode scanning, photo recognition, and an integrated recipe library. Every entry automatically calculates calories, macronutrients, and micronutrients.\n\nNutritional data is synthesized into visual weekly and monthly reports, making it easy for users and physicians to assess dietary trends and adjust eating plans to match personal health goals.",
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
    body: {
      vi: "Nhịp tim là một trong những chỉ số quan trọng nhất phản ánh sức khỏe tim mạch. Những biến động bất thường trong nhịp tim có thể là dấu hiệu sớm của nhiều vấn đề nghiêm trọng như rối loạn nhịp tim, thiếu máu cơ tim hay stress quá mức.\n\nAlgorithm phát hiện bất thường của HealthOS sử dụng mô hình học máy được huấn luyện trên hàng triệu chuỗi dữ liệu nhịp tim. Hệ thống học từ baseline cá nhân của mỗi người dùng, do đó có thể phân biệt nhịp tim cao do tập thể dục với nhịp tim cao do stress hoặc bệnh lý.\n\nKhi phát hiện pattern bất thường liên tục, HealthOS gửi cảnh báo được phân cấp theo mức độ nghiêm trọng — từ gợi ý thay đổi lối sống đến khuyến nghị khám bác sĩ ngay lập tức. Mọi cảnh báo đều được ghi lại trong hồ sơ y tế để bác sĩ tham khảo.",
      en: "Heart rate is one of the most important indicators of cardiovascular health. Unusual fluctuations can be early signs of serious problems including arrhythmia, myocardial ischemia, or excessive stress.\n\nHealthOS's anomaly detection algorithm uses machine learning models trained on millions of heart rate time series. The system learns each user's personal baseline, allowing it to distinguish elevated heart rate from exercise versus stress or pathology.\n\nWhen sustained anomalous patterns are detected, HealthOS sends tiered alerts based on severity — from lifestyle change suggestions to recommendations to see a doctor immediately. Every alert is logged in the medical record for physician review.",
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
    body: {
      vi: "Hồ sơ y tế điện tử (EMR) đã thay đổi căn bản cách thức quản lý thông tin sức khỏe trên toàn thế giới. Thay vì lưu trữ trên giấy tờ dễ thất lạc, thông tin y tế được lưu trữ an toàn trên đám mây, có thể truy cập từ bất kỳ đâu trong trường hợp khẩn cấp.\n\nVới HealthOS, bệnh nhân có thể chia sẻ hồ sơ y tế với bác sĩ chuyên khoa chỉ bằng một cú chạm, loại bỏ hoàn toàn việc phải mang theo giấy tờ y tế cồng kềnh. Bác sĩ có thể xem toàn bộ lịch sử bệnh, đơn thuốc và kết quả xét nghiệm trước khi khám, giúp tiết kiệm thời gian và tăng chất lượng tư vấn.\n\nHệ thống cũng tự động phát hiện tương tác thuốc nguy hiểm và dị ứng khi bác sĩ kê đơn, giảm thiểu đáng kể nguy cơ sai sót y tế. Theo nghiên cứu, EMR có thể giảm tới 80% các lỗi kê đơn thuốc so với hệ thống giấy tờ truyền thống.",
      en: "Electronic medical records (EMR) have fundamentally changed how health information is managed worldwide. Instead of paper files that can be lost, medical information is stored securely in the cloud, accessible from anywhere in an emergency.\n\nWith HealthOS, patients can share their medical records with specialist physicians with a single tap, eliminating the need to carry bulky paper records. Physicians can review a complete medical history, prescriptions, and lab results before the appointment, saving time and improving consultation quality.\n\nThe system also automatically detects dangerous drug interactions and allergies when physicians prescribe, significantly reducing medical error risk. Research shows EMR can reduce prescription errors by up to 80% compared to traditional paper-based systems.",
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
    body: {
      vi: "Meal Scan là tính năng nổi bật nhất của HealthOS, giải quyết rào cản lớn nhất trong việc theo dõi dinh dưỡng: sự bất tiện khi phải tìm kiếm và nhập thông tin thực phẩm theo cách thủ công.\n\nModel AI được huấn luyện trên dataset hơn 2 triệu hình ảnh thực phẩm Việt Nam và quốc tế. Khi người dùng chụp ảnh bữa ăn, hệ thống nhận diện từng món, ước tính khẩu phần và tính toán macronutrients, calories, vitamin và khoáng chất chỉ trong 2-3 giây. Độ chính xác đạt trên 90% với các món ăn phổ biến.\n\nTính năng còn cho phép người dùng điều chỉnh kết quả nhận diện nếu cần, và mỗi lần điều chỉnh giúp model học thêm để cải thiện độ chính xác. Meal Scan hỗ trợ cả ảnh chụp và video quay ngắn, phù hợp với buffet hoặc bữa ăn nhiều món.",
      en: "Meal Scan is HealthOS's flagship feature, eliminating the biggest barrier to nutrition tracking: the inconvenience of manually searching and entering food information.\n\nThe AI model is trained on a dataset of over 2 million Vietnamese and international food images. When a user photographs a meal, the system identifies each dish, estimates portions, and calculates macronutrients, calories, vitamins, and minerals in just 2-3 seconds. Accuracy exceeds 90% for common dishes.\n\nUsers can also adjust recognition results when needed, and each correction helps the model learn and improve accuracy. Meal Scan supports both photos and short videos, making it ideal for buffets or multi-dish meals.",
    },
    author: "Geras Indive",
    date: "2025-12-28",
    categoryId: "ai-health",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
    readingMinutes: 5,
  },
];
