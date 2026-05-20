/* eslint-env jest */
import { createUploadFormData } from '../api/client';

describe('createUploadFormData', () => {
  const originalFormData = global.FormData;

  afterEach(() => {
    global.FormData = originalFormData;
  });

  it('appends scalar fields and React Native file metadata', () => {
    const append = jest.fn();
    global.FormData = jest.fn(() => ({ append })) as any;

    const file = {
      fieldName: 'image',
      uri: 'file:///meal.jpg',
      name: 'meal.jpg',
      type: 'image/jpeg',
    };

    const form = createUploadFormData(
      { name: 'Lunch', notes: null, logged_at: '2026-05-20T12:00:00.000Z' },
      file,
    );

    expect(form).toBeDefined();
    expect(append).toHaveBeenCalledWith('name', 'Lunch');
    expect(append).toHaveBeenCalledWith('logged_at', '2026-05-20T12:00:00.000Z');
    expect(append).not.toHaveBeenCalledWith('notes', expect.anything());
    expect(append).toHaveBeenCalledWith('image', {
      uri: 'file:///meal.jpg',
      name: 'meal.jpg',
      type: 'image/jpeg',
    });
  });
});
