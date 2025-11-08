// Modulo per la ricerca e il disegno delle linee
const SearchEngine = {
    // Trova e disegna le linee in comune
// Trova e disegna le linee in comune
findCommonBusLines: function() {
    if (Object.keys(APP_STATE.data.allShapes).length === 0) {
        UIManager.updateStatus("File shapes.txt non trovato nel ZIP", "error");
        return;
    }

    UIManager.updateStatus("Ricerca linee in comune...", "info");
    UIManager.showProgress(true, "Ricerca linee in comune...");

    setTimeout(() => {
        console.log("=== INIZIO RICERCA LINEE IN COMUNE ===");
        
        const startShapes = new Set();
        console.log(`Analisi ${APP_STATE.search.nearStartStops.length} fermate partenza:`);
        APP_STATE.search.nearStartStops.forEach((item, index) => {
            console.log(`Fermata partenza ${index+1}: ${item.stop.name} (${item.stop.id})`);
            const shapesBefore = startShapes.size;
            this.findShapesForStop(item.stop, startShapes);
            console.log(`  Trovate ${startShapes.size - shapesBefore} nuove shapes per questa fermata`);
            UIManager.updateProgress(
                (index / APP_STATE.search.nearStartStops.length) * 50,
                `Analisi fermate partenza: ${index+1}/${APP_STATE.search.nearStartStops.length}`
            );
        });

        const endShapes = new Set();
        console.log(`Analisi ${APP_STATE.search.nearEndStops.length} fermate arrivo:`);
        APP_STATE.search.nearEndStops.forEach((item, index) => {
            console.log(`Fermata arrivo ${index+1}: ${item.stop.name} (${item.stop.id})`);
            const shapesBefore = endShapes.size;
            this.findShapesForStop(item.stop, endShapes);
            console.log(`  Trovate ${endShapes.size - shapesBefore} nuove shapes per questa fermata`);
            UIManager.updateProgress(
                50 + (index / APP_STATE.search.nearEndStops.length) * 50,
                `Analisi fermate arrivo: ${index+1}/${APP_STATE.search.nearEndStops.length}`
            );
        });

        // SALVA LE SHAPES TROVATE PER PARTENZA E ARRIVO
        APP_STATE.search.startShapes = startShapes;
        APP_STATE.search.endShapes = endShapes;

        console.log(`=== RISULTATI SHAPES ===`);
        console.log(`Shapes partenza totali: ${startShapes.size}`, Array.from(startShapes));
        console.log(`Shapes arrivo totali: ${endShapes.size}`, Array.from(endShapes));

        // Trova l'intersezione tra le shapes di partenza e arrivo
        const commonShapes = new Set();
        startShapes.forEach((shapeId) => {
            if (endShapes.has(shapeId)) {
                commonShapes.add(shapeId);
                console.log(`Shape in comune: ${shapeId}`);
            }
        });

        console.log(`Shapes in comune totali: ${commonShapes.size}`, Array.from(commonShapes));

        MapManager.layers.busLines.clearLayers();
        APP_STATE.lines.drawnShapes.clear();
        APP_STATE.lines.polylinesByShape = {};
        APP_STATE.lines.polylinesByRoute = {};
        APP_STATE.lines.polylinesByDirection = {};

        if (commonShapes.size === 0) {
            console.log("=== NESSUNA LINEA IN COMUNE TROVATA ===");
            UIManager.updateProgress(100, "Nessuna linea in comune trovata");
            UIManager.updateCommonLinesList({});
            UIManager.updateStatus("Nessuna linea in comune trovata tra partenza e arrivo", "warning");
        } else {
            console.log("=== ANALISI TRIPS PER SHAPES IN COMUNE ===");
            const groupedRoutes = this.groupShapesByRoute(commonShapes);
            this.assignRouteColors(groupedRoutes);
            this.drawAllRoutes(groupedRoutes);

            UIManager.updateProgress(100, "Completato");
            UIManager.updateCommonLinesList(groupedRoutes);
            UIManager.updateStatus(`Trovate ${Object.keys(groupedRoutes).length} linee in comune con ${commonShapes.size} segmenti`, "success");
        }

        console.log("=== FINE RICERCA LINEE IN COMUNE ===");
        setTimeout(() => { UIManager.showProgress(false); }, 1000);
    }, 100);
},



    // Trova le linee che passano per la partenza
// Mostra tutte le linee che passano per la partenza
showLinesForStart: function() {
    if (!APP_STATE.search.startShapes || APP_STATE.search.startShapes.size === 0) {
        UIManager.updateStatus("Nessuna linea trovata per la partenza", "info");
        return;
    }

    // NON pulire i layer, ma gestire le shapes da disegnare
    const shapesToDraw = new Set(APP_STATE.search.startShapes);

    // Se anche le linee per arrivo sono attive, unisci le shapes
    if (APP_STATE.search.showEndLines) {
        APP_STATE.search.endShapes.forEach(shapeId => shapesToDraw.add(shapeId));
    }

    this.redrawLines(shapesToDraw, "start");
},

// Mostra tutte le linee che passano per l'arrivo
showLinesForEnd: function() {
    if (!APP_STATE.search.endShapes || APP_STATE.search.endShapes.size === 0) {
        UIManager.updateStatus("Nessuna linea trovata per l'arrivo", "info");
        return;
    }

    // NON pulire i layer, ma gestire le shapes da disegnare
    const shapesToDraw = new Set(APP_STATE.search.endShapes);

    // Se anche le linee per partenza sono attive, unisci le shapes
    if (APP_STATE.search.showStartLines) {
        APP_STATE.search.startShapes.forEach(shapeId => shapesToDraw.add(shapeId));
    }

    this.redrawLines(shapesToDraw, "end");
},

// Funzione helper per ridisegnare le linee senza cancellare tutto
redrawLines: function(shapesToDraw, source) {
    // PRIMA: Pulisci tutte le fermate delle linee precedenti
    this.clearAllLineStops();

    // POI: Pulisci le linee esistenti
    MapManager.layers.busLines.clearLayers();
    APP_STATE.lines.drawnShapes.clear();
    APP_STATE.lines.polylinesByShape = {};
    APP_STATE.lines.polylinesByRoute = {};
    APP_STATE.lines.polylinesByDirection = {};

    const groupedRoutes = this.groupShapesByRoute(shapesToDraw);
    this.assignRouteColors(groupedRoutes);
    this.drawAllRoutes(groupedRoutes);

    // Aggiorna la lista con tutte le linee visibili
    UIManager.updateCommonLinesList(groupedRoutes);

    // Aggiorna la barra di stato
    let statusText = "";
    if (APP_STATE.search.showStartLines && APP_STATE.search.showEndLines) {
        statusText = "Mostrate tutte le linee che passano per PARTENZA e ARRIVO";
    } else if (APP_STATE.search.showStartLines) {
        statusText = "Mostrate le linee che passano per PARTENZA";
    } else if (APP_STATE.search.showEndLines) {
        statusText = "Mostrate le linee che passano per ARRIVO";
    }
    UIManager.updateStatus(statusText);
},

// Pulisce tutte le fermate delle linee
clearAllLineStops: function() {
    MapManager.layers.busLines.eachLayer((layer) => {
        if (layer.isShowingStops && layer.stopMarkers) {
            layer.hideLineStops();
        }
    });
},



// Trova le shape per una fermata
findShapesForStop: function(stop, shapesSet) {
    let shapesFound = 0;
    
    for (const shapeId in APP_STATE.data.allShapes) {
        const shapePoints = APP_STATE.data.allShapes[shapeId];
        let isNearShape = false;
        
        for (let i = 0; i < shapePoints.length; i++) {
            const point = shapePoints[i];
            const distance = MapManager.map.distance([stop.lat, stop.lon], [point.lat, point.lon]);
            if (distance < CONFIG.defaults.stopProximity) {
                isNearShape = true;
                shapesFound++;
                break; // Esci dal loop interno, ma continua a cercare altre shape
            }
        }
        
        if (isNearShape) {
            shapesSet.add(shapeId);
        }
    }
    
    console.log(`    Fermata ${stop.name}: trovate ${shapesFound} shapes vicine`);
},


    // Raggruppa le shape per route e direzione
groupShapesByRoute: function(commonShapes) {
    const groupedRoutes = {};

    console.log(`Analisi ${commonShapes.size} shapes in comune:`);
    
    commonShapes.forEach((shapeId) => {
        const trips = APP_STATE.data.allTrips[shapeId] || [];
        
        console.log(`Shape ${shapeId}: ${trips.length} trips associati`);
        
        if (trips.length === 0) {
            console.warn(`  Shape ${shapeId} senza trips associati`);
            return;
        }

        trips.forEach((trip, tripIndex) => {
            const routeId = trip.routeId || 'SENZA_ROUTE_ID';
            const headsign = trip.tripHeadsign || 'Sconosciuta';
            const shortName = trip.tripShortName || 'SENZA_NOME';

            console.log(`  Trip ${tripIndex+1}: routeId="${routeId}", shortName="${shortName}", headsign="${headsign}"`);

            if (!groupedRoutes[routeId]) groupedRoutes[routeId] = {};
            if (!groupedRoutes[routeId][headsign]) groupedRoutes[routeId][headsign] = new Set();
            groupedRoutes[routeId][headsign].add(shapeId);
            
            console.log(`    Aggiunta shape ${shapeId} a route ${routeId} direzione ${headsign}`);
        });
    });

    console.log(`Raggruppate ${commonShapes.size} shapes in ${Object.keys(groupedRoutes).length} route:`, groupedRoutes);
    return groupedRoutes;
},

    // Assegna i colori alle route
    assignRouteColors: function(groupedRoutes) {
        let routeIndex = 0;
        for (const routeId in groupedRoutes) {
            APP_STATE.lines.routeColors[routeId] = CONFIG.colorPalette[routeIndex % CONFIG.colorPalette.length];
            routeIndex++;
        }
    },

    // Disegna tutte le route
    drawAllRoutes: function(groupedRoutes) {
        for (const routeId in groupedRoutes) {
            const routeColor = APP_STATE.lines.routeColors[routeId];
            APP_STATE.lines.polylinesByRoute[routeId] = [];

            for (const headsign in groupedRoutes[routeId]) {
                const directionKey = routeId + '_' + headsign;
                APP_STATE.lines.polylinesByDirection[directionKey] = [];

                const shapeIds = groupedRoutes[routeId][headsign];
                shapeIds.forEach((shapeId) => {
                    APP_STATE.lines.shapeColors[shapeId] = routeColor;
                    this.drawTruncatedBusLine(shapeId, APP_STATE.data.allShapes[shapeId]);
                    APP_STATE.lines.drawnShapes.add(shapeId);

                    if (APP_STATE.lines.polylinesByShape[shapeId]) {
                        APP_STATE.lines.polylinesByRoute[routeId].push(APP_STATE.lines.polylinesByShape[shapeId]);
                        APP_STATE.lines.polylinesByDirection[directionKey].push(APP_STATE.lines.polylinesByShape[shapeId]);
                    }
                });
            }
        }
    },

    // Disegna una linea troncata tra partenza e arrivo
    drawTruncatedBusLine: function(shapeId, shapePoints) {
        if (!APP_STATE.ui.startPoint || !APP_STATE.ui.endPoint) return;

        const startNearest = this.findNearestPointOnLine(APP_STATE.ui.startPoint, shapePoints);
        const endNearest = this.findNearestPointOnLine(APP_STATE.ui.endPoint, shapePoints);

        if (!startNearest || !endNearest) {
            this.drawFullBusLine(shapeId, shapePoints);
            return;
        }

        let startIndex = startNearest.index;
        let endIndex = endNearest.index;

        // Assicurati che startIndex sia minore di endIndex
        if (startIndex > endIndex) {
            [startIndex, endIndex] = [endIndex, startIndex];
        }

        // Estrai il segmento della shape tra startIndex e endIndex
        const truncatedPoints = shapePoints.slice(startIndex, endIndex + 1);

        if (truncatedPoints.length < 2) {
            console.warn('Shape troncata troppo corta per', shapeId);
            return;
        }

        const latlngs = truncatedPoints.map(point => [point.lat, point.lon]);
        this.createPolyline(shapeId, latlngs);
    },

    // Disegna una linea completa
    drawFullBusLine: function(shapeId, shapePoints) {
        const latlngs = shapePoints.map(point => [point.lat, point.lon]);
        this.createPolyline(shapeId, latlngs);
    },

    // Crea una polyline
// Crea una polyline
createPolyline: function(shapeId, latlngs) {
    const polyline = L.polyline(latlngs, {
        color: APP_STATE.lines.shapeColors[shapeId],
        weight: APP_STATE.search.currentLineWidth,
        opacity: 0.7
    }).addTo(MapManager.layers.busLines);

    polyline.shapeId = shapeId;
    polyline.isShowingStops = false;
    APP_STATE.lines.polylinesByShape[shapeId] = polyline;

    // Aggiungi eventi per l'evidenziazione al passaggio del mouse
    polyline.on('mouseover', function() {
        // Evidenzia tutta la linea in giallo
        this.setStyle({
            color: CONFIG.markerColors.highlight,
            weight: APP_STATE.search.currentLineWidth + 3,
            opacity: 1
        });
        this.bringToFront();

        // Aggiorna barra di stato con info route
        UIManager.updateStatus(this.getRouteInfo(), "info");
    });

    polyline.on('mouseout', function() {
        // Ripristina lo stile originale
        const originalColor = APP_STATE.lines.shapeColors[shapeId] || '#3498db';
        this.setStyle({
            color: originalColor,
            weight: APP_STATE.search.currentLineWidth,
            opacity: 0.7
        });

        // Ripristina barra di stato
        if (!this.isShowingStops) {
            UIManager.updateStatus("Pronto", "info");
        }
    });

    // Aggiungi evento click per mostrare/nascondere fermate e info route
    polyline.on('click', function(e) {
        e.originalEvent.stopPropagation(); // Impedisce il click sulla mappa

        if (this.isShowingStops) {
            // Nascondi fermate
            this.hideLineStops();
            UIManager.updateStatus("Pronto", "info");
        } else {
            // Mostra fermate e info route
            this.showLineStops();
            UIManager.updateStatus(this.getDetailedRouteInfo(), "info");
        }
    });

    // Aggiungi metodi alla polyline
    polyline.showLineStops = function() {
        if (this.isShowingStops) return;

        this.isShowingStops = true;
        this.stopMarkers = L.layerGroup();

        // Trova tutte le fermate vicine a questa shape
        APP_STATE.data.allStops.forEach(stop => {
            let isNearShape = false;

            // Controlla se la fermata è vicina a qualsiasi punto della shape
            for (let i = 0; i < latlngs.length; i++) {
                const distance = MapManager.map.distance(
                    [stop.lat, stop.lon],
                    [latlngs[i][0], latlngs[i][1]]
                );

                if (distance < CONFIG.defaults.stopProximity) {
                    isNearShape = true;
                    break;
                }
            }

            if (isNearShape) {
                const stopIcon = L.divIcon({
                    className: 'line-stop-marker-container',
                    html: '<div class="line-stop-marker"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });

                const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon })
                    .addTo(this.stopMarkers)
                    .bindTooltip(stop.name, {
                        permanent: false,
                        className: 'line-stop-tooltip'
                    });

                this.stopMarkers.addLayer(marker);
            }
        });

        MapManager.map.addLayer(this.stopMarkers);
    };

    polyline.hideLineStops = function() {
        if (!this.isShowingStops) return;

        this.isShowingStops = false;
        if (this.stopMarkers) {
            MapManager.map.removeLayer(this.stopMarkers);
            this.stopMarkers = null;
        }
    };

    // Nuova funzione per ottenere informazioni base della route
    polyline.getRouteInfo = function() {
        const trips = APP_STATE.data.allTrips[shapeId] || [];
        if (trips.length === 0) return "Linea: " + shapeId;

        const uniqueRoutes = new Set();
        const uniqueHeadsigns = new Set();

        trips.forEach((trip) => {
            if (trip.routeId) uniqueRoutes.add(trip.routeId);
            if (trip.tripHeadsign) uniqueHeadsigns.add(trip.tripHeadsign);
        });

        let info = "";
        const routeIds = Array.from(uniqueRoutes);

        if (routeIds.length > 0) {
            const routeId = routeIds[0]; // Prendi la prima route
            const routeInfo = APP_STATE.data.allRoutes[routeId];

            if (routeInfo) {
                info = routeInfo.shortName || routeInfo.longName || routeId;

                // Aggiungi il tipo di trasporto
                if (routeInfo.type) {
                    const transportType = this.getTransportType(routeInfo.type);
                    info += " - " + transportType;
                }
            } else {
                info = "Linea: " + routeIds.join(", ");
            }
        }

        if (uniqueHeadsigns.size > 0) {
            info += " - Direzione: " + Array.from(uniqueHeadsigns).join(", ");
        }

        return info || "Linea: " + shapeId;
    };

    // Nuova funzione per informazioni dettagliate della route
    polyline.getDetailedRouteInfo = function() {
        const trips = APP_STATE.data.allTrips[shapeId] || [];
        if (trips.length === 0) return "Linea: " + shapeId;

        const uniqueRoutes = new Set();
        const uniqueHeadsigns = new Set();

        trips.forEach((trip) => {
            if (trip.routeId) uniqueRoutes.add(trip.routeId);
            if (trip.tripHeadsign) uniqueHeadsigns.add(trip.tripHeadsign);
        });

        let info = "";
        const routeIds = Array.from(uniqueRoutes);

        if (routeIds.length > 0) {
            const routeId = routeIds[0]; // Prendi la prima route
            const routeInfo = APP_STATE.data.allRoutes[routeId];

            if (routeInfo) {
                // Nome corto o lungo
                info = routeInfo.shortName ? `Linea ${routeInfo.shortName}` : "Linea";
                if (routeInfo.longName) {
                    info += ": " + routeInfo.longName;
                }

                // Tipo di trasporto
                if (routeInfo.type) {
                    const transportType = this.getTransportType(routeInfo.type);
                    info += " - " + transportType;
                }

                // Descrizione aggiuntiva
                if (routeInfo.desc) {
                    info += " - " + routeInfo.desc;
                }
            } else {
                info = "Linea: " + routeIds.join(", ");
            }
        }

        if (uniqueHeadsigns.size > 0) {
            info += " - Direzione: " + Array.from(uniqueHeadsigns).join(", ");
        }

        info += " - Clicca per nascondere fermate";

        return info || "Linea: " + shapeId;
    };

    // Funzione helper per convertire route_type in testo
    polyline.getTransportType = function(routeType) {
        const types = {
            '0': 'Tram',
            '1': 'Metro',
            '2': 'Ferrovia',
            '3': 'Autobus',
            '4': 'Ferry',
            '5': 'Funicolare',
            '6': 'Funivia',
            '7': 'Metropolitana'
        };
        return types[routeType] || `Tipo ${routeType}`;
    };

    return polyline;
},

    // Trova il punto più vicino su una linea
    findNearestPointOnLine: function(point, linePoints) {
        let minDistance = Infinity;
        let nearestPoint = null;
        let nearestIndex = -1;

        for (let i = 0; i < linePoints.length; i++) {
            const linePoint = linePoints[i];
            const distance = MapManager.map.distance(
                [point.lat, point.lng],
                [linePoint.lat, linePoint.lon]
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = linePoint;
                nearestIndex = i;
            }
        }

        return minDistance < CONFIG.limits.shapeProximityTolerance
            ? { point: nearestPoint, index: nearestIndex }
            : null;
    }
};