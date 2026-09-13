const fs = require('fs');
const path = require('path');
const { mediaQueries } = require('/root/short_bot/src/lib/db/queries.js');

// Verificar si hay medios sincronizados
(async () => {
  try {
    const media = await mediaQueries.findAll();
    console.log(`Medios sincronizados: ${media.length}`);
    media.forEach(m => {
      console.log(`- ${m.name} (${m.type})`);
    });
  } catch (error) {
    console.error('Error al leer medios:', error.message);
  }
})();
