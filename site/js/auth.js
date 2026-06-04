// Protection des pages
(function() {
  const SESSION_KEY = 'euroStatsAuth';
  
  // Vérifier l'authentification sur toutes les pages sauf login
  if (!window.location.pathname.includes('index.html') && 
      window.location.pathname !== '/' &&
      sessionStorage.getItem(SESSION_KEY) !== 'true') {
    window.location.href = 'index.html';
  }
  
  // Fonction de déconnexion
  window.logout = function() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  };
})();
