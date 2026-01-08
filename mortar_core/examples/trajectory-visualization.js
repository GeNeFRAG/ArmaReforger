/**
 * Example: Trajectory Visualization
 * 
 * Demonstrates how to use BallisticCalculator.generateTrajectoryPoints()
 * for custom visualizations (terminal output, canvas, etc.)
 */

const BallisticCalculator = require('../BallisticCalculator');
const path = require('path');

async function main() {
    // Load ballistic data
    const dataPath = path.join(__dirname, '../ballistic-data.json');
    await BallisticCalculator.loadBallisticData(dataPath);
    
    // Define test positions (from default example)
    const mortarPos = { x: 4800, y: 7049, z: 168 };
    const targetPos = { x: 4696, y: 5516, z: 64 };
    
    // Prepare input
    const input = BallisticCalculator.prepareInput(mortarPos, targetPos, "RUS", "HE");
    
    console.log('Calculating trajectories for:');
    console.log(`  Distance: ${input.distance.toFixed(1)}m`);
    console.log(`  Height Difference: ${input.heightDifference.toFixed(1)}m`);
    console.log(`  Bearing: ${input.bearing.toFixed(1)}°\n`);
    
    // Get all trajectory options
    const solutions = BallisticCalculator.calculateAllTrajectories(input);
    
    if (solutions.length === 0 || !solutions[0].inRange) {
        console.log('No solutions available');
        return;
    }
    
    console.log(`Found ${solutions.length} firing solution(s)\n`);
    
    // Generate trajectory points
    const trajectoryData = BallisticCalculator.generateTrajectoryPoints(
        solutions, 
        input.distance, 
        input.mortarType
    );
    
    // Display trajectory data
    console.log('Trajectory Data:');
    console.log('================');
    console.log(`Global Max Height: ${trajectoryData.globalMaxY.toFixed(1)}m`);
    console.log(`Global Range: ${trajectoryData.globalRange.toFixed(1)}m\n`);
    
    trajectoryData.series.forEach((trajectory, i) => {
        console.log(`\nCharge ${trajectory.charge}:`);
        console.log(`  Elevation: ${trajectory.elevDeg}°`);
        console.log(`  Time of Flight: ${trajectory.tof}s`);
        console.log(`  Max Height: ${trajectory.maxY.toFixed(1)}m`);
        console.log(`  Points: ${trajectory.points.length}`);
        console.log(`  Color: ${trajectory.color}`);
        
        // Show sample points (first 5, middle 5, last 5)
        console.log('  Sample Points (x, y in meters):');
        const points = trajectory.points;
        if (points.length > 15) {
            points.slice(0, 5).forEach((p, idx) => {
                console.log(`    [${idx}] x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}`);
            });
            console.log('    ...');
            const mid = Math.floor(points.length / 2);
            points.slice(mid - 2, mid + 3).forEach((p, idx) => {
                console.log(`    [${mid - 2 + idx}] x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}`);
            });
            console.log('    ...');
            points.slice(-5).forEach((p, idx) => {
                console.log(`    [${points.length - 5 + idx}] x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}`);
            });
        } else {
            points.forEach((p, idx) => {
                console.log(`    [${idx}] x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}`);
            });
        }
    });
    
    // ASCII visualization
    console.log('\n\nASCII Trajectory Visualization:');
    console.log('================================\n');
    visualizeTrajectoryASCII(trajectoryData);
}

/**
 * Simple ASCII visualization of trajectories
 */
function visualizeTrajectoryASCII(trajectoryData) {
    const width = 80;
    const height = 20;
    const chars = ['*', '#', '+', 'o', 'x'];
    
    // Create canvas
    const canvas = Array(height).fill(null).map(() => Array(width).fill(' '));
    
    // Draw ground line
    for (let x = 0; x < width; x++) {
        canvas[height - 1][x] = '-';
    }
    
    // Scale factor
    const xScale = trajectoryData.globalRange / width;
    const yScale = trajectoryData.globalMaxY / (height - 2);
    
    // Plot trajectories
    trajectoryData.series.forEach((trajectory, seriesIdx) => {
        const char = chars[seriesIdx % chars.length];
        
        trajectory.points.forEach(point => {
            const screenX = Math.floor(point.x / xScale);
            const screenY = height - 2 - Math.floor(point.y / yScale);
            
            if (screenX >= 0 && screenX < width && screenY >= 0 && screenY < height - 1) {
                canvas[screenY][screenX] = char;
            }
        });
    });
    
    // Add markers
    canvas[height - 1][0] = 'M';  // Mortar
    canvas[height - 1][width - 1] = 'T';  // Target
    
    // Print canvas
    console.log('M = Mortar, T = Target');
    trajectoryData.series.forEach((traj, i) => {
        console.log(`${chars[i % chars.length]} = Charge ${traj.charge} (${traj.elevDeg}°)`);
    });
    console.log('');
    
    canvas.forEach(row => console.log(row.join('')));
    
    // Scale labels
    console.log(`0m${' '.repeat(width - 10)}${trajectoryData.globalRange.toFixed(0)}m`);
    console.log(`Height: 0 - ${trajectoryData.globalMaxY.toFixed(0)}m`);
}

main().catch(console.error);
