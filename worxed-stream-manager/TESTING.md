# 🧪 Worxed Stream Manager - Testing Guide

## Overview

This comprehensive testing suite ensures your Worxed Stream Manager is working perfectly. It tests everything from OAuth authentication to overlay functionality, alert systems, and performance.

## 🚀 Quick Start

### 1. Pre-Test Check
Before running tests, check if your environment is ready:

```bash
npm run pretest
# or
node pre-test-check.js
```

### 2. Run All Tests
```bash
npm test
# or
node test-suite.js
```

### 3. View Results
- **Console Output**: Real-time test results
- **JSON Report**: `test-report.json` - Detailed machine-readable results
- **HTML Report**: `test-report.html` - Beautiful visual report (open in browser)

## 🎯 Specific Test Suites

Run individual test categories:

```bash
# Server health and connectivity
npm run test:health

# Environment and configuration
npm run test:config

# OAuth token validation
npm run test:oauth

# Twitch API integration
npm run test:api

# Overlay page functionality
npm run test:overlays

# Alert system testing
npm run test:alerts
```

## 📋 Test Categories

### 🏥 Server Health Tests
- Server status endpoint
- Response format validation
- Twitch connection status
- Channel configuration

### ⚙️ Environment Configuration Tests
- `.env` file existence and format
- Required environment variables
- Configuration API endpoints
- Variable validation

### 🔐 OAuth Token Validation Tests
- Token validity with Twitch API
- Scope verification
- User ID validation
- Token expiration checking

### 📺 Twitch API Integration Tests
- Stream information retrieval
- Follower data access
- Analytics endpoint functionality
- API response format validation

### 🎨 Overlay Page Tests
- Standard overlay pages (`/overlay/[type]`)
- Worxed theme overlays (`/overlay-worxed/[type]`)
- Page accessibility and loading
- HTML structure validation

### 🛠️ Management Page Tests
- Main dashboard (`/`)
- Overlay customizer (`/customizer`)
- Alert manager (`/alerts`)
- Content validation

### 🚨 Alert System Tests
- Custom alert API endpoints
- Follower alert testing
- Subscriber alert testing
- Donation webhook testing
- Cheer alert testing

### 🔌 WebSocket Connection Tests
- Socket.IO endpoint availability
- Real-time communication setup
- Connection stability

### 📁 File Structure Tests
- Required file existence
- Dependency installation
- Project structure validation

### ⚡ Performance Tests
- Concurrent request handling
- Response time measurement
- Server load testing

## 📊 Understanding Test Results

### Console Output
```
✅ PASS - Server Status Endpoint (Status: 200)
❌ FAIL - OAuth Token Validation (HTTP 401)
```

### Success Indicators
- **✅ PASS**: Test completed successfully
- **❌ FAIL**: Test failed with error details

### Test Report Files

#### `test-report.json`
Machine-readable detailed results:
```json
{
  "summary": {
    "totalTests": 45,
    "passedTests": 42,
    "failedTests": 3,
    "successRate": 93.3,
    "duration": 2847
  },
  "results": [...]
}
```

#### `test-report.html`
Beautiful visual report with:
- Summary statistics
- Color-coded test results
- Detailed failure information
- Worxed terminal theme styling

## 🔧 Troubleshooting Common Issues

### Server Not Running
```
❌ Server Health Check (Error: ECONNREFUSED)
```
**Fix**: Start your server first:
```bash
npm start
```

### Missing Environment Variables
```
❌ Environment Variable: TWITCH_OAUTH_TOKEN
```
**Fix**: Complete OAuth setup:
```bash
npm run setup
```

### Invalid OAuth Tokens
```
❌ OAuth Token Validation (HTTP 401)
```
**Fix**: Refresh your tokens:
```bash
npm run setup
```

### Missing Dependencies
```
❌ Dependencies Installed
```
**Fix**: Install dependencies:
```bash
npm install
```

### Port Already in Use
```
❌ Server Status Endpoint (Error: EADDRINUSE)
```
**Fix**: 
1. Stop other processes using port 3000
2. Or change PORT in `.env` file

## 🎯 Test Development

### Adding New Tests

1. **Add to `test-suite.js`**:
```javascript
async function testNewFeature() {
  console.log('\n🆕 NEW FEATURE TESTS');
  console.log('===================');
  
  try {
    // Your test logic here
    logTest('New Feature Test', true, 'Success details');
  } catch (error) {
    logTest('New Feature Test', false, `Error: ${error.message}`);
  }
}
```

2. **Add to main test runner**:
```javascript
// In runAllTests() function
await testNewFeature();
```

3. **Add to `run-tests.js`**:
```javascript
case 'newfeature':
  await testNewFeature();
  break;
```

### Test Best Practices

1. **Use descriptive test names**
2. **Include helpful error details**
3. **Test both success and failure cases**
4. **Use timeouts for network requests**
5. **Clean up after tests**

## 📈 Continuous Testing

### Development Workflow
```bash
# 1. Make changes to your code
# 2. Run relevant tests
npm run test:api

# 3. Run full test suite before commits
npm test

# 4. Check HTML report for detailed results
open test-report.html
```

### Automated Testing
Set up automated testing in your development environment:

```bash
# Watch mode (if using nodemon)
npm run dev

# In another terminal, run tests periodically
watch -n 30 npm test
```

## 🎉 Success Criteria

Your Worxed Stream Manager is working perfectly when:

- ✅ All tests pass (100% success rate)
- ✅ Server responds quickly (< 5 seconds)
- ✅ OAuth tokens are valid
- ✅ All overlay pages load correctly
- ✅ Alert system functions properly
- ✅ WebSocket connections work
- ✅ Configuration management operates smoothly

## 🆘 Getting Help

If tests consistently fail:

1. **Check the HTML report** for detailed error information
2. **Review server logs** for additional context
3. **Verify your `.env` configuration**
4. **Ensure all dependencies are installed**
5. **Check Twitch Developer Console** for API issues

## 📝 Test Coverage

Current test coverage includes:

- **Server Infrastructure**: Health, connectivity, performance
- **Authentication**: OAuth tokens, scopes, validation
- **API Integration**: Twitch API, webhooks, endpoints
- **User Interface**: All overlay and management pages
- **Real-time Features**: WebSocket connections, alerts
- **Configuration**: Environment setup, management
- **File System**: Required files, dependencies

---

**Happy Testing! 🧪✨**

Your comprehensive test suite ensures your Worxed Stream Manager delivers a flawless streaming experience. 