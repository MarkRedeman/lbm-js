var Simulation = require('./lbm');
var LatticeNode = require('./LatticeNode');
var LatticeStructure = require('./LatticeStructure');
var Config = require('./config');
console.log(Config);
console.log("Starting simulation");
// Start of simulation
var sim = new Simulation();
console.log(sim);
window.sim = sim;
sim.visualizer.render();
sim.graph.render();
// sim.run();