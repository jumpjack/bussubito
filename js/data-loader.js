// Modulo per il caricamento e il parsing dei dati GTFS
let downloadedBlob = null;

const DataLoader = {
    // Funzione per parsare il CSV
    parseCSV: function(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return [];

        const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
        const result = {
            headers: headers,
            data: []
        };

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;

            const tokens = [];
            let inQuotes = false;
            let currentToken = '';

            for (let j = 0; j < line.length; j++) {
                const char = line[j];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    tokens.push(currentToken.trim().replace(/^"|"$/g, ''));
                    currentToken = '';
                } else {
                    currentToken += char;
                }
            }

            tokens.push(currentToken.trim().replace(/^"|"$/g, ''));

            // Crea un oggetto con i dati mappati per header
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = tokens[index] || '';
            });

            result.data.push(rowData);
        }

        return result;
    },

// Funzione per caricare i dati delle fermate
loadStopsData: function(parsedData) {
    APP_STATE.data.allStops = [];
    APP_STATE.search.nearStartStops = [];
    APP_STATE.search.nearEndStops = [];

    let count = 0;
    parsedData.data.forEach(function(stop) {
        // Usa i nomi delle colonne invece delle posizioni fisse
        const stopId = stop.stop_id || '';
        const stopCode = stop.stop_code || '';
        const stopName = stop.stop_name || '';
        const stopDesc = stop.stop_desc || '';
        const stopLat = parseFloat(stop.stop_lat);
        const stopLon = parseFloat(stop.stop_lon);

        if (isNaN(stopLat) || isNaN(stopLon)) {
            console.warn('Coordinate non valide per la fermata:', stopName);
            return;
        }

        APP_STATE.data.allStops.push({
            id: stopId,
            code: stopCode,
            name: stopName,
            desc: stopDesc,
            lat: stopLat,
            lon: stopLon
        });
        count++;
    });

    console.log(count + " fermate caricate da stops.txt");
    console.log("Colonne trovate:", parsedData.headers);
    return count;
},

// Funzione per caricare i dati delle shapes
loadShapesData: function(parsedData) {
    APP_STATE.data.allShapes = {};
    let count = 0;

    parsedData.data.forEach(function(shape) {
        // Usa i nomi delle colonne invece delle posizioni fisse
        const shapeId = shape.shape_id || '';
        const shapePtLat = parseFloat(shape.shape_pt_lat);
        const shapePtLon = parseFloat(shape.shape_pt_lon);
        const shapePtSequence = parseInt(shape.shape_pt_sequence) || 0;
        const shapeDistTraveled = shape.shape_dist_traveled ? parseFloat(shape.shape_dist_traveled) : null;

        if (isNaN(shapePtLat) || isNaN(shapePtLon)) return;

        if (!APP_STATE.data.allShapes[shapeId]) {
            APP_STATE.data.allShapes[shapeId] = [];
        }

        APP_STATE.data.allShapes[shapeId].push({
            lat: shapePtLat,
            lon: shapePtLon,
            sequence: shapePtSequence,
            dist: shapeDistTraveled
        });
        count++;
    });

    // Ordina i punti per sequenza
    for (const shapeId in APP_STATE.data.allShapes) {
        APP_STATE.data.allShapes[shapeId].sort((a, b) => a.sequence - b.sequence);
    }

    console.log("Caricate " + Object.keys(APP_STATE.data.allShapes).length + " shapes con " + count + " punti");
    console.log("Colonne shapes trovate:", parsedData.headers);
    return Object.keys(APP_STATE.data.allShapes).length;
},

