module.exports = function() {
    var requestAnimationFrame = require('./RequstAnimationFrame');
    var Simulation = function(Grid, config) {
        console.log('Starting simulation');

        this.config = config;

        this.canvas = document.getElementById('mpcCanvas');
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.context = this.canvas.getContext("2d");

        this.running = 0;
        this.wait = 0;


        this.bounds = {
            width: this.canvas.width,
            height: this.canvas.height
        }

        // Put a node on every 10th pixel
        var n = Math.ceil(this.bounds.width / 75);
        var m = Math.ceil(this.bounds.height / 10w0);
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
            this.canvas.width  = window.innerWidth;
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

/*
Simulation.prototype.createGrid = function(n, m) {
        this.grid = new Grid(n, m, this.bounds.x, this.bounds.y, 0, 0);
    }

    Simulation.prototype.draw = function() {
        for (var j = 0; j < this.particles.length; j++) {
            var particle = this.particles[j];
            particle.draw(this.context);
        };
        this.drawGrid();
    }

    Simulation.prototype.drawGrid = function() {
        if (! this.shouldDrawGrid) { return; }
        this.grid.draw(this.context);
    }

    Simulation.prototype.update = function() {
        this.canvas.width = this.canvas.width;
        if (this.streamSteps != 0) {
            this.grid.emptyCells();
            this.stream();
            this.draw();

        } else if (this.playsteps != 0) {
            this.collide(this.alpha);
            this.draw();

            this.grid.reset();
            this.playsteps--;
            // We want another collision, but that means we first need to stream
            if (this.playsteps != 0) { this.streamSteps = 30; }
        }

        if (this.playsteps != 0 || this.streamSteps != 0) {
            window.requestAnimationFrame(this.update.bind(this));
        }
    };

    Simulation.prototype.play = function(steps) {
        this.playsteps = steps;
        this.streamSteps = 60;
        this.update();
    }

    Simulation.prototype.stream = function() {
        for (var j = 0; j < this.particles.length; j++) {
            var particle = this.particles[j];
            particle.update(this.bounds);

            this.grid.findCell(particle.x, particle.y).addParticle(particle);
        };

        this.streamSteps--;
    };

    Simulation.prototype.collide = function(alpha) {
        this.grid.applyCollisions(alpha);
    };

    Simulation.prototype.createParticles = function(n, space) {
        this.particles = [];
        var magnitude = 10;
        var tvx = 0;
        var tvy = 0;
        for (var i = 0; i < n; i++) {
            x = Math.random() * this.bounds.x;
            y = Math.random() * this.bounds.y;
            vx = Math.random() * (magnitude * 2) - magnitude;
            vy = Math.random() * (magnitude * 2) - magnitude;

            tvx += vx;
            tvy += vy;

            this.particles[i] = new Particle(x, y, vx, vy);
        };
        avx = tvx / n;
        avy = tvy / n;
        // Normalize velocities
        for (var i = 0; i < n; i++) {
            this.particles[i].vx -= avx;
            this.particles[i].vy -= avy;
        };

        // Setup termperature
        var temp = 0;
        for (var i = 0; i < n; i++) {
            temp += Math.pow(this.particles[i].vx, 2) + Math.pow(this.particles[i].vy, 2);
        };
        temp = temp / (2 * n)
        temp = Math.sqrt(this.temperature / temp);
        tempx = temp * this.grid.n / (this.grid.width);
        tempy = temp * this.grid.m / (this.grid.height);
        temp = Math.sqrt(tempx * tempx + tempy * tempy) * 10;
        for (var i = 0; i < n; i++) {
            this.particles[i].vx *= temp;
            this.particles[i].vy *= temp;
            // this.particles[i].vx += 5;
        };

        this.particles[0].follow = true;
    };

*/