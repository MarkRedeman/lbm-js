module.exports = function() {
    var Rainbow = require('./Rainbow.js');

    var SpeedVisualizer2D = function(structure, canvas, visualizer, distanceBetweenNode) {
        this.structure = structure;
        this.canvas = canvas;
        this.visualizer = visualizer;
        this.distanceBetweenNode = distanceBetweenNode || 20;

        this.map = new Rainbow();
        this.map.setNumberRange(0, 0.1);
        this.map.setSpectrum('blue', 'green', 'yellow', 'red');

        this.context = this.canvas.getContext("2d");
    }

    SpeedVisualizer2D.prototype = {
        render: function() {
            this.canvas.width = this.canvas.width;

            var that = this;
            var maxVelocity = 0.0001;
            this.structure.forEachNode(function(node, idx) {
                var velocity = node.getVelocity(node.getDensity(), that.structure.velocitySet);
                velocity = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

                if (velocity > maxVelocity) {
                    maxVelocity = velocity;
                }
            });
            maxVelocity = maxVelocity;
            console.log(maxVelocity);
            this.map.setNumberRange(0, maxVelocity);

            this.structure.forEachNode(function(node, idx) {
                var domainIdx = that.structure.idxToDomain(idx);
                that.drawNode(domainIdx, node);
            });

            if (this.visualizer) {
                this.visualizer.render();
            }
        },

        drawNode: function(domainIdx, node) {
            var context = this.context;
            context.save();
            context.translate(
                domainIdx.x * this.distanceBetweenNode,
                domainIdx.y * this.distanceBetweenNode
            );

            var velocity = node.getVelocity(node.getDensity(), this.structure.velocitySet);
            velocity = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            context.fillStyle = '#' + this.map.colourAt(velocity);
            context.fillRect(0 , 0, this.distanceBetweenNode, this.distanceBetweenNode);

            context.restore();
        },

        keepRendering: function() {
            window.requestAnimationFrame(this.update.bind(this));
        },

        stopRendering: function() {
        },
    }

    return SpeedVisualizer2D;
}();