/**
 * Mock data for the Chat/Messaging feature.
 * Replace with real API calls (hooks) when backend is ready.
 */

import type {
  Conversation,
  Message,
  ChatParticipant,
  StrangerRequest,
  ChatTheme,
  ChatGradient,
  ChatPattern,
} from "@/types/api";

// ─── Current user (logged-in session) ────────────────────────────────
export const CURRENT_USER_ID = "user-me";

export const CURRENT_USER: ChatParticipant = {
  user_id: CURRENT_USER_ID,
  display_name: "Nguyễn Văn A",
  avatar_url: null,
  email: "me@example.com",
  is_online: true,
  last_seen: null,
};

// ─── Mock Participants ────────────────────────────────────────────────
export const MOCK_USERS: ChatParticipant[] = [
  {
    user_id: "user-1",
    display_name: "Trần Thị Bình",
    avatar_url: null,
    email: "binh.tran@example.com",
    is_online: true,
    last_seen: null,
  },
  {
    user_id: "user-2",
    display_name: "Lê Minh Khoa",
    avatar_url: null,
    email: "khoa.le@example.com",
    is_online: false,
    last_seen: "2026-03-02T08:30:00Z",
  },
  {
    user_id: "user-3",
    display_name: "Phạm Thu Hà",
    avatar_url: null,
    email: "ha.pham@example.com",
    is_online: true,
    last_seen: null,
  },
  {
    user_id: "user-4",
    display_name: "Đỗ Quốc Hưng",
    avatar_url: null,
    email: "hung.do@example.com",
    is_online: false,
    last_seen: "2026-03-01T21:15:00Z",
  },
  {
    user_id: "user-5",
    display_name: "Vũ Ngọc Lan",
    avatar_url: null,
    email: "lan.vu@example.com",
    is_online: false,
    last_seen: "2026-03-02T06:00:00Z",
  },
  {
    user_id: "user-6",
    display_name: "Hoàng Đức Anh",
    avatar_url: null,
    email: "anh.hoang@example.com",
    is_online: true,
    last_seen: null,
  },
  {
    user_id: "user-7",
    display_name: "Ngô Thị Cẩm",
    avatar_url: null,
    email: "cam.ngo@example.com",
    is_online: false,
    last_seen: "2026-03-02T09:00:00Z",
  },
  {
    user_id: "user-8",
    display_name: "Bùi Thanh Tùng",
    avatar_url: null,
    email: "tung.bui@example.com",
    is_online: false,
    last_seen: "2026-02-28T18:00:00Z",
  },
  {
    user_id: "user-9",
    display_name: "Dương Thị Mai",
    avatar_url: null,
    email: "mai.duong@example.com",
    is_online: true,
    last_seen: null,
  },
  {
    user_id: "user-10",
    display_name: "Trịnh Văn Đức",
    avatar_url: null,
    email: "duc.trinh@example.com",
    is_online: false,
    last_seen: "2026-03-01T15:30:00Z",
  },
  // Stranger users (not in conversations yet)
  {
    user_id: "stranger-1",
    display_name: "Phan Văn Lực",
    avatar_url: null,
    email: "luc.phan@gmail.com",
    is_online: false,
    last_seen: "2026-03-02T07:45:00Z",
  },
  {
    user_id: "stranger-2",
    display_name: "Lý Thị Sen",
    avatar_url: null,
    email: "sen.ly@outlook.com",
    is_online: true,
    last_seen: null,
  },
  {
    user_id: "stranger-3",
    display_name: "Cao Minh Tuấn",
    avatar_url: null,
    email: "tuan.cao@company.vn",
    is_online: false,
    last_seen: "2026-03-01T22:00:00Z",
  },
];

/** O(1) user lookup — use instead of MOCK_USERS.find() throughout the chat feature */
export const MOCK_USERS_MAP = new Map(MOCK_USERS.map((u) => [u.user_id, u]));

