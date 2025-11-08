// Modulo per la gestione dell'interfaccia utente
const UIManager = {
    elements: {},

updateStatus: function(message, type = 'info') {
    if (this.elements.unifiedStatus && this.elements.statusText) {
        this.elements.statusText.textContent = message;

        // Rimuovi tutte le classi precedenti
        this.elements.unifiedStatus.className = 'unified-status';

        // Aggiungi la classe del tipo
        if (type) {
            this.elements.unifiedStatus.classList.add(type);
        }
    }

    // Log per debug
    console.log(`Status [${type}]: ${message}`);
},

    // Inizializza gli elementi DOM
    init: function() {
    this.elements = {
        zipFileInput: document.getElementById('zip-file-input'),
        remoteZipUrl: document.getElementById('remote-zip-url'),
        loadRemoteZipBtn: document.getElementById('load-remote-zip'),
        saveLocalZip: document.getElementById('save-local-zip'),
        radiusSlider: document.getElementById('radius-slider'),
        radiusValue: document.getElementById('radius-value'),
        lineWidthSlider: document.getElementById('line-width-slider'),
        lineWidthValue: document.getElementById('line-width-value'),
        startAddress: document.getElementById('start-address'),
        endAddress: document.getElementById('end-address'),
        searchStartAddress: document.getElementById('search-start-address'),
        searchEndAddress: document.getElementById('search-end-address'),
        startAddressResults: document.getElementById('start-address-results'),
        endAddressResults: document.getElementById('end-address-results'),
        searchButton: document.getElementById('search-button'),
        resetButton: document.getElementById('reset-button'),
        showStartLines: document.getElementById('show-start-lines'),
        showEndLines: document.getElementById('show-end-lines'),
        unifiedStatus: document.getElementById('unified-status'),
        statusText: document.getElementById('status-text'),
        searchResults: document.getElementById('search-results'),
        commonLinesList: document.getElementById('common-lines-list'),
        progressContainer: document.getElementById('progress-container'),
        progressFill: document.getElementById('progress-fill'),
        progressText: document.getElementById('progress-text'),
        downloadProgressContainer: document.getElementById('download-progress-container'),
        downloadProgressFill: document.getElementById('download-progress-fill'),
        downloadProgressText: document.getElementById('download-progress-text'),
        toggleResults: document.getElementById('toggle-results')
    };

        this.setupEventListeners();
    },


// Aggiungi queste nuove funzioni per il progress download
showDownloadProgress: function(show, text) {
    if (show) {
        this.elements.downloadProgressContainer.style.display = 'block';
        this.elements.downloadProgressText.textContent = text || 'Download in corso...';
        this.elements.downloadProgressFill.style.width = '0%';
    } else {
        this.elements.downloadProgressContainer.style.display = 'none';
    }
},

updateDownloadProgress: function(percent, text) {
    this.elements.downloadProgressFill.style.width = percent + '%';
    if (text) this.elements.downloadProgressText.textContent = text;
},

    // Configura i listener degli eventi

    setupEventListeners: function() {
        // Slider del raggio
        this.elements.radiusSlider.addEventListener('input', (e) => {
            APP_STATE.search.currentRadius = parseInt(e.target.value);
            this.elements.radiusValue.textContent = APP_STATE.search.currentRadius + ' m';

            if (APP_STATE.ui.startPoint) {
                MapManager.updateNearbyStops(APP_STATE.ui.startPoint, "start");
            }
            if (APP_STATE.ui.endPoint) {
                MapManager.updateNearbyStops(APP_STATE.ui.endPoint, "end");
            }
            // Rimuovi la ricerca automatica
        });

        // Slider dello spessore delle linee
        this.elements.lineWidthSlider.addEventListener('input', (e) => {
            APP_STATE.search.currentLineWidth = parseInt(e.target.value);
            this.elements.lineWidthValue.textContent = APP_STATE.search.currentLineWidth + ' px';
            MapManager.updateLineWidth();
        });

        // Carica file ZIP locale
        this.elements.zipFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.updateStatus("Caricamento file ZIP in corso...", "info");
                DataLoader.loadZipFile(file);
            }
        });

        // Carica file ZIP da URL
        this.elements.loadRemoteZipBtn.addEventListener('click', () => {
            const url = this.elements.remoteZipUrl.value.trim();
            if (url) {
                this.updateStatus("Download file ZIP da URL...", "info");
                DataLoader.loadZipFromUrl(url);
            } else {
                this.updateStatus("Inserisci un URL valido", "error");
            }
        });


        // Checkbox per linee partenza
