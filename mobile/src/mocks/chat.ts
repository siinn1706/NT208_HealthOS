export const conversations = [
  { id: 'dr-lan',  name: 'Dr. Nguyen Thi Lan', role: 'Endocrinologist',   last: 'See you Thursday at 14:00', time: '2h',  unread: 2, online: true  },
  { id: 'coord',   name: 'Care Coordinator',    role: 'Care team',         last: 'Your lab results are ready', time: '5h',  unread: 0, online: false },
  { id: 'mom',     name: 'Mom',                 role: 'Family',            last: 'Did you take your meds?',    time: '1d',  unread: 0, online: false },
  { id: 'pharma',  name: 'Pharmacy',            role: 'MedExpress HCM',    last: 'Refill ready for pickup',    time: '2d',  unread: 0, online: false },
  { id: 'khoa',    name: 'Khoa Tran',           role: 'Trainer',           last: 'Great run yesterday!',       time: '3d',  unread: 0, online: true  },
];

export const aiThread = [
  {
    id: '1',
    side: 'ai' as const,
    text: 'Hi Minh! I\'m your HealthOS AI. I can help you understand your health data, check medications, or answer questions. How can I help today?',
    time: '9:01 AM',
  },
  {
    id: '2',
    side: 'me' as const,
    text: 'What does my heart rate trend mean?',
    time: '9:02 AM',
  },
  {
    id: '3',
    side: 'ai' as const,
    text: 'Your resting heart rate dropped from 72 to 68 bpm this week — that\'s a healthy trend, suggesting improved cardiovascular fitness.',
    time: '9:02 AM',
    hasSparkline: true,
  },
  {
    id: '4',
    side: 'ai' as const,
    text: 'The evening walks you added on Monday are likely contributing. Keep it up for another week and we\'ll see if the trend holds.',
    time: '9:02 AM',
    isCaption: true,
  },
  {
    id: '5',
    side: 'me' as const,
    text: 'That\'s great to hear!',
    time: '9:03 AM',
  },
];

export const aiSuggestions = ['Log symptom', 'Check med', 'Explain report'];
