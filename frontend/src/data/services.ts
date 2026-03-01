import { Service } from "@/types";

//  Core Features 
export const coreFeatures: Service[] = [
  {
    id: "cf1",
    icon: "/icons/filled/objects/insurance_card.svg",
    title: { vi: "Hồ sơ y tế điện tử", en: "Digital Medical Records" },
    description: {
      vi: "Lưu trữ toàn bộ lịch sử bệnh án, đơn thuốc, kết quả xét nghiệm và hình ảnh y tế tập trung, bảo mật và dễ truy cập mọi lúc.",
      en: "Store your complete medical history, prescriptions, lab results and medical images  centralized, secure and accessible anytime.",
    },
    cta: { vi: "Xem hồ sơ", en: "View Records" },
    ctaLink: "/services",
  },
  {
    id: "cf2",
    icon: "/icons/filled/nutrition/fruits.svg",
    title: { vi: "Nhật ký dinh dưỡng", en: "Nutrition Diary" },
    description: {
      vi: "Theo dõi lượng calo và dinh dưỡng hàng ngày. Tìm kiếm hàng nghìn loại thực phẩm hoặc quét mã vạch để ghi nhật ký nhanh chóng.",
      en: "Track daily calories and nutrition. Search thousands of foods or scan barcodes to log meals quickly.",
    },
    cta: { vi: "Mở nhật ký", en: "Open Diary" },
    ctaLink: "/services",
  },
  {
    id: "cf3",
    icon: "/icons/filled/diagnostics/malaria_testing.svg",
    title: { vi: "Kết quả xét nghiệm", en: "Lab Results" },
    description: {
      vi: "Theo dõi các chỉ số xét nghiệm máu, nước tiểu và xét nghiệm chuyên sâu theo thời gian với biểu đồ xu hướng trực quan.",
      en: "Track blood, urine and specialized test results over time with visual trend charts.",
    },
    cta: { vi: "Xem kết quả", en: "View Results" },
    ctaLink: "/services",
  },
  {
    id: "cf4",
    icon: "/icons/filled/medications/pills_2.svg",
    title: { vi: "Nhắc uống thuốc", en: "Medication Reminders" },
    description: {
      vi: "Đặt lịch nhắc uống thuốc thông minh, theo dõi tuân thủ điều trị và nhận cảnh báo khi sắp hết thuốc.",
      en: "Set smart medication reminders, track treatment compliance and receive alerts when running low.",
    },
    cta: { vi: "Đặt nhắc", en: "Set Reminder" },
    ctaLink: "/services",
  },
  {
    id: "cf5",
    icon: "/icons/filled/objects/calendar.svg",
    title: { vi: "Lịch khám bệnh", en: "Appointment Scheduling" },
    description: {
      vi: "Lên lịch khám bệnh, theo dõi lịch hẹn sắp tới và nhận nhắc nhở tự động trước mỗi buổi khám.",
      en: "Schedule medical appointments, track upcoming visits and receive automatic reminders.",
    },
    cta: { vi: "Đặt lịch", en: "Book Appointment" },
    ctaLink: "/services",
  },
  {
    id: "cf6",
    icon: "/icons/filled/people/doctor_male.svg",
    title: { vi: "Chia sẻ với bác sĩ", en: "Share with Doctor" },
    description: {
      vi: "Chia sẻ an toàn hồ sơ sức khỏe với bác sĩ của bạn để tư vấn từ xa hoặc chuẩn bị cho buổi khám trực tiếp.",
      en: "Securely share your health records with your doctor for remote consultation or in-person visits.",
    },
    cta: { vi: "Chia sẻ ngay", en: "Share Now" },
    ctaLink: "/services",
  },
  {
    id: "cf7",
    icon: "/icons/filled/graphs/chart_bar.svg",
    title: { vi: "Dashboard sức khỏe", en: "Health Dashboard" },
    description: {
      vi: "Xem tổng quan sức khỏe trực quan với biểu đồ xu hướng, chỉ số quan trọng và tóm tắt hoạt động hàng ngày.",
      en: "View an intuitive health overview with trend charts, key indicators and a daily activity summary.",
    },
    cta: { vi: "Xem dashboard", en: "View Dashboard" },
    ctaLink: "/services",
  },
  {
    id: "cf8",
    icon: "/icons/filled/objects/prescription_document.svg",
    title: { vi: "Quản lý toa thuốc", en: "Prescription Management" },
    description: {
      vi: "Lưu trữ và quản lý toa thuốc từ bác sĩ, theo dõi lịch uống thuốc và nhận nhắc nhở đúng giờ.",
      en: "Store and manage prescriptions from your doctor, track medication schedules and receive timely reminders.",
    },
    cta: { vi: "Xem toa thuốc", en: "View Prescriptions" },
    ctaLink: "/services",
  },
  {
    id: "cf9",
    icon: "/icons/filled/objects/spreadsheets.svg",
    title: { vi: "Xuất báo cáo PDF", en: "Export PDF Report" },
    description: {
      vi: "Xuất toàn bộ hồ sơ sức khỏe, lịch sử khám bệnh và kết quả xét nghiệm thành file PDF để chia sẻ hoặc lưu trữ.",
      en: "Export your complete health records, medical history and test results as a PDF file for sharing or archiving.",
    },
    cta: { vi: "Xuất báo cáo", en: "Export Report" },
    ctaLink: "/services",
  },
];

//  AI Intelligence 
export const aiFeatures: Service[] = [
  {
    id: "ai1",
    icon: "/icons/filled/nutrition/fruits.svg",
    title: { vi: "Quét bữa ăn (Meal Scan)", en: "Meal Scan" },
    description: {
      vi: "Chụp ảnh bữa ăn bằng camera và AI sẽ tự phân tích, nhận diện thực phẩm và ước tính lượng calo, protein, carb, chất béo trong vài giây.",
      en: "Take a photo of your meal and AI automatically identifies foods and estimates calories, protein, carbs and fat within seconds.",
    },
    cta: { vi: "Quét ngay", en: "Scan Now" },
    ctaLink: "/services",
  },
  {
    id: "ai2",
    icon: "/icons/filled/graphs/chart-cured-increasing.svg",
    title: { vi: "Phân tích dinh dưỡng AI", en: "AI Nutrition Analysis" },
    description: {
      vi: "AI phân tích xu hướng dinh dưỡng của bạn theo tuần/tháng và đưa ra báo cáo chi tiết về sự thiếu hụt hoặc dư thừa dưỡng chất.",
      en: "AI analyzes your weekly/monthly nutrition trends and generates detailed reports on nutrient deficiencies or excesses.",
    },
    cta: { vi: "Xem phân tích", en: "View Analysis" },
    ctaLink: "/services",
  },
  {
    id: "ai3",
    icon: "/icons/filled/specialties/cardiology.svg",
    title: { vi: "Phát hiện bất thường", en: "Anomaly Detection" },
    description: {
      vi: "Thuật toán AI liên tục giám sát dữ liệu sinh trắc học và cảnh báo sớm khi phát hiện các dấu hiệu bất thường cần chú ý.",
      en: "AI algorithms continuously monitor biometric data and provide early warnings when abnormal signs are detected.",
    },
    cta: { vi: "Tìm hiểu thêm", en: "Learn More" },
    ctaLink: "/services",
  },
  {
    id: "ai4",
    icon: "/icons/filled/emotions/happy.svg",
    title: { vi: "Gợi ý sức khỏe cá nhân", en: "Personalized Health Insights" },
    description: {
      vi: "Nhận gợi ý sức khỏe được cá nhân hóa dựa trên hồ sơ y tế, thói quen dinh dưỡng và dữ liệu wearable của riêng bạn.",
      en: "Receive personalized health suggestions based on your individual medical records, nutrition habits and wearable data.",
    },
    cta: { vi: "Nhận gợi ý", en: "Get Insights" },
    ctaLink: "/services",
  },
  {
    id: "ai5",
    icon: "/icons/filled/body/neurology.svg",
    title: { vi: "Phân tích chỉ số sức khỏe", en: "Health Index Analysis" },
    description: {
      vi: "Tổng hợp các chỉ số sức khỏe  BMI, huyết áp, đường huyết, nhịp tim  và đưa ra điểm sức khỏe tổng quát.",
      en: "Synthesize health indicators  BMI, blood pressure, blood sugar, heart rate  into a comprehensive health score.",
    },
    cta: { vi: "Xem chỉ số", en: "View Index" },
    ctaLink: "/services",
  },
  {
    id: "ai6",
    icon: "/icons/filled/specialties/endocrinology.svg",
    title: { vi: "Dự báo rủi ro sức khỏe", en: "Health Risk Prediction" },
    description: {
      vi: "Dựa trên lịch sử sức khỏe và các yếu tố nguy cơ, AI dự báo khả năng mắc một số bệnh lý và gợi ý biện pháp phòng ngừa.",
      en: "Based on health history and risk factors, AI predicts likelihood of certain conditions and suggests preventive measures.",
    },
    cta: { vi: "Dự báo ngay", en: "Get Prediction" },
    ctaLink: "/services",
  },
  {
    id: "ai7",
    icon: "/icons/filled/people/call_centre.svg",
    title: { vi: "Chat với AI bác sĩ", en: "Chat with AI Doctor" },
    description: {
      vi: "Trò chuyện trực tiếp với AI bác sĩ 24/7 để được tư vấn sức khỏe, giải đáp thắc mắc và nhận gợi ý điều trị ban đầu.",
      en: "Chat directly with an AI doctor 24/7 for health consultations, answers to your questions and initial treatment suggestions.",
    },
    cta: { vi: "Bắt đầu chat", en: "Start Chat" },
    ctaLink: "/services",
  },
  {
    id: "ai8",
    icon: "/icons/filled/graphs/chart_line.svg",
    title: { vi: "Phân tích xu hướng sức khỏe", en: "Health Trend Analysis" },
    description: {
      vi: "AI phân tích xu hướng dài hạn từ dữ liệu sức khỏe của bạn, phát hiện các thay đổi bất thường và gợi ý hành động kịp thời.",
      en: "AI analyzes long-term trends from your health data, detects unusual changes and suggests timely actions.",
    },
    cta: { vi: "Phân tích ngay", en: "Analyze Trends" },
    ctaLink: "/services",
  },
];

//  Realtime & Wearables 
export const realtimeFeatures: Service[] = [
  {
    id: "rt1",
    icon: "/icons/filled/exercise/weights.svg",
    title: { vi: "Kết nối Wearable", en: "Wearable Integration" },
    description: {
      vi: "Kết nối liền mạch với Apple Watch, Garmin, Fitbit, Samsung Galaxy Watch và hàng chục thiết bị đeo thông minh khác.",
      en: "Seamlessly connect with Apple Watch, Garmin, Fitbit, Samsung Galaxy Watch and dozens of other smartwatches.",
    },
    cta: { vi: "Kết nối ngay", en: "Connect Now" },
    ctaLink: "/services",
  },
  {
    id: "rt2",
    icon: "/icons/filled/specialties/cardiology.svg",
    title: { vi: "Theo dõi nhịp tim & SpO", en: "Heart Rate & SpO Monitoring" },
    description: {
      vi: "Theo dõi liên tục nhịp tim, độ bão hòa oxy trong máu (SpO) và HRV theo thời gian thực với biểu đồ chi tiết.",
      en: "Continuously monitor heart rate, blood oxygen (SpO) and HRV in real time with detailed charts.",
    },
    cta: { vi: "Xem dữ liệu", en: "View Data" },
    ctaLink: "/services",
  },
  {
    id: "rt3",
    icon: "/icons/filled/objects/insurance_card.svg",
    title: { vi: "Cảnh báo realtime", en: "Realtime Alerts" },
    description: {
      vi: "Nhận thông báo tức thì khi phát hiện nhịp tim bất thường, mức SpO thấp, hoặc các chỉ số vượt ngưỡng cảnh báo.",
      en: "Receive instant notifications when abnormal heart rate, low SpO levels, or threshold-exceeding readings are detected.",
    },
    cta: { vi: "Cài cảnh báo", en: "Set Alerts" },
    ctaLink: "/services",
  },
  {
    id: "rt4",
    icon: "/icons/filled/graphs/chart-cured-increasing.svg",
    title: { vi: "Đồng bộ & Tổng hợp dữ liệu", en: "Data Sync & Aggregation" },
    description: {
      vi: "Tự động đồng bộ dữ liệu từ tất cả thiết bị và ứng dụng sức khỏe để tạo bức tranh sức khỏe toàn diện của bạn.",
      en: "Automatically sync data from all devices and health apps to create a comprehensive health picture.",
    },
    cta: { vi: "Đồng bộ ngay", en: "Sync Now" },
    ctaLink: "/services",
  },
  {
    id: "rt5",
    icon: "/icons/filled/objects/calendar.svg",
    title: { vi: "Báo cáo sức khỏe tuần", en: "Weekly Health Reports" },
    description: {
      vi: "Nhận báo cáo tổng kết hàng tuần về hoạt động thể chất, dinh dưỡng, giấc ngủ và các chỉ số sinh trắc học quan trọng.",
      en: "Receive weekly summary reports on physical activity, nutrition, sleep and key biometric indicators.",
    },
    cta: { vi: "Xem báo cáo", en: "View Report" },
    ctaLink: "/services",
  },
  {
    id: "rt6",
    icon: "/icons/filled/diagnostics/malaria_testing.svg",
    title: { vi: "Theo dõi giấc ngủ", en: "Sleep Tracking" },
    description: {
      vi: "Phân tích chất lượng giấc ngủ, theo dõi các giai đoạn REM/Deep/Light và đưa ra gợi ý cải thiện giấc ngủ cá nhân hóa.",
      en: "Analyze sleep quality, track REM/Deep/Light sleep stages and provide personalized sleep improvement suggestions.",
    },
    cta: { vi: "Phân tích giấc ngủ", en: "Analyze Sleep" },
    ctaLink: "/services",
  },
];

