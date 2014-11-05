module.exports = function() {
    var DensityVisualizer2D = function(structure, canvas, visualizer, distanceBetweenNode) {
        this.structure = structure;
        this.canvas = canvas;
        this.visualizer = visualizer;
        this.distanceBetweenNode = distanceBetweenNode || 20;

        this.context = this.canvas.getContext("2d");
    }

    DensityVisualizer2D.prototype = {
        render: function() {
            this.canvas.width = this.canvas.width;

            var that = this;
            this.structure.forEachNode(function(node, idx) {
                var domainIdx = that.structure.idxToDomain(idx);
                that.drawNode(domainIdx, node);
            });

            this.visualizer.render();
        },

        drawNode: function(domainIdx, node) {
            var radius = 5;

            var context = this.context;
            context.save();
            context.translate(
                domainIdx.x * this.distanceBetweenNode,
                domainIdx.y * this.distanceBetweenNode
            );
            alpha = Math.min(1, Math.max(node.getDensity(), 0));
            context.fillStyle = 'rgba(32, 72, 155, ' + alpha + ')';// '#3367d5';
            context.fillRect(0 , 0, this.distanceBetweenNode, this.distanceBetweenNode);

            context.restore();
        },

        keepRendering: function() {
            window.requestAnimationFrame(this.update.bind(this));
        },

        stopRendering: function() {
        }
    }

    return DensityVisualizer2D;
}();