// first 2D, then

Simulation = function() {
    this.config = require('config');
    this.structure = this.initializeStructure(config);
    this.relaxationTime = 1;
    // @TODO: create an awesome visualizer that has a node visualizer, structure
    // visualizer, domain visualizer etc.
    //
    // this.visualizer = new DomainVisualizer(this.structure, canvas);
    // this.statVisualizer = new StatVisualizer();
    // velocityVisualizer, densityVisualizer
}

Simulation.prototype = {
    initializeStructure: function(config) {
        // actually because dt = dx = dy we should only have to
        // give one size since the structure should be able to
        // calculate the amount of nodes from knowing the domain
        size = [1000, 1000];
        var structure = new LatticeStructure(config, size);

        return structure;
    },

    collision: function() {
        var nodes = this.structure.getNodes();
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].collide(this.relaxationTime);
        };
    },

    stream: function() {
        var nodes = this.structure.getNodes();
        var directions = this.structure.getDirections();

        for (var idx = 0; idx < nodes; idx++) {
            var node = nodes[idx];
            for (var k = 0; k < directions.length; k++) {
                var direction = directions[k];
                var neighbour = this.neighbourOfNodeInDirection(idx, direction);
                node.streamTo(direction, neighbour);
            };
        };
    },

    neighbourOfNodeInDirection: function(idx, direction) {
        return this.structure.getNeighbourOfNodeInDirection(idx, direction);
    }
};

// hodls the structure and knows where every neighbour is.
LatticeStructure = function(config, size) {
    this.velocitySet = config.get('velocity-set');
    this.domain = config.get('domain');
    this.nodes = this.initializeNodes(size);
}

LatticeStructure.prototype = {
    initializeNodes: function(size) {
        // @TODO: determine if size should be 1D, 2D, 3D, or any D
        var nodes = [];

        // It should automatically create appropriate ghost nodes for boundary conditions

    },

    getNodes: function() {
        return this.nodes;
    },

    getDirections: function() {
        // @TODO
        return this.velocitySet;
    },

    getOppositeDirection: function(direction) {

    }

    getNeighbourOfNodeInDirection: function(idx, direction) {
        // if it can't find a neighbouring node, then send a ghost node

    },

}

LatticeNode = function() {
    directions = null;

    this.distributions = [];
    this.newDistributions = [];
}

LatticeNode.prototype = {
    streamTo: function(direction, node) {
        distribution = this.getDistribution(direction);
        node.setDistribution(direction, distribution)
    }

    getDistribution: function(direction) {
        return this.distribution[direction];
    },

    setDistribution: function(direction, distribution) {
        this.newDistributions[direction] = distribution;
    },

    collide: function(relaxationTime) {
        // now that the streaming is done, we can forget our old distributions
        this.distributions = this.newDistributions.slice(0);
        this.newDistributions = this.clearDistributions(this.newDistributions);
        // do collision stuff
        var equilibrium = this.getEquilibrium();
        for (var k = 0; k < this.distributions.length; k++) {
            this.distributions[k] = this.distributions[k] -
                (this.distributions[k] - equilibrium[k]) / relaxationTime;

            if (this.distributions[k] < 0) {
                console.log("Distribution is negative!", this.distributions[k]);
            }
        };
    },

    clearDistributions: function(distributions) {
        for (var k = 0; k < distributions.length; k++) {
            distributions[k] = 0;
        };
        return distributions;
    }

    getEquilibrium: function() {
        var speedOfSoundSquared = Config.get('speed-of-sound-squared');
        var velocitySet         = Config.get('velocity-set');

        var rho = this.density();
        var v = this.getVelocity(density, velocitySet);
        var equilibrium = [];

        for (var i = 0; i < this.distributions.length; i++) {
            var distribution = this.distributions[i];
            var xi = {x: velocitySet[i].x, y: velocitySet[i].y};

            var cu = (v.x * xi.x + v.y * xi.y) / speedOfSoundSquared;

            equilibrium[i] = rho * set[i].w * (
                1 + cu +
                cu * cu / 2 +
                (v.x * v.x + v.y * v.y) / (2 * speedOfSoundSquared)
            );
        };
        return equilibrium;
    },

    getDensity: function() {
        var rho = 0;
        for (var k = 0; k < this.distributions.length; k++) {
            rho += this.distributions[k];
        };
        return rho;
    },

    getVelocity: function(density, velocitySet) {
        // zero vector
        var u = {x: 0, y: 0};

        if (density === 0) {
            return u;
        }

    }
}

GhostNode = function() {

}

GhostNode.prototype = {
    streamTo: function(direction, node) {

    },

    collide: function() {

    },

    setDistribution: function(direction, distribution) {

    }

}