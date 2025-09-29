// utils/fetchWithRetry.js
async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const startTime = Date.now(); // début du timer
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      const endTime = Date.now(); // fin du timer
      const duration = endTime - startTime; // temps en ms

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();

      return { data, duration }; // on renvoie les données + durée
    } catch (error) {
      console.error(`Tentative ${i + 1} échouée :`, error.message);

      if (i === retries - 1) {
        throw error;
      }

      await new Promise((res) => setTimeout(res, delay));
    }
  }
}


module.exports = fetchWithRetry;
