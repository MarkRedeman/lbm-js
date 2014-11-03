var Simulation = require('./lbm');
var LatticeNode = require('./LatticeNode');
var LatticeStructure = require('./LatticeStructure');

console.log("Starting simulation");
// Start of simulation
var sim = new Simulation();
console.log(sim);
window.sim = sim;
sim.run();