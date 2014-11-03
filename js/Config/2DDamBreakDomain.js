module.exports = function() {
    var Domain = function(velocitySet) {
        this.dx = 100;
        this.dy = 100;
        this.velocitySet = velocitySet;
    };

    Domain.prototype = {
        initializeNode: function(domainIdx) {

            var LatticeNode = require('./../LatticeNode');
            var NoSlipBounceBackNode = require('./../NoSlipBounceBackNode');
            var GhostNode = require('./../GhostNode');

            if (this.isOnBoundary(domainIdx)) {
                return new NoSlipBounceBackNode();
            }

            var node = new LatticeNode();

            return node;
        },

        isOnBoundary: function(domainIdx) {
            return (domainIdx == 0 || domainIdx.x == this.dx || domainIdx.y == 0 || domainIdx.y == this.dy);
        },

        initialDistributions: function(domainIdx) {
            var distributions = [];

            for (var i = 0; i < this.velocitySet.length; i++) {
                distributions[i] = this.velocitySet[i].w;
            };

            return distributions;
        }
    }

    return Domain;
}();