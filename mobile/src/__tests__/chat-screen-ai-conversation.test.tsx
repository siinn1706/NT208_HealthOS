/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import ChatScreen from '../../app/(tabs)/chat';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { chatService } from '../api/services';
import { queryKeys } from '../api/queryKeys';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({
    user: { id: 'user-1', display_name: 'Test User' },
  }),
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  chatService: {
    conversations: jest.fn(),
    createAiConversation: jest.fn(),
    lookupUsers: jest.fn(),
    createDirectConversation: jest.fn(),
    createGroupConversation: jest.fn(),
  },
}));

const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockCreateAiConversation = chatService.createAiConversation as jest.MockedFunction<typeof chatService.createAiConversation>;
const mockRouterPush = router.push as jest.MockedFunction<typeof router.push>;
const mockInvalidate = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseApiQuery.mockReturnValue({
    data: [],
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: true,
    reload: jest.fn().mockResolvedValue(undefined),
  } as never);
  mockCreateAiConversation.mockResolvedValue({ id: 'ai-conv-1' } as never);
});

describe('ChatScreen AI conversation actions', () => {
  it('uses the Core AI conversation route for suggestion chips', async () => {
    const { getByText } = render(<ChatScreen />);

    fireEvent.press(getByText('How am I doing today?'));

    await waitFor(() => {
      expect(mockCreateAiConversation).toHaveBeenCalledWith('How am I doing today?');
    });
    expect(mockInvalidate).toHaveBeenCalledWith(queryKeys.conversations);
    expect(mockRouterPush).toHaveBeenCalledWith('/chat/ai-conv-1');
  });
});
