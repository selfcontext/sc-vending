# Test Plan - Vending Machine System

## Executive Summary
Current test coverage: **< 20%**
Target coverage: **> 80%**
Priority: **CRITICAL** (blocking production release)

---

## 1. Test Strategy

### Scope
- **IN SCOPE**: Service-level tests, component behavior, user flows, error handling
- **OUT OF SCOPE**: Language features, trivial getters/setters, external library testing

### Test Pyramid
```
    /\
   /E2E\      10% - Critical user flows (scan → shop → pay → dispense)
  /------\
 /Integr-\   20% - Firebase Functions, API integration
/---------\
| Unit    |  70% - Services, hooks, utilities, components
-----------
```

---

## 2. Critical Test Scenarios (MUST HAVE for MVP)

### 2.1 Payment Service (CRITICAL - Mock Implementation)
**User Story**: As a customer, I want to pay securely so I can get my products

**Behavior Scenarios**:
- ✅ Successfully process payment with valid request
- ✅ Handle payment decline/failure
- ✅ Verify payment status by transaction ID
- ✅ Process refund for failed dispense
- ✅ Reject invalid payment amounts (negative, zero, NaN)
- ✅ Handle network timeout gracefully
- ✅ Validate session ID format
- ✅ Handle concurrent payment requests

**Edge Cases**:
- Empty items array
- Extremely large amounts (overflow)
- Special characters in session ID
- Payment verification with invalid transaction ID

---

### 2.2 Authentication (useAuth Hook)
**User Story**: As a user, I want seamless auth so I can access the system

**Behavior Scenarios**:
- ✅ Auto sign-in anonymously on mount
- ✅ Admin login with email/password
- ✅ Sign out and re-authenticate as anonymous
- ✅ Detect admin vs customer (isAdmin check)
- ✅ Handle auth errors gracefully
- ✅ Persist auth state across refreshes
- ✅ Block admin actions for anonymous users

**Edge Cases**:
- Invalid email format
- Wrong password
- Network failure during auth
- Auth state changes while user is active
- Multiple rapid login attempts

---

### 2.3 Session Timer Component
**User Story**: As a customer, I want to know when my session expires

**Behavior Scenarios**:
- ✅ Display countdown timer accurately
- ✅ Show warning 15 seconds before expiry
- ✅ Allow extension once per session
- ✅ Block extension if already extended
- ✅ Change color based on time (green → amber → red)
- ✅ Show "Session Expired" when time reaches zero
- ✅ Handle session extension callback

**Edge Cases**:
- Session already expired on mount
- Extension called multiple times rapidly
- Time calculation with timezone differences
- Component unmount during countdown

---

### 2.4 Firebase Functions (HIGH PRIORITY)
**User Stories**: Backend operations must be reliable

#### createSession
- ✅ Create session with valid machine ID
- ✅ Generate unique QR code data
- ✅ Rate limit: 10 sessions per minute per machine
- ✅ Reject invalid machine ID
- ✅ Set correct expiration time

#### processPayment
- ✅ Process payment and create dispense events
- ✅ Update session with payment info
- ✅ Handle payment failure
- ✅ Validate basket items exist in inventory
- ✅ Check stock availability

#### extendSession
- ✅ Extend session by timeout duration
- ✅ Rate limit: 2 extensions per 5 minutes
- ✅ Block if already extended once
- ✅ Reject expired sessions

---

## 3. Integration Tests

### 3.1 Customer Shopping Flow (E2E)
1. Scan QR code → create session
2. Browse products → add to basket
3. Checkout → process payment
4. Watch dispensing → receive products
5. View success page

**Expected**: Products dispensed, inventory updated, session completed

### 3.2 Admin Inventory Management
1. Login as admin
2. Add product with image upload
3. Edit product quantity
4. Deactivate product
5. View in shopping page (should not show)

**Expected**: Changes reflected in real-time

---

## 4. Security Tests

### 4.1 Authentication & Authorization
- ❌ Anonymous users cannot access admin pages
- ❌ Anonymous users cannot edit inventory
- ❌ Admin users can manage all resources
- ❌ Session hijacking prevention (rate limits work)

### 4.2 Input Validation
- ❌ XSS prevention in product names/descriptions
- ❌ SQL injection (N/A for Firestore, but test function inputs)
- ❌ File upload validation (image type, size)
- ❌ Rate limiting prevents brute force

---

## 5. Performance Tests

### 5.1 Load Testing
- ❌ Handle 100 concurrent sessions
- ❌ Firestore query response < 500ms
- ❌ Image upload < 5 seconds for 5MB file
- ❌ Session creation < 1 second

### 5.2 UI Performance
- ❌ Page load < 3 seconds
- ❌ Smooth animations (60fps)
- ❌ No memory leaks in timer components

---

## 6. Error Handling Tests

### 6.1 Network Errors
- ✅ Handle Firebase offline/connection failure
- ✅ Retry logic for transient failures
- ✅ Show user-friendly error messages
- ✅ Recover gracefully when online

### 6.2 Business Logic Errors
- ✅ Out of stock product handling
- ✅ Payment decline handling
- ✅ Dispense failure → refund flow
- ✅ Session expiry during checkout

---

## 7. Test Data & Mocks

### 7.1 Mock Builders (Reusable)
```typescript
// client-app/src/test/builders/
- sessionBuilder.ts     // Create mock sessions
- productBuilder.ts     // Create mock products
- userBuilder.ts        // Create mock users
- paymentBuilder.ts     // Create mock payment requests
```

### 7.2 Mock Data
```typescript
// client-app/src/test/data/
- products.mock.ts      // Sample products
- sessions.mock.ts      // Sample sessions
- events.mock.ts        // Sample events
```

---

## 8. Test Coverage Goals

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| **Payment Service** | 0% | 100% | P0 |
| **useAuth Hook** | 0% | 100% | P0 |
| **SessionTimer** | 0% | 90% | P0 |
| **Firebase Functions** | 0% | 80% | P0 |
| **Image Upload** | 40% | 90% | P1 |
| **ErrorBoundary** | 100% | 100% | ✅ |
| **Admin Pages** | 0% | 60% | P1 |
| **Shopping Pages** | 0% | 70% | P1 |
| **Overall** | <20% | >80% | P0 |

---

## 9. Testing Tools & Setup

### Current Stack
- **Framework**: Vitest
- **UI Testing**: React Testing Library
- **Mocking**: Vitest vi
- **Coverage**: v8

### Needed Additions
- [ ] Firebase Emulators for function testing
- [ ] Playwright for E2E testing
- [ ] MSW (Mock Service Worker) for API mocking

---

## 10. Acceptance Criteria

### Before Production Deployment:
- [ ] All P0 tests written and passing
- [ ] Test coverage > 80%
- [ ] No critical bugs (P0/P1)
- [ ] E2E tests for checkout flow passing
- [ ] Security tests passing
- [ ] Performance benchmarks met

### Red Flags (DO NOT DEPLOY if found):
- Payment service fails 10% of tests
- Auth bypass possible
- Rate limiting not working
- Memory leaks in timer
- XSS vulnerabilities
- Dispense without payment

---

## 11. Test Execution Plan

### Phase 1: Critical Services (This Sprint)
1. Payment Service tests
2. useAuth hook tests
3. SessionTimer component tests
4. Firebase Functions setup

### Phase 2: Integration Tests (Next Sprint)
1. Shopping flow E2E
2. Admin flow E2E
3. Error recovery flows

### Phase 3: Performance & Security (Final Sprint)
1. Load testing
2. Security audit
3. Accessibility testing

---

## 12. Known Limitations

### Intentionally NOT Tested:
- Firebase SDK internals (trust Google's tests)
- React Router internals
- TailwindCSS styles (visual testing out of scope)
- Lottie animations (third-party library)
- Browser APIs (mocked in tests)

### Mock Dependencies:
- Firebase Auth, Firestore, Storage, Functions
- Payment gateway (mock by design)
- Hardware vending SDK (stub by design)

---

## Success Metrics

- ✅ All critical paths have tests
- ✅ Tests run in < 30 seconds
- ✅ Zero flaky tests
- ✅ CI/CD blocks deployment on test failure
- ✅ Code coverage visible in PRs
