/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { AttachmentUploadScreen } from '../components/care/attachment-upload-screen';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('AttachmentUploadScreen', () => {
  it('does not render fake local upload rows before a generic upload contract exists', () => {
    const { getByText, queryByText } = render(<AttachmentUploadScreen />);

    expect(getByText('Attachment upload unavailable')).toBeTruthy();
    expect(getByText(/Generic appointment upload\/storage API is not implemented/i)).toBeTruthy();
    expect(queryByText('lab_results.pdf')).toBeNull();
    expect(queryByText('xray_scan.png')).toBeNull();
    expect(queryByText('Uploaded')).toBeNull();
  });
});
