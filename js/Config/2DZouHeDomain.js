module.exports = function() {
    var Domain = function(config) {
        this.dx = 20;
        this.dy = 80;
        this.config = config;
    };

    Domain.prototype = {
        initializeNode: function(domainIdx) {

            var LatticeNode = require('./../LatticeNode');
            var NoSlipBounceBackNode = require('./../NoSlipBounceBackNode');
            var ZouHeVelocityBoundary = require('./../ZouHeVelocityBoundaryCondition');
            var GhostNode = require('./../GhostNode');

            var distributions = this.initialDistributions(domainIdx);
            // moving wall to the right
            var velocity = { x: 0.1, y: 0 };

            if (this.isOnWall(domainIdx) && ! this.isCorner(domainIdx)) {
                // if is corner
                return new ZouHeVelocityBoundary(distributions, velocity, 'N');
            }

            if (this.isOnBoundary(domainIdx)) {
                return new NoSlipBounceBackNode(distributions, this.config.get('opposite-velocity-set'));
            }

            var node = new LatticeNode(distributions);

            return node;
        },

        isCorner: function(domainIdx) {
            return domainIdx.x === 0             && domainIdx.y === 0 ||
                   domainIdx.x === (this.dx - 1) && domainIdx.y === 0 ||
                   domainIdx.x === 0             && domainIdx.y === (this.dy - 1) ||
                   domainIdx.x === (this.dx - 1) && domainIdx.y === (this.dy - 1);
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