this.elements.showStartLines.addEventListener('change', (e) => {
    APP_STATE.search.showStartLines = e.target.checked;

    if (APP_STATE.search.showStartLines || APP_STATE.search.showEndLines) {
        // Se almeno una checkbox è attiva, ridisegna le linee appropriate
        if (APP_STATE.search.showStartLines && APP_STATE.search.showEndLines) {
            // Entrambe attive - mostra tutte le linee
            const allShapes = new Set([
                ...(APP_STATE.search.startShapes || []),
                ...(APP_STATE.search.endShapes || [])
            ]);
            SearchEngine.redrawLines(allShapes, "both");
        } else if (APP_STATE.search.showStartLines) {
            // Solo partenza attiva
            SearchEngine.showLinesForStart();
        } else if (APP_STATE.search.showEndLines) {
            // Solo arrivo attivo
            SearchEngine.showLinesForEnd();
        }
    } else {
        // Nessuna checkbox attiva - pulisci tutto
        MapManager.layers.busLines.clearLayers();
        UIManager.updateCommonLinesList({});
        UIManager.updateStatus("Pronto");
    }
});

// Checkbox per linee arrivo
this.elements.showEndLines.addEventListener('change', (e) => {
    APP_STATE.search.showEndLines = e.target.checked;

    if (APP_STATE.search.showStartLines || APP_STATE.search.showEndLines) {
        // Se almeno una checkbox è attiva, ridisegna le linee appropriate
        if (APP_STATE.search.showStartLines && APP_STATE.search.showEndLines) {
            // Entrambe attive - mostra tutte le linee
            const allShapes = new Set([
                ...(APP_STATE.search.startShapes || []),
                ...(APP_STATE.search.endShapes || [])
            ]);
            SearchEngine.redrawLines(allShapes, "both");
        } else if (APP_STATE.search.showStartLines) {
            // Solo partenza attiva
            SearchEngine.showLinesForStart();
        } else if (APP_STATE.search.showEndLines) {
            // Solo arrivo attivo
            SearchEngine.showLinesForEnd();
        }
    } else {
        // Nessuna checkbox attiva - pulisci tutto
        MapManager.layers.busLines.clearLayers();
        UIManager.updateCommonLinesList({});
        UIManager.updateStatus("Pronto");
    }
});


        // Pulsante CERCA
    this.elements.searchButton.addEventListener('click', () => {
        if (APP_STATE.ui.startPoint && APP_STATE.ui.endPoint) {
            // Disabilita le checkbox quando si cerca linee in comune
            this.elements.showStartLines.checked = false;
            this.elements.showEndLines.checked = false;
            APP_STATE.search.showStartLines = false;
            APP_STATE.search.showEndLines = false;

            SearchEngine.findCommonBusLines();
        } else {
            this.updateStatus("Seleziona prima partenza e arrivo sulla mappa", "error");
        }
    });

    // Pulsante RESET
    this.elements.resetButton.addEventListener('click', () => {
        MapManager.resetApp();
    });

    // Ricerca indirizzo partenza
    this.elements.searchStartAddress.addEventListener('click', () => {
        this.searchAddress('start');
    });

    this.elements.startAddress.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            this.searchAddress('start');
        }
    });

    // Ricerca indirizzo arrivo
    this.elements.searchEndAddress.addEventListener('click', () => {
        this.searchAddress('end');
    });

    this.elements.endAddress.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            this.searchAddress('end');
        }
    });


    // Pulsante salva ZIP locale
    this.elements.saveLocalZip.addEventListener('click', () => {
        DataLoader.saveZipLocally();
    });    
    
    },
    
