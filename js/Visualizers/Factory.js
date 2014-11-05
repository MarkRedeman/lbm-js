module.exports = function() {
    var Factory = function(structure, domain) {
        this.structure = structure;
        this.domain = domain;
    }

    Factory.prototype = {
        // TODO: make it more dynamic
        build: function() {
            var Visualizers = require('./Visualizers');
            visualizers = new Visualizers;
            var distanceBetweenNodes = 5;

            var StructureVisualizer = require('./LatticeStructureVisaualizer2D');
            var DensityVisualizer = require('./DensityVisualizer2D');
            var SpeedVisualizer = require('./SpeedVisualizer2D');
            var DensityVisualizationGraph = require('./DensityVisualizationGraph');

            var denstiyCanvas = document.getElementById('densityCanvas');
            var structure = new StructureVisualizer(this.structure, denstiyCanvas, distanceBetweenNodes);
            visualizers.add(
                new DensityVisualizer(this.structure, denstiyCanvas, structure, distanceBetweenNodes)
            );
            // Draw each node
            denstiyCanvas.width = distanceBetweenNodes * this.domain.dx;
            denstiyCanvas.height = distanceBetweenNodes * this.domain.dy;

            var speedCanvas = document.getElementById('speedCanvas');
            var structure = new StructureVisualizer(this.structure, speedCanvas, distanceBetweenNodes);
            visualizers.add(
                new SpeedVisualizer(this.structure, speedCanvas, structure, distanceBetweenNodes)
            );
            speedCanvas.width = distanceBetweenNodes * this.domain.dx;
            speedCanvas.height = distanceBetweenNodes * this.domain.dy;

            var graphCanvas = document.getElementById('graphCanvas');
            visualizers.add(
                new DensityVisualizationGraph(this.structure, graphCanvas)
            );
            graphCanvas.width = distanceBetweenNodes * this.domain.dx;
            graphCanvas.height = distanceBetweenNodes * this.domain.dy;

            return visualizers;
        }
    }

    return Factory;
}()