module.exports = function() {
    var Visualizers = function() {
        this.visualizers = [];
    }

    Visualizers.prototype = {
        add: function(visualizer) {
            this.visualizers.push(visualizer);
        },

        visualize: function() {
            for (var i = 0; i < this.visualizers.length; i++) {
                this.visualizers[i].render();
            };
        }
    }

    return Visualizers;
}();