toggleSaveButton: function(enabled) {
    if (this.elements.saveLocalZip) {
        this.elements.saveLocalZip.disabled = !enabled;
        if (enabled) {
            this.elements.saveLocalZip.textContent = "Salva ZIP in locale";
        } else {
            this.elements.saveLocalZip.textContent = "Nessun file da salvare";
        }
    }
},    

    // Mostra/nasconde l'indicatore di progresso
    showProgress: function(show, text) {
        if (show) {
            this.elements.progressContainer.style.display = 'block';
            this.elements.progressText.textContent = text || 'Elaborazione in corso...';
            this.elements.progressFill.style.width = '0%';
        } else {
            this.elements.progressContainer.style.display = 'none';
        }
    },

    // Aggiorna l'indicatore di progresso
    updateProgress: function(percent, text) {
        this.elements.progressFill.style.width = percent + '%';
        if (text) this.elements.progressText.textContent = text;
    },

    // Aggiorna la visualizzazione dei risultati
    updateResultsDisplay: function() {
        const startCount = APP_STATE.search.nearStartStops.length;
        const endCount = APP_STATE.search.nearEndStops.length;

        if (startCount > 0 && endCount > 0) {
            this.elements.searchResults.textContent =
                startCount + " fermate vicine alla partenza, " + endCount + " fermate vicine all'arrivo";
        } else if (startCount > 0) {
            this.elements.searchResults.textContent = startCount + " fermate vicine alla partenza";
        } else if (endCount > 0) {
            this.elements.searchResults.textContent = endCount + " fermate vicine all'arrivo";
        } else {
            this.elements.searchResults.textContent =
                "Nessuna fermata trovata nel raggio di " + APP_STATE.search.currentRadius + " metri";
        }
    },

    // Aggiorna la lista delle linee in comune
    updateCommonLinesList: function(groupedRoutes) {
        if (Object.keys(groupedRoutes).length === 0) {
            this.elements.commonLinesList.innerHTML = "Nessuna linea trovata";
        } else {
            let html = '';
            for (const routeId in groupedRoutes) {
                html += '<div class="route-group">';
                html += '<div class="route-header" data-route="' + routeId + '">Linea: ' + routeId;

                if (APP_STATE.data.allRoutes[routeId] && APP_STATE.data.allRoutes[routeId].longName) {
                    html += ' - ' + APP_STATE.data.allRoutes[routeId].longName;
                }
                html += '</div>';
                html += '<div class="directions-list">';

                for (const headsign in groupedRoutes[routeId]) {
                    html += '<div class="direction-group">';
                    html += '<div class="direction-header" data-direction="' + routeId + '_' + headsign +
                           '">Direzione: ' + headsign + '</div>';
                    html += '<div class="segments-list">';

                    const shapeIds = Array.from(groupedRoutes[routeId][headsign]);
                    shapeIds.forEach((shapeId) => {
                        html += '<div class="segment-item" data-shape="' + shapeId + '">' + shapeId + '</div>';
                    });

                    html += '</div></div>';
                }

                html += '</div></div>';
            }
            this.elements.commonLinesList.innerHTML = html;

            this.addInteractivityEvents();

            // Aggiorna i risultati
            const totalRoutes = Object.keys(groupedRoutes).length;
            let totalSegments = 0;
            for (const routeId in groupedRoutes) {
                for (const headsign in groupedRoutes[routeId]) {
                    totalSegments += groupedRoutes[routeId][headsign].size;
                }
            }

            this.elements.searchResults.textContent =
                APP_STATE.search.nearStartStops.length + " fermate partenza, " +
                APP_STATE.search.nearEndStops.length + " fermate arrivo, " +
                totalRoutes + " linee, " + totalSegments + " segmenti";
        }
    },

    // Aggiunge gli eventi di interattività
    addInteractivityEvents: function() {
        // Route headers
        document.querySelectorAll('.route-header').forEach((header) => {
            header.addEventListener('mouseover', function() {
                MapManager.highlightRoute(this.getAttribute('data-route'));
            });
            header.addEventListener('mouseout', () => MapManager.resetHighlight());
        });

        // Direction headers
        document.querySelectorAll('.direction-header').forEach((header) => {
            header.addEventListener('mouseover', function() {
                MapManager.highlightDirection(this.getAttribute('data-direction'));
            });
            header.addEventListener('mouseout', () => MapManager.resetHighlight());
        });

        // Segment items
        document.querySelectorAll('.segment-item').forEach((item) => {
            item.addEventListener('mouseover', function() {
                MapManager.highlightShape(this.getAttribute('data-shape'));
            });
            item.addEventListener('mouseout', () => MapManager.resetHighlight());
        });
    },

    // Resetta l'UI
    resetUI: function() {
        this.elements.searchResults.textContent = "Nessuna ricerca effettuata";
        this.elements.commonLinesList.innerHTML = "Nessuna linea trovata";
    },
    
