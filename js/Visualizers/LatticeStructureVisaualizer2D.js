module.exports = function() {
    var LatticeStructureVisualizer2D = function(structure, canvas, visualizer, distanceBetweenNode) {
        this.structure = structure;
        this.canvas = canvas;
        this.visualizer = visualizer;
        this.distanceBetweenNode = distanceBetweenNode || 20;

        this.context = this.canvas.getContext("2d");
    };

    LatticeStructureVisualizer2D.prototype = {
        render: function() {
            var that = this;

            this.structure.forEachNode(function(node, idx) {
                var domainIdx = that.structure.idxToDomain(idx);
                that.drawNode(domainIdx, node);
            });
        },

        drawNode: function(domainIdx, node) {
            var radius = 5;
            var context = this.context;
            context.save();
            context.translate(
                domainIdx.x * this.distanceBetweenNode + this.distanceBetweenNode / 2,
                domainIdx.y * this.distanceBetweenNode + this.distanceBetweenNode / 2
            );
            // Draw the ndoe
            switch (node.type) {
                case "lattice":
                    if (node.position === undefined)
                        context.strokeStyle = context.fillStyle = '#486a96';
                    else
                        context.strokeStyle = context.fillStyle = 'red';
                break;
                case "boundary":
                    context.strokeStyle = context.fillStyle = 'limegreen';
                break;
                case "ghost":
                    context.strokeStyle = context.fillStyle = '#e65b47';
                break;
            }

            context.beginPath();
            context.arc(0, 0, radius / 2, 0, 2 * Math.PI);
            context.fill();

            var velocity = node.getVelocity(node.getDensity(), this.structure.velocitySet);
            this.drawArrow(context, velocity.x, velocity.y, 20);

            context.restore();
        },

        drawArrow: function(context, x, y, magnitude, maxMagnitude) {
            // make arrows unit
            context.strokeStyle = 'red';
            speed = Math.sqrt(x * x + y * y);

            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(magnitude * x / speed, magnitude * y / speed);
            context.stroke();
        },

        drawConnection: function(node1, node2) {

        }
    }

    return LatticeStructureVisualizer2D;
}();