// Funzione per caricare i dati dei trips
loadTripsData: function(parsedData) {
    APP_STATE.data.allTrips = {};
    let count = 0;

    console.log("=== CARICAMENTO TRIPS ===");
    console.log("Colonne trips trovate:", parsedData.headers);

    parsedData.data.forEach(function(trip, index) {
        // Usa i nomi delle colonne invece delle posizioni fisse
        const routeId = trip.route_id || '';
        const serviceId = trip.service_id || '';
        const tripId = trip.trip_id || '';
        const tripHeadsign = trip.trip_headsign || '';
        const tripShortName = trip.trip_short_name || '';
        const directionId = trip.direction_id || '';
        const blockId = trip.block_id || '';
        const shapeId = trip.shape_id || '';

        if (!shapeId) {
            console.warn(`Trip ${tripId} senza shape_id, skip`);
            return; // Skip trips senza shape_id
        }

        if (!APP_STATE.data.allTrips[shapeId]) {
            APP_STATE.data.allTrips[shapeId] = [];
        }

        APP_STATE.data.allTrips[shapeId].push({
            routeId: routeId,
            tripHeadsign: tripHeadsign,
            tripShortName: tripShortName
        });
        count++;

        // Log dei primi 5 trips per debug
        if (index < 5) {
            console.log(`Trip esempio ${index+1}: shapeId="${shapeId}", routeId="${routeId}", shortName="${tripShortName}", headsign="${tripHeadsign}"`);
        }
    });

    console.log("Caricati " + count + " trips per " + Object.keys(APP_STATE.data.allTrips).length + " shapes");
    return count;
},

// Funzione per caricare i dati delle routes
loadRoutesData: function(parsedData) {
    APP_STATE.data.allRoutes = {};
    let count = 0;

    parsedData.data.forEach(function(route) {
        // Usa i nomi delle colonne invece delle posizioni fisse
        const routeId = route.route_id || '';
        const routeShortName = route.route_short_name || '';
        const routeLongName = route.route_long_name || '';
        const routeDesc = route.route_desc || '';
        const routeType = route.route_type || '';
        const routeColor = route.route_color || '';
        const routeTextColor = route.route_text_color || '';

        APP_STATE.data.allRoutes[routeId] = {
            shortName: routeShortName,
            longName: routeLongName,
            desc: routeDesc,
            type: routeType,
            color: routeColor,
            textColor: routeTextColor
        };
        count++;
    });

    console.log("Caricate " + count + " routes");
    console.log("Colonne routes trovate:", parsedData.headers);
    return count;
},

    // Funzione per caricare un file ZIP
    loadZipFile: async function(zipFile) {
        try {
            const zip = await JSZip.loadAsync(zipFile);
            await DataLoader.processZipContents(zip);
        } catch (error) {
            UIManager.updateStatus("Errore nel caricamento del file ZIP: " + error.message, "error");
            console.error("Errore nel caricamento ZIP:", error);
        }
    },

