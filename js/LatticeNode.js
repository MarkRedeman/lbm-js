module.exports = function() {
    var Config = require('./config');

    LatticeNode = function(distributions) {
        directions = null;
        this.type = 'lattice';
        this.distributions = distributions;
        this.newDistributions = distributions.slice(0);
    }

    LatticeNode.prototype = {
        streamTo: function(direction, node) {
            distribution = this.getDistribution(direction);
            node.setDistribution(direction, distribution)
        },

        getDistribution: function(direction) {
            return this.distributions[direction];
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
            var velocitySet = Config.get('velocity-set');
            // var force = 10;
            for (var k = 0; k < this.distributions.length; k++) {
                    this.distributions[k] = this.distributions[k] -
                        (this.distributions[k] - equilibrium[k]) / relaxationTime;
                         // + 3 * velocitySet[k].dy * velocitySet[k].w * force;

                if (this.distributions[k] < 0) {
                    // console.log("Distribution is negative!", this.distributions[k]);
                }
            };
        },

        clearDistributions: function(distributions) {
            for (var k = 0; k < distributions.length; k++) {
                distributions[k] = 0;
            };
            return distributions;
        },


        getEquilibrium: function() {
            var speedOfSoundSquared = Config.get('speed-of-sound-squared');
            var velocitySet         = Config.get('velocity-set');

            var density = this.getDensity();
            var v = this.getVelocity(density, velocitySet);
            var equilibrium = [];

            for (var i = 0; i < this.distributions.length; i++) {
                var distribution = this.distributions[i];
                var xi = {x: velocitySet[i].dx, y: velocitySet[i].dy};

                var cu = (v.x * xi.x + v.y * xi.y) / speedOfSoundSquared;

                equilibrium[i] = density * velocitySet[i].w * (
                    1 + cu +
                    cu * cu / 2 -
                    (v.x * v.x + v.y * v.y) / (2 * speedOfSoundSquared)
                );
            };
            return equilibrium;
        },

        getDensity: function() {
            var density = 0;
            for (var k = 0; k < this.distributions.length; k++) {
                density += this.distributions[k];
            };
            return density;
        },

        getVelocity: function(density, velocitySet) {
            // zero vector
            var u = {x: 0, y: 0};

            if (density === undefined) {
                density = this.getDensity();
            }

            if (density === 0) {
                return u;
            }

            for (var i = 0; i < this.distributions.length; i++) {
                var distribution = this.distributions[i];
                u.x += velocitySet[i].w * velocitySet[i].dx * distribution;
                u.y += velocitySet[i].w * velocitySet[i].dy * distribution;
            };

            u.x = u.x / density;
            u.y = u.y / density;

            return u;

        },
    }

    return LatticeNode;
}();