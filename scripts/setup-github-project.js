#!/usr/bin/env node

/**
 * GitHub Project Setup Script
 * 
 * This script helps set up the GitHub repository with:
 * - Labels for issue organization
 * - Milestones for project tracking
 * - Initial project boards
 * 
 * Usage: node scripts/setup-github-project.js
 * 
 * Prerequisites:
 * - GitHub CLI installed (gh)
 * - Authenticated with GitHub
 * - Repository already created
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Worxed Stream Manager GitHub Project Structure');
console.log('============================================================\n');

// Check if GitHub CLI is installed
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    console.log('✅ GitHub CLI is installed');
  } catch (error) {
    console.error('❌ GitHub CLI is not installed. Please install it first:');
    console.error('   https://cli.github.com/');
    process.exit(1);
  }
}

// Check if authenticated with GitHub
function checkGitHubAuth() {
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    console.log('✅ Authenticated with GitHub');
  } catch (error) {
    console.error('❌ Not authenticated with GitHub. Please run:');
    console.error('   gh auth login');
    process.exit(1);
  }
}

// Create GitHub labels
function createLabels() {
  console.log('\n📋 Creating GitHub Labels...');
  
  const labels = [
    // Priority Labels
    { name: 'priority: critical', color: 'ff0000', description: 'Must be fixed immediately' },
    { name: 'priority: high', color: 'ff8c00', description: 'Important for next release' },
    { name: 'priority: medium', color: 'ffd700', description: 'Should be included if possible' },
    { name: 'priority: low', color: '90ee90', description: 'Nice to have, future consideration' },
    
    // Type Labels
    { name: 'type: feature', color: '00ff00', description: 'New feature development' },
    { name: 'type: enhancement', color: '32cd32', description: 'Improvement to existing feature' },
    { name: 'type: bug', color: 'ff1493', description: 'Bug fix' },
    { name: 'type: technical-debt', color: '8b4513', description: 'Code quality improvements' },
    { name: 'type: documentation', color: '4169e1', description: 'Documentation updates' },
    { name: 'type: security', color: '800080', description: 'Security-related changes' },
    { name: 'type: performance', color: 'ffff00', description: 'Performance improvements' },
    { name: 'type: testing', color: '00ffff', description: 'Testing-related work' },
    
    // Component Labels
    { name: 'component: overlay', color: 'ff69b4', description: 'Overlay system' },
    { name: 'component: dashboard', color: '1e90ff', description: 'Management dashboard' },
    { name: 'component: alerts', color: 'ff4500', description: 'Alert system' },
    { name: 'component: api', color: '32cd32', description: 'API endpoints' },
    { name: 'component: websocket', color: '9370db', description: 'WebSocket functionality' },
    { name: 'component: auth', color: 'dc143c', description: 'Authentication system' },
    { name: 'component: ui', color: 'ff1493', description: 'User interface' },
    { name: 'component: backend', color: '696969', description: 'Server-side code' },
    
    // Status Labels
    { name: 'status: needs-triage', color: 'ffa500', description: 'Needs initial assessment' },
    { name: 'status: ready', color: '00ff00', description: 'Ready for development' },
    { name: 'status: blocked', color: 'ff0000', description: 'Blocked by dependencies' },
    { name: 'status: in-review', color: '9370db', description: 'Under code review' },
    { name: 'status: needs-testing', color: 'ffff00', description: 'Needs testing' },
    { name: 'status: needs-docs', color: '4169e1', description: 'Needs documentation' },
    
    // Effort Labels
    { name: 'effort: xs', color: 'e6ffe6', description: '1-2 hours' },
    { name: 'effort: small', color: 'ccffcc', description: '1-2 days' },
    { name: 'effort: medium', color: '99ff99', description: '3-5 days' },
    { name: 'effort: large', color: '66ff66', description: '1-2 weeks' },
    { name: 'effort: xl', color: '33ff33', description: '2+ weeks' },
    
    // Platform Labels
    { name: 'platform: web', color: '1e90ff', description: 'Web browser' },
    { name: 'platform: mobile', color: 'ff69b4', description: 'Mobile devices' },
    { name: 'platform: obs', color: '8b0000', description: 'OBS Studio' },
    { name: 'platform: twitch', color: '9146ff', description: 'Twitch integration' }
  ];
  
  labels.forEach(label => {
    try {
      const command = `gh label create "${label.name}" --color ${label.color} --description "${label.description}"`;
      execSync(command, { stdio: 'ignore' });
      console.log(`  ✅ Created label: ${label.name}`);
    } catch (error) {
      console.log(`  ⚠️  Label already exists: ${label.name}`);
    }
  });
}

// Create GitHub milestones
function createMilestones() {
  console.log('\n🎯 Creating GitHub Milestones...');
  
  const milestones = [
    {
      title: 'Phase 2.1 - Core UX',
      description: 'Essential user experience improvements including real-time overlay editor and mobile responsiveness',
      due_date: '2024-01-31'
    },
    {
      title: 'Phase 2.2 - Advanced Features',
      description: 'Advanced customization features including CSS injection and drag-and-drop positioning',
      due_date: '2024-02-29'
    },
    {
      title: 'Phase 2.3 - Polish & Performance',
      description: 'Performance optimization, security audit, and comprehensive testing',
      due_date: '2024-03-31'
    }
  ];
  
  milestones.forEach(milestone => {
    try {
      const command = `gh api repos/:owner/:repo/milestones -f title="${milestone.title}" -f description="${milestone.description}" -f due_on="${milestone.due_date}T23:59:59Z"`;
      execSync(command, { stdio: 'ignore' });
      console.log(`  ✅ Created milestone: ${milestone.title}`);
    } catch (error) {
      console.log(`  ⚠️  Milestone may already exist: ${milestone.title}`);
    }
  });
}

// Create pull request template
function createPRTemplate() {
  console.log('\n📝 Creating Pull Request Template...');
  
  const prTemplateDir = '.github';
  const prTemplatePath = path.join(prTemplateDir, 'pull_request_template.md');
  
  if (!fs.existsSync(prTemplateDir)) {
    fs.mkdirSync(prTemplateDir, { recursive: true });
  }
  
  const prTemplate = `## 🎯 Description
Brief description of changes

## 🔗 Related Issues
- Closes #issue-number
- Related to #issue-number

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing done

## 📸 Screenshots
(if applicable)

## 🔍 Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Labels and milestone assigned
- [ ] Reviewers assigned

## 🎨 Design Considerations
- [ ] Matches worxed.com aesthetic
- [ ] Terminal/cyberpunk theme maintained
- [ ] Responsive design implemented
- [ ] Accessibility considerations

## 🚀 Deployment Notes
(Any special deployment considerations)
`;
  
  fs.writeFileSync(prTemplatePath, prTemplate);
  console.log('  ✅ Created pull request template');
}

// Create GitHub Actions workflow for basic CI
function createGitHubActions() {
  console.log('\n⚙️ Creating GitHub Actions Workflow...');
  
  const workflowDir = '.github/workflows';
  const workflowPath = path.join(workflowDir, 'ci.yml');
  
  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
  }
  
  const workflow = `name: CI

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint --if-present
    
    - name: Run tests
      run: npm test
    
    - name: Run security audit
      run: npm audit --audit-level moderate
    
    - name: Check for vulnerabilities
      run: npm audit --audit-level high

  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js 18.x
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build --if-present
`;
  
  fs.writeFileSync(workflowPath, workflow);
  console.log('  ✅ Created GitHub Actions CI workflow');
}

// Create initial project structure documentation
function createProjectDocs() {
  console.log('\n📚 Creating Project Documentation...');
  
  // Create CONTRIBUTING.md
  const contributing = `# Contributing to Worxed Stream Manager

Thank you for your interest in contributing! Please read our project management guide and follow the established workflows.

## Quick Start
1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/your-feature\`
3. Make your changes
4. Add tests for your changes
5. Run the test suite: \`npm test\`
6. Commit your changes: \`git commit -m "feat: your feature description"\`
7. Push to your fork: \`git push origin feature/your-feature\`
8. Create a Pull Request

## Development Setup
\`\`\`bash
npm install
cp env.example .env
# Configure your .env file
npm start
\`\`\`

## Code Style
- Use ESLint and Prettier configurations
- Follow conventional commit format
- Add JSDoc comments for functions
- Maintain test coverage above 80%

## Issue Guidelines
- Use issue templates
- Add appropriate labels
- Link to related issues
- Include reproduction steps for bugs

For more details, see PROJECT-MANAGEMENT.md
`;
  
  fs.writeFileSync('CONTRIBUTING.md', contributing);
  console.log('  ✅ Created CONTRIBUTING.md');
}

// Main execution
function main() {
  try {
    checkGitHubCLI();
    checkGitHubAuth();
    
    createLabels();
    createMilestones();
    createPRTemplate();
    createGitHubActions();
    createProjectDocs();
    
    console.log('\n🎉 GitHub project setup complete!');
    console.log('\nNext steps:');
    console.log('1. Review the created labels and milestones');
    console.log('2. Create GitHub project boards manually (GitHub web interface)');
    console.log('3. Start creating issues from ISSUES.md');
    console.log('4. Set up branch protection rules');
    console.log('5. Configure repository settings');
    
    console.log('\n📋 Recommended GitHub repository settings:');
    console.log('- Enable "Automatically delete head branches"');
    console.log('- Require pull request reviews');
    console.log('- Require status checks to pass');
    console.log('- Require branches to be up to date');
    console.log('- Include administrators in restrictions');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createLabels,
  createMilestones,
  createPRTemplate,
  createGitHubActions,
  createProjectDocs
}; 