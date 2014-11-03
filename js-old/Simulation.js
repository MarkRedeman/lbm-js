module.exports = function() {
    var requestAnimationFrame = require('./RequstAnimationFrame');
    var Simulation = function(Grid, config) {
        console.log('Initializing simulation');

        this.config = config;

        this.canvas = document.getElementById('mpcCanvas');
        this.canvas.width  = 640 //window.innerWidth;
        this.canvas.height = 480 //window.innerHeight;

        this.context = this.canvas.getContext("2d");

        this.running = 0;
        this.wait = 0;


        this.bounds = {
            width: this.canvas.width,
            height: this.canvas.height
        }

        // Put a node on every 10th pixel
        var n = Math.ceil(this.bounds.width / 75);
        var m = Math.ceil(this.bounds.height / 100);
        this.grid = new Grid(n, m, this.bounds);

        this.draw();
    };

    Simulation.prototype = {
        update: function() {
            if (this.wait > 0) {
                this.wait --;
                window.requestAnimationFrame(this.update.bind(this));
            } else {
                this.grid.update();
                this.draw();

                if (this.running != 0) {
                    console.log('running');
                    this.running--;
                    this.wait = 20;
                    window.requestAnimationFrame(this.update.bind(this));
                }
            }
        },

        draw: function() {
            this.canvas.width  = this.canvas.width; //window.innerWidth;
            this.grid.draw(this.context);
        },

        run: function(iterations) {
            this.running = iterations;
            this.update();
            return this;
        }
    }

    return Simulation;
}();