// ─── Mock Conversations ───────────────────────────────────────────────
export const MOCK_CONVERSATIONS: Conversation[] = [
  // 0. AI Chat — always first (type = ai)
  {
    id: "conv-ai",
    type: "ai",
    name: "HealthOS AI Assistant",
    avatar_url: null,
    participants: [CURRENT_USER],
    last_message: {
      content: "Xin chào! Tôi có thể giúp gì cho bạn hôm nay?",
      sender_id: "ai",
      created_at: "2026-03-02T09:00:00Z",
      type: "text",
      is_recalled: false,
    },
    is_pinned: true,
    is_muted: false,
    unread_count: 0,
    theme_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-02T09:00:00Z",
  },
  // 1. Pinned conversation
  {
    id: "conv-1",
    type: "direct",
    participants: [CURRENT_USER, MOCK_USERS[0]],
    last_message: {
      content: "Bạn nhớ uống thuốc huyết áp buổi sáng nhé!",
      sender_id: "user-1",
      created_at: "2026-03-02T10:30:00Z",
      type: "text",
      is_recalled: false,
    },
    is_pinned: true,
    is_muted: false,
    unread_count: 2,
    theme_id: "gradient-spring",
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-03-02T10:30:00Z",
  },
  // 2.
  {
    id: "conv-2",
    type: "direct",
    participants: [CURRENT_USER, MOCK_USERS[1]],
    last_message: {
      content: "Kết quả xét nghiệm máu của mình ra rồi",
      sender_id: CURRENT_USER_ID,
      created_at: "2026-03-02T08:15:00Z",
      type: "text",
      is_recalled: false,
    },
    is_pinned: false,
    is_muted: false,
    unread_count: 0,
    theme_id: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-03-02T08:15:00Z",
  },
  // 3. Group conversation
  {
    id: "conv-3",
    type: "group",
    name: "Nhóm Sức Khỏe Gia Đình",
    avatar_url: null,
    participants: [CURRENT_USER, MOCK_USERS[2], MOCK_USERS[3], MOCK_USERS[4]],
    last_message: {
      content: "Thu Hà: Mẹ hôm nay đo huyết áp 125/80, bình thường rồi 🎉",
      sender_id: "user-3",
      created_at: "2026-03-02T07:00:00Z",
      type: "text",
      is_recalled: false,
    },
    is_pinned: false,
    is_muted: false,
    unread_count: 5,
    theme_id: "theme-cats",
    created_at: "2026-01-20T00:00:00Z",
    updated_at: "2026-03-02T07:00:00Z",
  },
  // 4.
  {
    id: "conv-4",
    type: "direct",
    participants: [CURRENT_USER, MOCK_USERS[5]],
    last_message: {
      content: "Tin nhắn đã bị thu hồi",
      sender_id: "user-6",
      created_at: "2026-03-01T22:00:00Z",
      type: "text",
      is_recalled: true,
    },
    is_pinned: false,
    is_muted: true,
    unread_count: 0,
    theme_id: null,
    created_at: "2026-02-10T00:00:00Z",
    updated_at: "2026-03-01T22:00:00Z",
  },
  // 5.
  {
    id: "conv-5",
    type: "direct",
    participants: [CURRENT_USER, MOCK_USERS[6]],
    last_message: {
      content: "Lịch tái khám tuần sau vào thứ 4 nhé",
      sender_id: CURRENT_USER_ID,
      created_at: "2026-03-01T16:30:00Z",
      type: "text",
      is_recalled: false,
    },
    is_pinned: false,
    is_muted: false,
    unread_count: 1,
    theme_id: null,
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-03-01T16:30:00Z",
  },
  // 6. Muted
  {
    id: "conv-6",
    type: "direct",
    participants: [CURRENT_USER, MOCK_USERS[7]],
    last_message: {
      content: "Ok bạn nhé",
      sender_id: "user-8",
      created_at: "2026-02-28T10:00:00Z",
      type: "text",
      is_recalled: false,
    },
    is_pinned: false,
    is_muted: true,
    unread_count: 0,
    theme_id: null,
    created_at: "2026-02-20T00:00:00Z",
    updated_at: "2026-02-28T10:00:00Z",
  },
  // 7.
  {
    id: "conv-7",
    type: "direct",
    participants: [CURRENT_USER, MOCK_USERS[8]],
    last_message: {
      content: "Chỉ số BMI của mình hiện là 22.4, bình thường không bạn?",
      sender_id: "user-9",
      created_at: "2026-02-27T14:00:00Z",
      type: "text",
      is_recalled: false,
    },
    is_pinned: false,
    is_muted: false,
    unread_count: 3,
    theme_id: null,
    created_at: "2026-02-25T00:00:00Z",
    updated_at: "2026-02-27T14:00:00Z",
  },
];

// ─── Mock Messages (per conversation) ────────────────────────────────
export const MOCK_MESSAGES: Record<string, Message[]> = {
  // AI conversation
  "conv-ai": [
    {
      id: "ai-msg-1",
      conversation_id: "conv-ai",
      sender_id: "ai",
      content:
        "Xin chào! Tôi là **HealthOS AI Assistant**. Tôi có thể hỗ trợ bạn về sức khỏe, dinh dưỡng, nhắc nhở uống thuốc, giải thích kết quả xét nghiệm và nhiều hơn nữa.\n\nHôm nay tôi có thể giúp gì cho bạn?",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T09:00:00Z",
    },
    {
      id: "ai-msg-2",
      conversation_id: "conv-ai",
      sender_id: CURRENT_USER_ID,
      content: "Chỉ số huyết áp 130/85 có bình thường không?",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T09:02:00Z",
    },
    {
      id: "ai-msg-3",
      conversation_id: "conv-ai",
      sender_id: "ai",
      content:
        "Huyết áp **130/85 mmHg** thuộc mức **Tiền tăng huyết áp** (Prehypertension) theo phân loại JNC 8:\n\n• **Bình thường**: < 120/80 mmHg\n• **Tiền tăng HA**: 120–139/80–89 mmHg ← bạn đang ở đây\n• **Tăng HA độ 1**: 140–159/90–99 mmHg\n\n**Khuyến nghị:**\n- Giảm muối trong chế độ ăn (< 5g/ngày)\n- Tập thể dục 30 phút/ngày, ít nhất 5 ngày/tuần\n- Theo dõi huyết áp định kỳ\n- Tham khảo bác sĩ nếu chỉ số liên tục ở mức này",
      type: "text",
      status: "read",
      reactions: [{ emoji: "👍", user_ids: [CURRENT_USER_ID] }],
      is_edited: false,
      is_recalled: false,
      is_pinned: true,
      created_at: "2026-03-02T09:02:30Z",
    },
    {
      id: "ai-msg-4",
      conversation_id: "conv-ai",
      sender_id: CURRENT_USER_ID,
      content: "Cảm ơn! Vậy mình nên ăn gì để giảm huyết áp?",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T09:05:00Z",
    },
    {
      id: "ai-msg-5",
      conversation_id: "conv-ai",
      sender_id: "ai",
      content:
        "Chế độ ăn **DASH** (Dietary Approaches to Stop Hypertension) được khuyến nghị:\n\n**Nên ăn nhiều:**\n• Rau xanh (cải bó xôi, bông cải xanh)\n• Trái cây (chuối, cam, dưa hấu)\n• Ngũ cốc nguyên hạt\n• Cá béo (cá hồi, cá thu)\n• Đậu và hạt\n\n**Hạn chế:**\n• Muối và thực phẩm mặn\n• Thịt đỏ và thịt chế biến sẵn\n• Đồ ăn nhanh, đồ chiên\n• Rượu bia\n• Đường và nước ngọt",
      type: "text",
      status: "read",
      reactions: [
        { emoji: "❤️", user_ids: [CURRENT_USER_ID] },
        { emoji: "👍", user_ids: [CURRENT_USER_ID] },
      ],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T09:05:30Z",
    },
  ],

  // conv-1: Trần Thị Bình
  "conv-1": [
    {
      id: "c1-msg-1",
      conversation_id: "conv-1",
      sender_id: "user-1",
      content: "Chào bạn! Dạo này sức khỏe thế nào?",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T08:00:00Z",
    },
    {
      id: "c1-msg-2",
      conversation_id: "conv-1",
      sender_id: CURRENT_USER_ID,
      content: "Mình ổn bạn ơi! Vừa đi khám sức khỏe định kỳ về.",
      type: "text",
      status: "read",
      reactions: [{ emoji: "❤️", user_ids: ["user-1"] }],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T08:05:00Z",
    },
    {
      id: "c1-msg-3",
      conversation_id: "conv-1",
      sender_id: "user-1",
      content: "Kết quả thế nào? Các chỉ số có ổn không?",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T08:07:00Z",
    },
    {
      id: "c1-msg-4",
      conversation_id: "conv-1",
      sender_id: CURRENT_USER_ID,
      content: "Huyết áp hơi cao một chút, bác sĩ dặn cần theo dõi thêm",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T08:10:00Z",
    },
    {
      id: "c1-msg-5",
      conversation_id: "conv-1",
      sender_id: "user-1",
      content: "Vậy à, bạn nhớ uống đủ nước và hạn chế muối nhé",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: true,
      created_at: "2026-03-01T08:12:00Z",
    },
    {
      id: "c1-msg-6",
      conversation_id: "conv-1",
      sender_id: CURRENT_USER_ID,
      content: "Ừ mình biết rồi. Cảm ơn bạn nhiều nha",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T08:15:00Z",
    },
    {
      id: "c1-msg-7",
      conversation_id: "conv-1",
      sender_id: CURRENT_USER_ID,
      content: "Thực ra hôm qua mình lỡ ăn nhiều đồ mặn 😅",
      type: "text",
      status: "read",
      reactions: [{ emoji: "😂", user_ids: ["user-1"] }],
      is_edited: true,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T09:00:00Z",
      edited_at: "2026-03-01T09:01:00Z",
    },
    {
      id: "c1-msg-8",
      conversation_id: "conv-1",
      sender_id: "user-1",
      content: "",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: true,
      is_pinned: false,
      created_at: "2026-03-01T09:05:00Z",
    },
    {
      id: "c1-msg-9",
      conversation_id: "conv-1",
      sender_id: "user-1",
      content: "Thôi hôm nay cẩn thận hơn nhé bạn hihi",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T09:06:00Z",
    },
    {
      id: "c1-msg-10",
      conversation_id: "conv-1",
      sender_id: "user-1",
      content: "Bạn nhớ uống thuốc huyết áp buổi sáng nhé!",
      type: "text",
      status: "delivered",
      reply_to: {
        id: "c1-msg-5",
        content: "Vậy à, bạn nhớ uống đủ nước và hạn chế muối nhé",
        sender_id: "user-1",
        type: "text",
      },
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T10:30:00Z",
    },
  ],

  // conv-2: Lê Minh Khoa
  "conv-2": [
    {
      id: "c2-msg-1",
      conversation_id: "conv-2",
      sender_id: CURRENT_USER_ID,
      content: "Khoa ơi, kết quả xét nghiệm máu của mình ra rồi",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T08:00:00Z",
    },
    {
      id: "c2-msg-2",
      conversation_id: "conv-2",
      sender_id: "user-2",
      content: "Kết quả sao bạn?",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T08:05:00Z",
    },
    {
      id: "c2-msg-3",
      conversation_id: "conv-2",
      sender_id: CURRENT_USER_ID,
      content:
        "Cholesterol tổng là 195 mg/dL, LDL 110 mg/dL, HDL 55 mg/dL. Bình thường không bạn?",
      type: "text",
      status: "read",
      reactions: [{ emoji: "😮", user_ids: ["user-2"] }],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T08:07:00Z",
    },
    {
      id: "c2-msg-4",
      conversation_id: "conv-2",
      sender_id: "user-2",
      content:
        "Theo mình biết thì: Cholesterol tổng < 200 là bình thường, LDL < 130 là ổn, HDL > 40 là tốt. Của bạn vẫn trong ngưỡng an toàn đó!",
      type: "text",
      status: "read",
      reactions: [{ emoji: "👍", user_ids: [CURRENT_USER_ID] }],
      is_edited: false,
      is_recalled: false,
      is_pinned: true,
      created_at: "2026-03-02T08:10:00Z",
    },
    {
      id: "c2-msg-5",
      conversation_id: "conv-2",
      sender_id: CURRENT_USER_ID,
      content: "Kết quả xét nghiệm máu của mình ra rồi",
      type: "text",
      status: "sent",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T08:15:00Z",
    },
  ],

  // conv-3: Nhóm Sức Khỏe Gia Đình
  "conv-3": [
    {
      id: "c3-system-1",
      conversation_id: "conv-3",
      sender_id: "system",
      content: "Nguyễn Văn A đã tạo nhóm Sức Khỏe Gia Đình",
      type: "system",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-01-20T00:00:00Z",
    },
    {
      id: "c3-msg-1",
      conversation_id: "conv-3",
      sender_id: CURRENT_USER_ID,
      content: "Mình tạo nhóm này để mọi người cùng theo dõi sức khỏe gia đình nha!",
      type: "text",
      status: "read",
      reactions: [
        { emoji: "❤️", user_ids: ["user-3", "user-4", "user-5"] },
      ],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-01-20T00:01:00Z",
    },
    {
      id: "c3-msg-2",
      conversation_id: "conv-3",
      sender_id: "user-3",
      content: "Hay quá! Mình sẽ chia sẻ kết quả sức khỏe của gia đình mình ở đây",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-01-20T00:05:00Z",
    },
    {
      id: "c3-msg-3",
      conversation_id: "conv-3",
      sender_id: "user-4",
      content: "Tốt quá, ba mình vừa ra viện cần theo dõi thêm",
      type: "text",
      status: "read",
      reactions: [{ emoji: "😢", user_ids: [CURRENT_USER_ID, "user-3", "user-5"] }],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-01-20T00:10:00Z",
    },
    {
      id: "c3-msg-4",
      conversation_id: "conv-3",
      sender_id: CURRENT_USER_ID,
      content: "Bác cần theo dõi gì vậy Hưng? Ứng dụng có thể giúp nhắc nhở uống thuốc",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-01-20T00:15:00Z",
    },
    {
      id: "c3-msg-5",
      conversation_id: "conv-3",
      sender_id: "user-3",
      content: "Mẹ hôm nay đo huyết áp 125/80, bình thường rồi 🎉",
      type: "text",
      status: "delivered",
      reactions: [
        { emoji: "❤️", user_ids: [CURRENT_USER_ID, "user-4", "user-5"] },
        { emoji: "👍", user_ids: [CURRENT_USER_ID] },
      ],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-02T07:00:00Z",
    },
  ],

  // conv-4: Hoàng Đức Anh (muted)
  "conv-4": [
    {
      id: "c4-msg-1",
      conversation_id: "conv-4",
      sender_id: "user-6",
      content: "Anh ơi, em muốn hỏi về bài tập thể dục cho người bị đau lưng",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T20:00:00Z",
    },
    {
      id: "c4-msg-2",
      conversation_id: "conv-4",
      sender_id: CURRENT_USER_ID,
      content: "Bạn nên thử yoga hoặc bơi lội, các bài tập đó nhẹ nhàng cho cột sống",
      type: "text",
      status: "read",
      reactions: [{ emoji: "👍", user_ids: ["user-6"] }],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T20:10:00Z",
    },
    {
      id: "c4-msg-3",
      conversation_id: "conv-4",
      sender_id: "user-6",
      content: "",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: true,
      is_pinned: false,
      created_at: "2026-03-01T22:00:00Z",
    },
  ],

  // conv-5: Ngô Thị Cẩm
  "conv-5": [
    {
      id: "c5-msg-1",
      conversation_id: "conv-5",
      sender_id: "user-7",
      content: "Mình muốn hỏi về lịch tái khám",
      type: "text",
      status: "read",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T16:00:00Z",
    },
    {
      id: "c5-msg-2",
      conversation_id: "conv-5",
      sender_id: CURRENT_USER_ID,
      content: "Lịch tái khám tuần sau vào thứ 4 nhé",
      type: "text",
      status: "sent",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-03-01T16:30:00Z",
    },
  ],

  // conv-7: Dương Thị Mai
  "conv-7": [
    {
      id: "c7-msg-1",
      conversation_id: "conv-7",
      sender_id: "user-9",
      content: "Chỉ số BMI của mình hiện là 22.4, bình thường không bạn?",
      type: "text",
      status: "delivered",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-02-27T14:00:00Z",
    },
    {
      id: "c7-msg-2",
      conversation_id: "conv-7",
      sender_id: "user-9",
      content: "Mình lo vì dạo này hay xây xẩm mặt mày",
      type: "text",
      status: "delivered",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-02-27T14:01:00Z",
    },
    {
      id: "c7-msg-3",
      conversation_id: "conv-7",
      sender_id: "user-9",
      content: "Bạn có biết nguyên nhân không?",
      type: "text",
      status: "delivered",
      reactions: [],
      is_edited: false,
      is_recalled: false,
      is_pinned: false,
      created_at: "2026-02-27T14:02:00Z",
    },
  ],
};

