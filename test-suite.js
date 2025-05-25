const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

console.log('🧪 WORXED STREAM MANAGER - Comprehensive Test Suite');
console.log('===================================================\n');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];

// Helper function to log test results
function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const result = { testName, passed, details, timestamp: new Date().toISOString() };
  TEST_RESULTS.push(result);
  console.log(`${status} - ${testName}${details ? ` (${details})` : ''}`);
}

// Helper function to make HTTP requests with timeout
async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Test 1: Server Health Check
async function testServerHealth() {
  console.log('\n🏥 SERVER HEALTH TESTS');
  console.log('=====================');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/status`);
    const data = await response.json();
    
    logTest('Server Status Endpoint', response.ok, `Status: ${response.status}`);
    logTest('Server Response Format', data.hasOwnProperty('status'), `Has status field: ${!!data.status}`);
    logTest('Twitch Connection Status', data.hasOwnProperty('connected'), `Connected: ${data.connected}`);
    logTest('Channel Configuration', data.hasOwnProperty('channel'), `Channel: ${data.channel}`);
  } catch (error) {
    logTest('Server Health Check', false, `Error: ${error.message}`);
  }
}

// Test 2: Environment Configuration
async function testEnvironmentConfig() {
  console.log('\n⚙️  ENVIRONMENT CONFIGURATION TESTS');
  console.log('===================================');
  
  // Check .env file exists
  const envExists = fs.existsSync('.env');
  logTest('.env File Exists', envExists);
  
  if (envExists) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const requiredVars = [
      'TWITCH_CLIENT_ID',
      'TWITCH_CLIENT_SECRET', 
      'TWITCH_OAUTH_TOKEN',
      'TWITCH_REFRESH_TOKEN',
      'TWITCH_CHANNEL',
      'TWITCH_BOT_USERNAME'
    ];
    
    requiredVars.forEach(varName => {
      const hasVar = envContent.includes(`${varName}=`);
      logTest(`Environment Variable: ${varName}`, hasVar);
    });
  }
  
  // Test config API endpoint
  try {
    const response = await makeRequest(`${BASE_URL}/api/config`);
    const config = await response.json();
    
    logTest('Config API Endpoint', response.ok, `Status: ${response.status}`);
    logTest('Config Has Client ID', !!config.TWITCH_CLIENT_ID);
    logTest('Config Has Channel', !!config.TWITCH_CHANNEL);
  } catch (error) {
    logTest('Config API Test', false, `Error: ${error.message}`);
  }
}

// Test 3: OAuth Token Validation
async function testOAuthTokens() {
  console.log('\n🔐 OAUTH TOKEN VALIDATION TESTS');
  console.log('===============================');
  
  // Read tokens from .env
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const tokenMatch = envContent.match(/TWITCH_OAUTH_TOKEN=(.+)/);
    
    if (tokenMatch) {
      const token = tokenMatch[1];
      
      try {
        // Validate token with Twitch
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          logTest('OAuth Token Validation', true, `Expires in: ${data.expires_in}s`);
          logTest('Token Scopes Available', data.scopes && data.scopes.length > 0, `Scopes: ${data.scopes?.length || 0}`);
          logTest('Token User ID', !!data.user_id, `User ID: ${data.user_id}`);
        } else {
          logTest('OAuth Token Validation', false, `HTTP ${response.status}`);
        }
      } catch (error) {
        logTest('OAuth Token Validation', false, `Error: ${error.message}`);
      }
    } else {
      logTest('OAuth Token Found', false, 'No token in .env file');
    }
  }
}

// Test 4: Twitch API Integration
async function testTwitchAPI() {
  console.log('\n📺 TWITCH API INTEGRATION TESTS');
  console.log('===============================');
  
  try {
    // Test stream info endpoint
    const streamResponse = await makeRequest(`${BASE_URL}/api/twitch/stream`);
    logTest('Stream Info API', streamResponse.ok, `Status: ${streamResponse.status}`);
    
    // Test followers endpoint
    const followersResponse = await makeRequest(`${BASE_URL}/api/twitch/followers`);
    logTest('Followers API', followersResponse.ok, `Status: ${followersResponse.status}`);
    
    if (followersResponse.ok) {
      const followersData = await followersResponse.json();
      logTest('Followers Data Format', followersData.hasOwnProperty('total'), `Has total: ${!!followersData.total}`);
    }
    
    // Test analytics endpoint
    const analyticsResponse = await makeRequest(`${BASE_URL}/api/analytics`);
    logTest('Analytics API', analyticsResponse.ok, `Status: ${analyticsResponse.status}`);
    
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      logTest('Analytics Data Structure', 
        analyticsData.hasOwnProperty('stream') && 
        analyticsData.hasOwnProperty('followers') && 
        analyticsData.hasOwnProperty('session'), 
        'Has required sections'
      );
    }
  } catch (error) {
    logTest('Twitch API Integration', false, `Error: ${error.message}`);
  }
}

// Test 5: Overlay Pages
async function testOverlayPages() {
  console.log('\n🎨 OVERLAY PAGES TESTS');
  console.log('=====================');
  
  const overlayTypes = ['chat', 'alerts', 'stats', 'game'];
  const overlayThemes = ['overlay', 'overlay-worxed'];
  
  for (const theme of overlayThemes) {
    for (const type of overlayTypes) {
      try {
        const response = await makeRequest(`${BASE_URL}/${theme}/${type}`);
        logTest(`${theme}/${type} Page`, response.ok, `Status: ${response.status}`);
      } catch (error) {
        logTest(`${theme}/${type} Page`, false, `Error: ${error.message}`);
      }
    }
  }
}

// Test 6: Management Pages
async function testManagementPages() {
  console.log('\n🛠️  MANAGEMENT PAGES TESTS');
  console.log('==========================');
  
  const pages = [
    { path: '/', name: 'Main Dashboard' },
    { path: '/customizer', name: 'Overlay Customizer' },
    { path: '/alerts', name: 'Alert Manager' }
  ];
  
  for (const page of pages) {
    try {
      const response = await makeRequest(`${BASE_URL}${page.path}`);
      logTest(`${page.name} Page`, response.ok, `Status: ${response.status}`);
      
      if (response.ok) {
        const content = await response.text();
        // Check for valid HTML structure - look for DOCTYPE and html tag
        const hasDoctype = content.includes('<!DOCTYPE html>');
        const hasHtmlTag = content.includes('<html') || content.includes('<HTML');
        const isValidHTML = hasDoctype && hasHtmlTag;
        logTest(`${page.name} Content`, isValidHTML, 'Valid HTML structure');
      }
    } catch (error) {
      logTest(`${page.name} Page`, false, `Error: ${error.message}`);
    }
  }
}

// Test 7: Alert System
async function testAlertSystem() {
  console.log('\n🚨 ALERT SYSTEM TESTS');
  console.log('=====================');
  
  const testAlerts = [
    {
      type: 'custom-follow',
      data: { username: 'TestFollower', timestamp: new Date().toISOString() }
    },
    {
      type: 'custom-subscriber',
      data: { username: 'TestSubscriber', tier: '1000', message: 'Test sub!', timestamp: new Date().toISOString() }
    },
    {
      type: 'custom-cheer',
      data: { username: 'TestCheerer', bits: '100', message: 'Cheer100 Test!', timestamp: new Date().toISOString() }
    }
  ];
  
  for (const alert of testAlerts) {
    try {
      const response = await makeRequest(`${BASE_URL}/api/custom-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
      
      logTest(`Custom Alert: ${alert.type}`, response.ok, `Status: ${response.status}`);
    } catch (error) {
      logTest(`Custom Alert: ${alert.type}`, false, `Error: ${error.message}`);
    }
  }
  
  // Test donation webhook
  try {
    const donationData = {
      username: 'TestDonor',
      amount: '5.00',
      message: 'Test donation!',
      currency: 'USD',
      processor: 'test'
    };
    
    const response = await makeRequest(`${BASE_URL}/webhooks/donation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donationData)
    });
    
    logTest('Donation Webhook', response.ok, `Status: ${response.status}`);
  } catch (error) {
    logTest('Donation Webhook', false, `Error: ${error.message}`);
  }
}

// Test 8: WebSocket Connection
async function testWebSocketConnection() {
  console.log('\n🔌 WEBSOCKET CONNECTION TESTS');
  console.log('=============================');
  
  try {
    // Test if Socket.IO endpoint is available
    const response = await makeRequest(`${BASE_URL}/socket.io/socket.io.js`);
    logTest('Socket.IO Client Library', response.ok, `Status: ${response.status}`);
    
    // Note: Full WebSocket testing would require a WebSocket client
    logTest('WebSocket Endpoint Available', response.ok, 'Socket.IO endpoint accessible');
  } catch (error) {
    logTest('WebSocket Connection', false, `Error: ${error.message}`);
  }
}

// Test 9: File Structure
async function testFileStructure() {
  console.log('\n📁 FILE STRUCTURE TESTS');
  console.log('=======================');
  
  const requiredFiles = [
    'server.js',
    'package.json',
    '.env',
    'public/index.html',
    'public/overlay.html',
    'public/overlay-worxed.html',
    'public/customizer.html',
    'public/alerts-manager.html'
  ];
  
  requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    logTest(`File: ${file}`, exists);
  });
  
  // Check if node_modules exists
  const nodeModulesExists = fs.existsSync('node_modules');
  logTest('Dependencies Installed', nodeModulesExists, 'node_modules directory');
}

// Test 10: Configuration Management
async function testConfigurationManagement() {
  console.log('\n⚙️  CONFIGURATION MANAGEMENT TESTS');
  console.log('==================================');
  
  // Test server config endpoint
  try {
    const testConfig = {
      PORT: '3000',
      WEBHOOK_URL: 'https://test.example.com/webhooks/twitch',
      TWITCH_WEBHOOK_SECRET: 'test_secret'
    };
    
    const response = await makeRequest(`${BASE_URL}/api/server-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testConfig)
    });
    
    logTest('Server Config Update', response.ok, `Status: ${response.status}`);
  } catch (error) {
    logTest('Server Config Update', false, `Error: ${error.message}`);
  }
}

