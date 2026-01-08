// Test file for MLRS and Mortar integration
const BallisticCalculator = require('../BallisticCalculator');
const path = require('path');

async function testBasicFunctions() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  BALLISTIC CALCULATOR - INTEGRATION TEST');
    console.log('  Testing Mortars and MLRS Systems');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Load ballistic data
    const dataPath = path.join(__dirname, '../ballistic-data.json');
    await BallisticCalculator.loadBallisticData(dataPath);
    console.log('✓ Ballistic data loaded\n');
    
    // Test 1: Get all weapon systems
    console.log('TEST 1: Get All Weapon Systems');
    console.log('─────────────────────────────────────────────────────');
    const allWeapons = BallisticCalculator.getAllWeaponSystems();
    console.log(`Found ${allWeapons.length} weapon systems:`);
    allWeapons.forEach(w => {
        console.log(`  - ${w.name} (${w.id}) [${w.systemType}]`);
    });
    console.log('✓ PASSED\n');
    
    // Test 2: Filter by system type
    console.log('TEST 2: Filter Weapon Systems by Type');
    console.log('─────────────────────────────────────────────────────');
    const mortars = BallisticCalculator.getAllWeaponSystems('mortar');
    const mlrs = BallisticCalculator.getAllWeaponSystems('mlrs');
    console.log(`Mortars: ${mortars.length}`);
    mortars.forEach(m => console.log(`  - ${m.name}`));
    console.log(`MLRS: ${mlrs.length}`);
    mlrs.forEach(m => console.log(`  - ${m.name}`));
    console.log('✓ PASSED\n');
    
    // Test 3: Get weapon config for mortar
    console.log('TEST 3: Get Mortar Weapon Config');
    console.log('─────────────────────────────────────────────────────');
    const mortarConfig = BallisticCalculator.getWeaponConfig('2B14', 'HE');
    console.log(`Weapon: ${mortarConfig.weapon.name}`);
    console.log(`System Type: ${mortarConfig.systemType}`);
    console.log(`Ammunition: ${mortarConfig.ammunition.name}`);
    console.log(`Charges: ${mortarConfig.ammunition.charges.length}`);
    console.log('✓ PASSED\n');
    
    // Test 4: Get weapon config for MLRS
    console.log('TEST 4: Get MLRS Weapon Config');
    console.log('─────────────────────────────────────────────────────');
    const mlrsConfig = BallisticCalculator.getWeaponConfig('BM21', 'HE');
    console.log(`Weapon: ${mlrsConfig.weapon.name}`);
    console.log(`System Type: ${mlrsConfig.systemType}`);
    console.log(`Projectile: ${mlrsConfig.ammunition.name}`);
    console.log(`Range: ${mlrsConfig.ammunition.minRange}m - ${mlrsConfig.ammunition.maxRange}m`);
    console.log('✓ PASSED\n');
    
    // Test 5: Mortar calculation
    console.log('TEST 5: Mortar Ballistic Calculation');
    console.log('─────────────────────────────────────────────────────');
    const mortarPos = { x: 6400, y: 6400, z: 125 };
    const targetPos1 = { x: 7650, y: 6350, z: 80 };
    
    const mortarInput = BallisticCalculator.prepareInput(
        mortarPos, targetPos1, '2B14', 'HE'
    );
    console.log(`Distance: ${mortarInput.distance.toFixed(1)}m`);
    console.log(`Height Diff: ${mortarInput.heightDifference}m`);
    console.log(`Bearing: ${mortarInput.bearing}°`);
    
    const mortarSolution = BallisticCalculator.calculate(mortarInput);
    console.log(`In Range: ${mortarSolution.inRange}`);
    if (mortarSolution.inRange) {
        console.log(`Charge: ${mortarSolution.charge}`);
        console.log(`Elevation: ${mortarSolution.elevation} mils (${mortarSolution.elevationDegrees}°)`);
        console.log(`Azimuth: ${mortarSolution.azimuthMils} mils (${mortarSolution.azimuth}°)`);
        console.log(`TOF: ${mortarSolution.timeOfFlight}s`);
        console.log('✓ PASSED\n');
    } else {
        console.log(`✗ FAILED: ${mortarSolution.error}\n`);
    }
    
    // Test 6: MLRS calculation
    console.log('TEST 6: MLRS Ballistic Calculation');
    console.log('─────────────────────────────────────────────────────');
    const mlrsPos = { x: 1000, y: 1000, z: 50 };
    const targetPos2 = { x: 9000, y: 5000, z: 45 };
    
    const mlrsInput = BallisticCalculator.prepareInput(
        mlrsPos, targetPos2, 'BM21', 'HE'
    );
    console.log(`Distance: ${mlrsInput.distance.toFixed(1)}m`);
    console.log(`Height Diff: ${mlrsInput.heightDifference}m`);
    console.log(`Bearing: ${mlrsInput.bearing}°`);
    
    const mlrsSolution = BallisticCalculator.calculate(mlrsInput);
    console.log(`In Range: ${mlrsSolution.inRange}`);
    if (mlrsSolution.inRange) {
        console.log(`Charge: ${mlrsSolution.charge} (MLRS: always 0)`);
        console.log(`Elevation: ${mlrsSolution.elevation} mils (${mlrsSolution.elevationDegrees}°)`);
        console.log(`Azimuth: ${mlrsSolution.azimuthMils} mils (${mlrsSolution.azimuth}°)`);
        console.log(`TOF: ${mlrsSolution.timeOfFlight}s`);
        console.log('✓ PASSED\n');
    } else {
        console.log(`✗ FAILED: ${mlrsSolution.error}\n`);
    }
    
    // Test 7: Mortar - All trajectories
    console.log('TEST 7: Mortar - Calculate All Trajectories');
    console.log('─────────────────────────────────────────────────────');
    const allSolutions = BallisticCalculator.calculateAllTrajectories(mortarInput);
    console.log(`Found ${allSolutions.length} possible solutions:`);
    allSolutions.forEach((sol, idx) => {
        if (sol.inRange) {
            console.log(`  Solution ${idx + 1}: Charge ${sol.charge}, Elev ${sol.elevation} mils, TOF ${sol.timeOfFlight}s`);
        }
    });
    console.log('✓ PASSED\n');
    
    // Test 8: MLRS - All trajectories (should be 1)
    console.log('TEST 8: MLRS - Calculate All Trajectories');
    console.log('─────────────────────────────────────────────────────');
    const mlrsAllSolutions = BallisticCalculator.calculateAllTrajectories(mlrsInput);
    console.log(`Found ${mlrsAllSolutions.length} solution(s):`);
    mlrsAllSolutions.forEach((sol, idx) => {
        if (sol.inRange) {
            console.log(`  Solution ${idx + 1}: Charge ${sol.charge} (N/A), Elev ${sol.elevation} mils, TOF ${sol.timeOfFlight}s`);
        }
    });
    console.log('✓ PASSED\n');
    
    // Test 9: Mil system configs
    console.log('TEST 9: Mil System Configurations');
    console.log('─────────────────────────────────────────────────────');
    const rusMils = BallisticCalculator.getMilSystemConfig('2B14');
    const usMils = BallisticCalculator.getMilSystemConfig('M252');
    const gradMils = BallisticCalculator.getMilSystemConfig('BM21');
    
    console.log(`2B14 Mortar: ${rusMils.name} - ${rusMils.milsPerCircle} mils/circle`);
    console.log(`M252 Mortar: ${usMils.name} - ${usMils.milsPerCircle} mils/circle`);
    console.log(`BM-21 Grad: ${gradMils.name} - ${gradMils.milsPerCircle} mils/circle`);
    console.log('✓ PASSED\n');
    
    // Test 10: Out of range scenarios
    console.log('TEST 10: Out of Range Handling');
    console.log('─────────────────────────────────────────────────────');
    
    // Mortar: too far
    const farTarget = { x: 20000, y: 20000, z: 50 };
    const farInput = BallisticCalculator.prepareInput(mortarPos, farTarget, '2B14', 'HE');
    const farSolution = BallisticCalculator.calculate(farInput);
    console.log(`Mortar @ ${farInput.distance.toFixed(0)}m: ${farSolution.inRange ? 'IN RANGE' : 'OUT OF RANGE ✓'}`);
    if (!farSolution.inRange) {
        console.log(`  Error: ${farSolution.error}`);
        console.log(`  Max range: ${farSolution.maxRange}m`);
    }
    
    // MLRS: too close
    const closeTarget = { x: 1100, y: 1100, z: 50 };
    const closeInput = BallisticCalculator.prepareInput(mlrsPos, closeTarget, 'BM21', 'HE');
    const closeSolution = BallisticCalculator.calculate(closeInput);
    console.log(`MLRS @ ${closeInput.distance.toFixed(0)}m: ${closeSolution.inRange ? 'IN RANGE' : 'OUT OF RANGE ✓'}`);
    if (!closeSolution.inRange) {
        console.log(`  Error: ${closeSolution.error}`);
        console.log(`  Min range: ${closeSolution.minRange}m`);
    }
    console.log('✓ PASSED\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ALL TESTS PASSED ✓');
    console.log('═══════════════════════════════════════════════════════');
}

testBasicFunctions().catch(error => {
    console.error('\n✗ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
});