// Nuova funzione per cercare indirizzi
searchAddress: async function(type) {
    const inputElement = type === 'start' ? this.elements.startAddress : this.elements.endAddress;
    const resultsElement = type === 'start' ? this.elements.startAddressResults : this.elements.endAddressResults;
    const query = inputElement.value.trim();

    if (!query) {
        this.updateStatus("Inserisci un indirizzo da cercare", "warning");
        return;
    }

    this.updateStatus("Ricerca indirizzo in corso...", "info");

    try {
console.log(CONFIG)    
        const response = await fetch(
            `${CONFIG.geocoding.nominatimUrl}?` +
            `q=${encodeURIComponent(query)}&` +
            `format=${CONFIG.geocoding.format}&` +
            `limit=${CONFIG.geocoding.limit}&` +
            `countrycodes=${CONFIG.geocoding.countrycodes}&` +
            `accept-language=${CONFIG.geocoding['accept-language']}`
        );

        if (!response.ok) {
            throw new Error('Errore nella ricerca indirizzo');
        }

        const results = await response.json();
        
        if (results.length === 0) {
            this.updateStatus("Nessun risultato trovato per: " + query, "warning");
            resultsElement.style.display = 'none';
            return;
        }

        // Mostra risultati
        this.displayAddressResults(results, resultsElement, type);
        this.updateStatus(`Trovati ${results.length} risultati per: ${query}`, "success");

    } catch (error) {
        console.error('Errore ricerca indirizzo:', error);
        this.updateStatus("Errore nella ricerca indirizzo", "error");
    }
},

// Mostra i risultati della ricerca
displayAddressResults: function(results, resultsElement, type) {
    let html = '';
    
    results.forEach((result, index) => {
        html += `
            <div class="address-result-item" data-lat="${result.lat}" data-lon="${result.lon}">
                <div class="address-result-name">${result.display_name.split(',')[0]}</div>
                <div class="address-result-address">${result.display_name}</div>
            </div>
        `;
    });
    
    resultsElement.innerHTML = html;
    resultsElement.style.display = 'block';
    
    // Aggiungi listener ai risultati
    resultsElement.querySelectorAll('.address-result-item').forEach(item => {
        item.addEventListener('click', () => {
            this.selectAddressResult(
                parseFloat(item.getAttribute('data-lat')),
                parseFloat(item.getAttribute('data-lon')),
                item.querySelector('.address-result-address').textContent,
                type
            );
        });
    });
},

// Seleziona un risultato della ricerca
selectAddressResult: function(lat, lon, address, type) {
    const latlng = L.latLng(lat, lon);
    
    if (type === 'start') {
        // Simula click sulla mappa per partenza
        APP_STATE.ui.clickCount = 1;
        APP_STATE.ui.startPoint = latlng;
        MapManager.createStartMarker(latlng);
        MapManager.updateNearbyStops(latlng, "start");
        this.elements.startAddressResults.style.display = 'none';
        this.elements.startAddress.value = address.split(',')[0]; // Mostra solo il nome principale
        this.updateStatus("Partenza impostata: " + address, "success");
    } else {
        // Simula click sulla mappa per arrivo
        APP_STATE.ui.clickCount = 2;
        APP_STATE.ui.endPoint = latlng;
        MapManager.createEndMarker(latlng);
        MapManager.updateNearbyStops(latlng, "end");
        this.elements.endAddressResults.style.display = 'none';
        this.elements.endAddress.value = address.split(',')[0]; // Mostra solo il nome principale
        this.updateStatus("Arrivo impostato: " + address, "success");
    }
    
    // Centra la mappa sulla posizione selezionata
    MapManager.map.setView(latlng, 16);
}    
};