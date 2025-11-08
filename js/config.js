// Configurazione globale dell'applicazione
const CONFIG = {
    // Impostazioni della mappa
    map: {
        defaultCenter: [41.901308, 12.500433],
        defaultZoom: 13,
        tileLayerUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        tileLayerAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        tileLayerSubdomains: 'abcd',
        maxZoom: 20
    },

    // Impostazioni di default
    defaults: {
        radius: 100,
        lineWidth: 5,
        stopProximity: 50 // distanza in metri per considerare una fermata vicina ad una shape
    },

    // Limiti dei controlli
    limits: {
        radiusMin: 50,
        radiusMax: 1000,
        radiusStep: 50,
        lineWidthMin: 1,
        lineWidthMax: 10,
        lineWidthStep: 1,
        shapeProximityTolerance: 1000 // tolleranza per trovare punti più vicini sulle shape
    },

    // Palette di colori per le linee
    colorPalette: [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
        '#2c3e50', '#f1c40f', '#e67e22', '#7f8c8c', '#34495e',
        '#e84393', '#00cec9', '#fd79a8', '#6c5ce7', '#a29bfe',
        '#55efc4', '#81ecec', '#74b9ff', '#dfe6e9', '#636e72'
    ],

    // Colori dei marker
    markerColors: {
        start: '#2ecc71',
        end: '#e74c3c',
        highlight: '#ffeb3b'
    },

    // File GTFS richiesti
    gtfsFiles: {
        required: ['stops.txt', 'shapes.txt', 'trips.txt'],
        optional: ['routes.txt', 'calendar_dates.txt']
    },
    


    // Geocoding settings
    geocoding: {
        nominatimUrl: 'https://nominatim.openstreetmap.org/search',
        format: 'json',
        limit: 5,
        countrycodes: 'it', // Cerca solo in Italia
        'accept-language': 'it'
    }    
};

// Stato globale dell'applicazione
const APP_STATE = {
    // Dati GTFS
    data: {
        allStops: [],
        allShapes: {},
        allTrips: {},
        allRoutes: {}
    },

    // Stato della ricerca
    search: {
        nearStartStops: [],
        nearEndStops: [],
        currentRadius: CONFIG.defaults.radius,
        currentLineWidth: CONFIG.defaults.lineWidth,
        // Aggiungi queste proprietà
        showStartLines: false,
        showEndLines: false,
        startShapes: null,  // Per salvare le shapes della partenza
        endShapes: null     // Per salvare le shapes dell'arrivo
    },
    // Stato dei click e dei marker
    ui: {
        clickCount: 0,
        startPoint: null,
        endPoint: null,
        startMarker: null,
        endMarker: null
    },

    // Dati delle linee disegnate
    lines: {
        drawnShapes: new Set(),
        shapeColors: {},
        routeColors: {},
        polylinesByShape: {},
        polylinesByRoute: {},
        polylinesByDirection: {}
    },
};

// Esporta la configurazione per l'uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, APP_STATE };
}