/* eslint-env jest */
import React from 'react';
import { Image } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Bubble } from '../components/chat/bubble';
import { safeOpenUrl } from '../utils/safe-url';

jest.mock('../utils/safe-url', () => ({
  safeOpenUrl: jest.fn().mockResolvedValue(true),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

describe('Bubble attachments', () => {
  it('renders attachment metadata and opens the HTTPS link', async () => {
    const { getByLabelText, getByText } = render(
      <Bubble
        side="ai"
        text="Attached"
        attachments={[{
          url: 'https://example.test/report.pdf',
          name: 'Report.pdf',
          size: 2048,
          mimeType: 'application/pdf',
        }]}
      />,
    );

    expect(getByText('Report.pdf')).toBeTruthy();
    expect(getByText('application/pdf · 2 KB')).toBeTruthy();

    fireEvent.press(getByLabelText('Open Report.pdf'));

    await waitFor(() => expect(safeOpenUrl).toHaveBeenCalledWith('https://example.test/report.pdf'));
  });

  it('renders image attachments as previews', async () => {
    const { UNSAFE_getByType, getByLabelText, getByText } = render(
      <Bubble
        side="me"
        text="Lunch"
        attachments={[{
          url: 'https://example.test/lunch.png',
          name: 'lunch.png',
          size: 4096,
          mimeType: 'image/png',
        }]}
      />,
    );

    expect(getByText('lunch.png')).toBeTruthy();
    expect(getByText('image/png · 4 KB')).toBeTruthy();
    expect(UNSAFE_getByType(Image).props.source).toEqual({ uri: 'https://example.test/lunch.png' });

    fireEvent.press(getByLabelText('Open lunch.png'));

    await waitFor(() => expect(safeOpenUrl).toHaveBeenCalledWith('https://example.test/lunch.png'));
  });
});
