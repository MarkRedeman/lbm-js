// first 2D, then
module.exports = function() {

    Simulation = function() {
        var config = require('./config');
        this.structure = this.initializeStructure(config);
        this.relaxationTime = config.get('relaxation-time');

        var canvas = document.getElementById('mpcCanvas');
        var StructureVisualizer = require('./Visualizers/LatticeStructureVisaualizer2D');
        var DensityVisualizer = require('./Visualizers/DensityVisualizer2D');

        var graphCanvas = document.getElementById('graphCanvas');
        var DensityVisualizationGraph = require('./Visualizers/DensityVisualizationGraph');
        this.graph = new DensityVisualizationGraph(this.structure, graphCanvas);
        console.log(this.graph);

        this.visualizer = new StructureVisualizer(this.structure, canvas);
        this.visualizer = new DensityVisualizer(this.structure, canvas, this.visualizer);

        //canvas.width  = 640 //window.innerWidth;
        //canvas.height = 480 //window.innerHeight;
        canvas.width = 40*40;
        canvas.height = 40*40;

        graphCanvas.width = canvas.width;
        graphCanvas.height = canvas.height;

        // @TODO: create an awesome visualizer that has a node visualizer, structure
        // visualizer, domain visualizer etc.
        //
        // this.visualizer = new DomainVisualizer(this.structure, canvas);
        // this.statVisualizer = new StatVisualizer();
        // velocityVisualizer, densityVisualizer

        console.log("Initialized everything!");
    }

    Simulation.prototype = {
        initializeStructure: function(config) {
            // actually because dt = dx = dy we should only have to
            // give one size since the structure should be able to
            // calculate the amount of nodes from knowing the domain
            var structure = new LatticeStructure(config);
            return structure;
        },

        collision: function() {
            relaxationTime = this.relaxationTime;

            this.structure.forEachNode(function(node) {
                node.collide(relaxationTime);
            });
        },

        stream: function() {
            var that = this.structure;
            var directions = that.getDirections();
            this.structure.forEachNode(function(node, idx) {

                for (var k = 0; k < directions.length; k++) {
                    var direction = k;//directions[k];
                    var neighbour = that.getNeighbourOfNodeInDirection(idx, direction);
                    node.streamTo(direction, neighbour);
                };
            });

            // apply boundary conditions
            this.structure.forEachNode(function(node, idx) {
                if (node.type == "boundary") {
                    for (var k = 0; k < directions.length; k++) {
                        var direction = k;//directions[k];
                        var neighbour = that.getNeighbourOfNodeInDirection(idx, direction);
                        node.applyBoundary(direction, neighbour);
                    };
                }
            });
        },

        run: function() {
            // this.visualizer.k    eepRendering();
            console.log("Density voor collision: ", this.structure.getDensity());
            this.collision();
            console.log("Density na collision: ", this.structure.getDensity());
            this.visualizer.render();
            this.graph.render();
            console.log("Density voor streamen: ", this.structure.getDensity());
            this.stream();
            console.log("Density na streamen: ", this.structure.getDensity());

            this.visualizer.render();
            this.graph.render();
        },

        play: function() {
            window.requestAnimationFrame(this.update.bind(this));
        },

        update: function() {
            if (this.wait > 0) {
                this.wait --;
                window.requestAnimationFrame(this.update.bind(this));
            } else {
                this.run();

                if (this.running != 0) {
                    console.log('running');
                    this.running--;
                    this.wait = 20;
                    window.requestAnimationFrame(this.update.bind(this));
                }
            }
        },


        runFor: function(iterations) {
            this.running = iterations;
            this.update();
            return this;
        },
    };

    return Simulation;
}();