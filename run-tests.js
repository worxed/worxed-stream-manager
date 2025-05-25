#!/usr/bin/env node

const { 
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
} = require('./test-suite');

console.log('🧪 WORXED STREAM MANAGER - Test Runner');
console.log('======================================\n');

const args = process.argv.slice(2);
const testType = args[0];

async function runSpecificTest() {
  switch (testType) {
    case 'health':
      console.log('Running Server Health Tests...');
      await testServerHealth();
      break;
    case 'config':
      console.log('Running Configuration Tests...');
      await testEnvironmentConfig();
      break;
    case 'oauth':
      console.log('Running OAuth Tests...');
      await testOAuthTokens();
      break;
    case 'api':
      console.log('Running Twitch API Tests...');
      await testTwitchAPI();
      break;
    case 'overlays':
      console.log('Running Overlay Tests...');
      await testOverlayPages();
      break;
    case 'management':
      console.log('Running Management Page Tests...');
      await testManagementPages();
      break;
    case 'alerts':
      console.log('Running Alert System Tests...');
      await testAlertSystem();
      break;
    case 'websocket':
      console.log('Running WebSocket Tests...');
      await testWebSocketConnection();
      break;
    case 'files':
      console.log('Running File Structure Tests...');
      await testFileStructure();
      break;
    case 'performance':
      console.log('Running Performance Tests...');
      await testPerformance();
      break;
    case 'all':
    case undefined:
      console.log('Running All Tests...');
      await runAllTests();
      break;
    default:
      console.log('❌ Unknown test type. Available options:');
      console.log('  health      - Server health checks');
      console.log('  config      - Environment configuration');
      console.log('  oauth       - OAuth token validation');
      console.log('  api         - Twitch API integration');
      console.log('  overlays    - Overlay page tests');
      console.log('  management  - Management page tests');
      console.log('  alerts      - Alert system tests');
      console.log('  websocket   - WebSocket connection tests');
      console.log('  files       - File structure tests');
      console.log('  performance - Performance tests');
      console.log('  all         - Run all tests (default)');
      console.log('\nUsage: node run-tests.js [test-type]');
      process.exit(1);
  }
}

runSpecificTest().catch(console.error); 