module.exports = function() {
    var NoSlipBounceBackNode = function(distributions, oppositeDirection) {
        this.type = 'boundary';
        this.oppositeDirection = oppositeDirection;

        this.clearDistributions(distributions);
        this.distributions = distributions;
        this.newDistributions = distributions.slice(0);
    }

    NoSlipBounceBackNode.prototype = {
        streamTo: function(direction, node) {
            return;
            if (node.type == "lattice") {
                distribution = this.getDistribution(direction);
                node.setDistribution(direction, distribution);
            }
        },

        applyBoundary: function(direction, node) {
            if (node.type == "lattice") {
                distribution = this.getDistribution(direction);
                node.setDistribution(direction, distribution);
            }
            this.setDistribution(this.oppositeOf(direction), 0);
        },

        getDistribution: function(direction) {
            return this.distributions[this.oppositeOf(direction)];
        },

        setDistribution: function(direction, distribution) {
            this.distributions[direction] = distribution;
        },

        oppositeOf: function(direction) {
            return this.oppositeDirection[direction];
        },

        collide: function(relaxationTime) {
            this.distributions = this.newDistributions.slice(0);
            this.newDistributions = this.clearDistributions(this.newDistributions);
        },

        clearDistributions: function(distributions) {
            for (var k = 0; k < distributions.length; k++) {
                distributions[k] = 0;
            };
            return distributions;
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

    return NoSlipBounceBackNode;
}();