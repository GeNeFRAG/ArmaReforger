/**
 * Example: Fire for Effect Patterns
 *
 * Demonstrates how to generate area fire patterns and sort solutions
 * for efficient gun traverse:
 * - Lateral sheaf (perpendicular to line of fire)
 * - Linear sheaf (along line of fire)
 * - Circular pattern (concentric rings)
 * - sortFFESolutionsByAzimuth (sequential gun traverse)
 */

const BallisticCalculator = require('../BallisticCalculator');
const path = require('path');

async function main() {
    const dataPath = path.join(__dirname, '../ballistic-data.json');
    await BallisticCalculator.loadBallisticData(dataPath);

    const mortarPos = { x: 4800, y: 7049, z: 168 };
    const targetPos = { x: 4696, y: 5516, z:  64 };

    // ── 1. Lateral sheaf (perpendicular) ─────────────────────────────────────

    console.log('1. Lateral Sheaf — 5 rounds perpendicular, 50m spacing');
    console.log('──────────────────────────────────────────────────────');

    const lateralPositions = BallisticCalculator.generateFireForEffectPattern(
        mortarPos, targetPos, 'perpendicular', 5, 50
    );

    const lateralSolutions = lateralPositions.map((pos, i) => {
        const input = BallisticCalculator.prepareInput(mortarPos, pos, '2B14', 'HE');
        const solution = BallisticCalculator.calculate(input);
        return { roundNumber: i + 1, targetPos: pos, solution };
    });

    lateralSolutions.forEach(({ roundNumber, targetPos: tp, solution }) => {
        console.log(`  Round ${roundNumber}: target=(${tp.x.toFixed(0)}, ${tp.y.toFixed(0)}), ` +
            `elev=${solution.elevation} mils, az=${solution.azimuthMils} mils`);
    });
    console.log();

    // ── 2. Linear sheaf (along-bearing) ──────────────────────────────────────

    console.log('2. Linear Sheaf — 4 rounds along line of fire, 75m spacing');
    console.log('──────────────────────────────────────────────────────');

    const linearPositions = BallisticCalculator.generateFireForEffectPattern(
        mortarPos, targetPos, 'along-bearing', 4, 75
    );

    linearPositions.forEach((pos, i) => {
        const input = BallisticCalculator.prepareInput(mortarPos, pos, 'M252', 'HE');
        const solution = BallisticCalculator.calculate(input);
        console.log(`  Round ${i + 1}: target=(${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}), ` +
            `elev=${solution.elevation} mils, az=${solution.azimuthMils} mils`);
    });
    console.log();

    // ── 3. Circular pattern ───────────────────────────────────────────────────

    console.log('3. Circular Pattern — 6 rounds, 80m radius');
    console.log('──────────────────────────────────────────────────────');

    const circlePositions = BallisticCalculator.generateCircularPattern(targetPos, 80, 6);

    circlePositions.forEach((pos, i) => {
        const distFromCenter = Math.sqrt(
            (pos.x - targetPos.x) ** 2 + (pos.y - targetPos.y) ** 2
        ).toFixed(0);
        const input = BallisticCalculator.prepareInput(mortarPos, pos, '2B14', 'HE');
        const solution = BallisticCalculator.calculate(input);
        console.log(`  Round ${i + 1}: offset=${distFromCenter}m from center, ` +
            `elev=${solution.elevation} mils, az=${solution.azimuthMils} mils`);
    });
    console.log();

    // ── 4. sortFFESolutionsByAzimuth ──────────────────────────────────────────

    console.log('4. sortFFESolutionsByAzimuth — sequential gun traverse');
    console.log('──────────────────────────────────────────────────────');

    // Circular pattern produces rounds at scattered azimuths.
    // Sort so gunner only turns in one direction without backtracking.
    const unsortedSolutions = circlePositions.map((pos, i) => {
        const input = BallisticCalculator.prepareInput(mortarPos, pos, '2B14', 'HE');
        const solution = BallisticCalculator.calculate(input);
        return { roundNumber: i + 1, targetPos: pos, solution };
    });

    const azimuths = unsortedSolutions.map(s => s.solution.azimuthMils).join(', ');
    console.log(`  Before sort (azimuth mils): ${azimuths}`);

    // NOTE: sortFFESolutionsByAzimuth mutates roundNumber on the original solution objects.
    // Do not rely on unsortedSolutions[i].roundNumber after this call.
    const sortedSolutions = BallisticCalculator.sortFFESolutionsByAzimuth(unsortedSolutions);
    const sortedAzimuths = sortedSolutions.map(s => s.solution.azimuthMils).join(', ');
    console.log(`  After sort  (azimuth mils): ${sortedAzimuths}`);

    console.log('\n  Fire order:');
    sortedSolutions.forEach(({ roundNumber, solution }) => {
        console.log(`    Round ${roundNumber}: elev=${solution.elevation} mils, az=${solution.azimuthMils} mils`);
    });
}

main().catch(console.error);
