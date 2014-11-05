// hodls the structure and knows where every neighbour is.
module.exports = function() {
    var GhostNode = require('./GhostNode');

    LatticeStructure = function(config) {
        // velocity set
        this.velocitySet = config.get('velocity-set');
        this.oppositeDirections = config.get('opposite-velocity-set');

        // amount of nodes in x and y direction
// 2DZouHeDomain
        var Domain = require('./Config/2DZouHeDomain');
        var domain = new Domain(config);
        // var domain = require(config.get('domain'));
        this.nx = domain.dx;
        this.ny = domain.dy;
        this.initializeNodes(domain);
    }

    LatticeStructure.prototype = {
        initializeNodes: function(domain) {
            // @TODO: determine if size should be 1D, 2D, 3D, or any D
            this.nodes = [];

            for (var i = 0; i < this.nx; i++) {
                for (var j = 0; j < this.ny; j++) {
                    var domainIdx = {x: i, y: j};
                    var idx = this.domainToIdx(domainIdx);
                    this.nodes[idx] = domain.initializeNode(domainIdx);
                };
            };
            // It should automatically create appropriate ghost nodes for boundary conditions

        },

        forEachNode: function(callable) {
            for (var idx = 0; idx < this.nodes.length; idx++) {
                var node = this.nodes[idx];
                callable(node, idx);
            };
        },

        getNodes: function() {
            return this.nodes;
        },

        getDirections: function() {
            // @TODO
            return this.velocitySet;
        },

        getOppositeDirection: function(direction) {
            return this.oppositeDirections[direction];
        },

        getNeighbourOfNodeInDirection: function(idx, direction) {
            // if it can't find a neighbouring node, then send a ghost node
            var domainIdx = this.idxToDomain(idx);

            domainIdx.x += this.velocitySet[direction].dx;
            domainIdx.y -= this.velocitySet[direction].dy;

            if (! this.isInDomain(domainIdx)) {
                return this.ghostNode(domainIdx);
            }

            neighbourIdx = this.domainToIdx(domainIdx);
            return this.nodes[neighbourIdx];
        },

        idxToDomain: function(idx) {
            x = idx % this.nx;
            y = Math.floor(idx / this.nx);
            return {x: x, y: y};
        },

        domainToIdx: function(domainIdx) {
            idx = domainIdx.y * this.nx + domainIdx.x;

            return idx;
        },

        isInDomain: function(domainIdx) {
            return domainIdx.x >= 0 && domainIdx.x < (this.nx) &&
                    domainIdx.y >= 0 && domainIdx.y < (this.ny);
        },

        ghostNode: function(domainIdx) {
            return new GhostNode;
        },

        getDensity: function() {
            density = 0;

            for (var i = 0; i < this.nodes.length; i++) {
                density += this.nodes[i].getDensity();
            };

            return density;
        }
    }

    return LatticeStructure;
}();