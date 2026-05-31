/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AttachmentLinkModal } from '../components/chat/attachment-link-modal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'chat.attachmentHttpsError': 'Use a valid HTTPS link.',
      'chat.attachmentNameRequired': 'Attachment name is required.',
      'chat.attachmentSizeError': 'Size must be 0 to 104857600 bytes.',
      'chat.attachLink': 'Attach link',
      'chat.attachLinkHelper': 'Paste an HTTPS link and file details.',
      'chat.attachmentUrl': 'Attachment URL',
      'chat.attachmentName': 'Name',
      'chat.attachmentMimeType': 'MIME type',
      'chat.attachmentSizeBytes': 'Size bytes',
      'chat.attachmentSizeHelper': 'Leave blank when unknown.',
      'chat.attachmentMessage': 'Message',
      'chat.attachmentMessagePlaceholder': 'Optional note',
      'common.cancel': 'Cancel',
      'chat.send': 'Send',
    } as Record<string, string>)[key] ?? key,
  }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

describe('AttachmentLinkModal', () => {
  it('validates HTTPS links before sending', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <AttachmentLinkModal visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText('Attachment URL'), 'http://example.test/report.pdf');
    fireEvent.changeText(getByLabelText('Name'), 'Report.pdf');
    fireEvent.press(getByText('Send'));

    expect(getByText('Use a valid HTTPS link.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits Core attachment metadata with optional caption', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = render(
      <AttachmentLinkModal visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText('Attachment URL'), 'https://example.test/report.pdf');
    fireEvent.changeText(getByLabelText('Name'), 'Report.pdf');
    fireEvent.changeText(getByLabelText('MIME type'), 'application/pdf');
    fireEvent.changeText(getByLabelText('Size bytes'), '2048');
    fireEvent.changeText(getByLabelText('Message'), 'Please review');
    fireEvent.press(getByText('Send'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      url: 'https://example.test/report.pdf',
      name: 'Report.pdf',
      size: 2048,
      mime_type: 'application/pdf',
    }, 'Please review'));
  });
});
