// first 2D, then
module.exports = function() {

    Simulation = function() {
        var config = require('./config');
        this.structure = this.initializeStructure(config);
        var Domain = require('./Config/2DZouHeDomain');
        // var Domain = require('./Config/2DZouHeDomain');
        this.domain = new Domain(config);
        this.relaxationTime = this.domain.relaxationTime;
        console.log("relaxationTime: ", this.relaxationTime);

        this.initializeVisualizers();

        console.log("Initialized everything!");
    }

    Simulation.prototype = {
        initializeVisualizers: function() {
            this.visualizers = [];
            var StructureVisualizer = require('./Visualizers/LatticeStructureVisaualizer2D');
            var DensityVisualizer = require('./Visualizers/DensityVisualizer2D');
            var SpeedVisualizer = require('./Visualizers/SpeedVisualizer2D');
            var DensityVisualizationGraph = require('./Visualizers/DensityVisualizationGraph');

            var denstiyCanvas = document.getElementById('densityCanvas');
            var distanceBetweenNodes = 5;
            var structure = new StructureVisualizer(this.structure, denstiyCanvas, distanceBetweenNodes);
            this.visualizers.push(
                new DensityVisualizer(this.structure, denstiyCanvas, structure, distanceBetweenNodes)
            );
            // Draw each node
            denstiyCanvas.width = distanceBetweenNodes * this.domain.dx;
            denstiyCanvas.height = distanceBetweenNodes * this.domain.dy;

            var speedCanvas = document.getElementById('speedCanvas');
            var structure = new StructureVisualizer(this.structure, speedCanvas, distanceBetweenNodes);
            this.visualizers.push(
                new SpeedVisualizer(this.structure, speedCanvas, structure, distanceBetweenNodes)
            );
            speedCanvas.width = distanceBetweenNodes * this.domain.dx;
            speedCanvas.height = distanceBetweenNodes * this.domain.dy;

            var graphCanvas = document.getElementById('graphCanvas');
            this.visualizers.push(
                new DensityVisualizationGraph(this.structure, graphCanvas)
            );
            graphCanvas.width = distanceBetweenNodes * this.domain.dx;
            graphCanvas.height = distanceBetweenNodes * this.domain.dy;
        },

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
            console.log(this.structure.getDensity());
            this.collision();
            this.stream();
        },

        play: function() {
            window.requestAnimationFrame(this.update.bind(this));
        },

        update: function() {
            if (this.wait > 0) {
                this.wait --;
            } else {
                this.visualize();
                this.wait = 50;
            }

            this.run();

            if (this.running != 0) {
                this.running--;
                window.requestAnimationFrame(this.update.bind(this));
            }
        },


        runFor: function(iterations) {
            this.running = iterations;
            this.update();
            return this;
        },

        info: function(x, y) {
            console.table(
                this.structure.nodes[
                    this.structure.domainToIdx({x: x, y: y})
                ]
            );
        },

        visualize: function() {
            for (var i = 0; i < this.visualizers.length; i++) {
                this.visualizers[i].render();
            };
        }
    };

    return Simulation;
}();