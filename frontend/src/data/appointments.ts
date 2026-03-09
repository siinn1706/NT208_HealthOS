/**
 * Mock appointment / medical-history data for development / MVP.
 *
 * Replace with BFF fetch in V1:
 * // BFF TODO: GET /api/v1/appointments
 *   Trigger: Page load on /dashboard/appointments
 *   Request: { page: number; limit: number }
 *   Response: PaginatedResponse<Appointment>
 *
 * // BFF TODO: GET /api/v1/appointments/:id/prescription
 *   Trigger: User clicks "View Prescription"
 *   Response: { medicines: Medicine[]; notes: string | null }
 *
 * Fallback: import MOCK_APPOINTMENTS and MOCK_PRESCRIPTIONS directly.
 */

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  issuedAt: string;
  doctor: string;
  clinic: string;
  diagnosis: string;
  medicines: Medicine[];
  notes: string | null;
}

export type AppointmentStatus = "completed" | "upcoming" | "cancelled";

export interface Appointment {
  id: string;
  date: string; // ISO date string
  doctorName: string;
  specialty: string;
  clinic: string;
  diagnosis: string;
  status: AppointmentStatus;
  hasPrescription: boolean;
  prescriptionId?: string;
  notes?: string;
}

export const MOCK_PRESCRIPTIONS: Record<string, Prescription> = {
  "rx-001": {
    id: "rx-001",
    issuedAt: "2025-12-15T09:30:00",
    doctor: "BS. Nguyễn Minh Khoa",
    clinic: "Phòng khám Đa khoa 315",
    diagnosis: "Tăng huyết áp giai đoạn 1",
    medicines: [
      {
        name: "Amlodipine 5mg",
        dosage: "1 viên / lần",
        frequency: "1 lần / ngày (sáng)",
        duration: "30 ngày",
        notes: "Uống sau ăn sáng",
      },
      {
        name: "Losartan 50mg",
        dosage: "1 viên / lần",
        frequency: "1 lần / ngày (tối)",
        duration: "30 ngày",
        notes: "Theo dõi huyết áp mỗi ngày",
      },
    ],
    notes: "Hạn chế muối, tập thể dục nhẹ 30 phút/ngày. Tái khám sau 4 tuần.",
  },
  "rx-002": {
    id: "rx-002",
    issuedAt: "2025-10-05T14:00:00",
    doctor: "BS. Trần Thị Hương",
    clinic: "Bệnh viện Đại học Y Dược",
    diagnosis: "Đái tháo đường type 2",
    medicines: [
      {
        name: "Metformin 500mg",
        dosage: "1 viên / lần",
        frequency: "2 lần / ngày (sáng & tối)",
        duration: "60 ngày",
        notes: "Uống trong bữa ăn để giảm tác dụng phụ dạ dày",
      },
      {
        name: "Vitamin D3 1000 IU",
        dosage: "1 viên / lần",
        frequency: "1 lần / ngày",
        duration: "60 ngày",
      },
    ],
    notes:
      "Kiểm soát chế độ ăn, theo dõi đường huyết 2 lần/ngày. Tái khám sau 8 tuần.",
  },
  "rx-003": {
    id: "rx-003",
    issuedAt: "2025-08-22T10:15:00",
    doctor: "BS. Lê Quang Tuấn",
    clinic: "Phòng khám Tim mạch Medic",
    diagnosis: "Rối loạn mỡ máu (Dyslipidemia)",
    medicines: [
      {
        name: "Rosuvastatin 10mg",
        dosage: "1 viên / lần",
        frequency: "1 lần / ngày (tối)",
        duration: "90 ngày",
        notes: "Không dùng cùng lúc với nước bưởi",
      },
    ],
    notes: "Xét nghiệm lipid máu sau 3 tháng. Ăn ít chất béo bão hòa.",
  },
};

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "appt-001",
    date: "2026-03-20T09:30:00",
    doctorName: "BS. Nguyễn Minh Khoa",
    specialty: "Tim mạch",
    clinic: "Phòng khám Đa khoa 315",
    diagnosis: "Tái khám tăng huyết áp",
    status: "upcoming",
    hasPrescription: false,
    notes: "Phòng khám 3, tầng 2",
  },
  {
    id: "appt-002",
    date: "2025-12-15T09:30:00",
    doctorName: "BS. Nguyễn Minh Khoa",
    specialty: "Tim mạch",
    clinic: "Phòng khám Đa khoa 315",
    diagnosis: "Tăng huyết áp giai đoạn 1",
    status: "completed",
    hasPrescription: true,
    prescriptionId: "rx-001",
    notes: "Kết quả ECG bình thường",
  },
  {
    id: "appt-003",
    date: "2025-10-05T14:00:00",
    doctorName: "BS. Trần Thị Hương",
    specialty: "Nội tiết",
    clinic: "Bệnh viện Đại học Y Dược",
    diagnosis: "Đái tháo đường type 2",
    status: "completed",
    hasPrescription: true,
    prescriptionId: "rx-002",
    notes: "HbA1c: 7.2%. Cần kiểm soát chế độ ăn tốt hơn.",
  },
  {
    id: "appt-004",
    date: "2025-08-22T10:15:00",
    doctorName: "BS. Lê Quang Tuấn",
    specialty: "Tim mạch",
    clinic: "Phòng khám Tim mạch Medic",
    diagnosis: "Rối loạn mỡ máu (Dyslipidemia)",
    status: "completed",
    hasPrescription: true,
    prescriptionId: "rx-003",
  },
  {
    id: "appt-005",
    date: "2025-07-03T11:00:00",
    doctorName: "BS. Phạm Thị Lan",
    specialty: "Tổng quát",
    clinic: "Phòng khám Đa khoa FV",
    diagnosis: "Khám sức khỏe định kỳ",
    status: "completed",
    hasPrescription: false,
    notes: "Kết quả xét nghiệm máu trong giới hạn bình thường",
  },
  {
    id: "appt-006",
    date: "2025-05-10T15:30:00",
    doctorName: "BS. Vũ Đức Thịnh",
    specialty: "Thần kinh",
    clinic: "Bệnh viện Nhân dân 115",
    diagnosis: "Nhức đầu do căng thẳng",
    status: "cancelled",
    hasPrescription: false,
    notes: "Hủy vì lý do cá nhân",
  },
];
