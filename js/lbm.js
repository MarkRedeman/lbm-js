// first 2D, then
module.exports = function() {

    Simulation = function() {
        var config = require('./config');
        this.structure = this.initializeStructure(config);
        this.relaxationTime = config.get('relaxation-time');

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
            this.structure.forEachNode(function(node, idx) {
                var directions = that.getDirections();

                for (var k = 0; k < directions.length; k++) {
                    var direction = k;//directions[k];
                    var neighbour = that.getNeighbourOfNodeInDirection(idx, direction);
                    node.streamTo(direction, neighbour);
                };
            });
        },

        run: function() {
            // this.visualizer.keepRendering();
            this.stream();
            this.collide();
        }
    };

    return Simulation;
}();