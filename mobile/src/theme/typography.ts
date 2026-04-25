import type { TextStyle } from 'react-native';

export interface TypographyScale {
  fontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
  fontWeight: TextStyle['fontWeight'];
  fontFamily?: string;
}

export const typography = {
  display: { fontSize: 28, letterSpacing: -0.8, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  title:   { fontSize: 22, letterSpacing: -0.4, fontWeight: '700', fontFamily: 'Inter_700Bold'      },
  h3:      { fontSize: 16, letterSpacing: -0.3, fontWeight: '600', fontFamily: 'Inter_600SemiBold'  },
  body:    { fontSize: 14, lineHeight: 20,       fontWeight: '400', fontFamily: 'Inter_400Regular'  },
  bodyMed: { fontSize: 14, lineHeight: 20,       fontWeight: '500', fontFamily: 'Inter_500Medium'   },
  caption: { fontSize: 12,                       fontWeight: '400', fontFamily: 'Inter_400Regular'  },
  micro:   { fontSize: 10, letterSpacing: 0.5,   fontWeight: '500', fontFamily: 'Inter_500Medium'   },
} satisfies Record<string, TypographyScale>;

export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };
