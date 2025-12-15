# Bug Analysis Report - Notification Router

**Date:** 2025-12-15
**Repository:** notification-router
**Branch:** claude/check-codebase-iGzkI
**Analyzer:** Comprehensive Repository Bug Analysis System

## Executive Summary

- **Total Bugs Found:** 12
- **Critical (Security):** 4
- **High Priority (Functional):** 5
- **Medium Priority (Configuration):** 3
- **All Bugs:** Will be fixed with comprehensive tests

---

## CRITICAL BUGS (Security)

### BUG-001: Arbitrary Code Execution via Function Constructor in Condition Evaluator
**Severity:** CRITICAL
**Category:** Security
**File:** `src/engine/conditionEvaluator.ts:61-64`

**Description:**
Uses `new Function()` to evaluate custom JavaScript expressions from user input, allowing arbitrary code execution.

**Current Behavior:**
```typescript
const evaluator = new Function('context', `
  const { payload, source, headers } = context;
  return ${conditions.custom};
`);
```

**Impact:**
- **User Impact:** Malicious users can execute arbitrary code on the server
- **System Impact:** Complete system compromise possible
- **Business Impact:** Critical security vulnerability, data breach risk

**Reproduction:**
1. Create routing rule with custom condition: `process.exit(1)`
2. Send webhook matching the rule
3. Server crashes

**Fix Strategy:**
Remove unsafe `new Function()` evaluation. Custom expressions should either:
- Be removed entirely (recommended)
- Use a safe expression evaluator with sandboxing
- Be limited to a safe DSL

---

### BUG-002: Arbitrary Code Execution via Function Constructor in Message Transformer
**Severity:** CRITICAL
**Category:** Security
**File:** `src/engine/messageTransformer.ts:32`

**Description:**
Uses `new Function()` to create custom Handlebars helpers from user input.

**Current Behavior:**
```typescript
const helperFunc = new Function('return ' + func)();
Handlebars.registerHelper(name, helperFunc);
```

**Impact:**
- **User Impact:** Malicious users can execute arbitrary code
- **System Impact:** Complete system compromise
- **Business Impact:** Critical security vulnerability

**Reproduction:**
1. Create transform rule with helper: `function() { require('child_process').exec('malicious_command') }`
2. Trigger notification using this rule
3. Arbitrary code executes

**Fix Strategy:**
Remove custom helper functionality or use a safe sandbox.

---

### BUG-003: XSS Vulnerability in Email HTML Formatting
**Severity:** CRITICAL
**Category:** Security (XSS)
**File:** `src/channels/adapters/emailAdapter.ts:118,121,127`

**Description:**
HTML output is not sanitized, allowing XSS attacks via email content.

**Current Behavior:**
```typescript
html += `<h2>${message.title}</h2>`;
html += `<div>${message.body.replace(/\n/g, '<br>')}</div>`;
html += `<a href="${action.url}"...>${action.text}</a>`;
```

**Impact:**
- **User Impact:** Email recipients vulnerable to XSS attacks
- **System Impact:** Phishing attacks, credential theft
- **Business Impact:** Legal liability, reputation damage

**Reproduction:**
1. Send webhook with title: `<script>alert('XSS')</script>`
2. Email contains executable JavaScript
3. Recipient's email client may execute the script

**Fix Strategy:**
HTML escape all user-controlled content before rendering.

---

### BUG-004: Missing API Key Validation
**Severity:** CRITICAL
**Category:** Security (Authentication)
**File:** `src/middleware/auth.ts:28`

**Description:**
API key validation is not implemented - any API key is accepted.

**Current Behavior:**
```typescript
// TODO: Validate API key from database
req.apiKey = apiKey;
next();
```

**Impact:**
- **User Impact:** Unauthorized access to all API endpoints
- **System Impact:** Complete authentication bypass
- **Business Impact:** Data breach, unauthorized operations

**Reproduction:**
1. Call any protected endpoint with header `x-api-key: invalid`
2. Request succeeds without validation

**Fix Strategy:**
Implement proper API key validation against database.

---

## HIGH PRIORITY BUGS (Functional)

### BUG-005: Timezone Handling Ignored in Time Windows
**Severity:** HIGH
**Category:** Functional
**File:** `src/engine/conditionEvaluator.ts:121`

**Description:**
Time window conditions ignore the configured timezone parameter and always use UTC.

**Current Behavior:**
```typescript
const timezone = timeWindow.timezone || 'UTC';
// For simplicity, using UTC comparison here
const currentHour = now.getUTCHours();
```

**Impact:**
- **User Impact:** Notifications sent at wrong times for non-UTC timezones
- **System Impact:** Incorrect routing logic
- **Business Impact:** User trust issues, missed critical notifications

**Reproduction:**
1. Create rule with timeWindow: `{ start: "09:00", end: "17:00", timezone: "America/New_York" }`
2. Send webhook at 10:00 AM EST (15:00 UTC)
3. Rule doesn't match because UTC hour is used

**Fix Strategy:**
Use a proper timezone library (like `date-fns-tz` or `luxon`) to handle timezone conversions correctly.

---

### BUG-006: Processor Only Records Duration for First Channel
**Severity:** HIGH
**Category:** Functional
**File:** `src/engine/processor.ts:69`

**Description:**
Duration metric only recorded for the first channel, not all channels.

**Current Behavior:**
```typescript
// Record duration
const duration = (Date.now() - startTime) / 1000;
recordNotificationDuration(notification.channels[0].type, duration);
```

**Impact:**
- **User Impact:** Inaccurate metrics for multi-channel notifications
- **System Impact:** Poor observability
- **Business Impact:** Cannot track performance accurately

**Reproduction:**
1. Create notification with multiple channels
2. Check Prometheus metrics
3. Only first channel has duration recorded

**Fix Strategy:**
Record duration for each channel individually.

---

### BUG-007: Missing Try-Catch in requireRole Middleware
**Severity:** HIGH
**Category:** Functional (Error Handling)
**File:** `src/middleware/auth.ts:92-98`

**Description:**
The `requireRole` middleware throws errors without try-catch, bypassing error handler.

**Current Behavior:**
```typescript
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
};
```

**Impact:**
- **User Impact:** Inconsistent error responses
- **System Impact:** Unhandled promise rejections in async routes
- **Business Impact:** Poor API reliability

**Fix Strategy:**
Wrap in try-catch and call next(error).

---

### BUG-008: Missing Null/Undefined Checks in Field Matching
**Severity:** HIGH
**Category:** Functional
**File:** `src/engine/conditionEvaluator.ts:98-114`

**Description:**
Field comparison operators don't handle null/undefined actual values, causing incorrect matches or crashes.

**Current Behavior:**
```typescript
if ('$gt' in expected) return actual > expected.$gt;  // undefined > 5 = false
if ('$in' in expected) return expected.$in.includes(actual);  // includes(undefined) may not work as expected
```

**Impact:**
- **User Impact:** Rules match when they shouldn't (or vice versa)
- **System Impact:** Incorrect routing decisions
- **Business Impact:** Notifications sent to wrong channels

**Reproduction:**
1. Create rule: `{ fields: { "priority": { "$gt": 5 } } }`
2. Send webhook without `priority` field
3. Condition incorrectly evaluates

**Fix Strategy:**
Add explicit null/undefined checks before comparisons.

---

### BUG-009: Redis URL Parsing Without Error Handling
**Severity:** HIGH
**Category:** Integration
**File:** `src/services/queue.ts:13-14`

**Description:**
Redis URL is parsed without try-catch, will crash on invalid URL.

**Current Behavior:**
```typescript
host: new URL(config.redis.url).hostname,
port: parseInt(new URL(config.redis.url).port),
```

**Impact:**
- **User Impact:** Application fails to start with unclear error
- **System Impact:** No graceful degradation
- **Business Impact:** Deployment failures

**Reproduction:**
1. Set REDIS_URL to invalid value: `invalid-url`
2. Start application
3. Crashes with URL parsing error

**Fix Strategy:**
Wrap URL parsing in try-catch with clear error message.

---

## MEDIUM PRIORITY BUGS (Configuration)

### BUG-010: Deprecated require() in Webhook Signature Verification
**Severity:** MEDIUM
**Category:** Code Quality
**File:** `src/middleware/auth.ts:47`

**Description:**
Uses inline `require()` instead of import at top of file.

**Current Behavior:**
```typescript
const expectedSignature = require('crypto')
  .createHmac('sha256', secret)
  .update(JSON.stringify(req.body))
  .digest('hex');
```

**Impact:**
- **User Impact:** None (works but not best practice)
- **System Impact:** Inconsistent code style
- **Business Impact:** Technical debt

**Fix Strategy:**
Import crypto at top of file.

---

### BUG-011: CORS Origins Hardcoded in Configuration
**Severity:** MEDIUM
**Category:** Configuration
**File:** `src/config/index.ts:62-64`

**Description:**
CORS origins are hardcoded and not configurable via environment variables.

**Current Behavior:**
```typescript
corsOrigins: envVars.NODE_ENV === 'production'
  ? ['https://yourdomain.com']
  : ['http://localhost:3001', 'http://localhost:5173'],
```

**Impact:**
- **User Impact:** Cannot configure CORS for custom domains
- **System Impact:** Deployment inflexibility
- **Business Impact:** Manual code changes needed for each deployment

**Fix Strategy:**
Add CORS_ORIGINS environment variable with comma-separated values.

---

### BUG-012: Fragile SQLite URL Path Replacement
**Severity:** MEDIUM
**Category:** Configuration
**File:** `src/services/database.ts:12`

**Description:**
SQLite path extraction using string replace is fragile and doesn't handle edge cases.

**Current Behavior:**
```typescript
storage: config.database.url.replace('sqlite://', ''),
```

**Impact:**
- **User Impact:** Database fails with certain URL formats
- **System Impact:** Potential path issues
- **Business Impact:** Configuration issues

**Reproduction:**
1. Set DATABASE_URL to `sqlite:///absolute/path/db.sqlite`
2. Path becomes `/absolute/path/db.sqlite` (correct)
3. Set DATABASE_URL to `sqlite://./relative/path`
4. Path becomes `./relative/path` but should handle `://` differently

**Fix Strategy:**
Use proper URL parsing or support both `sqlite:///` and `sqlite://` protocols.

---

## Dependencies & Priority Order

**Fix Order (by severity and dependencies):**
1. BUG-001, BUG-002 (Security - Code Execution)
2. BUG-003 (Security - XSS)
3. BUG-004 (Security - Auth)
4. BUG-008 (Functional - prevents crashes)
5. BUG-009 (Integration - startup crash)
6. BUG-005 (Functional - timezone)
7. BUG-006 (Functional - metrics)
8. BUG-007 (Functional - error handling)
9. BUG-010 (Code Quality)
10. BUG-011 (Configuration)
11. BUG-012 (Configuration)

---

## Test Coverage Requirements

Each bug fix must include:
1. **Unit Test:** Isolated test for the specific fix
2. **Integration Test:** If bug involves multiple components
3. **Regression Test:** Ensure fix doesn't break existing functionality
4. **Edge Case Tests:** Cover boundary conditions

---

## Risk Assessment

**Remaining High-Priority Issues:**
- None - all will be fixed in this session

**Recommended Next Steps:**
1. Fix all 12 bugs with comprehensive tests
2. Run full test suite
3. Update documentation
4. Deploy with confidence

**Technical Debt Identified:**
- Mock implementation of rules service (separate issue)
- Missing authentication implementation (BUG-004 addresses part of this)
- Incomplete notification persistence (separate issue)
- Minimal test coverage (will be improved with bug fixes)
