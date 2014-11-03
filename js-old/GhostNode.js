/**
*   Ghost Node
*   ----------
*   A ghost node is a node which is not on the grid and has a behaviour corresponding to boundary conditions
*
*/
// describe("ghost nodes")
            //     a ghost node is influenced by boundary conditions
            //     can be periodic
            //     or bounce back etc.
module.exports = function() {
    var GhostNode = function(distributions, behaviour) {
        this.distributions = distributions;
        this.newDistributions = distributions;

        // Behaviour can be a callback
        this.behaviour = behaviour;
    }

    GhostNode.prototype = {

    }

    return GhostNode;
}();