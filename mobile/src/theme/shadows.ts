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

  cardNight: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 4,
    elevation: 3,
  } satisfies ShadowStyle,

  cardWarm: {
    shadowColor: '#7A4C1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  } satisfies ShadowStyle,

  // nt208 spec-named aliases — --shadow-sm / --shadow-md / --shadow-lg
  sm: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  } satisfies ShadowStyle,

  md: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  } satisfies ShadowStyle,

  lg: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 12,
  } satisfies ShadowStyle,
} as const;

export type Shadows = typeof shadows;