// ─── Mock Stranger Requests ───────────────────────────────────────────
export const MOCK_STRANGER_REQUESTS: StrangerRequest[] = [
  {
    id: "req-1",
    from_user: MOCK_USERS[10], // stranger-1
    message_preview: "Chào bạn! Mình tìm thấy tài khoản của bạn và muốn kết nối để trao đổi về sức khỏe.",
    status: "pending",
    created_at: "2026-03-02T06:00:00Z",
  },
  {
    id: "req-2",
    from_user: MOCK_USERS[11], // stranger-2
    message_preview: "Xin chào, mình là bác sĩ tư vấn dinh dưỡng, có thể giúp bạn về chế độ ăn không?",
    status: "pending",
    created_at: "2026-03-01T20:00:00Z",
  },
  {
    id: "req-3",
    from_user: MOCK_USERS[12], // stranger-3
    message_preview: "Bạn ơi mình cần hỏi về ứng dụng HealthOS",
    status: "pending",
    created_at: "2026-03-01T15:30:00Z",
  },
];

// ─── Chat Themes (mapped from /resources/chat/) ───────────────────────
export const CHAT_THEMES: ChatTheme[] = [
  // Gradients
  { id: "gradient-default-light", name: "Default Light", type: "gradient", url: "/resources/chat/Gradient_Default Light-DsPvtvsr.png" },
  { id: "gradient-default-dark", name: "Default Dark", type: "gradient", url: "/resources/chat/Gradient_Default Dark-DqP_otvt.png" },
  { id: "gradient-spring", name: "Spring", type: "gradient", url: "/resources/chat/Gradient_Spring-utzOhszE.png" },
  { id: "gradient-summer", name: "Summer", type: "gradient", url: "/resources/chat/Gradient_Summer-CF0d_y--.png" },
  { id: "gradient-autumn", name: "Autumn", type: "gradient", url: "/resources/chat/Gradient_Autumn-C2z_tKeH.png" },
  { id: "gradient-warm-winter", name: "Warm Winter", type: "gradient", url: "/resources/chat/Gradient_Warm Winter-BnTdiOVY.png" },
  { id: "gradient-fresh-morning", name: "Fresh Morning", type: "gradient", url: "/resources/chat/Gradient_Fresh morning-DvU2263F.png" },
  { id: "gradient-frosty-morning", name: "Frosty Morning", type: "gradient", url: "/resources/chat/Gradient_Frosty morning-DzdUqMPP.png" },
  { id: "gradient-polar-lights", name: "Polar Lights", type: "gradient", url: "/resources/chat/Gradient_Polar Lights-BFwtmsou.png" },
  { id: "gradient-iridescent", name: "Iridescent", type: "gradient", url: "/resources/chat/Gradient_Iridescent-pbNkXFg9.png" },
  { id: "gradient-cold-sunrise", name: "Cold Sunrise", type: "gradient", url: "/resources/chat/Gradient_Сold sunrise-C5svGP5t.png" },
  // Patterns
  { id: "theme-cats", name: "Cats", type: "pattern", url: "/resources/chat/Theme_Cats-C3s-Kipz.svg" },
  { id: "theme-space", name: "Space", type: "pattern", url: "/resources/chat/Theme_Space-DlZIkUbo.svg" },
  { id: "theme-love", name: "Love", type: "pattern", url: "/resources/chat/Theme_Love-BUl-vHnx.svg" },
  { id: "theme-food", name: "Food", type: "pattern", url: "/resources/chat/Theme_Food-BrTXL3Fr.svg" },
  { id: "theme-sport", name: "Sport", type: "pattern", url: "/resources/chat/Theme_Sport-BGq92n-p.svg" },
  { id: "theme-space-cat", name: "Space Cat", type: "pattern", url: "/resources/chat/Theme_Space Cat-BTJ0LWAn.svg" },
  { id: "theme-magic", name: "Magic", type: "pattern", url: "/resources/chat/Theme_Magic-BIel16qe.svg" },
  { id: "theme-unicorn", name: "Unicorn", type: "pattern", url: "/resources/chat/Theme_Unicorn-DUqxQ0x9.svg" },
  { id: "theme-sea-world", name: "Sea World", type: "pattern", url: "/resources/chat/Theme_Sea World-BPImsfen.svg" },
  { id: "theme-christmas", name: "Christmas", type: "pattern", url: "/resources/chat/Theme_Christmas-CP_Rysf6.svg" },
  { id: "theme-halloween", name: "Halloween", type: "pattern", url: "/resources/chat/Theme_HALOWEEN-BLTkatUp.svg" },
  { id: "theme-games", name: "Games", type: "pattern", url: "/resources/chat/Theme_Games-BvKvy_lh.svg" },
  { id: "theme-games-2", name: "Games 2", type: "pattern", url: "/resources/chat/Theme_Games 2-D0zKSj63.svg" },
  { id: "theme-cartoon-space", name: "Cartoon Space", type: "pattern", url: "/resources/chat/Theme_Cartoon Space-B8pfyczX.svg" },
  { id: "theme-woodland", name: "Woodland", type: "pattern", url: "/resources/chat/Theme_Woodland-CJHaqtKQ.svg" },
  { id: "theme-zoo", name: "Zoo", type: "pattern", url: "/resources/chat/Theme_Zoo-lk1JgSaL.svg" },
  { id: "theme-sweet-love", name: "Sweet Love", type: "pattern", url: "/resources/chat/Theme_Sweet Love-B6oOGVl0.svg" },
  { id: "theme-sweets", name: "Sweets", type: "pattern", url: "/resources/chat/Theme_Sweets-BZtwOzHg.svg" },
  { id: "theme-snowflakes", name: "Snowflakes", type: "pattern", url: "/resources/chat/Theme_Snowflakes-BCdBcNLG.svg" },
  { id: "theme-star-wars", name: "Star Wars", type: "pattern", url: "/resources/chat/Theme_Star Wars-2wxrVPVp.svg" },
  { id: "theme-star-wars-2", name: "Star Wars 2", type: "pattern", url: "/resources/chat/Theme_Star Wars 2-Cl9kmBqV.svg" },
  { id: "theme-witch", name: "Witch", type: "pattern", url: "/resources/chat/Theme_Witch-BRl6Go-5.svg" },
  { id: "theme-wizard", name: "Wizard World", type: "pattern", url: "/resources/chat/Theme_Wizard world-BWYKZhjt.svg" },
  { id: "theme-magic-2", name: "Magic 2", type: "pattern", url: "/resources/chat/Theme_Magic 2-B-CFhNEg.svg" },
  { id: "theme-magic-potion", name: "Magic Potion", type: "pattern", url: "/resources/chat/Theme_Magic potion-CeFnUbb8.svg" },
  { id: "theme-richness", name: "Richness", type: "pattern", url: "/resources/chat/Theme_Richness-BedbFs-g.svg" },
  { id: "theme-characters", name: "Characters", type: "pattern", url: "/resources/chat/Theme_Characters-CEltNEH5.svg" },
  { id: "theme-free-time", name: "Free Time", type: "pattern", url: "/resources/chat/Theme_Free Time--dV2FbzS.svg" },
  { id: "theme-fun-space", name: "Fun Space", type: "pattern", url: "/resources/chat/Theme_Fun space-BqngEcco.svg" },
  { id: "theme-sightseeing", name: "Sightseeing", type: "pattern", url: "/resources/chat/Theme_Sightseeing-HNkh55h8.svg" },
  { id: "theme-renovation", name: "Renovation", type: "pattern", url: "/resources/chat/Theme_renovation-IE09aNMN.svg" },
  { id: "theme-t-city", name: "T-City", type: "pattern", url: "/resources/chat/Theme_T-City-BuaGB9UT.svg" },
];

// ─── Chat Gradients (CSS-based — replaces gradient PNGs) ─────────────────────────────
export const CHAT_GRADIENTS: ChatGradient[] = [
  { id: "none",               name: "Không có màu",     css: "",                                                                                       type: "light" },
  { id: "grad-default-light", name: "Mặc định sáng",    css: "linear-gradient(160deg, #e8f4fd 0%, #dff3e8 50%, #e0eaff 100%)",                         type: "light" },
  { id: "grad-default-dark",  name: "Mặc định tối",     css: "linear-gradient(160deg, #141e30 0%, #1a2a4a 50%, #243b55 100%)",                         type: "dark"  },
  { id: "grad-spring",        name: "Mùa xuân",         css: "linear-gradient(160deg, #f8d7ea 0%, #d4f1dc 50%, #fce4f0 100%)",                         type: "light" },
  { id: "grad-summer",        name: "Mùa hè",           css: "linear-gradient(160deg, #ffeaa7 0%, #fdcb6e 40%, #ff7675 100%)",                         type: "light" },
  { id: "grad-autumn",        name: "Mùa thu",          css: "linear-gradient(160deg, #f39c12 0%, #e74c3c 50%, #c0392b 100%)",                         type: "dark"  },
  { id: "grad-warm-winter",   name: "Đông ấm",          css: "linear-gradient(160deg, #a29bfe 0%, #6c5ce7 40%, #fd79a8 100%)",                         type: "dark"  },
  { id: "grad-fresh-morning", name: "Bình minh tươi",   css: "linear-gradient(160deg, #ffecd2 0%, #fcb69f 40%, #ff9a9e 100%)",                         type: "light" },
  { id: "grad-frosty-morning",name: "Sương mai",        css: "linear-gradient(160deg, #e0f7fa 0%, #b2ebf2 50%, #dcedc8 100%)",                         type: "light" },
  { id: "grad-polar-lights",  name: "Cực quang",        css: "linear-gradient(160deg, #0d324d 0%, #1abc9c 50%, #7f5a83 100%)",                         type: "dark"  },
  { id: "grad-iridescent",    name: "Cầu vồng",         css: "linear-gradient(160deg, #f093fb 0%, #f5576c 25%, #4facfe 60%, #43e97b 100%)",             type: "dark"  },
  { id: "grad-cold-sunrise",  name: "Bình minh lạnh",   css: "linear-gradient(160deg, #a8edea 0%, #fed6e3 50%, #ffeaa7 100%)",                         type: "light" },
];

