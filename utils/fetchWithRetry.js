// utils/fetchWithRetry.js
async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      return await response.json(); // si ça marche, on sort
    } catch (error) {
      console.error(`Tentative ${i + 1} échouée :`, error.message);

      if (i === retries - 1) {
        throw error; // si c’est la dernière tentative, on relance l'erreur
      }

      // Attendre avant de réessayer
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

module.exports = fetchWithRetry;
