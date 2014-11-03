module.exports = function() {
    var LatticeStructureVisualizer2D = function(structure, canvas, visualizer) {
        this.structure = structure;
        this.canvas = canvas;
        this.visualizer = visualizer;
    };

    LatticeStructureVisualizer2D.prototype = {
        render: function() {
            var that = this;

            this.structure.forEachNode(function(node, idx) {

            });
        },

        that.drawNode: function(x, y) {

        },

        that.drawConnection: function(node1, node2) {

        }
    }
}