module.exports = function() {
    var Domain = function(config) {
        this.dx = 80;
        this.dy = 80;
        this.config = config;
        this.relaxationTime = this.config.get('relaxation-time');
    };

    Domain.prototype = {
        initializeNode: function(domainIdx) {

            var LatticeNode = require('./../LatticeNode');
            var NoSlipBounceBackNode = require('./../NoSlipBounceBackNode');
            var GhostNode = require('./../GhostNode');

            var distributions = this.initialDistributions(domainIdx);

            if (this.isOnWall(domainIdx)) {

            }

            if (this.isOnBoundary(domainIdx)) {
                return new NoSlipBounceBackNode(distributions, this.config.get('opposite-velocity-set'));
            }

            var node = new LatticeNode(distributions);

            return node;
        },

        isOnWall: function(domainIdx) {
            return domainIdx.y === 0;
        },

        isOnBoundary: function(domainIdx) {
            return (domainIdx.x === 0 || domainIdx.x === (this.dx - 1) ||
                domainIdx.y === 0 || domainIdx.y === (this.dy - 1));
        },

        initialDistributions: function(domainIdx) {
            var distributions = [];

            var velocitySet = this.config.get('velocity-set');

            for (var i = 0; i < velocitySet.length; i++) {
                // if (domainIdx.y > 70) {
                    distributions[i] = velocitySet[i].w;
                // } else {
                //     distributions[i] = 0;
                // }
            };

            return distributions;
        }
    }

    return Domain;
}();