import { slotOf } from '../components/meals/meals-hub-screen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('MealsHubScreen slotOf', () => {
  it('uses the persisted meal type before falling back to logged time', () => {
    expect(slotOf('2026-05-30T15:00:21.460Z', 'lunch')).toBe('Lunch');
  });

  it('falls back to logged time when Core has no meal type', () => {
    expect(slotOf('2026-05-30T15:00:21.460Z')).toBe('Dinner');
  });
});
