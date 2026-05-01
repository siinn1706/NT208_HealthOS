import type { ViewStyle } from 'react-native';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

// Shared shadow color — deep navy, matches NT208 ink base
const BASE = '#0F2743';

export const shadows = {
  card: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  } satisfies ShadowStyle,

  sheet: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 24,
  } satisfies ShadowStyle,

  modal: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 60,
    elevation: 32,
  } satisfies ShadowStyle,

  glass: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  } satisfies ShadowStyle,

  floating: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  } satisfies ShadowStyle,
} as const;

export type Shadows = typeof shadows;