//  Goals & Gamification 
export const gamificationFeatures: Service[] = [
  {
    id: "gm1",
    icon: "/icons/filled/objects/i_certificate_paper.svg",
    title: { vi: "Đặt mục tiêu sức khỏe", en: "Set Health Goals" },
    description: {
      vi: "Tự đặt mục tiêu cá nhân về cân nặng, số bước chân, lượng nước uống, calo và theo dõi tiến độ hàng ngày.",
      en: "Set personal goals for weight, step count, water intake, calories and track daily progress.",
    },
    cta: { vi: "Đặt mục tiêu", en: "Set Goals" },
    ctaLink: "/services",
  },
  {
    id: "gm2",
    icon: "/icons/filled/graphs/chart-cured-increasing.svg",
    title: { vi: "Theo dõi tiến độ", en: "Track Progress" },
    description: {
      vi: "Theo dõi tiến độ đạt mục tiêu qua biểu đồ trực quan, streak ngày liên tiếp và mốc thành tích đáng nhớ.",
      en: "Track your goal progress through visual charts, daily streaks and memorable achievement milestones.",
    },
    cta: { vi: "Xem tiến độ", en: "View Progress" },
    ctaLink: "/services",
  },
  {
    id: "gm3",
    icon: "/icons/filled/objects/award_trophy.svg",
    title: { vi: "Hệ thống thành tích", en: "Achievement System" },
    description: {
      vi: "Mở khóa huy hiệu và thành tích khi đạt cột mốc sức khỏe, tạo động lực duy trì thói quen lành mạnh.",
      en: "Unlock badges and achievements when you hit health milestones, motivating you to maintain healthy habits.",
    },
    cta: { vi: "Xem thành tích", en: "View Achievements" },
    ctaLink: "/services",
  },
  {
    id: "gm4",
    icon: "/icons/filled/shapes/star_large.svg",
    title: { vi: "Bảng xếp hạng", en: "Leaderboard" },
    description: {
      vi: "So sánh chỉ số sức khỏe với bạn bè và cộng đồng HealthOS, tạo động lực cạnh tranh lành mạnh.",
      en: "Compare health metrics with friends and the HealthOS community, creating healthy competitive motivation.",
    },
    cta: { vi: "Xem bảng xếp hạng", en: "View Leaderboard" },
    ctaLink: "/services",
  },
  {
    id: "gm5",
    icon: "/icons/filled/exercise/running.svg",
    title: { vi: "Gợi ý bài tập cá nhân hóa", en: "Personalized Exercise Tips" },
    description: {
      vi: "Nhận kế hoạch luyện tập được cá nhân hóa dựa trên mục tiêu, thể trạng và lịch sử hoạt động của bạn.",
      en: "Receive a personalized workout plan based on your goals, fitness level and activity history.",
    },
    cta: { vi: "Xem bài tập", en: "View Exercises" },
    ctaLink: "/services",
  },
  {
    id: "gm6",
    icon: "/icons/filled/people/i_groups_perspective_crowd.svg",
    title: { vi: "Tham gia thách thức cộng đồng", en: "Community Challenges" },
    description: {
      vi: "Tham gia các thách thức sức khỏe theo nhóm, cùng nhau đạt mục tiêu và chia sẻ hành trình sống khỏe.",
      en: "Join group health challenges, achieve goals together and share your wellness journey.",
    },
    cta: { vi: "Tham gia ngay", en: "Join Challenges" },
    ctaLink: "/services",
  },
];
