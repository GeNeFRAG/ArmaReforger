/**
 * Example: Fire Corrections
 *
 * Demonstrates the two correction workflows:
 * - GT-line corrections (gun fires, observes, corrects from gun bearing)
 * - OT-line corrections (Forward Observer corrects from their own line of sight)
 *
 * Also shows the internal ballistic solver primitives:
 * findOptimalCharge, interpolateFromTable, applyHeightCorrection, applyTOFCorrection.
 */

const BallisticCalculator = require('../BallisticCalculator');
const path = require('path');

async function main() {
    const dataPath = path.join(__dirname, '../ballistic-data.json');
    await BallisticCalculator.loadBallisticData(dataPath);

    const mortarPos   = { x: 4800, y: 7049, z: 168 };
    const targetPos   = { x: 4696, y: 5516, z:  64 };
    const observerPos = { x: 5200, y: 5800, z:  90 };

    // ── 1. GT-line correction (applyFireCorrection) ───────────────────────────

    console.log('1. Gun–Target Line Correction (applyFireCorrection)');
    console.log('──────────────────────────────────────────────────────');

    const initial = BallisticCalculator.calculate(
        BallisticCalculator.prepareInput(mortarPos, targetPos, '2B14', 'HE')
    );
    console.log(`Initial solution: elev=${initial.elevation} mils, az=${initial.azimuthMils} mils`);

    // Rounds fell: 30m short, 10m right → Add 30 (positive addDrop), Left 10 (negative leftRight)
    // Sign convention: positive addDrop = Add/farther, negative = Drop/closer
    const correctedTarget = BallisticCalculator.applyFireCorrection(
        mortarPos, targetPos,
        -10,  // Left 10m  (negative = Left, positive = Right)
        +30   // Add 30m   (positive = Add/farther, negative = Drop/closer)
    );
    console.log(`Corrected target:  x=${correctedTarget.x.toFixed(1)}, y=${correctedTarget.y.toFixed(1)}`);

    const correctedInput = BallisticCalculator.prepareInput(mortarPos, correctedTarget, '2B14', 'HE');
    const correctedSolution = BallisticCalculator.calculate(correctedInput);
    console.log(`Corrected solution: elev=${correctedSolution.elevation} mils, az=${correctedSolution.azimuthMils} mils`);
    console.log(`Delta: Δelev=${correctedSolution.elevation - initial.elevation} mils, Δaz=${correctedSolution.azimuthMils - initial.azimuthMils} mils\n`);

    // ── 2. OT-line correction (applyFireCorrectionFromObserver) ──────────────

    console.log('2. Observer–Target Line Correction (applyFireCorrectionFromObserver)');
    console.log('──────────────────────────────────────────────────────');

    // FO observes from a flank. Rounds landed Left 20m, 50m short (FO's perspective).
    // Corrections: Right 20, Add 50 (positive = Add/farther from FO's perspective).
    const otResult = BallisticCalculator.applyFireCorrectionFromObserver(
        mortarPos,
        observerPos,
        targetPos,
        20,   // Right 20m (correcting left impact)
        +50   // Add 50m  (positive = Add/farther, correcting short impact)
    );

    console.log(`OT bearing (observer → target): ${otResult.otBearing}°`);
    console.log(`GT bearing (gun → corrected):   ${otResult.gtBearing}°`);
    console.log(`OT-GT angle difference:         ${otResult.angleDiff}°`);
    console.log(`Corrected target: x=${otResult.correctedTarget.x.toFixed(1)}, y=${otResult.correctedTarget.y.toFixed(1)}`);

    const otCorrectedInput = BallisticCalculator.prepareInput(mortarPos, otResult.correctedTarget, '2B14', 'HE');
    const otSolution = BallisticCalculator.calculate(otCorrectedInput);
    console.log(`OT-corrected solution: elev=${otSolution.elevation} mils, az=${otSolution.azimuthMils} mils\n`);

    // ── 3. Low-level solver primitives ───────────────────────────────────────

    console.log('3. Low-Level Ballistic Solver Primitives');
    console.log('──────────────────────────────────────────────────────');

    // Pull raw charge and range table data from weapon config
    const { ammunition } = BallisticCalculator.getWeaponConfig('2B14', 'HE');
    const distance = 1533;

    // findOptimalCharge: selects the charge whose range band covers the distance
    const charge = BallisticCalculator.findOptimalCharge(ammunition.charges, distance);
    console.log(`findOptimalCharge(distance=${distance}m) → level ${charge.level} (${charge.minRange}–${charge.maxRange}m)`);

    // interpolateFromTable: raw elevation/TOF lookup from the range table
    const tableResult = BallisticCalculator.interpolateFromTable(charge.rangeTable, distance);
    console.log(`interpolateFromTable(${distance}m) → elev=${tableResult.elevation.toFixed(1)} mils, tof=${tableResult.tof.toFixed(2)}s, dElev=${tableResult.dElev.toFixed(2)}`);

    // applyHeightCorrection: adjusts elevation for height difference
    const heightDiff = targetPos.z - mortarPos.z; // -104m
    const correctedElev = BallisticCalculator.applyHeightCorrection(
        tableResult.elevation,
        heightDiff,
        tableResult.dElev
    );
    console.log(`applyHeightCorrection(heightDiff=${heightDiff}m) → ${correctedElev.toFixed(1)} mils`);

    // applyTOFCorrection: adjusts time of flight for height difference
    const correctedTOF = BallisticCalculator.applyTOFCorrection(
        tableResult.tof,
        heightDiff,
        tableResult.tofPer100m
    );
    console.log(`applyTOFCorrection(heightDiff=${heightDiff}m) → ${correctedTOF.toFixed(2)}s`);
}

main().catch(console.error);
