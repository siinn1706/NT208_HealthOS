// Vitest setup file — mocks for jsdom environment
import "@testing-library/jest-dom/vitest";

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