// ─── Chat Patterns (SVG repeat tiles, light/dark variants) ─────────────────────
export const CHAT_PATTERNS: ChatPattern[] = [
  { id: "none",              name: "Không có họa tiết",  filename: "",                           hasLight: true  },
  { id: "pat-cartoon-space", name: "Cartoon Space",       filename: "Theme_Cartoon Space.svg",    hasLight: true  },
  { id: "pat-cats",          name: "Mèo",                 filename: "Theme_Cats.svg",             hasLight: true  },
  { id: "pat-characters",    name: "Characters",          filename: "Theme_Characters.svg",       hasLight: true  },
  { id: "pat-christmas",     name: "Giáng sinh",          filename: "Theme_Christmas.svg",        hasLight: true  },
  { id: "pat-food",          name: "Món ăn",              filename: "Theme_Food.svg",             hasLight: true  },
  { id: "pat-free-time",     name: "Thư giãn",            filename: "Theme_Free Time.svg",        hasLight: true  },
  { id: "pat-fun-space",     name: "Vũ trụ vui",          filename: "Theme_Fun space.svg",        hasLight: true  },
  { id: "pat-games-2",       name: "Games 2",             filename: "Theme_Games 2.svg",          hasLight: true  },
  { id: "pat-games",         name: "Games",               filename: "Theme_Games.svg",            hasLight: true  },
  { id: "pat-halloween",     name: "Halloween",           filename: "Theme_HALOWEEN.svg",         hasLight: true  },
  { id: "pat-love",          name: "Tình yêu",            filename: "Theme_Love.svg",             hasLight: true  },
  { id: "pat-magic-2",       name: "Magic 2",             filename: "Theme_Magic 2.svg",          hasLight: true  },
  { id: "pat-magic-potion",  name: "Magic Potion",        filename: "Theme_Magic potion.svg",     hasLight: true  },
  { id: "pat-magic",         name: "Magic",               filename: "Theme_Magic.svg",            hasLight: true  },
  { id: "pat-renovation",    name: "Nội thất",            filename: "Theme_renovation.svg",       hasLight: true  },
  { id: "pat-richness",      name: "Sang trọng",          filename: "Theme_Richness.svg",         hasLight: true  },
  { id: "pat-sea-world",     name: "Biển cả",             filename: "Theme_Sea World.svg",        hasLight: true  },
  { id: "pat-sightseeing",   name: "Du lịch",             filename: "Theme_Sightseeing.svg",      hasLight: true  },
  { id: "pat-snowflakes",    name: "Bông tuyết",          filename: "Theme_Snowflakes.svg",       hasLight: true  },
  { id: "pat-space-cat",     name: "Mèo vũ trụ",          filename: "Theme_Space Cat.svg",        hasLight: true  },
  { id: "pat-space",         name: "Vũ trụ",              filename: "Theme_Space.svg",            hasLight: true  },
  { id: "pat-sport",         name: "Thể thao",            filename: "Theme_Sport.svg",            hasLight: true  },
  { id: "pat-star-wars-2",   name: "Star Wars 2",         filename: "Theme_Star Wars 2.svg",      hasLight: true  },
  { id: "pat-star-wars",     name: "Star Wars",           filename: "Theme_Star Wars.svg",        hasLight: true  },
  { id: "pat-sweet-love",    name: "Tình yêu ngọt",       filename: "Theme_Sweet Love.svg",       hasLight: true  },
  { id: "pat-sweets",        name: "Kẹo ngọt",            filename: "Theme_Sweets.svg",           hasLight: true  },
  { id: "pat-t-city",        name: "T-City",              filename: "Theme_T-City.svg",           hasLight: true  },
  { id: "pat-unicorn",       name: "Kỳ lân",              filename: "Theme_Unicorn.svg",          hasLight: true  },
  { id: "pat-witch",         name: "Phù thủy",            filename: "Theme_Witch.svg",            hasLight: true  },
  { id: "pat-wizard",        name: "Phù thủy 2",          filename: "Theme_Wizard world.svg",     hasLight: true  },
  { id: "pat-woodland",      name: "Rừng",                filename: "Theme_Woodland.svg",         hasLight: true  },
  { id: "pat-zoo",           name: "Súc vật",             filename: "Theme_Zoo.svg",              hasLight: true  },
];

