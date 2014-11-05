(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = function() {
    var Domain = function(config) {
        this.dx = 128;
        this.dy = 128;
        this.vx = 0.05;
        this.config = config;
        var Reynolds = 100;// config.get('Re');
        var nu = this.vx * this.dx / Reynolds;
        this.relaxationTime = 3 * nu + 1 / 2;

        // this.relaxationTime = this.config.get('relaxation-time');
    };

    Domain.prototype = {
        initializeNode: function(domainIdx) {

            var LatticeNode = require('./../LatticeNode');
            var NoSlipBounceBackNode = require('./../NoSlipBounceBackNode');
            var ZouHeVelocityBoundary = require('./../ZouHeVelocityBoundaryCondition');
            var GhostNode = require('./../GhostNode');

            var distributions = this.initialDistributions(domainIdx);
            // moving wall to the right
            var velocity = { x: this.vx, y: 0 };

            if (this.isOnWall(domainIdx) && ! this.isCorner(domainIdx)) {
                // if is corner
                return new ZouHeVelocityBoundary(distributions, velocity, 'N');
            }

            if (this.isOnBoundary(domainIdx)) {
                return new NoSlipBounceBackNode(distributions, this.config.get('opposite-velocity-set'));
            }

            var node = new LatticeNode(distributions);

            return node;
        },

        isCorner: function(domainIdx) {
            return domainIdx.x === 0             && domainIdx.y === 0 ||
                   domainIdx.x === (this.dx - 1) && domainIdx.y === 0 ||
                   domainIdx.x === 0             && domainIdx.y === (this.dy - 1) ||
                   domainIdx.x === (this.dx - 1) && domainIdx.y === (this.dy - 1);
        },

        isOnWall: function(domainIdx) {
            return domainIdx.y === 0;
        },

        isOnBoundary: function(domainIdx) {
            return (domainIdx.x === 0 || domainIdx.x === (this.dx - 1) ||
                domainIdx.y === 0 || domainIdx.y === (this.dy - 1));
        },

        initialDistributions: function(domainIdx) {
            var distributions = [];

            var velocitySet = this.config.get('velocity-set');

            for (var i = 0; i < velocitySet.length; i++) {
                // if (domainIdx.y > 70) {
                    distributions[i] = velocitySet[i].w;
                // } else {
                //     distributions[i] = 0;
                // }
            };

            return distributions;
        }
    }

    return Domain;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Config/2DZouHeDomain.js","/Config")
},{"./../GhostNode":2,"./../LatticeNode":3,"./../NoSlipBounceBackNode":5,"./../ZouHeVelocityBoundaryCondition":13,"1YiZ5S":20,"buffer":17}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = function() {
    GhostNode = function() {
        this.type = 'ghost';
    }

    GhostNode.prototype = {
        streamTo: function(direction, node) {

        },

        collide: function() {

        },

        setDistribution: function(direction, distribution) {

        },

        getDistribution: function() {
            return 0;
        },

    }

    return GhostNode;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/GhostNode.js","/")
},{"1YiZ5S":20,"buffer":17}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = function() {
    var Config = require('./config');

    LatticeNode = function(distributions) {
        directions = null;
        this.type = 'lattice';
        this.distributions = distributions;
        this.newDistributions = distributions.slice(0);
    }

    LatticeNode.prototype = {
        streamTo: function(direction, node) {
            distribution = this.getDistribution(direction);
            node.setDistribution(direction, distribution)
        },

        getDistribution: function(direction) {
            return this.distributions[direction];
        },

        setDistribution: function(direction, distribution) {
            this.newDistributions[direction] = distribution;
        },

        collide: function(relaxationTime) {
            // now that the streaming is done, we can forget our old distributions
            this.distributions = this.newDistributions.slice(0);
            this.newDistributions = this.clearDistributions(this.newDistributions);
            // do collision stuff
            var equilibrium = this.getEquilibrium();
            var velocitySet = Config.get('velocity-set');
            // var force = 10;
            for (var k = 0; k < this.distributions.length; k++) {
                    this.distributions[k] = this.distributions[k] -
                        (this.distributions[k] - equilibrium[k]) / relaxationTime;
                         // + 3 * velocitySet[k].dy * velocitySet[k].w * force;

                if (this.distributions[k] < 0) {
                    // console.log("Distribution is negative!", this.distributions[k]);
                }
            };
        },

        clearDistributions: function(distributions) {
            for (var k = 0; k < distributions.length; k++) {
                distributions[k] = 0;
            };
            return distributions;
        },


        getEquilibrium: function() {
            var speedOfSoundSquared = Config.get('speed-of-sound-squared');
            var velocitySet         = Config.get('velocity-set');

            var density = this.getDensity();
            var v = this.getVelocity(density, velocitySet);
            var equilibrium = [];

            for (var i = 0; i < this.distributions.length; i++) {
                var distribution = this.distributions[i];
                var xi = {x: velocitySet[i].dx, y: velocitySet[i].dy};

                var cu = (v.x * xi.x + v.y * xi.y) / speedOfSoundSquared;

                equilibrium[i] = density * velocitySet[i].w * (
                    1 + cu +
                    cu * cu / 2 -
                    (v.x * v.x + v.y * v.y) / (2 * speedOfSoundSquared)
                );
            };
            return equilibrium;
        },

        getDensity: function() {
            var density = 0;
            for (var k = 0; k < this.distributions.length; k++) {
                density += this.distributions[k];
            };
            return density;
        },

        getVelocity: function(density, velocitySet) {
            // zero vector
            var u = {x: 0, y: 0};

            if (density === undefined) {
                density = this.getDensity();
            }

            if (density === 0) {
                return u;
            }

            for (var i = 0; i < this.distributions.length; i++) {
                var distribution = this.distributions[i];
                u.x += velocitySet[i].w * velocitySet[i].dx * distribution;
                u.y += velocitySet[i].w * velocitySet[i].dy * distribution;
            };

            u.x = u.x / density;
            u.y = u.y / density;

            return u;

        },
    }

    return LatticeNode;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/LatticeNode.js","/")
},{"./config":14,"1YiZ5S":20,"buffer":17}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// hodls the structure and knows where every neighbour is.
module.exports = function() {
    var GhostNode = require('./GhostNode');

    LatticeStructure = function(config) {
        // velocity set
        this.velocitySet = config.get('velocity-set');
        this.oppositeDirections = config.get('opposite-velocity-set');

        // amount of nodes in x and y direction
        // 2DDamBreakDomain
        // 2DZouHeDomain
        var Domain = require('./Config/2DZouHeDomain');
        var domain = new Domain(config);
        // var domain = require(config.get('domain'));
        this.nx = domain.dx;
        this.ny = domain.dy;
        this.initializeNodes(domain);
    }

    LatticeStructure.prototype = {
        initializeNodes: function(domain) {
            // @TODO: determine if size should be 1D, 2D, 3D, or any D
            this.nodes = [];

            for (var i = 0; i < this.nx; i++) {
                for (var j = 0; j < this.ny; j++) {
                    var domainIdx = {x: i, y: j};
                    var idx = this.domainToIdx(domainIdx);
                    this.nodes[idx] = domain.initializeNode(domainIdx);
                };
            };
            // It should automatically create appropriate ghost nodes for boundary conditions

        },

        forEachNode: function(callable) {
            for (var idx = 0; idx < this.nodes.length; idx++) {
                var node = this.nodes[idx];
                callable(node, idx);
            };
        },

        getNodes: function() {
            return this.nodes;
        },

        getDirections: function() {
            // @TODO
            return this.velocitySet;
        },

        getOppositeDirection: function(direction) {
            return this.oppositeDirections[direction];
        },

        getNeighbourOfNodeInDirection: function(idx, direction) {
            // if it can't find a neighbouring node, then send a ghost node
            var domainIdx = this.idxToDomain(idx);

            domainIdx.x += this.velocitySet[direction].dx;
            domainIdx.y -= this.velocitySet[direction].dy;

            if (! this.isInDomain(domainIdx)) {
                return this.ghostNode(domainIdx);
            }

            neighbourIdx = this.domainToIdx(domainIdx);
            return this.nodes[neighbourIdx];
        },

        idxToDomain: function(idx) {
            x = idx % this.nx;
            y = Math.floor(idx / this.nx);
            return {x: x, y: y};
        },

        domainToIdx: function(domainIdx) {
            idx = domainIdx.y * this.nx + domainIdx.x;

            return idx;
        },

        isInDomain: function(domainIdx) {
            return domainIdx.x >= 0 && domainIdx.x < (this.nx) &&
                    domainIdx.y >= 0 && domainIdx.y < (this.ny);
        },

        ghostNode: function(domainIdx) {
            return new GhostNode;
        },

        getDensity: function() {
            density = 0;

            for (var i = 0; i < this.nodes.length; i++) {
                density += this.nodes[i].getDensity();
            };

            return density;
        }
    }

    return LatticeStructure;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/LatticeStructure.js","/")
},{"./Config/2DZouHeDomain":1,"./GhostNode":2,"1YiZ5S":20,"buffer":17}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = function() {
    var NoSlipBounceBackNode = function(distributions, oppositeDirection) {
        this.type = 'boundary';
        this.oppositeDirection = oppositeDirection;

        this.clearDistributions(distributions);
        this.distributions = distributions;
        this.newDistributions = distributions.slice(0);
    }

    NoSlipBounceBackNode.prototype = {
        streamTo: function(direction, node) {
            return;
            if (node.type == "lattice") {
                distribution = this.getDistribution(direction);
                node.setDistribution(direction, distribution);
            }
        },

        applyBoundary: function(direction, node) {
            if (node.type == "lattice") {
                distribution = this.getDistribution(direction);
                node.setDistribution(direction, distribution);
            }
            this.setDistribution(this.oppositeOf(direction), 0);
        },

        getDistribution: function(direction) {
            return this.distributions[this.oppositeOf(direction)];
        },

        setDistribution: function(direction, distribution) {
            this.distributions[direction] = distribution;
        },

        oppositeOf: function(direction) {
            return this.oppositeDirection[direction];
        },

        collide: function(relaxationTime) {
            this.distributions = this.newDistributions.slice(0);
            this.newDistributions = this.clearDistributions(this.newDistributions);
        },

        clearDistributions: function(distributions) {
            for (var k = 0; k < distributions.length; k++) {
                distributions[k] = 0;
            };
            return distributions;
        },

        getDensity: function() {
            var density = 0;
            for (var k = 0; k < this.distributions.length; k++) {
                density += this.distributions[k];
            };
            return density;
        },

        getVelocity: function(density, velocitySet) {
            // zero vector
            var u = {x: 0, y: 0};

            if (density === undefined) {
                density = this.getDensity();
            }

            if (density === 0) {
                return u;
            }

            for (var i = 0; i < this.distributions.length; i++) {
                var distribution = this.distributions[i];
                u.x += velocitySet[i].w * velocitySet[i].dx * distribution;
                u.y += velocitySet[i].w * velocitySet[i].dy * distribution;
            };

            u.x = u.x / density;
            u.y = u.y / density;

            return u;

        },
    }

    return NoSlipBounceBackNode;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/NoSlipBounceBackNode.js","/")
},{"1YiZ5S":20,"buffer":17}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
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
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Visualizers/DensityVisualizationGraph.js","/Visualizers")
},{"1YiZ5S":20,"buffer":17}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = function() {
    var DensityVisualizer2D = function(structure, canvas, visualizer, distanceBetweenNode) {
        this.structure = structure;
        this.canvas = canvas;
        this.visualizer = visualizer;
        this.distanceBetweenNode = distanceBetweenNode || 20;

        this.context = this.canvas.getContext("2d");
    }

    DensityVisualizer2D.prototype = {
        render: function() {
            this.canvas.width = this.canvas.width;

            var that = this;
            this.structure.forEachNode(function(node, idx) {
                var domainIdx = that.structure.idxToDomain(idx);
                that.drawNode(domainIdx, node);
            });

            this.visualizer.render();
        },

        drawNode: function(domainIdx, node) {
            var radius = 5;

            var context = this.context;
            context.save();
            context.translate(
                domainIdx.x * this.distanceBetweenNode,
                domainIdx.y * this.distanceBetweenNode
            );
            alpha = Math.min(1, Math.max(node.getDensity(), 0));
            context.fillStyle = 'rgba(32, 72, 155, ' + alpha + ')';// '#3367d5';
            context.fillRect(0 , 0, this.distanceBetweenNode, this.distanceBetweenNode);

            context.restore();
        },

        keepRendering: function() {
            window.requestAnimationFrame(this.update.bind(this));
        },

        stopRendering: function() {
        }
    }

    return DensityVisualizer2D;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Visualizers/DensityVisualizer2D.js","/Visualizers")
},{"1YiZ5S":20,"buffer":17}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
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
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Visualizers/Factory.js","/Visualizers")
},{"./DensityVisualizationGraph":6,"./DensityVisualizer2D":7,"./LatticeStructureVisaualizer2D":9,"./SpeedVisualizer2D":11,"./Visualizers":12,"1YiZ5S":20,"buffer":17}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
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
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Visualizers/LatticeStructureVisaualizer2D.js","/Visualizers")
},{"1YiZ5S":20,"buffer":17}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = function() {
    /*
    RainbowVis-JS
    Released under Eclipse Public License - v 1.0
    */

    function Rainbow()
    {
        "use strict";
        var gradients = null;
        var minNum = 0;
        var maxNum = 100;
        var colours = ['ff0000', 'ffff00', '00ff00', '0000ff'];
        setColours(colours);

        function setColours (spectrum)
        {
            if (spectrum.length < 2) {
                throw new Error('Rainbow must have two or more colours.');
            } else {
                var increment = (maxNum - minNum)/(spectrum.length - 1);
                var firstGradient = new ColourGradient();
                firstGradient.setGradient(spectrum[0], spectrum[1]);
                firstGradient.setNumberRange(minNum, minNum + increment);
                gradients = [ firstGradient ];

                for (var i = 1; i < spectrum.length - 1; i++) {
                    var colourGradient = new ColourGradient();
                    colourGradient.setGradient(spectrum[i], spectrum[i + 1]);
                    colourGradient.setNumberRange(minNum + increment * i, minNum + increment * (i + 1));
                    gradients[i] = colourGradient;
                }

                colours = spectrum;
            }
        }

        this.setSpectrum = function ()
        {
            setColours(arguments);
            return this;
        }

        this.setSpectrumByArray = function (array)
        {
            setColours(array);
            return this;
        }

        this.colourAt = function (number)
        {
            if (isNaN(number)) {
                throw new TypeError(number + ' is not a number');
            } else if (gradients.length === 1) {
                return gradients[0].colourAt(number);
            } else {
                var segment = (maxNum - minNum)/(gradients.length);
                var index = Math.min(Math.floor((Math.max(number, minNum) - minNum)/segment), gradients.length - 1);
                return gradients[index].colourAt(number);
            }
        }

        this.colorAt = this.colourAt;

        this.setNumberRange = function (minNumber, maxNumber)
        {
            if (maxNumber > minNumber) {
                minNum = minNumber;
                maxNum = maxNumber;
                setColours(colours);
            } else {
                throw new RangeError('maxNumber (' + maxNumber + ') is not greater than minNumber (' + minNumber + ')');
            }
            return this;
        }
    }

    function ColourGradient()
    {
        "use strict";
        var startColour = 'ff0000';
        var endColour = '0000ff';
        var minNum = 0;
        var maxNum = 100;

        this.setGradient = function (colourStart, colourEnd)
        {
            startColour = getHexColour(colourStart);
            endColour = getHexColour(colourEnd);
        }

        this.setNumberRange = function (minNumber, maxNumber)
        {
            if (maxNumber > minNumber) {
                minNum = minNumber;
                maxNum = maxNumber;
            } else {
                throw new RangeError('maxNumber (' + maxNumber + ') is not greater than minNumber (' + minNumber + ')');
            }
        }

        this.colourAt = function (number)
        {
            return calcHex(number, startColour.substring(0,2), endColour.substring(0,2))
                + calcHex(number, startColour.substring(2,4), endColour.substring(2,4))
                + calcHex(number, startColour.substring(4,6), endColour.substring(4,6));
        }

        function calcHex(number, channelStart_Base16, channelEnd_Base16)
        {
            var num = number;
            if (num < minNum) {
                num = minNum;
            }
            if (num > maxNum) {
                num = maxNum;
            }
            var numRange = maxNum - minNum;
            var cStart_Base10 = parseInt(channelStart_Base16, 16);
            var cEnd_Base10 = parseInt(channelEnd_Base16, 16);
            var cPerUnit = (cEnd_Base10 - cStart_Base10)/numRange;
            var c_Base10 = Math.round(cPerUnit * (num - minNum) + cStart_Base10);
            return formatHex(c_Base10.toString(16));
        }

        function formatHex(hex)
        {
            if (hex.length === 1) {
                return '0' + hex;
            } else {
                return hex;
            }
        }

        function isHexColour(string)
        {
            var regex = /^#?[0-9a-fA-F]{6}$/i;
            return regex.test(string);
        }

        function getHexColour(string)
        {
            if (isHexColour(string)) {
                return string.substring(string.length - 6, string.length);
            } else {
                var name = string.toLowerCase();
                if (colourNames.hasOwnProperty(name)) {
                    return colourNames[name];
                }
                throw new Error(string + ' is not a valid colour.');
            }
        }

        // Extended list of CSS colornames s taken from
        // http://www.w3.org/TR/css3-color/#svg-color
        var colourNames = {
            aliceblue: "F0F8FF",
            antiquewhite: "FAEBD7",
            aqua: "00FFFF",
            aquamarine: "7FFFD4",
            azure: "F0FFFF",
            beige: "F5F5DC",
            bisque: "FFE4C4",
            black: "000000",
            blanchedalmond: "FFEBCD",
            blue: "0000FF",
            blueviolet: "8A2BE2",
            brown: "A52A2A",
            burlywood: "DEB887",
            cadetblue: "5F9EA0",
            chartreuse: "7FFF00",
            chocolate: "D2691E",
            coral: "FF7F50",
            cornflowerblue: "6495ED",
            cornsilk: "FFF8DC",
            crimson: "DC143C",
            cyan: "00FFFF",
            darkblue: "00008B",
            darkcyan: "008B8B",
            darkgoldenrod: "B8860B",
            darkgray: "A9A9A9",
            darkgreen: "006400",
            darkgrey: "A9A9A9",
            darkkhaki: "BDB76B",
            darkmagenta: "8B008B",
            darkolivegreen: "556B2F",
            darkorange: "FF8C00",
            darkorchid: "9932CC",
            darkred: "8B0000",
            darksalmon: "E9967A",
            darkseagreen: "8FBC8F",
            darkslateblue: "483D8B",
            darkslategray: "2F4F4F",
            darkslategrey: "2F4F4F",
            darkturquoise: "00CED1",
            darkviolet: "9400D3",
            deeppink: "FF1493",
            deepskyblue: "00BFFF",
            dimgray: "696969",
            dimgrey: "696969",
            dodgerblue: "1E90FF",
            firebrick: "B22222",
            floralwhite: "FFFAF0",
            forestgreen: "228B22",
            fuchsia: "FF00FF",
            gainsboro: "DCDCDC",
            ghostwhite: "F8F8FF",
            gold: "FFD700",
            goldenrod: "DAA520",
            gray: "808080",
            green: "008000",
            greenyellow: "ADFF2F",
            grey: "808080",
            honeydew: "F0FFF0",
            hotpink: "FF69B4",
            indianred: "CD5C5C",
            indigo: "4B0082",
            ivory: "FFFFF0",
            khaki: "F0E68C",
            lavender: "E6E6FA",
            lavenderblush: "FFF0F5",
            lawngreen: "7CFC00",
            lemonchiffon: "FFFACD",
            lightblue: "ADD8E6",
            lightcoral: "F08080",
            lightcyan: "E0FFFF",
            lightgoldenrodyellow: "FAFAD2",
            lightgray: "D3D3D3",
            lightgreen: "90EE90",
            lightgrey: "D3D3D3",
            lightpink: "FFB6C1",
            lightsalmon: "FFA07A",
            lightseagreen: "20B2AA",
            lightskyblue: "87CEFA",
            lightslategray: "778899",
            lightslategrey: "778899",
            lightsteelblue: "B0C4DE",
            lightyellow: "FFFFE0",
            lime: "00FF00",
            limegreen: "32CD32",
            linen: "FAF0E6",
            magenta: "FF00FF",
            maroon: "800000",
            mediumaquamarine: "66CDAA",
            mediumblue: "0000CD",
            mediumorchid: "BA55D3",
            mediumpurple: "9370DB",
            mediumseagreen: "3CB371",
            mediumslateblue: "7B68EE",
            mediumspringgreen: "00FA9A",
            mediumturquoise: "48D1CC",
            mediumvioletred: "C71585",
            midnightblue: "191970",
            mintcream: "F5FFFA",
            mistyrose: "FFE4E1",
            moccasin: "FFE4B5",
            navajowhite: "FFDEAD",
            navy: "000080",
            oldlace: "FDF5E6",
            olive: "808000",
            olivedrab: "6B8E23",
            orange: "FFA500",
            orangered: "FF4500",
            orchid: "DA70D6",
            palegoldenrod: "EEE8AA",
            palegreen: "98FB98",
            paleturquoise: "AFEEEE",
            palevioletred: "DB7093",
            papayawhip: "FFEFD5",
            peachpuff: "FFDAB9",
            peru: "CD853F",
            pink: "FFC0CB",
            plum: "DDA0DD",
            powderblue: "B0E0E6",
            purple: "800080",
            red: "FF0000",
            rosybrown: "BC8F8F",
            royalblue: "4169E1",
            saddlebrown: "8B4513",
            salmon: "FA8072",
            sandybrown: "F4A460",
            seagreen: "2E8B57",
            seashell: "FFF5EE",
            sienna: "A0522D",
            silver: "C0C0C0",
            skyblue: "87CEEB",
            slateblue: "6A5ACD",
            slategray: "708090",
            slategrey: "708090",
            snow: "FFFAFA",
            springgreen: "00FF7F",
            steelblue: "4682B4",
            tan: "D2B48C",
            teal: "008080",
            thistle: "D8BFD8",
            tomato: "FF6347",
            turquoise: "40E0D0",
            violet: "EE82EE",
            wheat: "F5DEB3",
            white: "FFFFFF",
            whitesmoke: "F5F5F5",
            yellow: "FFFF00",
            yellowgreen: "9ACD32"
        }
    }

    return Rainbow;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Visualizers/Rainbow.js","/Visualizers")
},{"1YiZ5S":20,"buffer":17}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
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
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Visualizers/SpeedVisualizer2D.js","/Visualizers")
},{"./Rainbow.js":10,"1YiZ5S":20,"buffer":17}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
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
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/Visualizers/Visualizers.js","/Visualizers")
},{"1YiZ5S":20,"buffer":17}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = function() {
    var Config = require('./config');
    // For D2Q9
    var ZouHeVelocityBoundaryCondition = function(distributions, velocity, position) {
        this.type = 'lattice';

        this.position = position; // N, E, S, W
                                // NE, SE, SW, NW
        this.velocity = velocity;

        // this.clearDistributions(distributions);
        this.distributions = distributions;
        this.newDistributions = distributions.slice(0);
    }

    ZouHeVelocityBoundaryCondition.prototype = {
        streamTo: function(direction, node) {
            distribution = this.getDistribution(direction);
            node.setDistribution(direction, distribution);
        },

        getDistribution: function(direction) {
            return this.distributions[direction];
        },

        setDistribution: function(direction, distribution) {
            this.newDistributions[direction] = distribution;
        },

        collide: function(relaxationTime) {
            this.distributions = this.newDistributions.slice(0);
            this.newDistributions = this.clearDistributions(this.newDistributions);

            var density = this.getDensity();

            this.distributions[4] = this.distributions[2] - 3 * density * this.velocity.y / 2;
            this.distributions[7] = this.distributions[5] + (this.distributions[1] - this.distributions[3]) / 2 - density * this.velocity.y / 6 - density * this.velocity.x / 2;
            this.distributions[8] = this.distributions[6] + (this.distributions[3] - this.distributions[1]) / 2 - density * this.velocity.y / 6 + density * this.velocity.x / 2;

            // var equilibrium = this.getEquilibrium();
            // var velocitySet = Config.get('velocity-set');
            // // var force = 10;
            // for (var k = 0; k < this.distributions.length; k++) {
            //         this.distributions[k] = this.distributions[k] -
            //             (this.distributions[k] - equilibrium[k]) / relaxationTime;
            //              // + 3 * velocitySet[k].dy * velocitySet[k].w * force;

            //     if (this.distributions[k] < 0) {
            //         // console.log("Distribution is negative!", this.distributions[k]);
            //     }
            // };
            // var density = this.getDensity();

            // this.distributions[4] = this.distributions[2] - 3 * density * this.velocity.y / 2;
            // this.distributions[7] = this.distributions[5] + (this.distributions[1] - this.distributions[3]) / 2 - density * this.velocity.y / 6 - density * this.velocity.x / 2;
            // this.distributions[8] = this.distributions[6] + (this.distributions[3] - this.distributions[1]) / 2 - density * this.velocity.y / 6 + density * this.velocity.x / 2;
        },

        clearDistributions: function(distributions) {
            for (var k = 0; k < distributions.length; k++) {
                distributions[k] = 0;
            };
            return distributions;
        },

        getEquilibrium: function() {
            var speedOfSoundSquared = Config.get('speed-of-sound-squared');
            var velocitySet         = Config.get('velocity-set');

            var density = this.getDensity();
            var v = this.getVelocity(density, velocitySet);
            var equilibrium = [];

            for (var i = 0; i < this.distributions.length; i++) {
                var distribution = this.distributions[i];
                var xi = {x: velocitySet[i].dx, y: velocitySet[i].dy};

                var cu = (v.x * xi.x + v.y * xi.y) / speedOfSoundSquared;

                equilibrium[i] = density * velocitySet[i].w * (
                    1 + cu +
                    cu * cu / 2 -
                    (v.x * v.x + v.y * v.y) / (2 * speedOfSoundSquared)
                );
            };
            return equilibrium;
        },

        getDensity: function() {
            var density = 0;

            switch (this.position) {
                case 'N':
                    density = (1 / (1 + this.getVelocity().y)) * (
                        this.distributions[0] + this.distributions[1]+ this.distributions[3] +
                        2 * (this.distributions[2] + this.distributions[5] - this.distributions[6])
                    );
                break;
                case 'E':
                break;
                case 'S':
                break;
                case 'W':
                break;

                case 'NE':
                break;
                case 'NW':
                break;

                case 'SE':
                break;
                case 'SW':
                break;
            }
            return density;
        },

        getVelocity: function(density, velocitySet) {
            return this.velocity;
        },
    }

    return ZouHeVelocityBoundaryCondition;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/ZouHeVelocityBoundaryCondition.js","/")
},{"./config":14,"1YiZ5S":20,"buffer":17}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
module.exports = function () {

    var Config = function() {
        console.log('Creating config')
        this.config = {
            // 'domain': './Config/2DDamBreakDomain',
            'domain': './Config/2DDamBreakDomain',
            'velocity-set': [
                {dx: 0,      dy: 0,   w: 4 / 9},

                {dx: 1,      dy: 0,   w: 1 / 9},
                {dx: 0,      dy: 1,   w: 1 / 9},
                {dx: - 1,    dy: 0,   w: 1 / 9},
                {dx: 0,      dy: -1,  w: 1 / 9},

                {dx: 1,      dy: 1,   w: 1 / 36},
                {dx: - 1,    dy: 1,   w: 1 / 36},
                {dx: - 1,    dy: -1,  w: 1 / 36},
                {dx: 1,      dy: -1,  w: 1 / 36},

            ],
            // This array gives the index of the opposite velocity set corresponding to the index given.
            // This will be useful when implementing bounce back boundary conditions
            'opposite-velocity-set': [0, 3, 4, 1, 2, 7, 8, 5, 6],
            'speed-of-sound-squared': 1 / 3,
            'relaxation-time': 0.55,
            'Re': 10000,
            'initial-distributions': function(x, y) {
                if (1 == 1 || (x == 2 && y == 2)) {
                    var rand = Math.random();
                    var rand = 1;
                    return [
                        4 * rand / 9,
                        rand / 9,
                        rand / 9,
                        rand / 9,
                        rand / 9,
                        rand / 36,
                        rand / 36,
                        rand / 36,
                        rand / 36
                    ]
                } else {
                    return [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ];
                }
            }
        };
    }

    Config.prototype = {
        get: function(config) {
            // Check if key exists
            if (config in this.config) {
                return this.config[config];
            }
        },
    }

    return new Config();
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/config.js","/")
},{"1YiZ5S":20,"buffer":17}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var Simulation = require('./lbm');
var LatticeNode = require('./LatticeNode');
var LatticeStructure = require('./LatticeStructure');
var Config = require('./config');
console.log(Config);
console.log("Starting simulation");
// Start of simulation
var sim = new Simulation();
console.log(sim);
window.sim = sim;
sim.visualize();
// sim.run();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_7178495.js","/")
},{"./LatticeNode":3,"./LatticeStructure":4,"./config":14,"./lbm":16,"1YiZ5S":20,"buffer":17}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// first 2D, then
module.exports = function() {

    Simulation = function() {
        var config = require('./config');
        var Domain = require('./Config/2DZouHeDomain');
        this.domain = new Domain(config);
        this.structure = this.initializeStructure(config);
        this.relaxationTime = this.domain.relaxationTime;
        console.log("relaxationTime: ", this.relaxationTime);

        this.initializeVisualizers();
    }

    Simulation.prototype = {
        initializeVisualizers: function() {
            var Factory = require('./Visualizers/Factory');
            var factory = new Factory(this.structure, this.domain);
            this.visualizers = factory.build();
        },

        initializeStructure: function(config) {
            // actually because dt = dx = dy we should only have to
            // give one size since the structure should be able to
            // calculate the amount of nodes from knowing the domain
            var structure = new LatticeStructure(config);
            return structure;
        },

        collision: function() {
            relaxationTime = this.relaxationTime;

            this.structure.forEachNode(function(node) {
                node.collide(relaxationTime);
            });
        },

        stream: function() {
            var that = this.structure;
            var directions = that.getDirections();
            this.structure.forEachNode(function(node, idx) {

                for (var k = 0; k < directions.length; k++) {
                    var direction = k;//directions[k];
                    var neighbour = that.getNeighbourOfNodeInDirection(idx, direction);
                    node.streamTo(direction, neighbour);
                };
            });

            // apply boundary conditions
            this.structure.forEachNode(function(node, idx) {
                if (node.type == "boundary") {
                    for (var k = 0; k < directions.length; k++) {
                        var direction = k;//directions[k];
                        var neighbour = that.getNeighbourOfNodeInDirection(idx, direction);
                        node.applyBoundary(direction, neighbour);
                    };
                }
            });
        },

        run: function() {
            console.log(this.structure.getDensity());
            this.collision();
            this.stream();
        },

        play: function() {
            window.requestAnimationFrame(this.update.bind(this));
        },

        update: function() {
            if (this.wait > 0) {
                this.wait --;
            } else {
                this.visualize();
                this.wait = 50;
            }

            this.run();

            if (this.running != 0) {
                this.running--;
                window.requestAnimationFrame(this.update.bind(this));
            }
        },


        runFor: function(iterations) {
            this.running = iterations;
            this.update();
            return this;
        },

        info: function(x, y) {
            console.table(
                this.structure.nodes[
                    this.structure.domainToIdx({x: x, y: y})
                ]
            );
        },

        visualize: function() {
            this.visualizers.visualize();
        }
    };

    return Simulation;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/lbm.js","/")
},{"./Config/2DZouHeDomain":1,"./Visualizers/Factory":8,"./config":14,"1YiZ5S":20,"buffer":17}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/index.js","/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer")
},{"1YiZ5S":20,"base64-js":18,"buffer":17,"ieee754":19}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")
},{"1YiZ5S":20,"buffer":17}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754")
},{"1YiZ5S":20,"buffer":17}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/gulp-browserify/node_modules/browserify/node_modules/process/browser.js","/../node_modules/gulp-browserify/node_modules/browserify/node_modules/process")
},{"1YiZ5S":20,"buffer":17}]},{},[15])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9Db25maWcvMkRab3VIZURvbWFpbi5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvR2hvc3ROb2RlLmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9MYXR0aWNlTm9kZS5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvTGF0dGljZVN0cnVjdHVyZS5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvTm9TbGlwQm91bmNlQmFja05vZGUuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL1Zpc3VhbGl6ZXJzL0RlbnNpdHlWaXN1YWxpemF0aW9uR3JhcGguanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL1Zpc3VhbGl6ZXJzL0RlbnNpdHlWaXN1YWxpemVyMkQuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL1Zpc3VhbGl6ZXJzL0ZhY3RvcnkuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL1Zpc3VhbGl6ZXJzL0xhdHRpY2VTdHJ1Y3R1cmVWaXNhdWFsaXplcjJELmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9WaXN1YWxpemVycy9SYWluYm93LmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9WaXN1YWxpemVycy9TcGVlZFZpc3VhbGl6ZXIyRC5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvVmlzdWFsaXplcnMvVmlzdWFsaXplcnMuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL1pvdUhlVmVsb2NpdHlCb3VuZGFyeUNvbmRpdGlvbi5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvY29uZmlnLmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9mYWtlXzcxNzg0OTUuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL2xibS5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgRG9tYWluID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIHRoaXMuZHggPSAxMjg7XG4gICAgICAgIHRoaXMuZHkgPSAxMjg7XG4gICAgICAgIHRoaXMudnggPSAwLjA1O1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgdmFyIFJleW5vbGRzID0gMTAwOy8vIGNvbmZpZy5nZXQoJ1JlJyk7XG4gICAgICAgIHZhciBudSA9IHRoaXMudnggKiB0aGlzLmR4IC8gUmV5bm9sZHM7XG4gICAgICAgIHRoaXMucmVsYXhhdGlvblRpbWUgPSAzICogbnUgKyAxIC8gMjtcblxuICAgICAgICAvLyB0aGlzLnJlbGF4YXRpb25UaW1lID0gdGhpcy5jb25maWcuZ2V0KCdyZWxheGF0aW9uLXRpbWUnKTtcbiAgICB9O1xuXG4gICAgRG9tYWluLnByb3RvdHlwZSA9IHtcbiAgICAgICAgaW5pdGlhbGl6ZU5vZGU6IGZ1bmN0aW9uKGRvbWFpbklkeCkge1xuXG4gICAgICAgICAgICB2YXIgTGF0dGljZU5vZGUgPSByZXF1aXJlKCcuLy4uL0xhdHRpY2VOb2RlJyk7XG4gICAgICAgICAgICB2YXIgTm9TbGlwQm91bmNlQmFja05vZGUgPSByZXF1aXJlKCcuLy4uL05vU2xpcEJvdW5jZUJhY2tOb2RlJyk7XG4gICAgICAgICAgICB2YXIgWm91SGVWZWxvY2l0eUJvdW5kYXJ5ID0gcmVxdWlyZSgnLi8uLi9ab3VIZVZlbG9jaXR5Qm91bmRhcnlDb25kaXRpb24nKTtcbiAgICAgICAgICAgIHZhciBHaG9zdE5vZGUgPSByZXF1aXJlKCcuLy4uL0dob3N0Tm9kZScpO1xuXG4gICAgICAgICAgICB2YXIgZGlzdHJpYnV0aW9ucyA9IHRoaXMuaW5pdGlhbERpc3RyaWJ1dGlvbnMoZG9tYWluSWR4KTtcbiAgICAgICAgICAgIC8vIG1vdmluZyB3YWxsIHRvIHRoZSByaWdodFxuICAgICAgICAgICAgdmFyIHZlbG9jaXR5ID0geyB4OiB0aGlzLnZ4LCB5OiAwIH07XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzT25XYWxsKGRvbWFpbklkeCkgJiYgISB0aGlzLmlzQ29ybmVyKGRvbWFpbklkeCkpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiBpcyBjb3JuZXJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFpvdUhlVmVsb2NpdHlCb3VuZGFyeShkaXN0cmlidXRpb25zLCB2ZWxvY2l0eSwgJ04nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNPbkJvdW5kYXJ5KGRvbWFpbklkeCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5vU2xpcEJvdW5jZUJhY2tOb2RlKGRpc3RyaWJ1dGlvbnMsIHRoaXMuY29uZmlnLmdldCgnb3Bwb3NpdGUtdmVsb2NpdHktc2V0JykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbm9kZSA9IG5ldyBMYXR0aWNlTm9kZShkaXN0cmlidXRpb25zKTtcblxuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNDb3JuZXI6IGZ1bmN0aW9uKGRvbWFpbklkeCkge1xuICAgICAgICAgICAgcmV0dXJuIGRvbWFpbklkeC54ID09PSAwICAgICAgICAgICAgICYmIGRvbWFpbklkeC55ID09PSAwIHx8XG4gICAgICAgICAgICAgICAgICAgZG9tYWluSWR4LnggPT09ICh0aGlzLmR4IC0gMSkgJiYgZG9tYWluSWR4LnkgPT09IDAgfHxcbiAgICAgICAgICAgICAgICAgICBkb21haW5JZHgueCA9PT0gMCAgICAgICAgICAgICAmJiBkb21haW5JZHgueSA9PT0gKHRoaXMuZHkgLSAxKSB8fFxuICAgICAgICAgICAgICAgICAgIGRvbWFpbklkeC54ID09PSAodGhpcy5keCAtIDEpICYmIGRvbWFpbklkeC55ID09PSAodGhpcy5keSAtIDEpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzT25XYWxsOiBmdW5jdGlvbihkb21haW5JZHgpIHtcbiAgICAgICAgICAgIHJldHVybiBkb21haW5JZHgueSA9PT0gMDtcbiAgICAgICAgfSxcblxuICAgICAgICBpc09uQm91bmRhcnk6IGZ1bmN0aW9uKGRvbWFpbklkeCkge1xuICAgICAgICAgICAgcmV0dXJuIChkb21haW5JZHgueCA9PT0gMCB8fCBkb21haW5JZHgueCA9PT0gKHRoaXMuZHggLSAxKSB8fFxuICAgICAgICAgICAgICAgIGRvbWFpbklkeC55ID09PSAwIHx8IGRvbWFpbklkeC55ID09PSAodGhpcy5keSAtIDEpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0aWFsRGlzdHJpYnV0aW9uczogZnVuY3Rpb24oZG9tYWluSWR4KSB7XG4gICAgICAgICAgICB2YXIgZGlzdHJpYnV0aW9ucyA9IFtdO1xuXG4gICAgICAgICAgICB2YXIgdmVsb2NpdHlTZXQgPSB0aGlzLmNvbmZpZy5nZXQoJ3ZlbG9jaXR5LXNldCcpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbG9jaXR5U2V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgKGRvbWFpbklkeC55ID4gNzApIHtcbiAgICAgICAgICAgICAgICAgICAgZGlzdHJpYnV0aW9uc1tpXSA9IHZlbG9jaXR5U2V0W2ldLnc7XG4gICAgICAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgZGlzdHJpYnV0aW9uc1tpXSA9IDA7XG4gICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIGRpc3RyaWJ1dGlvbnM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gRG9tYWluO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9Db25maWcvMkRab3VIZURvbWFpbi5qc1wiLFwiL0NvbmZpZ1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgR2hvc3ROb2RlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdnaG9zdCc7XG4gICAgfVxuXG4gICAgR2hvc3ROb2RlLnByb3RvdHlwZSA9IHtcbiAgICAgICAgc3RyZWFtVG86IGZ1bmN0aW9uKGRpcmVjdGlvbiwgbm9kZSkge1xuXG4gICAgICAgIH0sXG5cbiAgICAgICAgY29sbGlkZTogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgfSxcblxuICAgICAgICBzZXREaXN0cmlidXRpb246IGZ1bmN0aW9uKGRpcmVjdGlvbiwgZGlzdHJpYnV0aW9uKSB7XG5cbiAgICAgICAgfSxcblxuICAgICAgICBnZXREaXN0cmlidXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0sXG5cbiAgICB9XG5cbiAgICByZXR1cm4gR2hvc3ROb2RlO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9HaG9zdE5vZGUuanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpO1xuXG4gICAgTGF0dGljZU5vZGUgPSBmdW5jdGlvbihkaXN0cmlidXRpb25zKSB7XG4gICAgICAgIGRpcmVjdGlvbnMgPSBudWxsO1xuICAgICAgICB0aGlzLnR5cGUgPSAnbGF0dGljZSc7XG4gICAgICAgIHRoaXMuZGlzdHJpYnV0aW9ucyA9IGRpc3RyaWJ1dGlvbnM7XG4gICAgICAgIHRoaXMubmV3RGlzdHJpYnV0aW9ucyA9IGRpc3RyaWJ1dGlvbnMuc2xpY2UoMCk7XG4gICAgfVxuXG4gICAgTGF0dGljZU5vZGUucHJvdG90eXBlID0ge1xuICAgICAgICBzdHJlYW1UbzogZnVuY3Rpb24oZGlyZWN0aW9uLCBub2RlKSB7XG4gICAgICAgICAgICBkaXN0cmlidXRpb24gPSB0aGlzLmdldERpc3RyaWJ1dGlvbihkaXJlY3Rpb24pO1xuICAgICAgICAgICAgbm9kZS5zZXREaXN0cmlidXRpb24oZGlyZWN0aW9uLCBkaXN0cmlidXRpb24pXG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0RGlzdHJpYnV0aW9uOiBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRpc3RyaWJ1dGlvbnNbZGlyZWN0aW9uXTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXREaXN0cmlidXRpb246IGZ1bmN0aW9uKGRpcmVjdGlvbiwgZGlzdHJpYnV0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnNbZGlyZWN0aW9uXSA9IGRpc3RyaWJ1dGlvbjtcbiAgICAgICAgfSxcblxuICAgICAgICBjb2xsaWRlOiBmdW5jdGlvbihyZWxheGF0aW9uVGltZSkge1xuICAgICAgICAgICAgLy8gbm93IHRoYXQgdGhlIHN0cmVhbWluZyBpcyBkb25lLCB3ZSBjYW4gZm9yZ2V0IG91ciBvbGQgZGlzdHJpYnV0aW9uc1xuICAgICAgICAgICAgdGhpcy5kaXN0cmlidXRpb25zID0gdGhpcy5uZXdEaXN0cmlidXRpb25zLnNsaWNlKDApO1xuICAgICAgICAgICAgdGhpcy5uZXdEaXN0cmlidXRpb25zID0gdGhpcy5jbGVhckRpc3RyaWJ1dGlvbnModGhpcy5uZXdEaXN0cmlidXRpb25zKTtcbiAgICAgICAgICAgIC8vIGRvIGNvbGxpc2lvbiBzdHVmZlxuICAgICAgICAgICAgdmFyIGVxdWlsaWJyaXVtID0gdGhpcy5nZXRFcXVpbGlicml1bSgpO1xuICAgICAgICAgICAgdmFyIHZlbG9jaXR5U2V0ID0gQ29uZmlnLmdldCgndmVsb2NpdHktc2V0Jyk7XG4gICAgICAgICAgICAvLyB2YXIgZm9yY2UgPSAxMDtcbiAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzdHJpYnV0aW9uc1trXSA9IHRoaXMuZGlzdHJpYnV0aW9uc1trXSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5kaXN0cmlidXRpb25zW2tdIC0gZXF1aWxpYnJpdW1ba10pIC8gcmVsYXhhdGlvblRpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gKyAzICogdmVsb2NpdHlTZXRba10uZHkgKiB2ZWxvY2l0eVNldFtrXS53ICogZm9yY2U7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kaXN0cmlidXRpb25zW2tdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkRpc3RyaWJ1dGlvbiBpcyBuZWdhdGl2ZSFcIiwgdGhpcy5kaXN0cmlidXRpb25zW2tdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyRGlzdHJpYnV0aW9uczogZnVuY3Rpb24oZGlzdHJpYnV0aW9ucykge1xuICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBkaXN0cmlidXRpb25zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgZGlzdHJpYnV0aW9uc1trXSA9IDA7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGRpc3RyaWJ1dGlvbnM7XG4gICAgICAgIH0sXG5cblxuICAgICAgICBnZXRFcXVpbGlicml1bTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc3BlZWRPZlNvdW5kU3F1YXJlZCA9IENvbmZpZy5nZXQoJ3NwZWVkLW9mLXNvdW5kLXNxdWFyZWQnKTtcbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eVNldCAgICAgICAgID0gQ29uZmlnLmdldCgndmVsb2NpdHktc2V0Jyk7XG5cbiAgICAgICAgICAgIHZhciBkZW5zaXR5ID0gdGhpcy5nZXREZW5zaXR5KCk7XG4gICAgICAgICAgICB2YXIgdiA9IHRoaXMuZ2V0VmVsb2NpdHkoZGVuc2l0eSwgdmVsb2NpdHlTZXQpO1xuICAgICAgICAgICAgdmFyIGVxdWlsaWJyaXVtID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZGlzdHJpYnV0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICB2YXIgeGkgPSB7eDogdmVsb2NpdHlTZXRbaV0uZHgsIHk6IHZlbG9jaXR5U2V0W2ldLmR5fTtcblxuICAgICAgICAgICAgICAgIHZhciBjdSA9ICh2LnggKiB4aS54ICsgdi55ICogeGkueSkgLyBzcGVlZE9mU291bmRTcXVhcmVkO1xuXG4gICAgICAgICAgICAgICAgZXF1aWxpYnJpdW1baV0gPSBkZW5zaXR5ICogdmVsb2NpdHlTZXRbaV0udyAqIChcbiAgICAgICAgICAgICAgICAgICAgMSArIGN1ICtcbiAgICAgICAgICAgICAgICAgICAgY3UgKiBjdSAvIDIgLVxuICAgICAgICAgICAgICAgICAgICAodi54ICogdi54ICsgdi55ICogdi55KSAvICgyICogc3BlZWRPZlNvdW5kU3F1YXJlZClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBlcXVpbGlicml1bTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREZW5zaXR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZW5zaXR5ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgZGVuc2l0eSArPSB0aGlzLmRpc3RyaWJ1dGlvbnNba107XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGRlbnNpdHk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VmVsb2NpdHk6IGZ1bmN0aW9uKGRlbnNpdHksIHZlbG9jaXR5U2V0KSB7XG4gICAgICAgICAgICAvLyB6ZXJvIHZlY3RvclxuICAgICAgICAgICAgdmFyIHUgPSB7eDogMCwgeTogMH07XG5cbiAgICAgICAgICAgIGlmIChkZW5zaXR5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBkZW5zaXR5ID0gdGhpcy5nZXREZW5zaXR5KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkZW5zaXR5ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZGlzdHJpYnV0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICB1LnggKz0gdmVsb2NpdHlTZXRbaV0udyAqIHZlbG9jaXR5U2V0W2ldLmR4ICogZGlzdHJpYnV0aW9uO1xuICAgICAgICAgICAgICAgIHUueSArPSB2ZWxvY2l0eVNldFtpXS53ICogdmVsb2NpdHlTZXRbaV0uZHkgKiBkaXN0cmlidXRpb247XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB1LnggPSB1LnggLyBkZW5zaXR5O1xuICAgICAgICAgICAgdS55ID0gdS55IC8gZGVuc2l0eTtcblxuICAgICAgICAgICAgcmV0dXJuIHU7XG5cbiAgICAgICAgfSxcbiAgICB9XG5cbiAgICByZXR1cm4gTGF0dGljZU5vZGU7XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL0xhdHRpY2VOb2RlLmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLy8gaG9kbHMgdGhlIHN0cnVjdHVyZSBhbmQga25vd3Mgd2hlcmUgZXZlcnkgbmVpZ2hib3VyIGlzLlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgR2hvc3ROb2RlID0gcmVxdWlyZSgnLi9HaG9zdE5vZGUnKTtcblxuICAgIExhdHRpY2VTdHJ1Y3R1cmUgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgLy8gdmVsb2NpdHkgc2V0XG4gICAgICAgIHRoaXMudmVsb2NpdHlTZXQgPSBjb25maWcuZ2V0KCd2ZWxvY2l0eS1zZXQnKTtcbiAgICAgICAgdGhpcy5vcHBvc2l0ZURpcmVjdGlvbnMgPSBjb25maWcuZ2V0KCdvcHBvc2l0ZS12ZWxvY2l0eS1zZXQnKTtcblxuICAgICAgICAvLyBhbW91bnQgb2Ygbm9kZXMgaW4geCBhbmQgeSBkaXJlY3Rpb25cbiAgICAgICAgLy8gMkREYW1CcmVha0RvbWFpblxuICAgICAgICAvLyAyRFpvdUhlRG9tYWluXG4gICAgICAgIHZhciBEb21haW4gPSByZXF1aXJlKCcuL0NvbmZpZy8yRFpvdUhlRG9tYWluJyk7XG4gICAgICAgIHZhciBkb21haW4gPSBuZXcgRG9tYWluKGNvbmZpZyk7XG4gICAgICAgIC8vIHZhciBkb21haW4gPSByZXF1aXJlKGNvbmZpZy5nZXQoJ2RvbWFpbicpKTtcbiAgICAgICAgdGhpcy5ueCA9IGRvbWFpbi5keDtcbiAgICAgICAgdGhpcy5ueSA9IGRvbWFpbi5keTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplTm9kZXMoZG9tYWluKTtcbiAgICB9XG5cbiAgICBMYXR0aWNlU3RydWN0dXJlLnByb3RvdHlwZSA9IHtcbiAgICAgICAgaW5pdGlhbGl6ZU5vZGVzOiBmdW5jdGlvbihkb21haW4pIHtcbiAgICAgICAgICAgIC8vIEBUT0RPOiBkZXRlcm1pbmUgaWYgc2l6ZSBzaG91bGQgYmUgMUQsIDJELCAzRCwgb3IgYW55IERcbiAgICAgICAgICAgIHRoaXMubm9kZXMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm54OyBpKyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMubnk7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZG9tYWluSWR4ID0ge3g6IGksIHk6IGp9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdGhpcy5kb21haW5Ub0lkeChkb21haW5JZHgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGVzW2lkeF0gPSBkb21haW4uaW5pdGlhbGl6ZU5vZGUoZG9tYWluSWR4KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIEl0IHNob3VsZCBhdXRvbWF0aWNhbGx5IGNyZWF0ZSBhcHByb3ByaWF0ZSBnaG9zdCBub2RlcyBmb3IgYm91bmRhcnkgY29uZGl0aW9uc1xuXG4gICAgICAgIH0sXG5cbiAgICAgICAgZm9yRWFjaE5vZGU6IGZ1bmN0aW9uKGNhbGxhYmxlKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCB0aGlzLm5vZGVzLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMubm9kZXNbaWR4XTtcbiAgICAgICAgICAgICAgICBjYWxsYWJsZShub2RlLCBpZHgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXROb2RlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlcztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREaXJlY3Rpb25zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIEBUT0RPXG4gICAgICAgICAgICByZXR1cm4gdGhpcy52ZWxvY2l0eVNldDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRPcHBvc2l0ZURpcmVjdGlvbjogZnVuY3Rpb24oZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vcHBvc2l0ZURpcmVjdGlvbnNbZGlyZWN0aW9uXTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXROZWlnaGJvdXJPZk5vZGVJbkRpcmVjdGlvbjogZnVuY3Rpb24oaWR4LCBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIC8vIGlmIGl0IGNhbid0IGZpbmQgYSBuZWlnaGJvdXJpbmcgbm9kZSwgdGhlbiBzZW5kIGEgZ2hvc3Qgbm9kZVxuICAgICAgICAgICAgdmFyIGRvbWFpbklkeCA9IHRoaXMuaWR4VG9Eb21haW4oaWR4KTtcblxuICAgICAgICAgICAgZG9tYWluSWR4LnggKz0gdGhpcy52ZWxvY2l0eVNldFtkaXJlY3Rpb25dLmR4O1xuICAgICAgICAgICAgZG9tYWluSWR4LnkgLT0gdGhpcy52ZWxvY2l0eVNldFtkaXJlY3Rpb25dLmR5O1xuXG4gICAgICAgICAgICBpZiAoISB0aGlzLmlzSW5Eb21haW4oZG9tYWluSWR4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdob3N0Tm9kZShkb21haW5JZHgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZWlnaGJvdXJJZHggPSB0aGlzLmRvbWFpblRvSWR4KGRvbWFpbklkeCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub2Rlc1tuZWlnaGJvdXJJZHhdO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlkeFRvRG9tYWluOiBmdW5jdGlvbihpZHgpIHtcbiAgICAgICAgICAgIHggPSBpZHggJSB0aGlzLm54O1xuICAgICAgICAgICAgeSA9IE1hdGguZmxvb3IoaWR4IC8gdGhpcy5ueCk7XG4gICAgICAgICAgICByZXR1cm4ge3g6IHgsIHk6IHl9O1xuICAgICAgICB9LFxuXG4gICAgICAgIGRvbWFpblRvSWR4OiBmdW5jdGlvbihkb21haW5JZHgpIHtcbiAgICAgICAgICAgIGlkeCA9IGRvbWFpbklkeC55ICogdGhpcy5ueCArIGRvbWFpbklkeC54O1xuXG4gICAgICAgICAgICByZXR1cm4gaWR4O1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzSW5Eb21haW46IGZ1bmN0aW9uKGRvbWFpbklkeCkge1xuICAgICAgICAgICAgcmV0dXJuIGRvbWFpbklkeC54ID49IDAgJiYgZG9tYWluSWR4LnggPCAodGhpcy5ueCkgJiZcbiAgICAgICAgICAgICAgICAgICAgZG9tYWluSWR4LnkgPj0gMCAmJiBkb21haW5JZHgueSA8ICh0aGlzLm55KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnaG9zdE5vZGU6IGZ1bmN0aW9uKGRvbWFpbklkeCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBHaG9zdE5vZGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0RGVuc2l0eTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBkZW5zaXR5ID0gMDtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZGVuc2l0eSArPSB0aGlzLm5vZGVzW2ldLmdldERlbnNpdHkoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBkZW5zaXR5O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIExhdHRpY2VTdHJ1Y3R1cmU7XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL0xhdHRpY2VTdHJ1Y3R1cmUuanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBOb1NsaXBCb3VuY2VCYWNrTm9kZSA9IGZ1bmN0aW9uKGRpc3RyaWJ1dGlvbnMsIG9wcG9zaXRlRGlyZWN0aW9uKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdib3VuZGFyeSc7XG4gICAgICAgIHRoaXMub3Bwb3NpdGVEaXJlY3Rpb24gPSBvcHBvc2l0ZURpcmVjdGlvbjtcblxuICAgICAgICB0aGlzLmNsZWFyRGlzdHJpYnV0aW9ucyhkaXN0cmlidXRpb25zKTtcbiAgICAgICAgdGhpcy5kaXN0cmlidXRpb25zID0gZGlzdHJpYnV0aW9ucztcbiAgICAgICAgdGhpcy5uZXdEaXN0cmlidXRpb25zID0gZGlzdHJpYnV0aW9ucy5zbGljZSgwKTtcbiAgICB9XG5cbiAgICBOb1NsaXBCb3VuY2VCYWNrTm9kZS5wcm90b3R5cGUgPSB7XG4gICAgICAgIHN0cmVhbVRvOiBmdW5jdGlvbihkaXJlY3Rpb24sIG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gXCJsYXR0aWNlXCIpIHtcbiAgICAgICAgICAgICAgICBkaXN0cmlidXRpb24gPSB0aGlzLmdldERpc3RyaWJ1dGlvbihkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0RGlzdHJpYnV0aW9uKGRpcmVjdGlvbiwgZGlzdHJpYnV0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBhcHBseUJvdW5kYXJ5OiBmdW5jdGlvbihkaXJlY3Rpb24sIG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gXCJsYXR0aWNlXCIpIHtcbiAgICAgICAgICAgICAgICBkaXN0cmlidXRpb24gPSB0aGlzLmdldERpc3RyaWJ1dGlvbihkaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0RGlzdHJpYnV0aW9uKGRpcmVjdGlvbiwgZGlzdHJpYnV0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2V0RGlzdHJpYnV0aW9uKHRoaXMub3Bwb3NpdGVPZihkaXJlY3Rpb24pLCAwKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREaXN0cmlidXRpb246IGZ1bmN0aW9uKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlzdHJpYnV0aW9uc1t0aGlzLm9wcG9zaXRlT2YoZGlyZWN0aW9uKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0RGlzdHJpYnV0aW9uOiBmdW5jdGlvbihkaXJlY3Rpb24sIGRpc3RyaWJ1dGlvbikge1xuICAgICAgICAgICAgdGhpcy5kaXN0cmlidXRpb25zW2RpcmVjdGlvbl0gPSBkaXN0cmlidXRpb247XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3Bwb3NpdGVPZjogZnVuY3Rpb24oZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vcHBvc2l0ZURpcmVjdGlvbltkaXJlY3Rpb25dO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbGxpZGU6IGZ1bmN0aW9uKHJlbGF4YXRpb25UaW1lKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnMgPSB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMuc2xpY2UoMCk7XG4gICAgICAgICAgICB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMgPSB0aGlzLmNsZWFyRGlzdHJpYnV0aW9ucyh0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyRGlzdHJpYnV0aW9uczogZnVuY3Rpb24oZGlzdHJpYnV0aW9ucykge1xuICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBkaXN0cmlidXRpb25zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgZGlzdHJpYnV0aW9uc1trXSA9IDA7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGRpc3RyaWJ1dGlvbnM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0RGVuc2l0eTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZGVuc2l0eSA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IHRoaXMuZGlzdHJpYnV0aW9ucy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgIGRlbnNpdHkgKz0gdGhpcy5kaXN0cmlidXRpb25zW2tdO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBkZW5zaXR5O1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFZlbG9jaXR5OiBmdW5jdGlvbihkZW5zaXR5LCB2ZWxvY2l0eVNldCkge1xuICAgICAgICAgICAgLy8gemVybyB2ZWN0b3JcbiAgICAgICAgICAgIHZhciB1ID0ge3g6IDAsIHk6IDB9O1xuXG4gICAgICAgICAgICBpZiAoZGVuc2l0eSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZGVuc2l0eSA9IHRoaXMuZ2V0RGVuc2l0eSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGVuc2l0eSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGlzdHJpYnV0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBkaXN0cmlidXRpb24gPSB0aGlzLmRpc3RyaWJ1dGlvbnNbaV07XG4gICAgICAgICAgICAgICAgdS54ICs9IHZlbG9jaXR5U2V0W2ldLncgKiB2ZWxvY2l0eVNldFtpXS5keCAqIGRpc3RyaWJ1dGlvbjtcbiAgICAgICAgICAgICAgICB1LnkgKz0gdmVsb2NpdHlTZXRbaV0udyAqIHZlbG9jaXR5U2V0W2ldLmR5ICogZGlzdHJpYnV0aW9uO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdS54ID0gdS54IC8gZGVuc2l0eTtcbiAgICAgICAgICAgIHUueSA9IHUueSAvIGRlbnNpdHk7XG5cbiAgICAgICAgICAgIHJldHVybiB1O1xuXG4gICAgICAgIH0sXG4gICAgfVxuXG4gICAgcmV0dXJuIE5vU2xpcEJvdW5jZUJhY2tOb2RlO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9Ob1NsaXBCb3VuY2VCYWNrTm9kZS5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIERlbnNpdHlWaXN1YWxpemF0aW9uR3JhcGggPSBmdW5jdGlvbihzdHJ1Y3R1cmUsIGNhbnZhcykge1xuICAgICAgICB0aGlzLnN0cnVjdHVyZSA9IHN0cnVjdHVyZTtcbiAgICAgICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG5cbiAgICAgICAgdGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG4gICAgICAgIHZhciBtYXhEZW5zaXR5ID0gMDtcbiAgICAgICAgdGhpcy5zdHJ1Y3R1cmUuZm9yRWFjaE5vZGUoZnVuY3Rpb24obm9kZSwgaWR4KSB7XG4gICAgICAgICAgICB2YXIgZGVuc2l0eSA9IG5vZGUuZ2V0RGVuc2l0eSgpO1xuICAgICAgICAgICAgaWYgKGRlbnNpdHkgPiBtYXhEZW5zaXR5KSB7XG4gICAgICAgICAgICAgICAgbWF4RGVuc2l0eSA9IGRlbnNpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLm1heERlbnNpdHkgPSBtYXhEZW5zaXR5O1xuICAgIH1cblxuICAgIERlbnNpdHlWaXN1YWxpemF0aW9uR3JhcGgucHJvdG90eXBlID0ge1xuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQudHJhbnNsYXRlKHRoaXMuY2FudmFzLndpZHRoIC8gMiwgdGhpcy5jYW52YXMuaGVpZ2h0IC8gMik7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQuc2NhbGUoMSwgLTEpO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnRyYW5zbGF0ZSgtIHRoaXMuY2FudmFzLndpZHRoIC8gMiwgLSB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKTtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5zdHJva2VTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxpbmVXaWR0aCA9IDM7XG4gICAgICAgICAgICAvLyB0aGlzLmNvbnRleHQudHJhbnNsYXRlKDAsIDApO1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG5cbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcblxuICAgICAgICAgICAgdmFyIG1heElkeCA9IHRoaXMuc3RydWN0dXJlLm5vZGVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICB2YXIgd2lkdGhNdWx0aXBsaWVyID0gdGhpcy5jYW52YXMud2lkdGggLyBtYXhJZHg7XG4gICAgICAgICAgICB2YXIgaGVpZ2h0TXV0bGlwbGllciA9IHRoaXMuY2FudmFzLmhlaWdodCAvIHRoaXMubWF4RGVuc2l0eTtcblxuICAgICAgICAgICAgdmFyIG5vZGUgPSB0aGlzLnN0cnVjdHVyZS5ub2Rlc1swXTtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5tb3ZlVG8oMCwgaGVpZ2h0TXV0bGlwbGllciAqIG5vZGUuZ2V0RGVuc2l0eSgpKTtcblxuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5zdHJ1Y3R1cmUuZm9yRWFjaE5vZGUoZnVuY3Rpb24obm9kZSwgaWR4KSB7XG4gICAgICAgICAgICAgICAgdGhhdC5jb250ZXh0LmxpbmVUbyh3aWR0aE11bHRpcGxpZXIgKiBpZHgsIGhlaWdodE11dGxpcGxpZXIgKiBub2RlLmdldERlbnNpdHkoKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgfSxcbiAgICB9XG5cbiAgICByZXR1cm4gRGVuc2l0eVZpc3VhbGl6YXRpb25HcmFwaDtcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvVmlzdWFsaXplcnMvRGVuc2l0eVZpc3VhbGl6YXRpb25HcmFwaC5qc1wiLFwiL1Zpc3VhbGl6ZXJzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgRGVuc2l0eVZpc3VhbGl6ZXIyRCA9IGZ1bmN0aW9uKHN0cnVjdHVyZSwgY2FudmFzLCB2aXN1YWxpemVyLCBkaXN0YW5jZUJldHdlZW5Ob2RlKSB7XG4gICAgICAgIHRoaXMuc3RydWN0dXJlID0gc3RydWN0dXJlO1xuICAgICAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICAgICAgdGhpcy52aXN1YWxpemVyID0gdmlzdWFsaXplcjtcbiAgICAgICAgdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlID0gZGlzdGFuY2VCZXR3ZWVuTm9kZSB8fCAyMDtcblxuICAgICAgICB0aGlzLmNvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgfVxuXG4gICAgRGVuc2l0eVZpc3VhbGl6ZXIyRC5wcm90b3R5cGUgPSB7XG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLndpZHRoO1xuXG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZG9tYWluSWR4ID0gdGhhdC5zdHJ1Y3R1cmUuaWR4VG9Eb21haW4oaWR4KTtcbiAgICAgICAgICAgICAgICB0aGF0LmRyYXdOb2RlKGRvbWFpbklkeCwgbm9kZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy52aXN1YWxpemVyLnJlbmRlcigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRyYXdOb2RlOiBmdW5jdGlvbihkb21haW5JZHgsIG5vZGUpIHtcbiAgICAgICAgICAgIHZhciByYWRpdXMgPSA1O1xuXG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dDtcbiAgICAgICAgICAgIGNvbnRleHQuc2F2ZSgpO1xuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoXG4gICAgICAgICAgICAgICAgZG9tYWluSWR4LnggKiB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUsXG4gICAgICAgICAgICAgICAgZG9tYWluSWR4LnkgKiB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGVcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBhbHBoYSA9IE1hdGgubWluKDEsIE1hdGgubWF4KG5vZGUuZ2V0RGVuc2l0eSgpLCAwKSk7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2JhKDMyLCA3MiwgMTU1LCAnICsgYWxwaGEgKyAnKSc7Ly8gJyMzMzY3ZDUnO1xuICAgICAgICAgICAgY29udGV4dC5maWxsUmVjdCgwICwgMCwgdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlLCB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUpO1xuXG4gICAgICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBrZWVwUmVuZGVyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RvcFJlbmRlcmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gRGVuc2l0eVZpc3VhbGl6ZXIyRDtcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvVmlzdWFsaXplcnMvRGVuc2l0eVZpc3VhbGl6ZXIyRC5qc1wiLFwiL1Zpc3VhbGl6ZXJzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgRmFjdG9yeSA9IGZ1bmN0aW9uKHN0cnVjdHVyZSwgZG9tYWluKSB7XG4gICAgICAgIHRoaXMuc3RydWN0dXJlID0gc3RydWN0dXJlO1xuICAgICAgICB0aGlzLmRvbWFpbiA9IGRvbWFpbjtcbiAgICB9XG5cbiAgICBGYWN0b3J5LnByb3RvdHlwZSA9IHtcbiAgICAgICAgLy8gVE9ETzogbWFrZSBpdCBtb3JlIGR5bmFtaWNcbiAgICAgICAgYnVpbGQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIFZpc3VhbGl6ZXJzID0gcmVxdWlyZSgnLi9WaXN1YWxpemVycycpO1xuICAgICAgICAgICAgdmlzdWFsaXplcnMgPSBuZXcgVmlzdWFsaXplcnM7XG4gICAgICAgICAgICB2YXIgZGlzdGFuY2VCZXR3ZWVuTm9kZXMgPSA1O1xuXG4gICAgICAgICAgICB2YXIgU3RydWN0dXJlVmlzdWFsaXplciA9IHJlcXVpcmUoJy4vTGF0dGljZVN0cnVjdHVyZVZpc2F1YWxpemVyMkQnKTtcbiAgICAgICAgICAgIHZhciBEZW5zaXR5VmlzdWFsaXplciA9IHJlcXVpcmUoJy4vRGVuc2l0eVZpc3VhbGl6ZXIyRCcpO1xuICAgICAgICAgICAgdmFyIFNwZWVkVmlzdWFsaXplciA9IHJlcXVpcmUoJy4vU3BlZWRWaXN1YWxpemVyMkQnKTtcbiAgICAgICAgICAgIHZhciBEZW5zaXR5VmlzdWFsaXphdGlvbkdyYXBoID0gcmVxdWlyZSgnLi9EZW5zaXR5VmlzdWFsaXphdGlvbkdyYXBoJyk7XG5cbiAgICAgICAgICAgIHZhciBkZW5zdGl5Q2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlbnNpdHlDYW52YXMnKTtcbiAgICAgICAgICAgIHZhciBzdHJ1Y3R1cmUgPSBuZXcgU3RydWN0dXJlVmlzdWFsaXplcih0aGlzLnN0cnVjdHVyZSwgZGVuc3RpeUNhbnZhcywgZGlzdGFuY2VCZXR3ZWVuTm9kZXMpO1xuICAgICAgICAgICAgdmlzdWFsaXplcnMuYWRkKFxuICAgICAgICAgICAgICAgIG5ldyBEZW5zaXR5VmlzdWFsaXplcih0aGlzLnN0cnVjdHVyZSwgZGVuc3RpeUNhbnZhcywgc3RydWN0dXJlLCBkaXN0YW5jZUJldHdlZW5Ob2RlcylcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBEcmF3IGVhY2ggbm9kZVxuICAgICAgICAgICAgZGVuc3RpeUNhbnZhcy53aWR0aCA9IGRpc3RhbmNlQmV0d2Vlbk5vZGVzICogdGhpcy5kb21haW4uZHg7XG4gICAgICAgICAgICBkZW5zdGl5Q2FudmFzLmhlaWdodCA9IGRpc3RhbmNlQmV0d2Vlbk5vZGVzICogdGhpcy5kb21haW4uZHk7XG5cbiAgICAgICAgICAgIHZhciBzcGVlZENhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzcGVlZENhbnZhcycpO1xuICAgICAgICAgICAgdmFyIHN0cnVjdHVyZSA9IG5ldyBTdHJ1Y3R1cmVWaXN1YWxpemVyKHRoaXMuc3RydWN0dXJlLCBzcGVlZENhbnZhcywgZGlzdGFuY2VCZXR3ZWVuTm9kZXMpO1xuICAgICAgICAgICAgdmlzdWFsaXplcnMuYWRkKFxuICAgICAgICAgICAgICAgIG5ldyBTcGVlZFZpc3VhbGl6ZXIodGhpcy5zdHJ1Y3R1cmUsIHNwZWVkQ2FudmFzLCBzdHJ1Y3R1cmUsIGRpc3RhbmNlQmV0d2Vlbk5vZGVzKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHNwZWVkQ2FudmFzLndpZHRoID0gZGlzdGFuY2VCZXR3ZWVuTm9kZXMgKiB0aGlzLmRvbWFpbi5keDtcbiAgICAgICAgICAgIHNwZWVkQ2FudmFzLmhlaWdodCA9IGRpc3RhbmNlQmV0d2Vlbk5vZGVzICogdGhpcy5kb21haW4uZHk7XG5cbiAgICAgICAgICAgIHZhciBncmFwaENhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdncmFwaENhbnZhcycpO1xuICAgICAgICAgICAgdmlzdWFsaXplcnMuYWRkKFxuICAgICAgICAgICAgICAgIG5ldyBEZW5zaXR5VmlzdWFsaXphdGlvbkdyYXBoKHRoaXMuc3RydWN0dXJlLCBncmFwaENhbnZhcylcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBncmFwaENhbnZhcy53aWR0aCA9IGRpc3RhbmNlQmV0d2Vlbk5vZGVzICogdGhpcy5kb21haW4uZHg7XG4gICAgICAgICAgICBncmFwaENhbnZhcy5oZWlnaHQgPSBkaXN0YW5jZUJldHdlZW5Ob2RlcyAqIHRoaXMuZG9tYWluLmR5O1xuXG4gICAgICAgICAgICByZXR1cm4gdmlzdWFsaXplcnM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gRmFjdG9yeTtcbn0oKVxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9WaXN1YWxpemVycy9GYWN0b3J5LmpzXCIsXCIvVmlzdWFsaXplcnNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBMYXR0aWNlU3RydWN0dXJlVmlzdWFsaXplcjJEID0gZnVuY3Rpb24oc3RydWN0dXJlLCBjYW52YXMsIHZpc3VhbGl6ZXIsIGRpc3RhbmNlQmV0d2Vlbk5vZGUpIHtcbiAgICAgICAgdGhpcy5zdHJ1Y3R1cmUgPSBzdHJ1Y3R1cmU7XG4gICAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgICB0aGlzLnZpc3VhbGl6ZXIgPSB2aXN1YWxpemVyO1xuICAgICAgICB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUgPSBkaXN0YW5jZUJldHdlZW5Ob2RlIHx8IDIwO1xuXG4gICAgICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB9O1xuXG4gICAgTGF0dGljZVN0cnVjdHVyZVZpc3VhbGl6ZXIyRC5wcm90b3R5cGUgPSB7XG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgICAgIHRoaXMuc3RydWN0dXJlLmZvckVhY2hOb2RlKGZ1bmN0aW9uKG5vZGUsIGlkeCkge1xuICAgICAgICAgICAgICAgIHZhciBkb21haW5JZHggPSB0aGF0LnN0cnVjdHVyZS5pZHhUb0RvbWFpbihpZHgpO1xuICAgICAgICAgICAgICAgIHRoYXQuZHJhd05vZGUoZG9tYWluSWR4LCBub2RlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRyYXdOb2RlOiBmdW5jdGlvbihkb21haW5JZHgsIG5vZGUpIHtcbiAgICAgICAgICAgIHZhciByYWRpdXMgPSA1O1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG4gICAgICAgICAgICBjb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKFxuICAgICAgICAgICAgICAgIGRvbWFpbklkeC54ICogdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlICsgdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlIC8gMixcbiAgICAgICAgICAgICAgICBkb21haW5JZHgueSAqIHRoaXMuZGlzdGFuY2VCZXR3ZWVuTm9kZSArIHRoaXMuZGlzdGFuY2VCZXR3ZWVuTm9kZSAvIDJcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBEcmF3IHRoZSBuZG9lXG4gICAgICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJsYXR0aWNlXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnBvc2l0aW9uID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gY29udGV4dC5maWxsU3R5bGUgPSAnIzQ4NmE5Nic7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb250ZXh0LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJib3VuZGFyeVwiOlxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gY29udGV4dC5maWxsU3R5bGUgPSAnbGltZWdyZWVuJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZ2hvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9IGNvbnRleHQuZmlsbFN0eWxlID0gJyNlNjViNDcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY29udGV4dC5hcmMoMCwgMCwgcmFkaXVzIC8gMiwgMCwgMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgY29udGV4dC5maWxsKCk7XG5cbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eSA9IG5vZGUuZ2V0VmVsb2NpdHkobm9kZS5nZXREZW5zaXR5KCksIHRoaXMuc3RydWN0dXJlLnZlbG9jaXR5U2V0KTtcbiAgICAgICAgICAgIHRoaXMuZHJhd0Fycm93KGNvbnRleHQsIHZlbG9jaXR5LngsIHZlbG9jaXR5LnksIDIwKTtcblxuICAgICAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZHJhd0Fycm93OiBmdW5jdGlvbihjb250ZXh0LCB4LCB5LCBtYWduaXR1ZGUsIG1heE1hZ25pdHVkZSkge1xuICAgICAgICAgICAgLy8gbWFrZSBhcnJvd3MgdW5pdFxuICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgc3BlZWQgPSBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSk7XG5cbiAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjb250ZXh0Lm1vdmVUbygwLCAwKTtcbiAgICAgICAgICAgIGNvbnRleHQubGluZVRvKG1hZ25pdHVkZSAqIHggLyBzcGVlZCwgbWFnbml0dWRlICogeSAvIHNwZWVkKTtcbiAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZHJhd0Nvbm5lY3Rpb246IGZ1bmN0aW9uKG5vZGUxLCBub2RlMikge1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gTGF0dGljZVN0cnVjdHVyZVZpc3VhbGl6ZXIyRDtcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvVmlzdWFsaXplcnMvTGF0dGljZVN0cnVjdHVyZVZpc2F1YWxpemVyMkQuanNcIixcIi9WaXN1YWxpemVyc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgLypcbiAgICBSYWluYm93VmlzLUpTXG4gICAgUmVsZWFzZWQgdW5kZXIgRWNsaXBzZSBQdWJsaWMgTGljZW5zZSAtIHYgMS4wXG4gICAgKi9cblxuICAgIGZ1bmN0aW9uIFJhaW5ib3coKVxuICAgIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIHZhciBncmFkaWVudHMgPSBudWxsO1xuICAgICAgICB2YXIgbWluTnVtID0gMDtcbiAgICAgICAgdmFyIG1heE51bSA9IDEwMDtcbiAgICAgICAgdmFyIGNvbG91cnMgPSBbJ2ZmMDAwMCcsICdmZmZmMDAnLCAnMDBmZjAwJywgJzAwMDBmZiddO1xuICAgICAgICBzZXRDb2xvdXJzKGNvbG91cnMpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHNldENvbG91cnMgKHNwZWN0cnVtKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoc3BlY3RydW0ubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUmFpbmJvdyBtdXN0IGhhdmUgdHdvIG9yIG1vcmUgY29sb3Vycy4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGluY3JlbWVudCA9IChtYXhOdW0gLSBtaW5OdW0pLyhzcGVjdHJ1bS5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RHcmFkaWVudCA9IG5ldyBDb2xvdXJHcmFkaWVudCgpO1xuICAgICAgICAgICAgICAgIGZpcnN0R3JhZGllbnQuc2V0R3JhZGllbnQoc3BlY3RydW1bMF0sIHNwZWN0cnVtWzFdKTtcbiAgICAgICAgICAgICAgICBmaXJzdEdyYWRpZW50LnNldE51bWJlclJhbmdlKG1pbk51bSwgbWluTnVtICsgaW5jcmVtZW50KTtcbiAgICAgICAgICAgICAgICBncmFkaWVudHMgPSBbIGZpcnN0R3JhZGllbnQgXTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgc3BlY3RydW0ubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xvdXJHcmFkaWVudCA9IG5ldyBDb2xvdXJHcmFkaWVudCgpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvdXJHcmFkaWVudC5zZXRHcmFkaWVudChzcGVjdHJ1bVtpXSwgc3BlY3RydW1baSArIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3VyR3JhZGllbnQuc2V0TnVtYmVyUmFuZ2UobWluTnVtICsgaW5jcmVtZW50ICogaSwgbWluTnVtICsgaW5jcmVtZW50ICogKGkgKyAxKSk7XG4gICAgICAgICAgICAgICAgICAgIGdyYWRpZW50c1tpXSA9IGNvbG91ckdyYWRpZW50O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbG91cnMgPSBzcGVjdHJ1bTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0U3BlY3RydW0gPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICBzZXRDb2xvdXJzKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0U3BlY3RydW1CeUFycmF5ID0gZnVuY3Rpb24gKGFycmF5KVxuICAgICAgICB7XG4gICAgICAgICAgICBzZXRDb2xvdXJzKGFycmF5KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb2xvdXJBdCA9IGZ1bmN0aW9uIChudW1iZXIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihudW1iZXIgKyAnIGlzIG5vdCBhIG51bWJlcicpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChncmFkaWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdyYWRpZW50c1swXS5jb2xvdXJBdChudW1iZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VnbWVudCA9IChtYXhOdW0gLSBtaW5OdW0pLyhncmFkaWVudHMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBNYXRoLm1pbihNYXRoLmZsb29yKChNYXRoLm1heChudW1iZXIsIG1pbk51bSkgLSBtaW5OdW0pL3NlZ21lbnQpLCBncmFkaWVudHMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdyYWRpZW50c1tpbmRleF0uY29sb3VyQXQobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29sb3JBdCA9IHRoaXMuY29sb3VyQXQ7XG5cbiAgICAgICAgdGhpcy5zZXROdW1iZXJSYW5nZSA9IGZ1bmN0aW9uIChtaW5OdW1iZXIsIG1heE51bWJlcilcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKG1heE51bWJlciA+IG1pbk51bWJlcikge1xuICAgICAgICAgICAgICAgIG1pbk51bSA9IG1pbk51bWJlcjtcbiAgICAgICAgICAgICAgICBtYXhOdW0gPSBtYXhOdW1iZXI7XG4gICAgICAgICAgICAgICAgc2V0Q29sb3Vycyhjb2xvdXJzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ21heE51bWJlciAoJyArIG1heE51bWJlciArICcpIGlzIG5vdCBncmVhdGVyIHRoYW4gbWluTnVtYmVyICgnICsgbWluTnVtYmVyICsgJyknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQ29sb3VyR3JhZGllbnQoKVxuICAgIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIHZhciBzdGFydENvbG91ciA9ICdmZjAwMDAnO1xuICAgICAgICB2YXIgZW5kQ29sb3VyID0gJzAwMDBmZic7XG4gICAgICAgIHZhciBtaW5OdW0gPSAwO1xuICAgICAgICB2YXIgbWF4TnVtID0gMTAwO1xuXG4gICAgICAgIHRoaXMuc2V0R3JhZGllbnQgPSBmdW5jdGlvbiAoY29sb3VyU3RhcnQsIGNvbG91ckVuZClcbiAgICAgICAge1xuICAgICAgICAgICAgc3RhcnRDb2xvdXIgPSBnZXRIZXhDb2xvdXIoY29sb3VyU3RhcnQpO1xuICAgICAgICAgICAgZW5kQ29sb3VyID0gZ2V0SGV4Q29sb3VyKGNvbG91ckVuZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldE51bWJlclJhbmdlID0gZnVuY3Rpb24gKG1pbk51bWJlciwgbWF4TnVtYmVyKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAobWF4TnVtYmVyID4gbWluTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgbWluTnVtID0gbWluTnVtYmVyO1xuICAgICAgICAgICAgICAgIG1heE51bSA9IG1heE51bWJlcjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ21heE51bWJlciAoJyArIG1heE51bWJlciArICcpIGlzIG5vdCBncmVhdGVyIHRoYW4gbWluTnVtYmVyICgnICsgbWluTnVtYmVyICsgJyknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29sb3VyQXQgPSBmdW5jdGlvbiAobnVtYmVyKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gY2FsY0hleChudW1iZXIsIHN0YXJ0Q29sb3VyLnN1YnN0cmluZygwLDIpLCBlbmRDb2xvdXIuc3Vic3RyaW5nKDAsMikpXG4gICAgICAgICAgICAgICAgKyBjYWxjSGV4KG51bWJlciwgc3RhcnRDb2xvdXIuc3Vic3RyaW5nKDIsNCksIGVuZENvbG91ci5zdWJzdHJpbmcoMiw0KSlcbiAgICAgICAgICAgICAgICArIGNhbGNIZXgobnVtYmVyLCBzdGFydENvbG91ci5zdWJzdHJpbmcoNCw2KSwgZW5kQ29sb3VyLnN1YnN0cmluZyg0LDYpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGNIZXgobnVtYmVyLCBjaGFubmVsU3RhcnRfQmFzZTE2LCBjaGFubmVsRW5kX0Jhc2UxNilcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIG51bSA9IG51bWJlcjtcbiAgICAgICAgICAgIGlmIChudW0gPCBtaW5OdW0pIHtcbiAgICAgICAgICAgICAgICBudW0gPSBtaW5OdW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobnVtID4gbWF4TnVtKSB7XG4gICAgICAgICAgICAgICAgbnVtID0gbWF4TnVtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG51bVJhbmdlID0gbWF4TnVtIC0gbWluTnVtO1xuICAgICAgICAgICAgdmFyIGNTdGFydF9CYXNlMTAgPSBwYXJzZUludChjaGFubmVsU3RhcnRfQmFzZTE2LCAxNik7XG4gICAgICAgICAgICB2YXIgY0VuZF9CYXNlMTAgPSBwYXJzZUludChjaGFubmVsRW5kX0Jhc2UxNiwgMTYpO1xuICAgICAgICAgICAgdmFyIGNQZXJVbml0ID0gKGNFbmRfQmFzZTEwIC0gY1N0YXJ0X0Jhc2UxMCkvbnVtUmFuZ2U7XG4gICAgICAgICAgICB2YXIgY19CYXNlMTAgPSBNYXRoLnJvdW5kKGNQZXJVbml0ICogKG51bSAtIG1pbk51bSkgKyBjU3RhcnRfQmFzZTEwKTtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXRIZXgoY19CYXNlMTAudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdEhleChoZXgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChoZXgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcwJyArIGhleDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzSGV4Q29sb3VyKHN0cmluZylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHJlZ2V4ID0gL14jP1swLTlhLWZBLUZdezZ9JC9pO1xuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4LnRlc3Qoc3RyaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEhleENvbG91cihzdHJpbmcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChpc0hleENvbG91cihzdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZy5zdWJzdHJpbmcoc3RyaW5nLmxlbmd0aCAtIDYsIHN0cmluZy5sZW5ndGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IHN0cmluZy50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb2xvdXJOYW1lcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29sb3VyTmFtZXNbbmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihzdHJpbmcgKyAnIGlzIG5vdCBhIHZhbGlkIGNvbG91ci4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dGVuZGVkIGxpc3Qgb2YgQ1NTIGNvbG9ybmFtZXMgcyB0YWtlbiBmcm9tXG4gICAgICAgIC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL2NzczMtY29sb3IvI3N2Zy1jb2xvclxuICAgICAgICB2YXIgY29sb3VyTmFtZXMgPSB7XG4gICAgICAgICAgICBhbGljZWJsdWU6IFwiRjBGOEZGXCIsXG4gICAgICAgICAgICBhbnRpcXVld2hpdGU6IFwiRkFFQkQ3XCIsXG4gICAgICAgICAgICBhcXVhOiBcIjAwRkZGRlwiLFxuICAgICAgICAgICAgYXF1YW1hcmluZTogXCI3RkZGRDRcIixcbiAgICAgICAgICAgIGF6dXJlOiBcIkYwRkZGRlwiLFxuICAgICAgICAgICAgYmVpZ2U6IFwiRjVGNURDXCIsXG4gICAgICAgICAgICBiaXNxdWU6IFwiRkZFNEM0XCIsXG4gICAgICAgICAgICBibGFjazogXCIwMDAwMDBcIixcbiAgICAgICAgICAgIGJsYW5jaGVkYWxtb25kOiBcIkZGRUJDRFwiLFxuICAgICAgICAgICAgYmx1ZTogXCIwMDAwRkZcIixcbiAgICAgICAgICAgIGJsdWV2aW9sZXQ6IFwiOEEyQkUyXCIsXG4gICAgICAgICAgICBicm93bjogXCJBNTJBMkFcIixcbiAgICAgICAgICAgIGJ1cmx5d29vZDogXCJERUI4ODdcIixcbiAgICAgICAgICAgIGNhZGV0Ymx1ZTogXCI1RjlFQTBcIixcbiAgICAgICAgICAgIGNoYXJ0cmV1c2U6IFwiN0ZGRjAwXCIsXG4gICAgICAgICAgICBjaG9jb2xhdGU6IFwiRDI2OTFFXCIsXG4gICAgICAgICAgICBjb3JhbDogXCJGRjdGNTBcIixcbiAgICAgICAgICAgIGNvcm5mbG93ZXJibHVlOiBcIjY0OTVFRFwiLFxuICAgICAgICAgICAgY29ybnNpbGs6IFwiRkZGOERDXCIsXG4gICAgICAgICAgICBjcmltc29uOiBcIkRDMTQzQ1wiLFxuICAgICAgICAgICAgY3lhbjogXCIwMEZGRkZcIixcbiAgICAgICAgICAgIGRhcmtibHVlOiBcIjAwMDA4QlwiLFxuICAgICAgICAgICAgZGFya2N5YW46IFwiMDA4QjhCXCIsXG4gICAgICAgICAgICBkYXJrZ29sZGVucm9kOiBcIkI4ODYwQlwiLFxuICAgICAgICAgICAgZGFya2dyYXk6IFwiQTlBOUE5XCIsXG4gICAgICAgICAgICBkYXJrZ3JlZW46IFwiMDA2NDAwXCIsXG4gICAgICAgICAgICBkYXJrZ3JleTogXCJBOUE5QTlcIixcbiAgICAgICAgICAgIGRhcmtraGFraTogXCJCREI3NkJcIixcbiAgICAgICAgICAgIGRhcmttYWdlbnRhOiBcIjhCMDA4QlwiLFxuICAgICAgICAgICAgZGFya29saXZlZ3JlZW46IFwiNTU2QjJGXCIsXG4gICAgICAgICAgICBkYXJrb3JhbmdlOiBcIkZGOEMwMFwiLFxuICAgICAgICAgICAgZGFya29yY2hpZDogXCI5OTMyQ0NcIixcbiAgICAgICAgICAgIGRhcmtyZWQ6IFwiOEIwMDAwXCIsXG4gICAgICAgICAgICBkYXJrc2FsbW9uOiBcIkU5OTY3QVwiLFxuICAgICAgICAgICAgZGFya3NlYWdyZWVuOiBcIjhGQkM4RlwiLFxuICAgICAgICAgICAgZGFya3NsYXRlYmx1ZTogXCI0ODNEOEJcIixcbiAgICAgICAgICAgIGRhcmtzbGF0ZWdyYXk6IFwiMkY0RjRGXCIsXG4gICAgICAgICAgICBkYXJrc2xhdGVncmV5OiBcIjJGNEY0RlwiLFxuICAgICAgICAgICAgZGFya3R1cnF1b2lzZTogXCIwMENFRDFcIixcbiAgICAgICAgICAgIGRhcmt2aW9sZXQ6IFwiOTQwMEQzXCIsXG4gICAgICAgICAgICBkZWVwcGluazogXCJGRjE0OTNcIixcbiAgICAgICAgICAgIGRlZXBza3libHVlOiBcIjAwQkZGRlwiLFxuICAgICAgICAgICAgZGltZ3JheTogXCI2OTY5NjlcIixcbiAgICAgICAgICAgIGRpbWdyZXk6IFwiNjk2OTY5XCIsXG4gICAgICAgICAgICBkb2RnZXJibHVlOiBcIjFFOTBGRlwiLFxuICAgICAgICAgICAgZmlyZWJyaWNrOiBcIkIyMjIyMlwiLFxuICAgICAgICAgICAgZmxvcmFsd2hpdGU6IFwiRkZGQUYwXCIsXG4gICAgICAgICAgICBmb3Jlc3RncmVlbjogXCIyMjhCMjJcIixcbiAgICAgICAgICAgIGZ1Y2hzaWE6IFwiRkYwMEZGXCIsXG4gICAgICAgICAgICBnYWluc2Jvcm86IFwiRENEQ0RDXCIsXG4gICAgICAgICAgICBnaG9zdHdoaXRlOiBcIkY4RjhGRlwiLFxuICAgICAgICAgICAgZ29sZDogXCJGRkQ3MDBcIixcbiAgICAgICAgICAgIGdvbGRlbnJvZDogXCJEQUE1MjBcIixcbiAgICAgICAgICAgIGdyYXk6IFwiODA4MDgwXCIsXG4gICAgICAgICAgICBncmVlbjogXCIwMDgwMDBcIixcbiAgICAgICAgICAgIGdyZWVueWVsbG93OiBcIkFERkYyRlwiLFxuICAgICAgICAgICAgZ3JleTogXCI4MDgwODBcIixcbiAgICAgICAgICAgIGhvbmV5ZGV3OiBcIkYwRkZGMFwiLFxuICAgICAgICAgICAgaG90cGluazogXCJGRjY5QjRcIixcbiAgICAgICAgICAgIGluZGlhbnJlZDogXCJDRDVDNUNcIixcbiAgICAgICAgICAgIGluZGlnbzogXCI0QjAwODJcIixcbiAgICAgICAgICAgIGl2b3J5OiBcIkZGRkZGMFwiLFxuICAgICAgICAgICAga2hha2k6IFwiRjBFNjhDXCIsXG4gICAgICAgICAgICBsYXZlbmRlcjogXCJFNkU2RkFcIixcbiAgICAgICAgICAgIGxhdmVuZGVyYmx1c2g6IFwiRkZGMEY1XCIsXG4gICAgICAgICAgICBsYXduZ3JlZW46IFwiN0NGQzAwXCIsXG4gICAgICAgICAgICBsZW1vbmNoaWZmb246IFwiRkZGQUNEXCIsXG4gICAgICAgICAgICBsaWdodGJsdWU6IFwiQUREOEU2XCIsXG4gICAgICAgICAgICBsaWdodGNvcmFsOiBcIkYwODA4MFwiLFxuICAgICAgICAgICAgbGlnaHRjeWFuOiBcIkUwRkZGRlwiLFxuICAgICAgICAgICAgbGlnaHRnb2xkZW5yb2R5ZWxsb3c6IFwiRkFGQUQyXCIsXG4gICAgICAgICAgICBsaWdodGdyYXk6IFwiRDNEM0QzXCIsXG4gICAgICAgICAgICBsaWdodGdyZWVuOiBcIjkwRUU5MFwiLFxuICAgICAgICAgICAgbGlnaHRncmV5OiBcIkQzRDNEM1wiLFxuICAgICAgICAgICAgbGlnaHRwaW5rOiBcIkZGQjZDMVwiLFxuICAgICAgICAgICAgbGlnaHRzYWxtb246IFwiRkZBMDdBXCIsXG4gICAgICAgICAgICBsaWdodHNlYWdyZWVuOiBcIjIwQjJBQVwiLFxuICAgICAgICAgICAgbGlnaHRza3libHVlOiBcIjg3Q0VGQVwiLFxuICAgICAgICAgICAgbGlnaHRzbGF0ZWdyYXk6IFwiNzc4ODk5XCIsXG4gICAgICAgICAgICBsaWdodHNsYXRlZ3JleTogXCI3Nzg4OTlcIixcbiAgICAgICAgICAgIGxpZ2h0c3RlZWxibHVlOiBcIkIwQzRERVwiLFxuICAgICAgICAgICAgbGlnaHR5ZWxsb3c6IFwiRkZGRkUwXCIsXG4gICAgICAgICAgICBsaW1lOiBcIjAwRkYwMFwiLFxuICAgICAgICAgICAgbGltZWdyZWVuOiBcIjMyQ0QzMlwiLFxuICAgICAgICAgICAgbGluZW46IFwiRkFGMEU2XCIsXG4gICAgICAgICAgICBtYWdlbnRhOiBcIkZGMDBGRlwiLFxuICAgICAgICAgICAgbWFyb29uOiBcIjgwMDAwMFwiLFxuICAgICAgICAgICAgbWVkaXVtYXF1YW1hcmluZTogXCI2NkNEQUFcIixcbiAgICAgICAgICAgIG1lZGl1bWJsdWU6IFwiMDAwMENEXCIsXG4gICAgICAgICAgICBtZWRpdW1vcmNoaWQ6IFwiQkE1NUQzXCIsXG4gICAgICAgICAgICBtZWRpdW1wdXJwbGU6IFwiOTM3MERCXCIsXG4gICAgICAgICAgICBtZWRpdW1zZWFncmVlbjogXCIzQ0IzNzFcIixcbiAgICAgICAgICAgIG1lZGl1bXNsYXRlYmx1ZTogXCI3QjY4RUVcIixcbiAgICAgICAgICAgIG1lZGl1bXNwcmluZ2dyZWVuOiBcIjAwRkE5QVwiLFxuICAgICAgICAgICAgbWVkaXVtdHVycXVvaXNlOiBcIjQ4RDFDQ1wiLFxuICAgICAgICAgICAgbWVkaXVtdmlvbGV0cmVkOiBcIkM3MTU4NVwiLFxuICAgICAgICAgICAgbWlkbmlnaHRibHVlOiBcIjE5MTk3MFwiLFxuICAgICAgICAgICAgbWludGNyZWFtOiBcIkY1RkZGQVwiLFxuICAgICAgICAgICAgbWlzdHlyb3NlOiBcIkZGRTRFMVwiLFxuICAgICAgICAgICAgbW9jY2FzaW46IFwiRkZFNEI1XCIsXG4gICAgICAgICAgICBuYXZham93aGl0ZTogXCJGRkRFQURcIixcbiAgICAgICAgICAgIG5hdnk6IFwiMDAwMDgwXCIsXG4gICAgICAgICAgICBvbGRsYWNlOiBcIkZERjVFNlwiLFxuICAgICAgICAgICAgb2xpdmU6IFwiODA4MDAwXCIsXG4gICAgICAgICAgICBvbGl2ZWRyYWI6IFwiNkI4RTIzXCIsXG4gICAgICAgICAgICBvcmFuZ2U6IFwiRkZBNTAwXCIsXG4gICAgICAgICAgICBvcmFuZ2VyZWQ6IFwiRkY0NTAwXCIsXG4gICAgICAgICAgICBvcmNoaWQ6IFwiREE3MEQ2XCIsXG4gICAgICAgICAgICBwYWxlZ29sZGVucm9kOiBcIkVFRThBQVwiLFxuICAgICAgICAgICAgcGFsZWdyZWVuOiBcIjk4RkI5OFwiLFxuICAgICAgICAgICAgcGFsZXR1cnF1b2lzZTogXCJBRkVFRUVcIixcbiAgICAgICAgICAgIHBhbGV2aW9sZXRyZWQ6IFwiREI3MDkzXCIsXG4gICAgICAgICAgICBwYXBheWF3aGlwOiBcIkZGRUZENVwiLFxuICAgICAgICAgICAgcGVhY2hwdWZmOiBcIkZGREFCOVwiLFxuICAgICAgICAgICAgcGVydTogXCJDRDg1M0ZcIixcbiAgICAgICAgICAgIHBpbms6IFwiRkZDMENCXCIsXG4gICAgICAgICAgICBwbHVtOiBcIkREQTBERFwiLFxuICAgICAgICAgICAgcG93ZGVyYmx1ZTogXCJCMEUwRTZcIixcbiAgICAgICAgICAgIHB1cnBsZTogXCI4MDAwODBcIixcbiAgICAgICAgICAgIHJlZDogXCJGRjAwMDBcIixcbiAgICAgICAgICAgIHJvc3licm93bjogXCJCQzhGOEZcIixcbiAgICAgICAgICAgIHJveWFsYmx1ZTogXCI0MTY5RTFcIixcbiAgICAgICAgICAgIHNhZGRsZWJyb3duOiBcIjhCNDUxM1wiLFxuICAgICAgICAgICAgc2FsbW9uOiBcIkZBODA3MlwiLFxuICAgICAgICAgICAgc2FuZHlicm93bjogXCJGNEE0NjBcIixcbiAgICAgICAgICAgIHNlYWdyZWVuOiBcIjJFOEI1N1wiLFxuICAgICAgICAgICAgc2Vhc2hlbGw6IFwiRkZGNUVFXCIsXG4gICAgICAgICAgICBzaWVubmE6IFwiQTA1MjJEXCIsXG4gICAgICAgICAgICBzaWx2ZXI6IFwiQzBDMEMwXCIsXG4gICAgICAgICAgICBza3libHVlOiBcIjg3Q0VFQlwiLFxuICAgICAgICAgICAgc2xhdGVibHVlOiBcIjZBNUFDRFwiLFxuICAgICAgICAgICAgc2xhdGVncmF5OiBcIjcwODA5MFwiLFxuICAgICAgICAgICAgc2xhdGVncmV5OiBcIjcwODA5MFwiLFxuICAgICAgICAgICAgc25vdzogXCJGRkZBRkFcIixcbiAgICAgICAgICAgIHNwcmluZ2dyZWVuOiBcIjAwRkY3RlwiLFxuICAgICAgICAgICAgc3RlZWxibHVlOiBcIjQ2ODJCNFwiLFxuICAgICAgICAgICAgdGFuOiBcIkQyQjQ4Q1wiLFxuICAgICAgICAgICAgdGVhbDogXCIwMDgwODBcIixcbiAgICAgICAgICAgIHRoaXN0bGU6IFwiRDhCRkQ4XCIsXG4gICAgICAgICAgICB0b21hdG86IFwiRkY2MzQ3XCIsXG4gICAgICAgICAgICB0dXJxdW9pc2U6IFwiNDBFMEQwXCIsXG4gICAgICAgICAgICB2aW9sZXQ6IFwiRUU4MkVFXCIsXG4gICAgICAgICAgICB3aGVhdDogXCJGNURFQjNcIixcbiAgICAgICAgICAgIHdoaXRlOiBcIkZGRkZGRlwiLFxuICAgICAgICAgICAgd2hpdGVzbW9rZTogXCJGNUY1RjVcIixcbiAgICAgICAgICAgIHllbGxvdzogXCJGRkZGMDBcIixcbiAgICAgICAgICAgIHllbGxvd2dyZWVuOiBcIjlBQ0QzMlwiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUmFpbmJvdztcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvVmlzdWFsaXplcnMvUmFpbmJvdy5qc1wiLFwiL1Zpc3VhbGl6ZXJzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgUmFpbmJvdyA9IHJlcXVpcmUoJy4vUmFpbmJvdy5qcycpO1xuXG4gICAgdmFyIFNwZWVkVmlzdWFsaXplcjJEID0gZnVuY3Rpb24oc3RydWN0dXJlLCBjYW52YXMsIHZpc3VhbGl6ZXIsIGRpc3RhbmNlQmV0d2Vlbk5vZGUpIHtcbiAgICAgICAgdGhpcy5zdHJ1Y3R1cmUgPSBzdHJ1Y3R1cmU7XG4gICAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgICB0aGlzLnZpc3VhbGl6ZXIgPSB2aXN1YWxpemVyO1xuICAgICAgICB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUgPSBkaXN0YW5jZUJldHdlZW5Ob2RlIHx8IDIwO1xuXG4gICAgICAgIHRoaXMubWFwID0gbmV3IFJhaW5ib3coKTtcbiAgICAgICAgdGhpcy5tYXAuc2V0TnVtYmVyUmFuZ2UoMCwgMC4xKTtcbiAgICAgICAgdGhpcy5tYXAuc2V0U3BlY3RydW0oJ2JsdWUnLCAnZ3JlZW4nLCAneWVsbG93JywgJ3JlZCcpO1xuXG4gICAgICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB9XG5cbiAgICBTcGVlZFZpc3VhbGl6ZXIyRC5wcm90b3R5cGUgPSB7XG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLndpZHRoO1xuXG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgbWF4VmVsb2NpdHkgPSAwLjAwMDE7XG4gICAgICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSBub2RlLmdldFZlbG9jaXR5KG5vZGUuZ2V0RGVuc2l0eSgpLCB0aGF0LnN0cnVjdHVyZS52ZWxvY2l0eVNldCk7XG4gICAgICAgICAgICAgICAgdmVsb2NpdHkgPSBNYXRoLnNxcnQodmVsb2NpdHkueCAqIHZlbG9jaXR5LnggKyB2ZWxvY2l0eS55ICogdmVsb2NpdHkueSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodmVsb2NpdHkgPiBtYXhWZWxvY2l0eSkge1xuICAgICAgICAgICAgICAgICAgICBtYXhWZWxvY2l0eSA9IHZlbG9jaXR5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbWF4VmVsb2NpdHkgPSBtYXhWZWxvY2l0eTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1heFZlbG9jaXR5KTtcbiAgICAgICAgICAgIHRoaXMubWFwLnNldE51bWJlclJhbmdlKDAsIG1heFZlbG9jaXR5KTtcblxuICAgICAgICAgICAgdGhpcy5zdHJ1Y3R1cmUuZm9yRWFjaE5vZGUoZnVuY3Rpb24obm9kZSwgaWR4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGRvbWFpbklkeCA9IHRoYXQuc3RydWN0dXJlLmlkeFRvRG9tYWluKGlkeCk7XG4gICAgICAgICAgICAgICAgdGhhdC5kcmF3Tm9kZShkb21haW5JZHgsIG5vZGUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnZpc3VhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXIucmVuZGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZHJhd05vZGU6IGZ1bmN0aW9uKGRvbWFpbklkeCwgbm9kZSkge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG4gICAgICAgICAgICBjb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKFxuICAgICAgICAgICAgICAgIGRvbWFpbklkeC54ICogdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlLFxuICAgICAgICAgICAgICAgIGRvbWFpbklkeC55ICogdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSBub2RlLmdldFZlbG9jaXR5KG5vZGUuZ2V0RGVuc2l0eSgpLCB0aGlzLnN0cnVjdHVyZS52ZWxvY2l0eVNldCk7XG4gICAgICAgICAgICB2ZWxvY2l0eSA9IE1hdGguc3FydCh2ZWxvY2l0eS54ICogdmVsb2NpdHkueCArIHZlbG9jaXR5LnkgKiB2ZWxvY2l0eS55KTtcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJyMnICsgdGhpcy5tYXAuY29sb3VyQXQodmVsb2NpdHkpO1xuICAgICAgICAgICAgY29udGV4dC5maWxsUmVjdCgwICwgMCwgdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlLCB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUpO1xuXG4gICAgICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBrZWVwUmVuZGVyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RvcFJlbmRlcmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIH0sXG4gICAgfVxuXG4gICAgcmV0dXJuIFNwZWVkVmlzdWFsaXplcjJEO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9WaXN1YWxpemVycy9TcGVlZFZpc3VhbGl6ZXIyRC5qc1wiLFwiL1Zpc3VhbGl6ZXJzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgVmlzdWFsaXplcnMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy52aXN1YWxpemVycyA9IFtdO1xuICAgIH1cblxuICAgIFZpc3VhbGl6ZXJzLnByb3RvdHlwZSA9IHtcbiAgICAgICAgYWRkOiBmdW5jdGlvbih2aXN1YWxpemVyKSB7XG4gICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXJzLnB1c2godmlzdWFsaXplcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdmlzdWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy52aXN1YWxpemVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMudmlzdWFsaXplcnNbaV0ucmVuZGVyKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFZpc3VhbGl6ZXJzO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9WaXN1YWxpemVycy9WaXN1YWxpemVycy5qc1wiLFwiL1Zpc3VhbGl6ZXJzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcbiAgICAvLyBGb3IgRDJROVxuICAgIHZhciBab3VIZVZlbG9jaXR5Qm91bmRhcnlDb25kaXRpb24gPSBmdW5jdGlvbihkaXN0cmlidXRpb25zLCB2ZWxvY2l0eSwgcG9zaXRpb24pIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2xhdHRpY2UnO1xuXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjsgLy8gTiwgRSwgUywgV1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBORSwgU0UsIFNXLCBOV1xuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdmVsb2NpdHk7XG5cbiAgICAgICAgLy8gdGhpcy5jbGVhckRpc3RyaWJ1dGlvbnMoZGlzdHJpYnV0aW9ucyk7XG4gICAgICAgIHRoaXMuZGlzdHJpYnV0aW9ucyA9IGRpc3RyaWJ1dGlvbnM7XG4gICAgICAgIHRoaXMubmV3RGlzdHJpYnV0aW9ucyA9IGRpc3RyaWJ1dGlvbnMuc2xpY2UoMCk7XG4gICAgfVxuXG4gICAgWm91SGVWZWxvY2l0eUJvdW5kYXJ5Q29uZGl0aW9uLnByb3RvdHlwZSA9IHtcbiAgICAgICAgc3RyZWFtVG86IGZ1bmN0aW9uKGRpcmVjdGlvbiwgbm9kZSkge1xuICAgICAgICAgICAgZGlzdHJpYnV0aW9uID0gdGhpcy5nZXREaXN0cmlidXRpb24oZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIG5vZGUuc2V0RGlzdHJpYnV0aW9uKGRpcmVjdGlvbiwgZGlzdHJpYnV0aW9uKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREaXN0cmlidXRpb246IGZ1bmN0aW9uKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlzdHJpYnV0aW9uc1tkaXJlY3Rpb25dO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldERpc3RyaWJ1dGlvbjogZnVuY3Rpb24oZGlyZWN0aW9uLCBkaXN0cmlidXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMubmV3RGlzdHJpYnV0aW9uc1tkaXJlY3Rpb25dID0gZGlzdHJpYnV0aW9uO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbGxpZGU6IGZ1bmN0aW9uKHJlbGF4YXRpb25UaW1lKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnMgPSB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMuc2xpY2UoMCk7XG4gICAgICAgICAgICB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMgPSB0aGlzLmNsZWFyRGlzdHJpYnV0aW9ucyh0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMpO1xuXG4gICAgICAgICAgICB2YXIgZGVuc2l0eSA9IHRoaXMuZ2V0RGVuc2l0eSgpO1xuXG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnNbNF0gPSB0aGlzLmRpc3RyaWJ1dGlvbnNbMl0gLSAzICogZGVuc2l0eSAqIHRoaXMudmVsb2NpdHkueSAvIDI7XG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnNbN10gPSB0aGlzLmRpc3RyaWJ1dGlvbnNbNV0gKyAodGhpcy5kaXN0cmlidXRpb25zWzFdIC0gdGhpcy5kaXN0cmlidXRpb25zWzNdKSAvIDIgLSBkZW5zaXR5ICogdGhpcy52ZWxvY2l0eS55IC8gNiAtIGRlbnNpdHkgKiB0aGlzLnZlbG9jaXR5LnggLyAyO1xuICAgICAgICAgICAgdGhpcy5kaXN0cmlidXRpb25zWzhdID0gdGhpcy5kaXN0cmlidXRpb25zWzZdICsgKHRoaXMuZGlzdHJpYnV0aW9uc1szXSAtIHRoaXMuZGlzdHJpYnV0aW9uc1sxXSkgLyAyIC0gZGVuc2l0eSAqIHRoaXMudmVsb2NpdHkueSAvIDYgKyBkZW5zaXR5ICogdGhpcy52ZWxvY2l0eS54IC8gMjtcblxuICAgICAgICAgICAgLy8gdmFyIGVxdWlsaWJyaXVtID0gdGhpcy5nZXRFcXVpbGlicml1bSgpO1xuICAgICAgICAgICAgLy8gdmFyIHZlbG9jaXR5U2V0ID0gQ29uZmlnLmdldCgndmVsb2NpdHktc2V0Jyk7XG4gICAgICAgICAgICAvLyAvLyB2YXIgZm9yY2UgPSAxMDtcbiAgICAgICAgICAgIC8vIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHRoaXMuZGlzdHJpYnV0aW9uc1trXSA9IHRoaXMuZGlzdHJpYnV0aW9uc1trXSAtXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAodGhpcy5kaXN0cmlidXRpb25zW2tdIC0gZXF1aWxpYnJpdW1ba10pIC8gcmVsYXhhdGlvblRpbWU7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgLy8gKyAzICogdmVsb2NpdHlTZXRba10uZHkgKiB2ZWxvY2l0eVNldFtrXS53ICogZm9yY2U7XG5cbiAgICAgICAgICAgIC8vICAgICBpZiAodGhpcy5kaXN0cmlidXRpb25zW2tdIDwgMCkge1xuICAgICAgICAgICAgLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkRpc3RyaWJ1dGlvbiBpcyBuZWdhdGl2ZSFcIiwgdGhpcy5kaXN0cmlidXRpb25zW2tdKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9O1xuICAgICAgICAgICAgLy8gdmFyIGRlbnNpdHkgPSB0aGlzLmdldERlbnNpdHkoKTtcblxuICAgICAgICAgICAgLy8gdGhpcy5kaXN0cmlidXRpb25zWzRdID0gdGhpcy5kaXN0cmlidXRpb25zWzJdIC0gMyAqIGRlbnNpdHkgKiB0aGlzLnZlbG9jaXR5LnkgLyAyO1xuICAgICAgICAgICAgLy8gdGhpcy5kaXN0cmlidXRpb25zWzddID0gdGhpcy5kaXN0cmlidXRpb25zWzVdICsgKHRoaXMuZGlzdHJpYnV0aW9uc1sxXSAtIHRoaXMuZGlzdHJpYnV0aW9uc1szXSkgLyAyIC0gZGVuc2l0eSAqIHRoaXMudmVsb2NpdHkueSAvIDYgLSBkZW5zaXR5ICogdGhpcy52ZWxvY2l0eS54IC8gMjtcbiAgICAgICAgICAgIC8vIHRoaXMuZGlzdHJpYnV0aW9uc1s4XSA9IHRoaXMuZGlzdHJpYnV0aW9uc1s2XSArICh0aGlzLmRpc3RyaWJ1dGlvbnNbM10gLSB0aGlzLmRpc3RyaWJ1dGlvbnNbMV0pIC8gMiAtIGRlbnNpdHkgKiB0aGlzLnZlbG9jaXR5LnkgLyA2ICsgZGVuc2l0eSAqIHRoaXMudmVsb2NpdHkueCAvIDI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJEaXN0cmlidXRpb25zOiBmdW5jdGlvbihkaXN0cmlidXRpb25zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGRpc3RyaWJ1dGlvbnMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICBkaXN0cmlidXRpb25zW2tdID0gMDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZGlzdHJpYnV0aW9ucztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRFcXVpbGlicml1bTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc3BlZWRPZlNvdW5kU3F1YXJlZCA9IENvbmZpZy5nZXQoJ3NwZWVkLW9mLXNvdW5kLXNxdWFyZWQnKTtcbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eVNldCAgICAgICAgID0gQ29uZmlnLmdldCgndmVsb2NpdHktc2V0Jyk7XG5cbiAgICAgICAgICAgIHZhciBkZW5zaXR5ID0gdGhpcy5nZXREZW5zaXR5KCk7XG4gICAgICAgICAgICB2YXIgdiA9IHRoaXMuZ2V0VmVsb2NpdHkoZGVuc2l0eSwgdmVsb2NpdHlTZXQpO1xuICAgICAgICAgICAgdmFyIGVxdWlsaWJyaXVtID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZGlzdHJpYnV0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICB2YXIgeGkgPSB7eDogdmVsb2NpdHlTZXRbaV0uZHgsIHk6IHZlbG9jaXR5U2V0W2ldLmR5fTtcblxuICAgICAgICAgICAgICAgIHZhciBjdSA9ICh2LnggKiB4aS54ICsgdi55ICogeGkueSkgLyBzcGVlZE9mU291bmRTcXVhcmVkO1xuXG4gICAgICAgICAgICAgICAgZXF1aWxpYnJpdW1baV0gPSBkZW5zaXR5ICogdmVsb2NpdHlTZXRbaV0udyAqIChcbiAgICAgICAgICAgICAgICAgICAgMSArIGN1ICtcbiAgICAgICAgICAgICAgICAgICAgY3UgKiBjdSAvIDIgLVxuICAgICAgICAgICAgICAgICAgICAodi54ICogdi54ICsgdi55ICogdi55KSAvICgyICogc3BlZWRPZlNvdW5kU3F1YXJlZClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBlcXVpbGlicml1bTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREZW5zaXR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZW5zaXR5ID0gMDtcblxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnTic6XG4gICAgICAgICAgICAgICAgICAgIGRlbnNpdHkgPSAoMSAvICgxICsgdGhpcy5nZXRWZWxvY2l0eSgpLnkpKSAqIChcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzdHJpYnV0aW9uc1swXSArIHRoaXMuZGlzdHJpYnV0aW9uc1sxXSsgdGhpcy5kaXN0cmlidXRpb25zWzNdICtcbiAgICAgICAgICAgICAgICAgICAgICAgIDIgKiAodGhpcy5kaXN0cmlidXRpb25zWzJdICsgdGhpcy5kaXN0cmlidXRpb25zWzVdIC0gdGhpcy5kaXN0cmlidXRpb25zWzZdKVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1MnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1cnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnTkUnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ05XJzpcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ1NFJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTVyc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGVuc2l0eTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRWZWxvY2l0eTogZnVuY3Rpb24oZGVuc2l0eSwgdmVsb2NpdHlTZXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZlbG9jaXR5O1xuICAgICAgICB9LFxuICAgIH1cblxuICAgIHJldHVybiBab3VIZVZlbG9jaXR5Qm91bmRhcnlDb25kaXRpb247XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL1pvdUhlVmVsb2NpdHlCb3VuZGFyeUNvbmRpdGlvbi5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIENvbmZpZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnQ3JlYXRpbmcgY29uZmlnJylcbiAgICAgICAgdGhpcy5jb25maWcgPSB7XG4gICAgICAgICAgICAvLyAnZG9tYWluJzogJy4vQ29uZmlnLzJERGFtQnJlYWtEb21haW4nLFxuICAgICAgICAgICAgJ2RvbWFpbic6ICcuL0NvbmZpZy8yRERhbUJyZWFrRG9tYWluJyxcbiAgICAgICAgICAgICd2ZWxvY2l0eS1zZXQnOiBbXG4gICAgICAgICAgICAgICAge2R4OiAwLCAgICAgIGR5OiAwLCAgIHc6IDQgLyA5fSxcblxuICAgICAgICAgICAgICAgIHtkeDogMSwgICAgICBkeTogMCwgICB3OiAxIC8gOX0sXG4gICAgICAgICAgICAgICAge2R4OiAwLCAgICAgIGR5OiAxLCAgIHc6IDEgLyA5fSxcbiAgICAgICAgICAgICAgICB7ZHg6IC0gMSwgICAgZHk6IDAsICAgdzogMSAvIDl9LFxuICAgICAgICAgICAgICAgIHtkeDogMCwgICAgICBkeTogLTEsICB3OiAxIC8gOX0sXG5cbiAgICAgICAgICAgICAgICB7ZHg6IDEsICAgICAgZHk6IDEsICAgdzogMSAvIDM2fSxcbiAgICAgICAgICAgICAgICB7ZHg6IC0gMSwgICAgZHk6IDEsICAgdzogMSAvIDM2fSxcbiAgICAgICAgICAgICAgICB7ZHg6IC0gMSwgICAgZHk6IC0xLCAgdzogMSAvIDM2fSxcbiAgICAgICAgICAgICAgICB7ZHg6IDEsICAgICAgZHk6IC0xLCAgdzogMSAvIDM2fSxcblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIC8vIFRoaXMgYXJyYXkgZ2l2ZXMgdGhlIGluZGV4IG9mIHRoZSBvcHBvc2l0ZSB2ZWxvY2l0eSBzZXQgY29ycmVzcG9uZGluZyB0byB0aGUgaW5kZXggZ2l2ZW4uXG4gICAgICAgICAgICAvLyBUaGlzIHdpbGwgYmUgdXNlZnVsIHdoZW4gaW1wbGVtZW50aW5nIGJvdW5jZSBiYWNrIGJvdW5kYXJ5IGNvbmRpdGlvbnNcbiAgICAgICAgICAgICdvcHBvc2l0ZS12ZWxvY2l0eS1zZXQnOiBbMCwgMywgNCwgMSwgMiwgNywgOCwgNSwgNl0sXG4gICAgICAgICAgICAnc3BlZWQtb2Ytc291bmQtc3F1YXJlZCc6IDEgLyAzLFxuICAgICAgICAgICAgJ3JlbGF4YXRpb24tdGltZSc6IDAuNTUsXG4gICAgICAgICAgICAnUmUnOiAxMDAwMCxcbiAgICAgICAgICAgICdpbml0aWFsLWRpc3RyaWJ1dGlvbnMnOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgICAgICAgICAgaWYgKDEgPT0gMSB8fCAoeCA9PSAyICYmIHkgPT0gMikpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJhbmQgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmFuZCA9IDE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgICAgICAgICA0ICogcmFuZCAvIDksXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5kIC8gOSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyA5LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZCAvIDksXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5kIC8gOSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyAzNixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyAzNixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyAzNixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyAzNlxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgMFxuICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBDb25maWcucHJvdG90eXBlID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYga2V5IGV4aXN0c1xuICAgICAgICAgICAgaWYgKGNvbmZpZyBpbiB0aGlzLmNvbmZpZykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ1tjb25maWddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH1cblxuICAgIHJldHVybiBuZXcgQ29uZmlnKCk7XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL2NvbmZpZy5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbnZhciBTaW11bGF0aW9uID0gcmVxdWlyZSgnLi9sYm0nKTtcbnZhciBMYXR0aWNlTm9kZSA9IHJlcXVpcmUoJy4vTGF0dGljZU5vZGUnKTtcbnZhciBMYXR0aWNlU3RydWN0dXJlID0gcmVxdWlyZSgnLi9MYXR0aWNlU3RydWN0dXJlJyk7XG52YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcbmNvbnNvbGUubG9nKENvbmZpZyk7XG5jb25zb2xlLmxvZyhcIlN0YXJ0aW5nIHNpbXVsYXRpb25cIik7XG4vLyBTdGFydCBvZiBzaW11bGF0aW9uXG52YXIgc2ltID0gbmV3IFNpbXVsYXRpb24oKTtcbmNvbnNvbGUubG9nKHNpbSk7XG53aW5kb3cuc2ltID0gc2ltO1xuc2ltLnZpc3VhbGl6ZSgpO1xuLy8gc2ltLnJ1bigpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9mYWtlXzcxNzg0OTUuanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vLyBmaXJzdCAyRCwgdGhlblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcblxuICAgIFNpbXVsYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG4gICAgICAgIHZhciBEb21haW4gPSByZXF1aXJlKCcuL0NvbmZpZy8yRFpvdUhlRG9tYWluJyk7XG4gICAgICAgIHRoaXMuZG9tYWluID0gbmV3IERvbWFpbihjb25maWcpO1xuICAgICAgICB0aGlzLnN0cnVjdHVyZSA9IHRoaXMuaW5pdGlhbGl6ZVN0cnVjdHVyZShjb25maWcpO1xuICAgICAgICB0aGlzLnJlbGF4YXRpb25UaW1lID0gdGhpcy5kb21haW4ucmVsYXhhdGlvblRpbWU7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVsYXhhdGlvblRpbWU6IFwiLCB0aGlzLnJlbGF4YXRpb25UaW1lKTtcblxuICAgICAgICB0aGlzLmluaXRpYWxpemVWaXN1YWxpemVycygpO1xuICAgIH1cblxuICAgIFNpbXVsYXRpb24ucHJvdG90eXBlID0ge1xuICAgICAgICBpbml0aWFsaXplVmlzdWFsaXplcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIEZhY3RvcnkgPSByZXF1aXJlKCcuL1Zpc3VhbGl6ZXJzL0ZhY3RvcnknKTtcbiAgICAgICAgICAgIHZhciBmYWN0b3J5ID0gbmV3IEZhY3RvcnkodGhpcy5zdHJ1Y3R1cmUsIHRoaXMuZG9tYWluKTtcbiAgICAgICAgICAgIHRoaXMudmlzdWFsaXplcnMgPSBmYWN0b3J5LmJ1aWxkKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZVN0cnVjdHVyZTogZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgICAgICAvLyBhY3R1YWxseSBiZWNhdXNlIGR0ID0gZHggPSBkeSB3ZSBzaG91bGQgb25seSBoYXZlIHRvXG4gICAgICAgICAgICAvLyBnaXZlIG9uZSBzaXplIHNpbmNlIHRoZSBzdHJ1Y3R1cmUgc2hvdWxkIGJlIGFibGUgdG9cbiAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSB0aGUgYW1vdW50IG9mIG5vZGVzIGZyb20ga25vd2luZyB0aGUgZG9tYWluXG4gICAgICAgICAgICB2YXIgc3RydWN0dXJlID0gbmV3IExhdHRpY2VTdHJ1Y3R1cmUoY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybiBzdHJ1Y3R1cmU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29sbGlzaW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJlbGF4YXRpb25UaW1lID0gdGhpcy5yZWxheGF0aW9uVGltZTtcblxuICAgICAgICAgICAgdGhpcy5zdHJ1Y3R1cmUuZm9yRWFjaE5vZGUoZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgICAgIG5vZGUuY29sbGlkZShyZWxheGF0aW9uVGltZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdHJlYW06IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzLnN0cnVjdHVyZTtcbiAgICAgICAgICAgIHZhciBkaXJlY3Rpb25zID0gdGhhdC5nZXREaXJlY3Rpb25zKCk7XG4gICAgICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgZGlyZWN0aW9ucy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGlyZWN0aW9uID0gazsvL2RpcmVjdGlvbnNba107XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvdXIgPSB0aGF0LmdldE5laWdoYm91ck9mTm9kZUluRGlyZWN0aW9uKGlkeCwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHJlYW1UbyhkaXJlY3Rpb24sIG5laWdoYm91cik7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBhcHBseSBib3VuZGFyeSBjb25kaXRpb25zXG4gICAgICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFwiYm91bmRhcnlcIikge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGRpcmVjdGlvbnMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkaXJlY3Rpb24gPSBrOy8vZGlyZWN0aW9uc1trXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvdXIgPSB0aGF0LmdldE5laWdoYm91ck9mTm9kZUluRGlyZWN0aW9uKGlkeCwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuYXBwbHlCb3VuZGFyeShkaXJlY3Rpb24sIG5laWdoYm91cik7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcnVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuc3RydWN0dXJlLmdldERlbnNpdHkoKSk7XG4gICAgICAgICAgICB0aGlzLmNvbGxpc2lvbigpO1xuICAgICAgICAgICAgdGhpcy5zdHJlYW0oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwbGF5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLndhaXQgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53YWl0IC0tO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMud2FpdCA9IDUwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJ1bigpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5ydW5uaW5nICE9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bm5pbmctLTtcbiAgICAgICAgICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG5cbiAgICAgICAgcnVuRm9yOiBmdW5jdGlvbihpdGVyYXRpb25zKSB7XG4gICAgICAgICAgICB0aGlzLnJ1bm5pbmcgPSBpdGVyYXRpb25zO1xuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluZm86IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUudGFibGUoXG4gICAgICAgICAgICAgICAgdGhpcy5zdHJ1Y3R1cmUubm9kZXNbXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RydWN0dXJlLmRvbWFpblRvSWR4KHt4OiB4LCB5OiB5fSlcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIHZpc3VhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXJzLnZpc3VhbGl6ZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBTaW11bGF0aW9uO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9sYm0uanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5fdXNlVHlwZWRBcnJheXNgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xuQnVmZmVyLl91c2VUeXBlZEFycmF5cyA9IChmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssXG4gIC8vIENocm9tZSA3KywgU2FmYXJpIDUuMSssIE9wZXJhIDExLjYrLCBpT1MgNC4yKy4gSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBhZGRpbmdcbiAgLy8gcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLCB0aGVuIHRoYXQncyB0aGUgc2FtZSBhcyBubyBgVWludDhBcnJheWAgc3VwcG9ydFxuICAvLyBiZWNhdXNlIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBhZGQgYWxsIHRoZSBub2RlIEJ1ZmZlciBBUEkgbWV0aG9kcy4gVGhpcyBpcyBhbiBpc3N1ZVxuICAvLyBpbiBGaXJlZm94IDQtMjkuIE5vdyBmaXhlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJlxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nIC8vIENocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBXb3JrYXJvdW5kOiBub2RlJ3MgYmFzZTY0IGltcGxlbWVudGF0aW9uIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBzdHJpbmdzXG4gIC8vIHdoaWxlIGJhc2U2NC1qcyBkb2VzIG5vdC5cbiAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JyAmJiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpXG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyAnPSdcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpIC8vIGFzc3VtZSB0aGF0IG9iamVjdCBpcyBhcnJheS1saWtlXG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSlcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdFtpXVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9PSBudWxsICYmIGIgIT09IHVuZGVmaW5lZCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggLyAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoICogMlxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgYXNzZXJ0KGlzQXJyYXkobGlzdCksICdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbicgK1xuICAgICAgJ2xpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyXG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIF91dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kICE9PSB1bmRlZmluZWQpXG4gICAgPyBOdW1iZXIoZW5kKVxuICAgIDogZW5kID0gc2VsZi5sZW5ndGhcblxuICAvLyBGYXN0cGF0aCBlbXB0eSBzdHJpbmdzXG4gIGlmIChlbmQgPT09IHN0YXJ0KVxuICAgIHJldHVybiAnJ1xuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpKzFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gYnVmW29mZnNldF0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMl0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIHZhbCB8PSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMClcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAxXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDNdXG4gICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHRoaXMud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHRoaXMud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgMHhmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQzMihidWYsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSksICd2YWx1ZSBpcyBub3QgYSBudW1iZXInKVxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdGhpc1tpXSA9IHZhbHVlXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3V0ID0gW11cbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBvdXRbaV0gPSB0b0hleCh0aGlzW2ldKVxuICAgIGlmIChpID09PSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTKSB7XG4gICAgICBvdXRbaSArIDFdID0gJy4uLidcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+J1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSlcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG4vLyBzbGljZShzdGFydCwgZW5kKVxuZnVuY3Rpb24gY2xhbXAgKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICBpbmRleCA9IH5+aW5kZXg7ICAvLyBDb2VyY2UgdG8gaW50ZWdlci5cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIGluZGV4ICs9IGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvZXJjZSAobGVuZ3RoKSB7XG4gIC8vIENvZXJjZSBsZW5ndGggdG8gYSBudW1iZXIgKHBvc3NpYmx5IE5hTiksIHJvdW5kIHVwXG4gIC8vIGluIGNhc2UgaXQncyBmcmFjdGlvbmFsIChlLmcuIDEyMy40NTYpIHRoZW4gZG8gYVxuICAvLyBkb3VibGUgbmVnYXRlIHRvIGNvZXJjZSBhIE5hTiB0byAwLiBFYXN5LCByaWdodD9cbiAgbGVuZ3RoID0gfn5NYXRoLmNlaWwoK2xlbmd0aClcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdWJqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICB9KShzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlID49IDAsICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbn1cblxuZnVuY3Rpb24gYXNzZXJ0ICh0ZXN0LCBtZXNzYWdlKSB7XG4gIGlmICghdGVzdCkgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UgfHwgJ0ZhaWxlZCBhc3NlcnRpb24nKVxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlclwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbnZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NFwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiLFwiLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3NcIikiXX0=