// Test 11: Performance Tests
async function testPerformance() {
  console.log('\n⚡ PERFORMANCE TESTS');
  console.log('===================');
  
  const startTime = Date.now();
  
  try {
    // Test multiple concurrent requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest(`${BASE_URL}/api/status`));
    }
    
    const responses = await Promise.all(promises);
    const allSuccessful = responses.every(r => r.ok);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logTest('Concurrent Requests', allSuccessful, `5 requests in ${duration}ms`);
    logTest('Response Time', duration < 5000, `${duration}ms (should be < 5000ms)`);
  } catch (error) {
    logTest('Performance Test', false, `Error: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting comprehensive test suite...\n');
  console.log('⚠️  Make sure your server is running on http://localhost:3000\n');
  
  const startTime = Date.now();
  
  // Run all test suites
  await testServerHealth();
  await testEnvironmentConfig();
  await testOAuthTokens();
  await testTwitchAPI();
  await testOverlayPages();
  await testManagementPages();
  await testAlertSystem();
  await testWebSocketConnection();
  await testFileStructure();
  await testConfigurationManagement();
  await testPerformance();
  
  // Generate test report
  const endTime = Date.now();
  const duration = endTime - startTime;
  const totalTests = TEST_RESULTS.length;
  const passedTests = TEST_RESULTS.filter(t => t.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log(`⏱️  Duration: ${duration}ms`);
  
  // Save detailed report
  const report = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      successRate: parseFloat(successRate),
      duration,
      timestamp: new Date().toISOString()
    },
    results: TEST_RESULTS
  };
  
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to test-report.json');
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(report);
  fs.writeFileSync('test-report.html', htmlReport);
  console.log('🌐 HTML report saved to test-report.html');
  
  if (failedTests > 0) {
    console.log('\n⚠️  Some tests failed. Check the report for details.');
    console.log('Common issues:');
    console.log('- Server not running on port 3000');
    console.log('- Missing environment variables');
    console.log('- Invalid OAuth tokens');
    console.log('- Network connectivity issues');
  } else {
    console.log('\n🎉 All tests passed! Your Worxed Stream Manager is working perfectly!');
  }
}

// Generate HTML report
function generateHTMLReport(report) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Worxed Stream Manager - Test Report</title>
    <style>
        body { font-family: 'Courier New', monospace; background: #121318; color: #8cffbe; margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #8cffbe; text-shadow: 0 0 10px rgba(140, 255, 190, 0.5); }
        .summary { background: rgba(140, 255, 190, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .test-pass { background: rgba(46, 213, 115, 0.2); border-left: 4px solid #2ed573; }
        .test-fail { background: rgba(255, 71, 87, 0.2); border-left: 4px solid #ff4757; }
        .test-name { font-weight: bold; }
        .test-details { color: #b893ff; font-size: 0.9em; margin-top: 5px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-card { background: rgba(184, 147, 255, 0.1); padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #8cffbe; }
        .stat-label { color: #b893ff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Worxed Stream Manager Test Report</h1>
            <p>Generated on: ${new Date(report.summary.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">${report.summary.totalTests}</div>
                    <div class="stat-label">Total Tests</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.summary.passedTests}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.summary.failedTests}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.summary.successRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.summary.duration}ms</div>
                    <div class="stat-label">Duration</div>
                </div>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Results</h2>
            ${report.results.map(result => `
                <div class="test-result ${result.passed ? 'test-pass' : 'test-fail'}">
                    <div class="test-name">${result.passed ? '✅' : '❌'} ${result.testName}</div>
                    ${result.details ? `<div class="test-details">${result.details}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testServerHealth,
  testEnvironmentConfig,
  testOAuthTokens,
  testTwitchAPI,
  testOverlayPages,
  testManagementPages,
  testAlertSystem,
  testWebSocketConnection,
  testFileStructure,
  testConfigurationManagement,
  testPerformance
}; 