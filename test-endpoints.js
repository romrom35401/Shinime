// Test script pour vérifier tous les endpoints
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testEndpoint(method, endpoint, data = null) {
  try {
    console.log(`\n🧪 Test ${method} ${endpoint}`);
    
    let response;
    if (method === 'GET') {
      response = await axios.get(`${BASE_URL}${endpoint}`);
    } else if (method === 'POST') {
      response = await axios.post(`${BASE_URL}${endpoint}`, data);
    }
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📦 Data preview:`, JSON.stringify(response.data).slice(0, 200) + '...');
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`🚀 Testing endpoints on ${BASE_URL}\n`);
  
  const tests = [
    // Health checks
    ['GET', '/'],
    ['GET', '/health'],
    ['GET', '/api/test'],
    
    // Anime data
    ['GET', '/api/trending?limit=5'],
    ['GET', '/api/top-rated?limit=5'],
    ['GET', '/api/current-season?limit=5'],
    ['GET', '/api/must-watch?limit=5'],
    ['GET', '/api/animes?limit=5'],
    
    // Search
    ['GET', '/api/search?q=naruto&limit=3'],
    ['POST', '/api/search', { q: 'one piece', limit: 3 }],
    
    // Episodes
    ['GET', '/api/episodes/Naruto'],
    ['GET', '/api/anime/naruto/episodes'],
    
    // Genre
    ['GET', '/api/genre/Action?limit=3'],
    
    // Anime details
    ['GET', '/api/anime/naruto'],
    
    // Stream prepare
    ['POST', '/api/stream/prepare', { 
      episodeId: 'naruto-1', 
      language: 'VOSTFR', 
      preferredQuality: '720p' 
    }],
    
    // Video extraction (with a test URL)
    ['GET', '/api/extract?url=https://example.com/test.mp4&prefer=mp4']
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const [method, endpoint, data] of tests) {
    const success = await testEndpoint(method, endpoint, data);
    if (success) passed++;
  }
  
  console.log(`\n📊 Résultats: ${passed}/${total} tests réussis`);
  
  if (passed === total) {
    console.log('🎉 Tous les endpoints fonctionnent correctement !');
  } else {
    console.log('⚠️ Certains endpoints ont des problèmes.');
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };
