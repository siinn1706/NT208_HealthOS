/**
 * Mock ML risk-prediction data for development / MVP.
 *
 * Replace with BFF fetch in V1:
 * // BFF TODO: GET /api/v1/health/risk-predictions
 *   Trigger: Page load on /dashboard/risk
 *   Request: { timeframe: "current" }
 *   Response: { risks: RiskItem[]; generatedAt: string; disclaimer: string }
 *
 * Fallback: import MOCK_RISK_PREDICTIONS directly.
 */

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type RiskTrend = "improving" | "stable" | "worsening";

export interface RiskFactor {
  label: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
}

export interface PreventionTip {
  id: string;
  category: "diet" | "exercise" | "medication" | "monitoring" | "lifestyle";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface RiskItem {
  id: string;
  condition: string;
  conditionVi: string;
  probability: number; // 0–1
  level: RiskLevel;
  trend: RiskTrend;
  factors: RiskFactor[];
  tips: PreventionTip[];
  icdCode?: string;
}

export interface RiskPredictionSummary {
  generatedAt: string;
  overallScore: number; // 0–100 (higher = healthier)
  risks: RiskItem[];
  disclaimer: string;
}

export const MOCK_RISK_PREDICTIONS: RiskPredictionSummary = {
  generatedAt: new Date().toISOString(),
  overallScore: 68,
  disclaimer:
    "Kết quả dự đoán này được tạo bởi AI và chỉ mang tính chất tham khảo. Không thay thế tư vấn của bác sĩ chuyên khoa. Hãy liên hệ chuyên gia y tế để được tư vấn cụ thể.",
  risks: [
    {
      id: "risk-diabetes",
      condition: "Type 2 Diabetes",
      conditionVi: "Đái tháo đường type 2",
      probability: 0.28,
      level: "moderate",
      trend: "stable",
      icdCode: "E11",
      factors: [
        {
          label: "Chỉ số BMI",
          impact: "negative",
          detail: "BMI 27.4 nằm trong vùng thừa cân",
        },
        {
          label: "Hoạt động thể chất",
          impact: "negative",
          detail: "Ít hơn 150 phút/tuần",
        },
        {
          label: "Chế độ ăn",
          impact: "neutral",
          detail: "Lượng carbs ở mức trung bình",
        },
        {
          label: "Lịch sử gia đình",
          impact: "negative",
          detail: "Có tiền sử gia đình mắc bệnh",
        },
        {
          label: "Đường huyết lúc đói",
          impact: "positive",
          detail: "5.6 mmol/L – trong giới hạn bình thường",
        },
      ],
      tips: [
        {
          id: "t-d1",
          category: "exercise",
          title: "Tăng cường vận động",
          description:
            "Đặt mục tiêu 150 phút hoạt động thể chất cường độ vừa mỗi tuần (đi bộ nhanh, đạp xe).",
          priority: "high",
        },
        {
          id: "t-d2",
          category: "diet",
          title: "Giảm carbs tinh chế",
          description:
            "Thay thế cơm trắng, bánh mì trắng bằng ngũ cốc nguyên hạt và rau xanh.",
          priority: "high",
        },
        {
          id: "t-d3",
          category: "monitoring",
          title: "Theo dõi đường huyết",
          description:
            "Kiểm tra HbA1c 6 tháng/lần. Ghi chép chỉ số đường huyết sau bữa ăn.",
          priority: "medium",
        },
      ],
    },
    {
      id: "risk-hypertension",
      condition: "Hypertension",
      conditionVi: "Tăng huyết áp",
      probability: 0.42,
      level: "moderate",
      trend: "worsening",
      icdCode: "I10",
      factors: [
        {
          label: "Huyết áp tâm thu",
          impact: "negative",
          detail: "128 mmHg – tiền tăng huyết áp",
        },
        {
          label: "Căng thẳng & ngủ",
          impact: "negative",
          detail: "Chất lượng giấc ngủ thấp, stress cao",
        },
        {
          label: "Natri trong chế độ ăn",
          impact: "negative",
          detail: "Ước tính 3.2g/ngày (khuyến nghị <2.3g)",
        },
        {
          label: "Không hút thuốc",
          impact: "positive",
          detail: "Yếu tố bảo vệ tim mạch",
        },
      ],
      tips: [
        {
          id: "t-h1",
          category: "diet",
          title: "Chế độ ăn DASH",
          description:
            "Tăng rau củ, trái cây, sữa ít béo; giảm muối < 2.3g/ngày và thịt đỏ.",
          priority: "high",
        },
        {
          id: "t-h2",
          category: "lifestyle",
          title: "Quản lý căng thẳng",
          description:
            "Thiền định 10 phút/ngày, kỹ thuật thở 4-7-8 giúp hạ huyết áp đáng kể.",
          priority: "high",
        },
        {
          id: "t-h3",
          category: "monitoring",
          title: "Đo huyết áp mỗi ngày",
          description:
            "Đo buổi sáng trước khi ăn. Nếu >135/85 mmHg liên tục 3 ngày, liên hệ bác sĩ.",
          priority: "high",
        },
        {
          id: "t-h4",
          category: "lifestyle",
          title: "Cải thiện giấc ngủ",
          description:
            "Mục tiêu 7–8 giờ giấc ngủ chất lượng. Tránh màn hình 1 giờ trước khi ngủ.",
          priority: "medium",
        },
      ],
    },
    {
      id: "risk-dyslipidemia",
      condition: "Dyslipidemia",
      conditionVi: "Rối loạn mỡ máu",
      probability: 0.35,
      level: "moderate",
      trend: "improving",
      icdCode: "E78",
      factors: [
        {
          label: "Cholesterol LDL",
          impact: "negative",
          detail: "3.4 mmol/L – ranh giới cao",
        },
        {
          label: "Cholesterol HDL",
          impact: "positive",
          detail: "1.3 mmol/L – mức tốt",
        },
        {
          label: "Triglycerides",
          impact: "neutral",
          detail: "1.8 mmol/L – bình thường",
        },
        {
          label: "Rosuvastatin đang dùng",
          impact: "positive",
          detail: "Thuốc giúp xu hướng cải thiện",
        },
      ],
      tips: [
        {
          id: "t-l1",
          category: "diet",
          title: "Tăng chất béo tốt",
          description:
            "Ăn cá hồi, bơ, hạt óc chó (omega-3). Hạn chế mỡ động vật và thức ăn chiên rán.",
          priority: "medium",
        },
        {
          id: "t-l2",
          category: "medication",
          title: "Duy trì dùng thuốc",
          description:
            "Tiếp tục Rosuvastatin theo chỉ định. Báo bác sĩ nếu có đau cơ.",
          priority: "high",
        },
      ],
    },
    {
      id: "risk-obesity",
      condition: "Obesity / Overweight",
      conditionVi: "Thừa cân / Béo phì",
      probability: 0.15,
      level: "low",
      trend: "improving",
      icdCode: "E66",
      factors: [
        {
          label: "BMI 27.4",
          impact: "negative",
          detail: "Phân loại thừa cân (ngưỡng 23 cho người châu Á)",
        },
        {
          label: "Calo tiêu thụ",
          impact: "positive",
          detail: "Đang dưới mức duy trì 300 kcal/ngày",
        },
        {
          label: "Hoạt động thể chất",
          impact: "positive",
          detail: "Xu hướng tăng dần trong 2 tuần qua",
        },
      ],
      tips: [
        {
          id: "t-o1",
          category: "diet",
          title: "Thâm hụt calo có kiểm soát",
          description:
            "Duy trì thâm hụt 300–500 kcal/ngày để giảm cân an toàn 0.3–0.5 kg/tuần.",
          priority: "medium",
        },
        {
          id: "t-o2",
          category: "exercise",
          title: "Kết hợp cardio và tập sức",
          description:
            "3 buổi cardio + 2 buổi tập lực / tuần giúp tăng trao đổi chất.",
          priority: "medium",
        },
      ],
    },
  ],
};
