module.exports = function() {
    var NoSlipBounceBackNode = function() {
        this.type = 'boundary';
    }

    NoSlipBounceBackNode.prototype = {
        streamTo: function(direction, node) {
            distribution = this.getDistribution(direction);
            node.setDistribution(direction, distribution)
        },

        getDistribution: function(direction) {
            return 0; //this.distribution[direction];
        },

        setDistribution: function(direction, distribution) {
            this.newDistributions[direction] = distribution;
        },
    }

    return NoSlipBounceBackNode;
}();