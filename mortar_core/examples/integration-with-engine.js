/**
 * Integration example showing how to use BallisticCalculator with the existing
 * Leaflet-based map engine (mapEngine.js)
 * 
 * This assumes:
 * - mapEngine.js is loaded and initialized
 * - Leaflet map is available
 * - Height map data is loaded
 */

const BallisticCalculator = require('../BallisticCalculator');

async function integrateWithMapEngine(map, engine) {
    // Load ballistic data
    await BallisticCalculator.loadBallisticData('../ballistic-data.json');
    
    // Get mortar position from map center
    const mortarLatLng = map.getCenter();
    
    // Example target position
    const targetLatLng = { lat: 125.5, lng: 127.3 };
    
    // Convert Leaflet coordinates to game coordinates
    const mortarGameCoords = engine.convertCoordinates(
        mortarLatLng.lng, 
        mortarLatLng.lat, 
        true,  // toGame
        true   // round
    );
    
    const targetGameCoords = engine.convertCoordinates(
        targetLatLng.lng, 
        targetLatLng.lat, 
        true, 
        true
    );
    
    // Get heights from height map
    const mortarHeight = engine.height.get(mortarGameCoords[0], mortarGameCoords[1]);
    const targetHeight = engine.height.get(targetGameCoords[0], targetGameCoords[1]);
    
    // Prepare 3D positions
    const mortarPos = { 
        x: parseFloat(mortarGameCoords[0]), 
        y: parseFloat(mortarGameCoords[1]), 
        z: mortarHeight 
    };
    
    const targetPos = { 
        x: parseFloat(targetGameCoords[0]), 
        y: parseFloat(targetGameCoords[1]), 
        z: targetHeight 
    };
    
    // Calculate firing solution
    const input = BallisticCalculator.prepareInput(mortarPos, targetPos, "RUS", "HE");
    const solution = BallisticCalculator.calculate(input);
    
    console.log('Mortar Position:', mortarPos);
    console.log('Target Position:', targetPos);
    console.log('Firing Solution:', solution);
    
    return solution;
}

// Example: Add click handler to calculate solution on map click
function setupMapClickHandler(map, engine) {
    let mortarMarker = null;
    
    map.on('click', async function(e) {
        // Set mortar position on first click
        if (!mortarMarker) {
            mortarMarker = L.marker(e.latlng).addTo(map);
            console.log('Mortar position set. Click again to set target.');
            return;
        }
        
        // Calculate solution on second click
        const mortarLatLng = mortarMarker.getLatLng();
        const targetLatLng = e.latlng;
        
        const mortarGameCoords = engine.convertCoordinates(
            mortarLatLng.lng, 
            mortarLatLng.lat, 
            true, 
            true
        );
        
        const targetGameCoords = engine.convertCoordinates(
            targetLatLng.lng, 
            targetLatLng.lat, 
            true, 
            true
        );
        
        const mortarHeight = engine.height.get(mortarGameCoords[0], mortarGameCoords[1]);
        const targetHeight = engine.height.get(targetGameCoords[0], targetGameCoords[1]);
        
        const mortarPos = { 
            x: parseFloat(mortarGameCoords[0]), 
            y: parseFloat(mortarGameCoords[1]), 
            z: mortarHeight 
        };
        
        const targetPos = { 
            x: parseFloat(targetGameCoords[0]), 
            y: parseFloat(targetGameCoords[1]), 
            z: targetHeight 
        };
        
        const input = BallisticCalculator.prepareInput(mortarPos, targetPos, "RUS", "HE");
        const solution = BallisticCalculator.calculate(input);
        
        if (solution.inRange) {
            alert(`Firing Solution:
Charge: ${solution.charge}
Elevation: ${solution.elevation} mils (${solution.elevationDegrees}°)
Azimuth: ${solution.azimuth}° (${solution.azimuthMils} mils)
TOF: ${solution.timeOfFlight}s`);
        } else {
            alert(`Target out of range: ${solution.error}`);
        }
        
        // Reset for next calculation
        map.removeLayer(mortarMarker);
        mortarMarker = null;
    });
}

module.exports = {
    integrateWithMapEngine,
    setupMapClickHandler
};
