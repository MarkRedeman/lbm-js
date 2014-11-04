module.exports = function() {
    var DensityVisualizer2D = function(structure, canvas, visualizer) {
        this.structure = structure;
        this.canvas = canvas;
        this.visualizer = visualizer;


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
            var distanceBetweenNode = 20;

            var context = this.context;
            context.save();
            context.translate(
                domainIdx.x * distanceBetweenNode,
                domainIdx.y * distanceBetweenNode
            );
            alpha = Math.min(1, Math.max(node.getDensity(), 0));
            // console.log(alpha);
            context.fillStyle = 'rgba(32, 72, 155, ' + alpha + ')';// '#3367d5';
            context.fillRect(0 , 0, distanceBetweenNode, distanceBetweenNode);

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