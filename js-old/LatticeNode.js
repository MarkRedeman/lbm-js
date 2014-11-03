module.exports = function() {
    var Config = require('./config');

    var Node = function(distributions) {
        this.distributions = distributions.slice(0);
        this.newDistributions = distributions.slice(0);

        this.focus = false;
        this.secondaryFocus = false;
    }

    Node.prototype = {
        draw: function(context, radius) {
            if (this.isEmpty()) { return; }
            // Todo: draw distributions
            var velocitySet = Config.get('velocity-set');
            context.lineWidth = 2;
            context.strokeStyle = context.fillStyle = '#aaa';
            for (var i = 0; i < velocitySet.length; i++) {
                var set = velocitySet[i];
                this.drawArrow(context, set.x, set.y, this.distributions[i], radius);
            }

            // Draw the ndoe
            if (this.focus) {
                context.strokeStyle = context.fillStyle = '#486a96';
            } else if (this.secondaryFocus) {
                context.strokeStyle = context.fillStyle = 'limegreen';
            } else {
                context.strokeStyle = context.fillStyle = '#e65b47';
            }
            context.beginPath();
            context.arc(0, 0, radius / 2, 0, 2 * Math.PI);
            context.fill();


        },
        drawArrow: function(context, x, y, magnitude, maxMagnitude) {
            magnitude = magnitude * 250;
            if (magnitude > maxMagnitude) {
                magnitude = maxMagnitude;
            }
            // if (magnitude < 20) { magnitude = 20}

            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(magnitude * x, magnitude * y);
            context.stroke();
            // Draw the arrow
            context.translate((magnitude + 1) * x, (magnitude + 1) * y);
            context.rotate(Math.atan2(y, x) - 1.25 * Math.PI);
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(0, 8);
            context.lineTo(8, 0);
            context.fill();
            context.rotate(- Math.atan2(y, x) + 1.25 * Math.PI);
            context.translate( - (magnitude + 1) * x, - (magnitude + 1) * y);

        },
        stream: function(nodes) {
            // set
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].newDistributions[i] = this.distributions[i];
            };
        },
        collide: function() {
            // Complete the streaming step
            this.distributions = this.newDistributions.slice(0);
            // this.distributions = this.newDistributions;
            this.newDistributions = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            // // Apply collision rules
            var relaxationTime = Config.get('relaxation-time');
            var equilibrium = this.equilibrium();

            for (var i = 0; i < this.distributions.length; i++) {
                // this.distributions[i] = (1 -  1 /relaxationTime) * this.distributions[i] + equilibrium[i] / relaxationTime;
                this.distributions[i] = this.distributions[i] - (this.distributions[i] - equilibrium[i]) / relaxationTime;

                // (1 -  1 /relaxationTime) * this.distributions[i] + equilibrium[i] / relaxationTime;

                if (this.distributions[i] < 0) { console.log("Distribution is negative!", this.distributions[i]); }
            };
        },
        equilibrium: function() {
            var speedOfSoundSquared = Config.get('speed-of-sound-squared');
            var set                 = Config.get('velocity-set');

            var rho = this.density();
            var v = this.meanVelocity();
            var equilibrium = [];

            for (var i = 0; i < this.distributions.length; i++) {
                var distribution = this.distributions[i];
                var xi = {x: set[i].x, y: set[i].y};

                var cu = (v.x * xi.x + v.y * xi.y) / speedOfSoundSquared;

                equilibrium[i] = rho * set[i].w * (
                    1 + cu +
                    cu * cu / 2 +
                    (v.x * v.x + v.y * v.y) / (2 * speedOfSoundSquared)
                );
            };
            return equilibrium;
        },
        density: function() {
            var rho = 0;
            for (var i = 0; i < this.distributions.length; i++) {
                rho += this.distributions[i];
            };
            return rho;
        },
        meanVelocity: function() {
            var set = Config.get('velocity-set');
            var density = this.density();

            var u = {x: 0, y: 0};

            if (density === 0) {
                return u;
            }

            for (var i = 0; i < this.distributions.length; i++) {
                var distribution = this.distributions[i];
                u.x += set[i].x * distribution;
                u.y += set[i].y * distribution;
            };

            u.x = u.x / density;
            u.y = u.y / density;

            return u;
        },
        isEmpty: function() {
            return this.density() === 0;
        }
    }

    return Node;
}();