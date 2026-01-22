const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing the application...\n');

// Test 1: Check if server is running
function testServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/clients', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('✅ Server is running and responding');
          console.log(`📊 Clients API returned ${parsed.data ? parsed.data.length : 'unknown'} clients`);
          resolve(true);
        } catch (e) {
          console.log('❌ Server responded but with invalid JSON');
          resolve(false);
        }
      });
    });
    
    req.on('error', () => {
      console.log('❌ Server is not running on port 5000');
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      console.log('❌ Server request timed out');
      resolve(false);
    });
  });
}

// Test 2: Check contractors API
function testContractors() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/contractors', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('✅ Contractors API is working');
          console.log(`📊 Contractors API returned ${Array.isArray(parsed) ? parsed.length : 'unknown'} contractors`);
          resolve(true);
        } catch (e) {
          console.log('❌ Contractors API responded with invalid JSON');
          resolve(false);
        }
      });
    });
    
    req.on('error', () => {
      console.log('❌ Contractors API is not accessible');
      resolve(false);
    });
  });
}

// Test 3: Check required files
function checkFiles() {
  const requiredFiles = [
    'backend/public/clients.html',
    'backend/public/contractors.html',
    'backend/public/js/clients.js',
    'backend/public/js/contractors.js',
    'backend/public/js/sidebar.js',
    'backend/public/sidebar.html',
    'backend/public/css/clients.css',
    'backend/public/css/contractors.css',
    'backend/public/css/sidebar.css',
    'database.sqlite'
  ];
  
  console.log('\n📁 Checking required files:');
  let allExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      allExist = false;
    }
  });
  
  return allExist;
}

// Test 4: Check database content
async function checkDatabase() {
  try {
    const db = require('./backend/db');
    
    const clientCount = await db('clients').count('id as count').first();
    const contractorCount = await db('contractors').count('id as count').first();
    
    console.log('\n💾 Database content:');
    console.log(`📊 Clients: ${clientCount.count}`);
    console.log(`📊 Contractors: ${contractorCount.count}`);
    
    if (clientCount.count === 0 && contractorCount.count === 0) {
      console.log('⚠️  Database is empty - this is why pages show no data');
      return false;
    }
    
    await db.destroy();
    return true;
  } catch (error) {
    console.log('❌ Database error:', error.message);
    return false;
  }
}

// Run all tests
async function runDiagnosis() {
  console.log('Starting diagnosis...\n');
  
  const serverOk = await testServer();
  const contractorsOk = await testContractors();
  const filesOk = checkFiles();
  const dbOk = await checkDatabase();
  
  console.log('\n📋 DIAGNOSIS SUMMARY:');
  console.log(`Server: ${serverOk ? '✅' : '❌'}`);
  console.log(`Contractors API: ${contractorsOk ? '✅' : '❌'}`);
  console.log(`Required Files: ${filesOk ? '✅' : '❌'}`);
  console.log(`Database: ${dbOk ? '✅' : '❌'}`);
  
  if (serverOk && contractorsOk && filesOk && dbOk) {
    console.log('\n🎉 Everything looks good! The pages should be working now.');
    console.log('📖 Open http://localhost:5000/clients.html to test clients page');
    console.log('📖 Open http://localhost:5000/contractors.html to test contractors page');
  } else {
    console.log('\n🔧 Issues found that need to be fixed.');
  }
}

runDiagnosis().catch(console.error);