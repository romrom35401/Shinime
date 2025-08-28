// test-backend.js - Test de connectivité des backends
import { getNewBackendUrl, getLegacyBackendUrl, getPrimaryBackendUrl } from './config';

const NEW_BACKEND_URL = getNewBackendUrl();
const LEGACY_BACKEND_URL = getLegacyBackendUrl();
const PRIMARY_BACKEND_URL = getPrimaryBackendUrl();

export async function testBackendConnectivity() {
  console.log('🔍 Test de connectivité des backends...');
  
  const results = {
    new: { success: false, error: null },
    legacy: { success: false, error: null }
  };
  
  // Test 1: Nouveau backend (votre backend Render)
  console.log('📡 Test nouveau backend:', NEW_BACKEND_URL);
  try {
    const healthResponse = await fetch(`${NEW_BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 10000
    });
    
    console.log(`✅ Nouveau backend health: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      results.new.success = true;
      results.new.message = 'Nouveau backend opérationnel';
    } else {
      results.new.error = `HTTP ${healthResponse.status}`;
    }
    
  } catch (error) {
    console.error('❌ Erreur nouveau backend:', error);
    results.new.error = error.message;
  }
  
  // Test 2: Ancien backend (fallback)
  console.log('📡 Test ancien backend:', LEGACY_BACKEND_URL);
  try {
    const healthResponse = await fetch(`${LEGACY_BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 10000
    });
    
    console.log(`✅ Ancien backend health: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      results.legacy.success = true;
      results.legacy.message = 'Ancien backend opérationnel';
    } else {
      results.legacy.error = `HTTP ${healthResponse.status}`;
    }
    
  } catch (error) {
    console.error('❌ Erreur ancien backend:', error);
    results.legacy.error = error.message;
  }
  
  // Résumé
  const hasWorkingBackend = results.new.success || results.legacy.success;
  
  return {
    success: hasWorkingBackend,
    new: results.new,
    legacy: results.legacy,
    message: hasWorkingBackend 
      ? `Backend${results.new.success && results.legacy.success ? 's' : ''} opérationnel${results.new.success && results.legacy.success ? 's' : ''}`
      : 'Aucun backend accessible'
  };
}

export async function testPrimaryBackend() {
  console.log('🔍 Test du backend principal:', PRIMARY_BACKEND_URL);
  
  try {
    const healthResponse = await fetch(`${PRIMARY_BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 10000
    });
    
    console.log(`✅ Backend principal health: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      return { 
        success: true, 
        message: 'Backend principal opérationnel',
        data: data
      };
    } else {
      return { 
        success: false, 
        error: `HTTP ${healthResponse.status}` 
      };
    }
    
  } catch (error) {
    console.error('❌ Erreur backend principal:', error);
    return { success: false, error: error.message };
  }
}

export async function testDirectVideoUrl(url) {
  console.log('🔍 Test URL vidéo directe:', url);
  
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      timeout: 10000 
    });
    
    console.log(`✅ Test URL: ${response.status} ${response.statusText}`);
    console.log('📋 Headers:', response.headers);
    
    return { success: true, status: response.status };
  } catch (error) {
    console.error('❌ Erreur test URL:', error);
    return { success: false, error: error.message };
  }
}
