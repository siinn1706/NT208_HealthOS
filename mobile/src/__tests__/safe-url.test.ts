/* eslint-env jest */
import { Linking } from 'react-native';
import { safeOpenUrl } from '../utils/safe-url';

jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

const mockCanOpenURL = Linking.canOpenURL as jest.MockedFunction<typeof Linking.canOpenURL>;
const mockOpenURL = Linking.openURL as jest.MockedFunction<typeof Linking.openURL>;

beforeEach(() => jest.clearAllMocks());

describe('safeOpenUrl', () => {
  it('opens a valid https URL and returns true', async () => {
    mockCanOpenURL.mockResolvedValueOnce(true);
    mockOpenURL.mockResolvedValueOnce(undefined as never);

    await expect(safeOpenUrl('https://example.com/path')).resolves.toBe(true);
    expect(mockCanOpenURL).toHaveBeenCalledWith('https://example.com/path');
    expect(mockOpenURL).toHaveBeenCalledWith('https://example.com/path');
  });

  it('returns false for non-https URL (http)', async () => {
    await expect(safeOpenUrl('http://example.com')).resolves.toBe(false);
    expect(mockCanOpenURL).not.toHaveBeenCalled();
  });

  it('returns false for custom scheme URL', async () => {
    await expect(safeOpenUrl('nt208://dashboard')).resolves.toBe(false);
    expect(mockCanOpenURL).not.toHaveBeenCalled();
  });

  it('returns false when device cannot open the URL', async () => {
    mockCanOpenURL.mockResolvedValueOnce(false);
    await expect(safeOpenUrl('https://example.com')).resolves.toBe(false);
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('returns false when URL is malformed', async () => {
    await expect(safeOpenUrl('not a url')).resolves.toBe(false);
  });

  it('returns false when Linking.openURL rejects', async () => {
    mockCanOpenURL.mockResolvedValueOnce(true);
    mockOpenURL.mockRejectedValueOnce(new Error('Open failed'));
    await expect(safeOpenUrl('https://example.com')).resolves.toBe(false);
  });
});
