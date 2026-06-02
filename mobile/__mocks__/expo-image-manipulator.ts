const ImageManipulator = {
  manipulate: jest.fn((uri: string) => ({
    renderAsync: jest.fn(() => Promise.resolve({
      saveAsync: jest.fn(() => Promise.resolve({ uri, width: 100, height: 100 })),
      release: jest.fn(),
    })),
    release: jest.fn(),
  })),
};

const SaveFormat = { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' };

module.exports = { ImageManipulator, SaveFormat };