/**
 * Resolves a pattern's URL by picking the light or dark SVG variant.
 * Falls back to the dark variant when no light version exists.
 */
export function resolvePatternUrl(
  pattern: Pick<import("@/types/api").ChatPattern, "filename" | "hasLight">,
  gradientType: "light" | "dark"
): string {
  if (!pattern.filename) return "";
  const variant = gradientType === "light" && pattern.hasLight ? "light" : "dark";
  return `/resources/chat/patterns/${variant}/${encodeURIComponent(pattern.filename)}`;
}

/**
 * Parse a composite theme_id ("gradId|patId|opacity") into its components.
 * - opacity: integer 0-100, default 45
 * - Handles legacy 2-part and single-type ids for backward compat.
 */
export function parseThemeId(themeId: string | null): { gradId: string; patId: string; opacity: number } {
  const defaults = { gradId: "none", patId: "none", opacity: 45 };
  if (!themeId) return defaults;
  const parts = themeId.split("|");
  if (parts.length >= 2) {
    const opacity = parts[2]
      ? Math.min(100, Math.max(0, parseInt(parts[2], 10)))
      : 45;
    return { gradId: parts[0] || "none", patId: parts[1] || "none", opacity };
  }
  return defaults;
}

/**
 * Build a composite theme_id.
 * Returns null if both are "none" (no theme active).
 * @param opacity integer 0-100, default 45
 */