// Funzione per caricare un file ZIP da URL
loadZipFromUrl: async function(url) {
    try {
        UIManager.updateStatus("Download in corso...", "info");
        UIManager.showDownloadProgress(true, "Connessione al server...");
        UIManager.toggleSaveButton(false); // Disabilita salvataggio durante download

        // Costruisci l'URL del proxy
        const proxyUrl = `https://win98.altervista.org/space/exploration/myp.php?pass=miapass&mode=native&url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        // Ottieni la dimensione totale del file
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10);
        let loaded = 0;

        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            loaded += value.length;
            
            // Aggiorna il progresso
            if (total) {
                const percent = Math.round((loaded / total) * 100);
                UIManager.updateDownloadProgress(percent, `Download: ${this.formatBytes(loaded)} / ${this.formatBytes(total)}`);
            } else {
                UIManager.updateDownloadProgress(0, `Download: ${this.formatBytes(loaded)}`);
            }
        }

        // Crea il blob da tutti i chunk
        downloadedBlob = new Blob(chunks);
        UIManager.updateDownloadProgress(100, "Download completato, elaborazione in corso...");
        
        UIManager.updateStatus("File scaricato, elaborazione in corso...", "info");

        const zip = await JSZip.loadAsync(downloadedBlob);
        await DataLoader.processZipContents(zip);
        
        UIManager.showDownloadProgress(false);
        UIManager.toggleSaveButton(true); // Abilita salvataggio dopo elaborazione

    } catch (error) {
        UIManager.showDownloadProgress(false);
        UIManager.toggleSaveButton(false);
        UIManager.updateStatus("Errore nel caricamento da URL: " + error.message, "error");
        console.error("Errore nel caricamento da URL:", error);
    }
},

// Aggiungi funzione per salvare il file localmente
saveZipLocally: function() {
    if (!downloadedBlob) {
        UIManager.updateStatus("Nessun file da salvare", "warning");
        return;
    }

    try {
        // Crea un URL per il blob
        const blobUrl = URL.createObjectURL(downloadedBlob);
        
        // Crea un link per il download
        const a = document.createElement('a');
        a.href = blobUrl;
        
        // Estrai il nome file dall'URL o usa un nome di default
        const url = UIManager.elements.remoteZipUrl.value.trim();
        let fileName = 'gtfs_data.zip';
        if (url) {
            const urlParts = url.split('/');
            const lastPart = urlParts[urlParts.length - 1];
            if (lastPart && lastPart.endsWith('.zip')) {
                fileName = lastPart;
            }
        }
        
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Rilascia l'URL
        URL.revokeObjectURL(blobUrl);
        
        UIManager.updateStatus(`File salvato come: ${fileName}`, "success");
        
    } catch (error) {
        UIManager.updateStatus("Errore nel salvataggio del file: " + error.message, "error");
        console.error("Errore nel salvataggio:", error);
    }
},

// Funzione helper per formattare i byte
formatBytes: function(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
},

    // Funzione per processare i contenuti del file ZIP
    processZipContents: async function(zip) {
        try {
            // Reset dei dati precedenti
            MapManager.resetSearch();

            const requiredFiles = CONFIG.gtfsFiles.required;
            const optionalFiles = CONFIG.gtfsFiles.optional;
            let loadedFiles = 0;
            const totalFiles = requiredFiles.length + optionalFiles.length;

            // Processa file richiesti
            for (const fileName of requiredFiles) {
                if (zip.file(fileName)) {
                    await DataLoader.processFileFromZip(zip, fileName);
                    loadedFiles++;
                    UIManager.updateStatus(`File caricati: ${loadedFiles}/${totalFiles} - ${fileName}`, "info");
                } else {
                    throw new Error(`File richiesto mancante: ${fileName}`);
                }
            }

            // Processa file opzionali
            for (const fileName of optionalFiles) {
                if (zip.file(fileName)) {
                    await DataLoader.processFileFromZip(zip, fileName);
                    loadedFiles++;
                    UIManager.updateStatus(`File caricati: ${loadedFiles}/${totalFiles} - ${fileName}`, "info");
                }
            }

            UIManager.updateStatus(`Caricamento completato! ${loadedFiles} file elaborati.`, "success");
            UIManager.updateStatus("Dati GTFS caricati con successo! Clicca sulla mappa per selezionare partenza e arrivo.", "success");

        } catch (error) {
            UIManager.updateStatus("Errore nell'elaborazione del ZIP: " + error.message, "error");
            console.error("Errore nell'elaborazione ZIP:", error);
        }
    },

    // Funzione per processare un singolo file dal ZIP
    processFileFromZip: async function(zip, fileName) {
        try {
            const file = zip.file(fileName);
            if (!file) return;

            const content = await file.async('text');
            const parsedData = DataLoader.parseCSV(content);

            switch (fileName) {
                case 'stops.txt':
                    DataLoader.loadStopsData(parsedData);
                    break;
                case 'shapes.txt':
                    DataLoader.loadShapesData(parsedData);
                    break;
                case 'trips.txt':
                    DataLoader.loadTripsData(parsedData);
                    break;
                case 'routes.txt':
                    DataLoader.loadRoutesData(parsedData);
                    break;
                case 'calendar_dates.txt':
                    console.log("calendar_dates.txt caricato:", parsedData.data.length, "righe");
                    console.log("Colonne calendar_dates trovate:", parsedData.headers);
                    break;
            }
        } catch (error) {
            console.error(`Errore nell'elaborazione di ${fileName}:`, error);
            throw error;
        }
    }
};