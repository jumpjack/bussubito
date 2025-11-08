// Modulo per la gestione della mappa e dei layer
const MapManager = {
    map: null,
    layers: {},

    // Inizializza la mappa
    init: function() {
        // Crea la mappa
        this.map = L.map('map').setView(CONFIG.map.defaultCenter, CONFIG.map.defaultZoom);

        // Aggiungi il tile layer
        L.tileLayer(CONFIG.map.tileLayerUrl, {
            attribution: CONFIG.map.tileLayerAttribution,
            subdomains: CONFIG.map.tileLayerSubdomains,
            maxZoom: CONFIG.map.maxZoom
        }).addTo(this.map);

        // Inizializza i layer
        this.layers = {
            start: L.layerGroup().addTo(this.map),
            end: L.layerGroup().addTo(this.map),
            stops: L.layerGroup().addTo(this.map),
            searchRadius: L.layerGroup().addTo(this.map),
            busLines: L.layerGroup().addTo(this.map)
        };

        // Aggiungi listener per i click sulla mappa
        this.map.on('click', this.handleMapClick.bind(this));
        this.layers.busLines.on('click', function(e) {
            e.originalEvent.stopPropagation();
        });
    },

    // Gestisce i click sulla mappa
    handleMapClick: function(e) {
        APP_STATE.ui.clickCount++;

        if (APP_STATE.ui.clickCount === 1) {
            // Primo click: imposta la partenza
            this.resetSearch();
            APP_STATE.ui.startPoint = e.latlng;
            this.createStartMarker(e.latlng);
            this.updateNearbyStops(e.latlng, "start");
            UIManager.updateStatus("Ora seleziona l'ARRIVO (secondo click)", '#e2f0ff');

            // Reset checkbox
            UIManager.elements.showStartLines.checked = false;
            UIManager.elements.showEndLines.checked = false;
            APP_STATE.search.showStartLines = false;
            APP_STATE.search.showEndLines = false;
        } else if (APP_STATE.ui.clickCount === 2) {
            // Secondo click: imposta l'arrivo (SENZA avviare ricerca automatica)
            APP_STATE.ui.endPoint = e.latlng;
            this.createEndMarker(e.latlng);
            this.updateNearbyStops(e.latlng, "end");
            UIManager.updateStatus("Partenza e arrivo selezionati. Usa i controlli per visualizzare le linee.", '#ffe2e2');

            // Reset checkbox
            UIManager.elements.showStartLines.checked = false;
            UIManager.elements.showEndLines.checked = false;
            APP_STATE.search.showStartLines = false;
            APP_STATE.search.showEndLines = false;
        }
    },

resetApp: function() {
    if (confirm("Sei sicuro di voler resettare? Tutti i dati verranno cancellati.")) {
        // PRIMA: Pulisci tutte le fermate delle linee
        SearchEngine.clearAllLineStops();
        
        // POI: Resetta tutto il resto
        this.resetSearch();
        APP_STATE.ui.clickCount = 0;
        APP_STATE.ui.startPoint = null;
        APP_STATE.ui.endPoint = null;
        APP_STATE.ui.startMarker = null;
        APP_STATE.ui.endMarker = null;
        
        // Reset caselle di ricerca indirizzi
        UIManager.elements.startAddress.value = '';
        UIManager.elements.endAddress.value = '';
        UIManager.elements.startAddressResults.style.display = 'none';
        UIManager.elements.endAddressResults.style.display = 'none';
        
        UIManager.updateStatus("Pronto - Carica un file ZIP GTFS per iniziare", "info");
    }
},
    // Crea il marker di partenza
    createStartMarker: function(latlng) {
        const startIcon = L.divIcon({
            className: 'start-marker-container',
            html: '<div class="start-marker">PARTENZA</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        APP_STATE.ui.startMarker = L.marker(latlng, {
            icon: startIcon,
            draggable: true
        }).addTo(this.layers.start);

        APP_STATE.ui.startMarker.on('dragend', (e) => {
            APP_STATE.ui.startPoint = e.target.getLatLng();
            this.updateNearbyStops(APP_STATE.ui.startPoint, "start");
            //if (APP_STATE.ui.endPoint) SearchEngine.findCommonBusLines();
        });
    },

    // Crea il marker di arrivo
    createEndMarker: function(latlng) {
        const endIcon = L.divIcon({
            className: 'end-marker-container',
            html: '<div class="end-marker">ARRIVO</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        APP_STATE.ui.endMarker = L.marker(latlng, {
            icon: endIcon,
            draggable: true
        }).addTo(this.layers.end);

        APP_STATE.ui.endMarker.on('dragend', (e) => {
            APP_STATE.ui.endPoint = e.target.getLatLng();
            this.updateNearbyStops(APP_STATE.ui.endPoint, "end");
            if (APP_STATE.ui.startPoint) SearchEngine.findCommonBusLines();
        });
    },

    // Aggiorna le fermate vicine
    updateNearbyStops: function(center, type) {
        this.layers.stops.clearLayers();
        this.layers.searchRadius.clearLayers();

        const circleColor = type === "start" ? CONFIG.markerColors.start : CONFIG.markerColors.end;
        L.circle(center, {
            color: circleColor,
            fillColor: circleColor,
            fillOpacity: 0.1,
            radius: APP_STATE.search.currentRadius
        }).addTo(this.layers.searchRadius);

        const nearbyStops = [];
        APP_STATE.data.allStops.forEach((stop) => {
            const distance = this.map.distance(center, [stop.lat, stop.lon]);
            if (distance <= APP_STATE.search.currentRadius) {
                nearbyStops.push({ stop: stop, distance: distance });
            }
        });

        if (type === "start") {
            APP_STATE.search.nearStartStops = nearbyStops;
        } else {
            APP_STATE.search.nearEndStops = nearbyStops;
        }

        this.updateStopMarkers();
        UIManager.updateResultsDisplay();
    },

    // Aggiorna i marker delle fermate
    updateStopMarkers: function() {
        this.layers.stops.clearLayers();
        const stopIcon = L.divIcon({
            className: 'stop-marker-container',
            html: '<div class="stop-marker"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        APP_STATE.search.nearStartStops.forEach((item) => {
            const stop = item.stop;
            L.marker([stop.lat, stop.lon], { icon: stopIcon })
                .addTo(this.layers.stops)
                .bindTooltip(stop.name + " (" + item.distance.toFixed(0) + "m dalla partenza)", { permanent: false });
        });

        APP_STATE.search.nearEndStops.forEach((item) => {
            const stop = item.stop;
            L.marker([stop.lat, stop.lon], { icon: stopIcon })
                .addTo(this.layers.stops)
                .bindTooltip(stop.name + " (" + item.distance.toFixed(0) + "m dall'arrivo)", { permanent: false });
        });
    },

    // Resetta la ricerca
    resetSearch: function() {
        this.layers.stops.clearLayers();
        this.layers.start.clearLayers();
        this.layers.end.clearLayers();
        this.layers.searchRadius.clearLayers();
        this.layers.busLines.clearLayers();

        APP_STATE.search.nearStartStops = [];
        APP_STATE.search.nearEndStops = [];
        APP_STATE.lines.drawnShapes.clear();
        APP_STATE.lines.shapeColors = {};
        APP_STATE.lines.routeColors = {};
        APP_STATE.lines.polylinesByShape = {};
        APP_STATE.lines.polylinesByRoute = {};
        APP_STATE.lines.polylinesByDirection = {};

        UIManager.resetUI();
    },

    // Aggiorna lo spessore delle linee
    updateLineWidth: function() {
        this.layers.busLines.eachLayer((layer) => {
            if (!layer.isHighlighted) {
                layer.setStyle({ weight: APP_STATE.search.currentLineWidth });
            }
        });
    },

    // Evidenzia una route
    highlightRoute: function(routeId) {
        this.resetHighlight();
        const polylines = APP_STATE.lines.polylinesByRoute[routeId] || [];
        polylines.forEach((polyline) => {
            polyline.setStyle({
                color: CONFIG.markerColors.highlight,
                weight: APP_STATE.search.currentLineWidth + 3,
                opacity: 1
            });
            polyline.bringToFront();
            polyline.isHighlighted = true;
        });
    },

    // Evidenzia una direzione
    highlightDirection: function(directionKey) {
        this.resetHighlight();
        const polylines = APP_STATE.lines.polylinesByDirection[directionKey] || [];
        polylines.forEach((polyline) => {
            polyline.setStyle({
                color: CONFIG.markerColors.highlight,
                weight: APP_STATE.search.currentLineWidth + 2,
                opacity: 1
            });
            polyline.bringToFront();
            polyline.isHighlighted = true;
        });
    },

    // Evidenzia un segmento
    highlightShape: function(shapeId) {
        this.resetHighlight();
        const polyline = APP_STATE.lines.polylinesByShape[shapeId];
        if (polyline) {
            polyline.setStyle({
                color: CONFIG.markerColors.highlight,
                weight: APP_STATE.search.currentLineWidth + 2,
                opacity: 1
            });
            polyline.bringToFront();
            polyline.isHighlighted = true;
        }
    },

    // Resetta l'evidenziazione
    resetHighlight: function() {
        this.layers.busLines.eachLayer((layer) => {
            if (layer.isHighlighted) {
                const originalColor = APP_STATE.lines.shapeColors[layer.shapeId] || '#3498db';
                layer.setStyle({
                    color: originalColor,
                    weight: APP_STATE.search.currentLineWidth,
                    opacity: 0.7
                });
                layer.isHighlighted = false;
            }
        });
    }
};