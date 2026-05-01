import type { TextStyle } from 'react-native';

export interface TypographyScale {
  fontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
  fontWeight: TextStyle['fontWeight'];
  fontFamily?: string;
}

export const typography = {
  // Display roles
  displayLarge: { fontSize: 34, lineHeight: 41, letterSpacing: 0.4,  fontWeight: '700', fontFamily: 'Inter_700Bold'      },
  display:      { fontSize: 28, lineHeight: 34, letterSpacing: -0.8, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },

  // Top bar
  topBarTitle:  { fontSize: 28, lineHeight: 34, letterSpacing: -0.8, fontWeight: '700', fontFamily: 'Inter_700Bold'      },
  topBarSub:    { fontSize: 13, lineHeight: 18, letterSpacing: 0,    fontWeight: '500', fontFamily: 'Inter_500Medium'    },

  // Content hierarchy
  title:        { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontWeight: '700', fontFamily: 'Inter_700Bold'      },
  h3:           { fontSize: 16, lineHeight: 22, letterSpacing: -0.3, fontWeight: '600', fontFamily: 'Inter_600SemiBold'  },
  body:         { fontSize: 14, lineHeight: 20, letterSpacing: 0,    fontWeight: '400', fontFamily: 'Inter_400Regular'   },
  bodyMed:      { fontSize: 14, lineHeight: 20, letterSpacing: 0,    fontWeight: '500', fontFamily: 'Inter_500Medium'    },
  caption:      { fontSize: 12, lineHeight: 16, letterSpacing: 0,    fontWeight: '400', fontFamily: 'Inter_400Regular'   },
  micro:        { fontSize: 10, lineHeight: 14, letterSpacing: 0.5,  fontWeight: '500', fontFamily: 'Inter_500Medium'    },

  // UI controls
  button:       { fontSize: 15, lineHeight: 20, letterSpacing: -0.1, fontWeight: '600', fontFamily: 'Inter_600SemiBold'  },
  chip:         { fontSize: 11, lineHeight: 14, letterSpacing: 0.1,  fontWeight: '600', fontFamily: 'Inter_600SemiBold'  },
  tabLabel:     { fontSize: 10, lineHeight: 12, letterSpacing: 0.1,  fontWeight: '600', fontFamily: 'Inter_600SemiBold'  },
} satisfies Record<string, TypographyScale>;

export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };
