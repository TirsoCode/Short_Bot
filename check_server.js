const axios = require('axios');

(async () => {
  try {
    const response = await axios.get('http://localhost:3000', { timeout: 5000 });
    console.log('Respuesta HTTP:', response.status);
    if (response.status === 200) {
      console.log('✅ Respuesta HTTP 200 recibida');
    } else {
      console.log('❌ No se recibió respuesta 200');
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
})();
