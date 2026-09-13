const path = require('path');
const githubPath = path.join(__dirname, 'src/lib/github.js');
const githubModule = require(githubPath);

(async () => {
  try {
    console.log('Testing syncGitHubMedia...');
    const result = await githubModule.syncGitHubMedia();
    console.log('Sync result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
