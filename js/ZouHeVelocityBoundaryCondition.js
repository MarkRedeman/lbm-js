module.exports = function() {
    var Config = require('./config');
    // For D2Q9
    var ZouHeVelocityBoundaryCondition = function(distributions, velocity, position) {
        this.type = 'lattice';

        this.position = position; // N, E, S, W
                                // NE, SE, SW, NW
        this.velocity = velocity;

        // this.clearDistributions(distributions);
        this.distributions = distributions;
        this.newDistributions = distributions.slice(0);
    }

    ZouHeVelocityBoundaryCondition.prototype = {
        streamTo: function(direction, node) {
            distribution = this.getDistribution(direction);
            node.setDistribution(direction, distribution);
        },

        getDistribution: function(direction) {
            return this.distributions[direction];
        },

        setDistribution: function(direction, distribution) {
            this.newDistributions[direction] = distribution;
        },

        collide: function(relaxationTime) {
            this.distributions = this.newDistributions.slice(0);
            this.newDistributions = this.clearDistributions(this.newDistributions);

            var density = this.getDensity();

            this.distributions[4] = this.distributions[2] - 3 * density * this.velocity.y / 2;
            this.distributions[7] = this.distributions[5] + (this.distributions[1] - this.distributions[3]) / 2 - density * this.velocity.y / 6 - density * this.velocity.x / 2;
            this.distributions[8] = this.distributions[6] + (this.distributions[3] - this.distributions[1]) / 2 - density * this.velocity.y / 6 + density * this.velocity.x / 2;

            // var equilibrium = this.getEquilibrium();
            // var velocitySet = Config.get('velocity-set');
            // // var force = 10;
            // for (var k = 0; k < this.distributions.length; k++) {
            //         this.distributions[k] = this.distributions[k] -
            //             (this.distributions[k] - equilibrium[k]) / relaxationTime;
            //              // + 3 * velocitySet[k].dy * velocitySet[k].w * force;

            //     if (this.distributions[k] < 0) {
            //         // console.log("Distribution is negative!", this.distributions[k]);
            //     }
            // };
            // var density = this.getDensity();

            // this.distributions[4] = this.distributions[2] - 3 * density * this.velocity.y / 2;
            // this.distributions[7] = this.distributions[5] + (this.distributions[1] - this.distributions[3]) / 2 - density * this.velocity.y / 6 - density * this.velocity.x / 2;
            // this.distributions[8] = this.distributions[6] + (this.distributions[3] - this.distributions[1]) / 2 - density * this.velocity.y / 6 + density * this.velocity.x / 2;
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

            switch (this.position) {
                case 'N':
                    density = (1 / (1 + this.getVelocity().y)) * (
                        this.distributions[0] + this.distributions[1]+ this.distributions[3] +
                        2 * (this.distributions[2] + this.distributions[5] - this.distributions[6])
                    );
                break;
                case 'E':
                break;
                case 'S':
                break;
                case 'W':
                break;

                case 'NE':
                break;
                case 'NW':
                break;

                case 'SE':
                break;
                case 'SW':
                break;
            }
            return density;
        },

        getVelocity: function(density, velocitySet) {
            return this.velocity;
        },
    }

    return ZouHeVelocityBoundaryCondition;
}();