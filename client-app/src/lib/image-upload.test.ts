import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateImageDimensions } from './image-upload';

// Mock File and Image for testing
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('image-upload utilities', () => {
  describe('validateImageDimensions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('resolves when image meets minimum dimensions', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' });

      // Mock Image
      const mockImage = {
        width: 200,
        height: 200,
        onload: null as any,
        onerror: null as any,
      };

      vi.spyOn(global, 'Image').mockImplementation(() => {
        setTimeout(() => {
          if (mockImage.onload) {
            mockImage.onload();
          }
        }, 0);
        return mockImage as any;
      });

      await expect(validateImageDimensions(file, 100, 100)).resolves.toBe(true);
    });

    it('rejects when image width is too small', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' });

      const mockImage = {
        width: 50,
        height: 200,
        onload: null as any,
        onerror: null as any,
      };

      vi.spyOn(global, 'Image').mockImplementation(() => {
        setTimeout(() => {
          if (mockImage.onload) {
            mockImage.onload();
          }
        }, 0);
        return mockImage as any;
      });

      await expect(validateImageDimensions(file, 100, 100)).rejects.toThrow(
        'Image width must be at least 100px'
      );
    });

    it('rejects when image height is too small', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' });

      const mockImage = {
        width: 200,
        height: 50,
        onload: null as any,
        onerror: null as any,
      };

      vi.spyOn(global, 'Image').mockImplementation(() => {
        setTimeout(() => {
          if (mockImage.onload) {
            mockImage.onload();
          }
        }, 0);
        return mockImage as any;
      });

      await expect(validateImageDimensions(file, 100, 100)).rejects.toThrow(
        'Image height must be at least 100px'
      );
    });

    it('rejects on invalid image file', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' });

      const mockImage = {
        width: 0,
        height: 0,
        onload: null as any,
        onerror: null as any,
      };

      vi.spyOn(global, 'Image').mockImplementation(() => {
        setTimeout(() => {
          if (mockImage.onerror) {
            mockImage.onerror();
          }
        }, 0);
        return mockImage as any;
      });

      await expect(validateImageDimensions(file)).rejects.toThrow('Invalid image file');
    });

    it('accepts image when no minimum dimensions specified', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' });

      const mockImage = {
        width: 50,
        height: 50,
        onload: null as any,
        onerror: null as any,
      };

      vi.spyOn(global, 'Image').mockImplementation(() => {
        setTimeout(() => {
          if (mockImage.onload) {
            mockImage.onload();
          }
        }, 0);
        return mockImage as any;
      });

      await expect(validateImageDimensions(file)).resolves.toBe(true);
    });
  });
});
