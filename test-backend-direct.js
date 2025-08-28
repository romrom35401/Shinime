// Test direct de votre backend
const BACKEND_URL = 'https://video-extractor-wqlx.onrender.com'; // Remplacez par votre URL

async function testBackendDirect() {
  console.log('🧪 Test direct du backend...');
  
  // Test 1: Health check
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    console.log('✅ Health check:', healthResponse.status, healthResponse.statusText);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
  
  // Test 2: Recherche d'anime
  const animeTitles = [
    'The Rising OF The Shield Hero',
    'The Rising of the Shield Hero',
    'the-rising-of-the-shield-hero',
    'the-rising-of-the-shield-hero--ep-1'
  ];
  
  for (const title of animeTitles) {
    try {
      console.log(`\n🔍 Test avec titre: "${title}"`);
      
      const response = await fetch(`${BACKEND_URL}/api/stream/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: title,
          language: 'VOSTFR',
          preferredQuality: '720p'
        })
      });
      
      console.log(`📡 Réponse (${response.status}):`, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Succès:', data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.log('❌ Erreur:', errorData);
      }
    } catch (error) {
      console.error(`❌ Erreur pour "${title}":`, error.message);
    }
  }
  
  // Test 3: Extraction directe
  try {
    console.log('\n🔧 Test extraction directe...');
    const testUrl = 'https://vk.com/video_ext.php?oid=755747641&id=456240187&hd=3';
    
    const extractResponse = await fetch(`${BACKEND_URL}/api/extract?url=${encodeURIComponent(testUrl)}`);
    console.log('📡 Extraction:', extractResponse.status, extractResponse.statusText);
    
    if (extractResponse.ok) {
      const data = await extractResponse.json();
      console.log('✅ Extraction réussie:', data);
    } else {
      const errorData = await extractResponse.json().catch(() => ({ error: 'Erreur inconnue' }));
      console.log('❌ Erreur extraction:', errorData);
    }
  } catch (error) {
    console.error('❌ Erreur extraction:', error.message);
  }
}

// Exécuter le test
testBackendDirect();
