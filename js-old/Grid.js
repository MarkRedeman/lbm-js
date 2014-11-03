module.exports = function() {
    var Node = require('./LatticeNode');
    var Config = require('./config');

    var Grid = function (n, m, bounds) {
        this.nodes = this.createLatticeNodes(n, m);

        this.nodes[Math.ceil(n / 2)][Math.ceil(m / 2) - 1].focus = true;
        var neighbours = this.getNeighbouringNodes(Math.ceil(n / 2), Math.ceil(m / 2) - 1);
        for (var i = 0; i < neighbours.length; i++) {
            neighbours[i].secondaryFocus = true;
        };

        this.bounds = bounds;
    };

    Grid.prototype = {
        createLatticeNodes: function(n, m) {
            console.log('Creating a ' + n + ' by ' + m + ' lattice grid.');
            var nodes = [];

            for (var x = 0; x < n; x++) {
                nodes[x] = [];
                for (var y = 0; y < m; y++) {
                    var distributions = Config.get('initial-distributions')(x, y);
                    // distributions   = [0, 0, 0, 0, 0, 0, 0, 0, 0];
                    nodes[x][y] = new Node(distributions);
                };
            };

            var distributions = Config.get('initial-distributions')(Math.ceil(n / 2), Math.ceil(m / 2) - 1);
            nodes[Math.ceil(n / 2)][Math.ceil(m / 2) - 1] = new Node(distributions);

            return nodes;
        },
        forEachNode: function(callback) {
            for (var x = 0; x < this.nodes.length; x++) {
                if (this.nodes[x] === undefined) { this.nodes[x] = []; }
                for (var y = 0; y < this.nodes[x].length; y++) {
                    callback(x, y);
                };
            };
        },
        draw: function(context) {
            // Uniformly draw nodes on the canvas
            var that = this;

            this.forEachNode(function(x, y) {
                var radius = Math.sqrt(
                    (that.bounds.width / (that.nodes.length - 1) ) * (that.bounds.width / (that.nodes.length - 1) ) +
                    (that.bounds.height / (that.nodes[x].length - 1) ) * (that.bounds.height / (that.nodes[x].length - 1) )
                ) / 4;

                context.save();

                var position = that.getNodePosition(x, y);

                context.translate(position.x, position.y);
                // draw awesome background
                // context.moveTo(x, y);
                // context.lineTo(x, y);
                // context.stroke();
                // context.fillRect(x, y, width, height)
                that.getNode(x, y).draw(context, radius);

                context.restore();

                // that.drawNodeGrid(context, x, y);
            });
        },
        drawNodeGrid: function(context, x, y) {
            var position = this.getNodePosition(x, y);
            var neighbours = this.getNeighbouringNodes(x, y);

            var velocitySet = Config.get('velocity-set');

            for (var i = 0; i < velocitySet.length; i++) {
                var set = velocitySet[i];
                var nextSet = velocitySet[i + 1 % velocitySet.length];

                this.getNode(x + set.x, y + set.y);
                this.getNode(x + nextSet.x, y + nextSet.y);

                first_neightbour_position = this.getNodePosition(x + set.x, y + set.y);
                next_neightbour_position = this.getNodePosition(x + nextSet.x, y + nextSet.y);

                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(first_neightbour_position.x, first_neightbour_position.y);
                context.lineTo(next_neightbour_position.x, next_neightbour_position.y);
                // context.fill();
                context.stroke();

            };

            for (var i = 0; i < neighbours.length; i++) {
                var neighbour = neighbours[i];
                var position_neighbour = this.getNodePosition(x, y);
                context.moveTo()
            };
            context.moveTo(position.x, position.y);
        },

        update: function() {
            var that = this;
            // Check for mouseover
            this.forEachNode(that.updateMouseOver);

            // stream step
            this.forEachNode(function(x, y) {
                that.getNode(x, y).stream(that.getNeighbouringNodes(x, y));
            });

            // collisions step
            this.forEachNode(function(x, y) {
                that.getNode(x, y).collide();
            });

        },
        updateMouseOver: function(x, y) {
            mouse = {
                x: 0,
                y: 0
            };


        },
        // Returns an object containing neighbouring nodes of a node
        getNeighbouringNodes: function(x, y) {
            var velocitySet = Config.get('velocity-set');
            var nodes = [];

            for (var i = 0; i < velocitySet.length; i++) {
                var set = velocitySet[i];
                // nodes[nodes.length] = this.getNode(x + set.x, y + set.y);
                if (this.nodeExists(x + set.x, y + set.y)) {
                    nodes[nodes.length] = this.nodes[x + set.x][y + set.y];
                } else {
                    nodes[nodes.length] = this.createGhostNode(x + set.x, y + set.y);
                }
            };

            return nodes;
        },
        // Domain position
        // Use dx and dy to find the appropriate position
        getNodePosition: function(x, y) {
            // TODO: dit is niet meer goed omdat de lengte flexibel is
            return {
                x: x * this.bounds.width / (this.nodes.length - 1) ,
                y: y * this.bounds.height / (this.nodes[x].length - 1)
            };
        },
        nodeExists: function(x, y) {
            return (x >= 0 && x < this.nodes.length) && (y >= 0 && y < this.nodes[x].length);
        },
        createGhostNode: function(x, y) {
            // Do periodic boundary

            x = x % this.nodes.length;
            if (x < 0) {
                x += this.nodes.length
            }

            y = y % this.nodes[x].length;
            if (y < 0) {
                y += this.nodes[x].length
            }

            return this.getNode(x, y);


            return new Node(Config.get('initial-distributions')(x, y));
        },
        // This method grabs a node in a flexible way: that is, if a node is nonexistent, then it will create a new one. Furthermore it can create
        // nodes with negative x and y position by using the bijection f(x) = { x / 2 if x == 2k, (x - 1) / 2 if x == 2k + 1}
        getNode: function(x, y) {
            if (this.nodes.length < x) {
                this.nodes[x] = [];
            }
            if (this.nodes[x].length < y || this.nodes[x][y] === undefined) {
                this.nodes[x][y] = new Node([0, 0, 0, 0, 0, 0, 0, 0, 0]);
            }
            return this.nodes[x][y];
        },
        density: function() {
            var that = this;
            var density = 0;
            this.forEachNode(function(x, y) {
                density += that.getNode(x, y).density();
            })
            return density;
        }
    }

    return Grid;
}();