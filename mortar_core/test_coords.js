const MortarCalculator = require('./MortarCalculator.js');

async function testCoordinates() {
    await MortarCalculator.loadBallisticData('./ballistic-data.json');
    
    const mortarGrid = "0585,0719";
    const mortarAlt = 0;
    const targetGrid = "0477,0694";
    const targetAlt = 0;
    
    const mortarPos = MortarCalculator.parseGridToMeters(mortarGrid);
    mortarPos.z = mortarAlt;
    
    const targetPos = MortarCalculator.parseGridToMeters(targetGrid);
    targetPos.z = targetAlt;
    
    console.log("Mortar:", mortarPos);
    console.log("Target:", targetPos);
    
    const initialInput = MortarCalculator.prepareInput(mortarPos, targetPos, 'US', 'HE');
    console.log(`\nDistance: ${initialInput.distance.toFixed(1)}m`);
    console.log(`Bearing: ${initialInput.bearing.toFixed(1)}°`);
    console.log(`Height Diff: ${initialInput.heightDifference}m`);
    
    const initialSolution = MortarCalculator.calculate(initialInput);
    console.log(`\nCharge: ${initialSolution.charge}`);
    console.log(`Elevation: ${initialSolution.elevation} mils (${initialSolution.elevationPrecise})`);
    console.log(`Azimuth: ${initialSolution.azimuthMils} mils`);
    
    // Apply -200m Drop correction
    const correctedTarget = MortarCalculator.applyFireCorrection(mortarPos, targetPos, 0, -200);
    console.log("\n=== After Drop -200m ===");
    
    const correctedInput = MortarCalculator.prepareInput(mortarPos, correctedTarget, 'US', 'HE');
    console.log(`Distance: ${correctedInput.distance.toFixed(1)}m (change: ${(correctedInput.distance - initialInput.distance).toFixed(1)}m)`);
    
    const correctedSolution = MortarCalculator.calculate(correctedInput);
    console.log(`Elevation: ${correctedSolution.elevation} mils (${correctedSolution.elevationPrecise})`);
    
    const elevChange = correctedSolution.elevationPrecise - initialSolution.elevationPrecise;
    console.log(`\nElevation change: ${elevChange > 0 ? '+' : ''}${elevChange.toFixed(2)} mils ${elevChange > 0 ? '✅' : '❌'}`);
}

testCoordinates().catch(console.error);
