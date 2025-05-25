const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 WORXED STREAM MANAGER - Pre-Test Environment Check');
console.log('=====================================================\n');

let allGood = true;

function checkItem(name, condition, fix = null) {
  if (condition) {
    console.log(`✅ ${name}`);
    return true;
  } else {
    console.log(`❌ ${name}`);
    if (fix) {
      console.log(`   💡 Fix: ${fix}`);
    }
    allGood = false;
    return false;
  }
}

console.log('📋 CHECKING PREREQUISITES...\n');

// Check Node.js version
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  checkItem(`Node.js version (${nodeVersion})`, majorVersion >= 14, 'Update to Node.js 14 or higher');
} catch (error) {
  checkItem('Node.js installation', false, 'Install Node.js from nodejs.org');
}

// Check if package.json exists
checkItem('package.json exists', fs.existsSync('package.json'), 'Run npm init to create package.json');

// Check if node_modules exists
checkItem('Dependencies installed', fs.existsSync('node_modules'), 'Run npm install to install dependencies');

// Check required files
const requiredFiles = [
  'server.js',
  '.env',
  'public/index.html',
  'public/overlay.html',
  'public/overlay-worxed.html',
  'public/customizer.html',
  'public/alerts-manager.html'
];

console.log('\n📁 CHECKING REQUIRED FILES...\n');
requiredFiles.forEach(file => {
  checkItem(`File: ${file}`, fs.existsSync(file), `Create missing file: ${file}`);
});

// Check environment variables
console.log('\n⚙️  CHECKING ENVIRONMENT CONFIGURATION...\n');
if (fs.existsSync('.env')) {
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
    const hasVar = envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=\n`);
    checkItem(`Environment variable: ${varName}`, hasVar, 'Run setup-production-auth-device.js to configure OAuth');
  });
} else {
  checkItem('.env file exists', false, 'Run setup-production-auth-device.js to create .env file');
}

// Check if server is running
console.log('\n🏥 CHECKING SERVER STATUS...\n');
try {
  const fetch = require('node-fetch');
  
  // This is a quick check - we'll do a more thorough test in the main test suite
  console.log('⏳ Checking if server is running on port 3000...');
  
  fetch('http://localhost:3000/api/status', { timeout: 3000 })
    .then(response => {
      if (response.ok) {
        console.log('✅ Server is running and responding');
        console.log('\n🎉 ENVIRONMENT CHECK COMPLETE!');
        console.log('===============================');
        if (allGood) {
          console.log('✅ All checks passed! Ready to run tests.');
          console.log('\n🚀 Run tests with:');
          console.log('   node test-suite.js        - Run all tests');
          console.log('   node run-tests.js health  - Run specific test suite');
        } else {
          console.log('⚠️  Some issues found. Please fix them before running tests.');
        }
      } else {
        console.log('❌ Server is running but not responding correctly');
        console.log('   💡 Fix: Check server logs for errors');
      }
    })
    .catch(error => {
      console.log('❌ Server is not running or not accessible');
      console.log('   💡 Fix: Start the server with "npm start" or "node server.js"');
      console.log('\n🎉 ENVIRONMENT CHECK COMPLETE!');
      console.log('===============================');
      if (allGood) {
        console.log('✅ Environment is ready, but server needs to be started.');
        console.log('\n🚀 To run tests:');
        console.log('   1. Start server: npm start');
        console.log('   2. Run tests: node test-suite.js');
      } else {
        console.log('⚠️  Some issues found. Please fix them before running tests.');
      }
    });
    
} catch (error) {
  console.log('❌ Cannot check server status (node-fetch not available)');
  console.log('   💡 Fix: Run npm install to install dependencies');
}

// Quick dependency check
console.log('\n📦 CHECKING KEY DEPENDENCIES...\n');
const keyDependencies = ['express', 'socket.io', 'tmi.js', 'node-fetch', 'dotenv', 'cors'];

if (fs.existsSync('package.json')) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    keyDependencies.forEach(dep => {
      checkItem(`Dependency: ${dep}`, dependencies.hasOwnProperty(dep), `Add to package.json and run npm install`);
    });
  } catch (error) {
    console.log('❌ Could not parse package.json');
  }
}

console.log('\n📋 QUICK START GUIDE');
console.log('===================');
console.log('If this is your first time running tests:');
console.log('1. Complete OAuth setup: node setup-production-auth-device.js');
console.log('2. Start the server: npm start');
console.log('3. Run tests: node test-suite.js');
console.log('4. View test report: open test-report.html in browser');
console.log('\nFor specific test suites: node run-tests.js [test-type]'); 