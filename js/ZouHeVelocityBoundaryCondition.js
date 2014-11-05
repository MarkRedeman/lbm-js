module.exports = function() {
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
        },

        clearDistributions: function(distributions) {
            for (var k = 0; k < distributions.length; k++) {
                distributions[k] = 0;
            };
            return distributions;
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