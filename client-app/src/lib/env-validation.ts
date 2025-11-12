/**
 * Environment variable validation
 * Ensures all required Firebase config is present before app initialization
 */

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const errorMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  MISSING FIREBASE CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following environment variables are missing:

${missing.map(v => `  ❌ ${v}`).join('\n')}

Please create a .env file in the client-app directory with your
Firebase configuration. See .env.example for reference.

Steps to fix:
1. Copy .env.example to .env
2. Add your Firebase configuration from Firebase Console
3. Restart the development server

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    console.error(errorMessage);

    // Show error in UI
    document.body.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding: 20px;
      ">
        <div style="
          background: white;
          border-radius: 24px;
          padding: 48px;
          max-width: 600px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
          <div style="
            width: 80px;
            height: 80px;
            background: #fee;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-center;
            margin: 0 auto 24px;
            font-size: 48px;
          ">
            ⚠️
          </div>
          <h1 style="
            color: #1f2937;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 16px;
            text-align: center;
          ">
            Missing Configuration
          </h1>
          <p style="
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
            text-align: center;
          ">
            Firebase environment variables are not configured.
          </p>
          <div style="
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
          ">
            <p style="
              color: #92400e;
              font-size: 14px;
              margin: 0 0 12px 0;
              font-weight: 600;
            ">
              Missing variables:
            </p>
            <ul style="
              color: #92400e;
              font-size: 14px;
              margin: 0;
              padding-left: 20px;
            ">
              ${missing.map(v => `<li style="margin: 4px 0;">${v}</li>`).join('')}
            </ul>
          </div>
          <div style="
            background: #f3f4f6;
            border-radius: 12px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #374151;
          ">
            <p style="margin: 0 0 12px 0; font-weight: 600;">Quick fix:</p>
            <pre style="margin: 0; white-space: pre-wrap;">1. cp .env.example .env
2. Add your Firebase config
3. Restart dev server</pre>
          </div>
        </div>
      </div>
    `;

    throw new Error('Missing required environment variables');
  }

  // Log success in development
  if (import.meta.env.DEV) {
    console.log('✅ Environment variables validated successfully');
  }
}
