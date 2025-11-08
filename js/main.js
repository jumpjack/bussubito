// File principale - inizializza l'applicazione

// Attendi che il DOM sia caricato
document.addEventListener('DOMContentLoaded', function() {
    // Inizializza la mappa
    MapManager.init();

    // Inizializza l'UI
    UIManager.init();
    console.log("Applicazione inizializzata con successo!");
});