// first 2D, then
module.exports = function() {

    Simulation = function() {
        var config = require('./config');
        var Domain = require('./Config/2DZouHeDomain');
        this.domain = new Domain(config);
        this.structure = this.initializeStructure(config);
        this.relaxationTime = this.domain.relaxationTime;
        console.log("relaxationTime: ", this.relaxationTime);

        this.initializeVisualizers();
    }

    Simulation.prototype = {
        initializeVisualizers: function() {
            var Factory = require('./Visualizers/Factory');
            var factory = new Factory(this.structure, this.domain);
            this.visualizers = factory.build();
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
            this.visualizers.visualize();
        }
    };

    return Simulation;
}();