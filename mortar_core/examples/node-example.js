const MortarCalculator = require('../MortarCalculator');
const path = require('path');

async function main() {
    // Load ballistic data
    const dataPath = path.join(__dirname, '../ballistic-data.json');
    await MortarCalculator.loadBallisticData(dataPath);
    
    // Define positions
    const mortarPos = { x: 6400, y: 6400, z: 125 };
    const targetPos = { x: 7650, y: 6350, z: 80 };
    
    // Prepare input
    const input = MortarCalculator.prepareInput(
        mortarPos, 
        targetPos, 
        "RUS", 
        "HE"
    );
    
    console.log('Input:', input);
    
    // Calculate solution
    const solution = MortarCalculator.calculate(input);
    
    console.log('\nFiring Solution:');
    console.log('================');
    console.log(`In Range: ${solution.inRange}`);
    if (solution.inRange) {
        console.log(`Charge: ${solution.charge}`);
        console.log(`Elevation: ${solution.elevation} mils (${solution.elevationDegrees}°)`);
        console.log(`Azimuth: ${solution.azimuth}° (${solution.azimuthMils} mils)`);
        console.log(`Time of Flight: ${solution.timeOfFlight}s`);
        console.log(`Range: ${solution.minRange}m - ${solution.maxRange}m`);
    } else {
        console.log(`Error: ${solution.error}`);
    }
}

main().catch(console.error);
