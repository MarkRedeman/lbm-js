module.exports = function() {
    GhostNode = function() {
        this.type = 'ghost';
    }

    GhostNode.prototype = {
        streamTo: function(direction, node) {

        },

        collide: function() {

        },

        setDistribution: function(direction, distribution) {

        },

        getDistribution: function() {
            return 0;
        },

    }

    return GhostNode;
}();