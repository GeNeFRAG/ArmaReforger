/**
 * Example: Coordinates, Geometry, and Display Utilities
 *
 * Demonstrates grid/meter conversion, bearing/distance helpers,
 * mil system conversion, ammunition listing, and field formatting.
 */

const BallisticCalculator = require('../BallisticCalculator');
const path = require('path');

async function main() {
    const dataPath = path.join(__dirname, '../ballistic-data.json');
    await BallisticCalculator.loadBallisticData(dataPath);

    // ── 1. Grid ↔ Meter conversion ───────────────────────────────────────────

    console.log('1. Grid ↔ Meter Conversion');
    console.log('──────────────────────────────────────────────────────');

    // 3-digit grid (100m precision, center of cell offset applied)
    const from3digit = BallisticCalculator.parseGridToMeters('064/071');
    console.log(`3-digit "064/071" → x=${from3digit.x}, y=${from3digit.y}`);

    // 4-digit grid (10m precision, no center offset)
    const from4digit = BallisticCalculator.parseGridToMeters('0640/0710');
    console.log(`4-digit "0640/0710" → x=${from4digit.x}, y=${from4digit.y}`);

    // Comma delimiter also supported
    const fromComma = BallisticCalculator.parseGridToMeters('064,071');
    console.log(`comma "064,071" → x=${fromComma.x}, y=${fromComma.y}`);

    // Meters → grid string
    const grid3 = BallisticCalculator.metersToGrid(6450, 7150);
    const grid4 = BallisticCalculator.metersToGrid(6450, 7150, true);
    console.log(`metersToGrid(6450, 7150) → "${grid3}" (3-digit), "${grid4}" (4-digit)\n`);

    // ── 2. parsePosition (grid string, grid object, raw meters) ─────────────

    console.log('2. parsePosition');
    console.log('──────────────────────────────────────────────────────');

    const fromString = BallisticCalculator.parsePosition('064/071');
    console.log(`parsePosition("064/071") → x=${fromString.x}, y=${fromString.y}, z=${fromString.z}`);

    const fromGridObj = BallisticCalculator.parsePosition({ grid: '0640/0710', z: 120 });
    console.log(`parsePosition({grid, z:120}) → x=${fromGridObj.x}, y=${fromGridObj.y}, z=${fromGridObj.z}`);

    const fromMeters = BallisticCalculator.parsePosition({ x: 6400, y: 7100, z: 115 });
    console.log(`parsePosition({x,y,z}) → x=${fromMeters.x}, y=${fromMeters.y}, z=${fromMeters.z}\n`);

    // ── 3. Geometry helpers ──────────────────────────────────────────────────

    console.log('3. Distance and Bearing');
    console.log('──────────────────────────────────────────────────────');

    const pos1 = { x: 4800, y: 7049, z: 168 };
    const pos2 = { x: 4696, y: 5516, z: 64 };

    const dist3d = BallisticCalculator.calculateDistance(pos1, pos2);
    const distHz = BallisticCalculator.calculateHorizontalDistance(pos1, pos2);
    const bearing = BallisticCalculator.calculateBearing(pos1, pos2);

    console.log(`3D distance:          ${dist3d.toFixed(1)}m`);
    console.log(`Horizontal distance:  ${distHz.toFixed(1)}m`);
    console.log(`Bearing:              ${bearing}°\n`);

    // ── 4. Mil system conversion ─────────────────────────────────────────────

    console.log('4. Mil System Conversion');
    console.log('──────────────────────────────────────────────────────');

    const weapons = [
        { id: '2B14',           label: 'Warsaw Pact (6000 mil)' },
        { id: 'M252',           label: 'NATO (6400 mil)' },
        { id: 'INTEGRITY_BM21', label: 'BM-21 Grad' },
    ];

    for (const w of weapons) {
        const name = BallisticCalculator.getMilSystemName(w.id);
        const azMils = BallisticCalculator.calculateAzimuthMils(bearing, w.id);
        const inMils = BallisticCalculator.degreesToMils(45, w.id);
        const backDeg = BallisticCalculator.milsToDegrees(inMils, w.id);
        console.log(`${w.label}`);
        console.log(`  Mil system:       ${name}`);
        console.log(`  Bearing (${bearing}°):  ${azMils} mils`);
        console.log(`  45° → ${inMils} mils → ${backDeg}°`);
    }
    console.log();

    // ── 5. Ammunition options and legacy mortar type list ────────────────────

    console.log('5. Ammunition Options');
    console.log('──────────────────────────────────────────────────────');

    const mortarTypes = BallisticCalculator.getAllMortarTypes();
    console.log(`getAllMortarTypes() → ${mortarTypes.map(m => m.id).join(', ')}`);

    for (const weaponId of ['2B14', 'M252', 'INTEGRITY_BM21', 'SH_BM21', 'D30', 'M119', 'TYPE63']) {
        const ammo = BallisticCalculator.getAmmunitionOptions(weaponId);
        const names = ammo.map(a => a.name).join(', ');
        console.log(`  ${weaponId.padEnd(16)} → ${names}`);
    }
    console.log();

    // ── 6. formatForField ────────────────────────────────────────────────────

    console.log('6. formatForField');
    console.log('──────────────────────────────────────────────────────');

    const input = BallisticCalculator.prepareInput(pos1, pos2, '2B14', 'HE');
    const solution = BallisticCalculator.calculate(input);
    const field = BallisticCalculator.formatForField(solution);

    console.log('Raw solution:  elevation=%d mils (%d°), azimuth=%d° (%d mils)',
        solution.elevation, solution.elevationDegrees, solution.azimuth, solution.azimuthMils);
    // formatForField: elevation is unchanged (already mils); azimuth is renamed from
    // azimuthMils and the original degree value moves to azimuthDegrees.
    console.log('Field format:  elevation=%d mils (same), azimuth=%d mils (was azimuthMils; degree value in azimuthDegrees)',
        field.elevation, field.azimuth);
}

main().catch(console.error);
