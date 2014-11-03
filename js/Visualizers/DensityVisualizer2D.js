module.exports = function() {
    var DensityVisualizer2D = function(structure, canvas, visualizer) {
        this.structure = structure;
        this.canvas = canvas;
        this.visualizer = visualizer;
    }

    DensityVisualizer2D.prototype = {
        render: function() {
            this.visualizer.render();

        },

        keepRendering: function() {
            this.animation = null;
        },

        stopRendering: function() {

        }
    }
}