/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NewChatModal } from '../components/chat/new-chat-modal';
import { chatService } from '../api/services';

jest.mock('../api/services', () => ({
  chatService: {
    lookupUsers: jest.fn(),
    createDirectConversation: jest.fn(),
    createGroupConversation: jest.fn(),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockLookupUsers = chatService.lookupUsers as jest.MockedFunction<typeof chatService.lookupUsers>;
const mockCreateDirect = chatService.createDirectConversation as jest.MockedFunction<typeof chatService.createDirectConversation>;
const mockCreateGroup = chatService.createGroupConversation as jest.MockedFunction<typeof chatService.createGroupConversation>;

const user = {
  id: 'user-2',
  display_name: 'Dr Smith',
  email: 'smith@example.test',
  avatar_url: null,
};

describe('NewChatModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLookupUsers.mockResolvedValue([user]);
    mockCreateDirect.mockResolvedValue({ id: 'conv-direct' } as never);
    mockCreateGroup.mockResolvedValue({ id: 'conv-group' } as never);
  });

  it('searches users and creates a direct conversation from an existing Core API', async () => {
    const onCreated = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <NewChatModal visible onClose={jest.fn()} onCreated={onCreated} />,
    );

    fireEvent.changeText(getByPlaceholderText('chat.userSearchPlaceholder'), 'smith');
    fireEvent.press(getByText('common.search'));

    await waitFor(() => expect(getByText('Dr Smith')).toBeTruthy());
    fireEvent.press(getByText('Dr Smith'));

    await waitFor(() => expect(mockCreateDirect).toHaveBeenCalledWith('user-2'));
    expect(onCreated).toHaveBeenCalledWith({ id: 'conv-direct' });
  });

  it('selects users and creates a group conversation', async () => {
    const onCreated = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <NewChatModal visible onClose={jest.fn()} onCreated={onCreated} />,
    );

    fireEvent.press(getByText('chat.groupChat'));
    fireEvent.changeText(getByPlaceholderText('chat.groupTitlePlaceholder'), 'Care team');
    fireEvent.changeText(getByPlaceholderText('chat.userSearchPlaceholder'), 'smith');
    fireEvent.press(getByText('common.search'));

    await waitFor(() => expect(getByText('Dr Smith')).toBeTruthy());
    fireEvent.press(getByText('Dr Smith'));
    fireEvent.press(getByText('chat.createGroup'));

    await waitFor(() => expect(mockCreateGroup).toHaveBeenCalledWith('Care team', ['user-2']));
    expect(onCreated).toHaveBeenCalledWith({ id: 'conv-group' });
  });
});
