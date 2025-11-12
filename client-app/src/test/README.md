# Testing Guide

This project uses [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/react) for testing.

## Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are colocated with the source files they test:
```
src/
├── components/
│   ├── ErrorBoundary.tsx
│   └── ErrorBoundary.test.tsx
├── lib/
│   ├── image-upload.ts
│   └── image-upload.test.ts
└── test/
    ├── setup.ts          # Test setup and global configuration
    └── README.md         # This file
```

## Writing Tests

### Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Utility Function Tests

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('returns expected value', () => {
    expect(myFunction(2, 3)).toBe(5);
  });
});
```

## Mocking

### Firebase

Firebase is automatically mocked in the test setup. Environment variables are set to test values.

### User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('handles click events', async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick}>Click me</Button>);

  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalled();
});
```

## Coverage

Coverage reports are generated in the `coverage/` directory after running:
```bash
npm run test:coverage
```

Open `coverage/index.html` in your browser to view the detailed coverage report.

## Best Practices

1. **Test user behavior, not implementation details**
   - Use `getByRole`, `getByLabelText` instead of `getByTestId`
   - Test what users see and do, not internal state

2. **Keep tests focused**
   - One assertion per test when possible
   - Use descriptive test names

3. **Mock external dependencies**
   - Mock Firebase, API calls, timers
   - Use `vi.mock()` for modules

4. **Clean up after tests**
   - The test setup automatically cleans up after each test
   - Use `afterEach` for custom cleanup

## CI/CD

Tests should be run in CI/CD pipelines before deployment:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## TODO

- [ ] Add tests for all critical components
- [ ] Add integration tests for user flows
- [ ] Set up E2E testing with Playwright
- [ ] Achieve >80% code coverage
- [ ] Add visual regression testing