export function buildThemeId(gradId: string, patId: string, opacity: number = 45): string | null {
  if (gradId === "none" && patId === "none") return null;
  return `${gradId}|${patId}|${opacity}`;
}

// ─── Emoji reactions (Facebook-style 6) ──────────────────────────────
export const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "😡"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

// ─── AI mock responses ────────────────────────────────────────────────
export const AI_MOCK_RESPONSES: string[] = [
  "Đây là câu hỏi hay! Dựa trên thông tin bạn cung cấp, tôi khuyến nghị bạn tham khảo ý kiến bác sĩ để được tư vấn chính xác nhất.",
  "Chỉ số này nằm trong ngưỡng bình thường. Tuy nhiên, để theo dõi sức khỏe tốt hơn, bạn nên kiểm tra định kỳ 3-6 tháng một lần.",
  "Theo nghiên cứu y khoa, điều quan trọng nhất là duy trì lối sống lành mạnh: ăn uống cân bằng, vận động đều đặn, ngủ đủ giấc và kiểm soát stress.",
  "Tôi hiểu bạn đang lo lắng. Hãy ghi lại triệu chứng và thời điểm xuất hiện để chia sẻ với bác sĩ trong lần khám tiếp theo.",
  "Trong HealthOS, bạn có thể vào **Nhật ký Dinh dưỡng** để theo dõi lượng calo và dưỡng chất hàng ngày. Điều này sẽ giúp tôi đưa ra gợi ý chính xác hơn.",
];

export function getAIResponse(): string {
  return AI_MOCK_RESPONSES[Math.floor(Math.random() * AI_MOCK_RESPONSES.length)];
}

// ─── Quick reply suggestions for AI chat ─────────────────────────────
export const AI_QUICK_REPLIES = [
  "Huyết áp của tôi có bình thường không?",
  "Gợi ý chế độ ăn lành mạnh",
  "Tôi nên tập bài tập gì?",
  "Giải thích chỉ số BMI",
  "Nhắc nhở uống thuốc",
] as const;
