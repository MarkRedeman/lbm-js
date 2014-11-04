module.exports = function() {
    var DensityVisualizationGraph = function(structure, canvas) {
        this.structure = structure;
        this.canvas = canvas;

        this.context = this.canvas.getContext("2d");

        var maxDensity = 0;
        this.structure.forEachNode(function(node, idx) {
            var density = node.getDensity();
            if (density > maxDensity) {
                maxDensity = density;
            }
        });
        this.maxDensity = maxDensity;
    }

    DensityVisualizationGraph.prototype = {
        render: function() {
            this.canvas.width = this.canvas.width;
            this.context.save();
            this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.context.scale(1, -1);
            this.context.translate(- this.canvas.width / 2, - this.canvas.height / 2);
            this.context.strokeStyle = 'red';
            this.context.lineWidth = 3;
            // this.context.translate(0, 0);
            var that = this;


            this.context.beginPath();

            var maxIdx = this.structure.nodes.length - 1;
            var widthMultiplier = this.canvas.width / maxIdx;
            var heightMutliplier = this.canvas.height / this.maxDensity;

            var node = this.structure.nodes[0];
            this.context.moveTo(0, heightMutliplier * node.getDensity());

            var that = this;
            this.structure.forEachNode(function(node, idx) {
                that.context.lineTo(widthMultiplier * idx, heightMutliplier * node.getDensity());
            });

            this.context.stroke();
            this.context.restore();
        },
    }

    return DensityVisualizationGraph;
}();