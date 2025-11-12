import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock import.meta.env since it's not available in test environment
const originalEnv = import.meta.env;

describe('env-validation', () => {
  beforeEach(() => {
    // Reset document.body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  it('validates required Firebase environment variables', () => {
    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ];

    // All required vars should be present in test environment (set in setup.ts)
    requiredVars.forEach((varName) => {
      expect(process.env[varName]).toBeDefined();
    });
  });

  it('environment variables are set in test setup', () => {
    expect(process.env.VITE_FIREBASE_API_KEY).toBe('test-api-key');
    expect(process.env.VITE_FIREBASE_AUTH_DOMAIN).toBe('test.firebaseapp.com');
    expect(process.env.VITE_FIREBASE_PROJECT_ID).toBe('test-project');
    expect(process.env.VITE_FIREBASE_STORAGE_BUCKET).toBe('test.appspot.com');
    expect(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID).toBe('123456789');
    expect(process.env.VITE_FIREBASE_APP_ID).toBe('1:123456789:web:abcdef');
  });
});
