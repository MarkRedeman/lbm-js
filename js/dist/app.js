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
},{"./../GhostNode":2,"./../LatticeNode":3,"./../NoSlipBounceBackNode":5,"./../ZouHeVelocityBoundaryCondition":11,"1YiZ5S":18,"buffer":15}],2:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],3:[function(require,module,exports){
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
},{"./config":12,"1YiZ5S":18,"buffer":15}],4:[function(require,module,exports){
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
},{"./Config/2DZouHeDomain":1,"./GhostNode":2,"1YiZ5S":18,"buffer":15}],5:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],6:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],7:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],8:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],9:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],10:[function(require,module,exports){
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
},{"./Rainbow.js":9,"1YiZ5S":18,"buffer":15}],11:[function(require,module,exports){
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
},{"./config":12,"1YiZ5S":18,"buffer":15}],12:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],13:[function(require,module,exports){
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
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_ec2fdd3e.js","/")
},{"./LatticeNode":3,"./LatticeStructure":4,"./config":12,"./lbm":14,"1YiZ5S":18,"buffer":15}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// first 2D, then
module.exports = function() {

    Simulation = function() {
        var config = require('./config');
        this.structure = this.initializeStructure(config);
        var Domain = require('./Config/2DZouHeDomain');
        // var Domain = require('./Config/2DZouHeDomain');
        this.domain = new Domain(config);
        this.relaxationTime = this.domain.relaxationTime;
        console.log("relaxationTime: ", this.relaxationTime);

        this.initializeVisualizers();

        console.log("Initialized everything!");
    }

    Simulation.prototype = {
        initializeVisualizers: function() {
            this.visualizers = [];
            var StructureVisualizer = require('./Visualizers/LatticeStructureVisaualizer2D');
            var DensityVisualizer = require('./Visualizers/DensityVisualizer2D');
            var SpeedVisualizer = require('./Visualizers/SpeedVisualizer2D');
            var DensityVisualizationGraph = require('./Visualizers/DensityVisualizationGraph');

            var denstiyCanvas = document.getElementById('densityCanvas');
            var distanceBetweenNodes = 5;
            var structure = new StructureVisualizer(this.structure, denstiyCanvas, distanceBetweenNodes);
            this.visualizers.push(
                new DensityVisualizer(this.structure, denstiyCanvas, structure, distanceBetweenNodes)
            );
            // Draw each node
            denstiyCanvas.width = distanceBetweenNodes * this.domain.dx;
            denstiyCanvas.height = distanceBetweenNodes * this.domain.dy;

            var speedCanvas = document.getElementById('speedCanvas');
            var structure = new StructureVisualizer(this.structure, speedCanvas, distanceBetweenNodes);
            this.visualizers.push(
                new SpeedVisualizer(this.structure, speedCanvas, structure, distanceBetweenNodes)
            );
            speedCanvas.width = distanceBetweenNodes * this.domain.dx;
            speedCanvas.height = distanceBetweenNodes * this.domain.dy;

            var graphCanvas = document.getElementById('graphCanvas');
            this.visualizers.push(
                new DensityVisualizationGraph(this.structure, graphCanvas)
            );
            graphCanvas.width = distanceBetweenNodes * this.domain.dx;
            graphCanvas.height = distanceBetweenNodes * this.domain.dy;
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
            for (var i = 0; i < this.visualizers.length; i++) {
                this.visualizers[i].render();
            };
        }
    };

    return Simulation;
}();
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/lbm.js","/")
},{"./Config/2DZouHeDomain":1,"./Visualizers/DensityVisualizationGraph":6,"./Visualizers/DensityVisualizer2D":7,"./Visualizers/LatticeStructureVisaualizer2D":8,"./Visualizers/SpeedVisualizer2D":10,"./config":12,"1YiZ5S":18,"buffer":15}],15:[function(require,module,exports){
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
},{"1YiZ5S":18,"base64-js":16,"buffer":15,"ieee754":17}],16:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],17:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}],18:[function(require,module,exports){
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
},{"1YiZ5S":18,"buffer":15}]},{},[13])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9Db25maWcvMkRab3VIZURvbWFpbi5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvR2hvc3ROb2RlLmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9MYXR0aWNlTm9kZS5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvTGF0dGljZVN0cnVjdHVyZS5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvTm9TbGlwQm91bmNlQmFja05vZGUuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL1Zpc3VhbGl6ZXJzL0RlbnNpdHlWaXN1YWxpemF0aW9uR3JhcGguanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL1Zpc3VhbGl6ZXJzL0RlbnNpdHlWaXN1YWxpemVyMkQuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL1Zpc3VhbGl6ZXJzL0xhdHRpY2VTdHJ1Y3R1cmVWaXNhdWFsaXplcjJELmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9WaXN1YWxpemVycy9SYWluYm93LmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9WaXN1YWxpemVycy9TcGVlZFZpc3VhbGl6ZXIyRC5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvanMvWm91SGVWZWxvY2l0eUJvdW5kYXJ5Q29uZGl0aW9uLmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9qcy9jb25maWcuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL2Zha2VfZWMyZmRkM2UuanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL2pzL2xibS5qcyIsIi9ob21lL21hcmsvRHJvcGJveC9SVUcvMjAxNCAtIDIwMTUvUGFyYWxsZWwgQWxnb3JpdGhtcy9sYm0tanMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiL2hvbWUvbWFyay9Ecm9wYm94L1JVRy8yMDE0IC0gMjAxNS9QYXJhbGxlbCBBbGdvcml0aG1zL2xibS1qcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIvaG9tZS9tYXJrL0Ryb3Bib3gvUlVHLzIwMTQgLSAyMDE1L1BhcmFsbGVsIEFsZ29yaXRobXMvbGJtLWpzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBEb21haW4gPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgdGhpcy5keCA9IDEyODtcbiAgICAgICAgdGhpcy5keSA9IDEyODtcbiAgICAgICAgdGhpcy52eCA9IDAuMDU7XG4gICAgICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgICAgICB2YXIgUmV5bm9sZHMgPSAxMDA7Ly8gY29uZmlnLmdldCgnUmUnKTtcbiAgICAgICAgdmFyIG51ID0gdGhpcy52eCAqIHRoaXMuZHggLyBSZXlub2xkcztcbiAgICAgICAgdGhpcy5yZWxheGF0aW9uVGltZSA9IDMgKiBudSArIDEgLyAyO1xuXG4gICAgICAgIC8vIHRoaXMucmVsYXhhdGlvblRpbWUgPSB0aGlzLmNvbmZpZy5nZXQoJ3JlbGF4YXRpb24tdGltZScpO1xuICAgIH07XG5cbiAgICBEb21haW4ucHJvdG90eXBlID0ge1xuICAgICAgICBpbml0aWFsaXplTm9kZTogZnVuY3Rpb24oZG9tYWluSWR4KSB7XG5cbiAgICAgICAgICAgIHZhciBMYXR0aWNlTm9kZSA9IHJlcXVpcmUoJy4vLi4vTGF0dGljZU5vZGUnKTtcbiAgICAgICAgICAgIHZhciBOb1NsaXBCb3VuY2VCYWNrTm9kZSA9IHJlcXVpcmUoJy4vLi4vTm9TbGlwQm91bmNlQmFja05vZGUnKTtcbiAgICAgICAgICAgIHZhciBab3VIZVZlbG9jaXR5Qm91bmRhcnkgPSByZXF1aXJlKCcuLy4uL1pvdUhlVmVsb2NpdHlCb3VuZGFyeUNvbmRpdGlvbicpO1xuICAgICAgICAgICAgdmFyIEdob3N0Tm9kZSA9IHJlcXVpcmUoJy4vLi4vR2hvc3ROb2RlJyk7XG5cbiAgICAgICAgICAgIHZhciBkaXN0cmlidXRpb25zID0gdGhpcy5pbml0aWFsRGlzdHJpYnV0aW9ucyhkb21haW5JZHgpO1xuICAgICAgICAgICAgLy8gbW92aW5nIHdhbGwgdG8gdGhlIHJpZ2h0XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSB7IHg6IHRoaXMudngsIHk6IDAgfTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNPbldhbGwoZG9tYWluSWR4KSAmJiAhIHRoaXMuaXNDb3JuZXIoZG9tYWluSWR4KSkge1xuICAgICAgICAgICAgICAgIC8vIGlmIGlzIGNvcm5lclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgWm91SGVWZWxvY2l0eUJvdW5kYXJ5KGRpc3RyaWJ1dGlvbnMsIHZlbG9jaXR5LCAnTicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc09uQm91bmRhcnkoZG9tYWluSWR4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgTm9TbGlwQm91bmNlQmFja05vZGUoZGlzdHJpYnV0aW9ucywgdGhpcy5jb25maWcuZ2V0KCdvcHBvc2l0ZS12ZWxvY2l0eS1zZXQnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBub2RlID0gbmV3IExhdHRpY2VOb2RlKGRpc3RyaWJ1dGlvbnMpO1xuXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0Nvcm5lcjogZnVuY3Rpb24oZG9tYWluSWR4KSB7XG4gICAgICAgICAgICByZXR1cm4gZG9tYWluSWR4LnggPT09IDAgICAgICAgICAgICAgJiYgZG9tYWluSWR4LnkgPT09IDAgfHxcbiAgICAgICAgICAgICAgICAgICBkb21haW5JZHgueCA9PT0gKHRoaXMuZHggLSAxKSAmJiBkb21haW5JZHgueSA9PT0gMCB8fFxuICAgICAgICAgICAgICAgICAgIGRvbWFpbklkeC54ID09PSAwICAgICAgICAgICAgICYmIGRvbWFpbklkeC55ID09PSAodGhpcy5keSAtIDEpIHx8XG4gICAgICAgICAgICAgICAgICAgZG9tYWluSWR4LnggPT09ICh0aGlzLmR4IC0gMSkgJiYgZG9tYWluSWR4LnkgPT09ICh0aGlzLmR5IC0gMSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNPbldhbGw6IGZ1bmN0aW9uKGRvbWFpbklkeCkge1xuICAgICAgICAgICAgcmV0dXJuIGRvbWFpbklkeC55ID09PSAwO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzT25Cb3VuZGFyeTogZnVuY3Rpb24oZG9tYWluSWR4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGRvbWFpbklkeC54ID09PSAwIHx8IGRvbWFpbklkeC54ID09PSAodGhpcy5keCAtIDEpIHx8XG4gICAgICAgICAgICAgICAgZG9tYWluSWR4LnkgPT09IDAgfHwgZG9tYWluSWR4LnkgPT09ICh0aGlzLmR5IC0gMSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluaXRpYWxEaXN0cmlidXRpb25zOiBmdW5jdGlvbihkb21haW5JZHgpIHtcbiAgICAgICAgICAgIHZhciBkaXN0cmlidXRpb25zID0gW107XG5cbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eVNldCA9IHRoaXMuY29uZmlnLmdldCgndmVsb2NpdHktc2V0Jyk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVsb2NpdHlTZXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBpZiAoZG9tYWluSWR4LnkgPiA3MCkge1xuICAgICAgICAgICAgICAgICAgICBkaXN0cmlidXRpb25zW2ldID0gdmVsb2NpdHlTZXRbaV0udztcbiAgICAgICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vICAgICBkaXN0cmlidXRpb25zW2ldID0gMDtcbiAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gZGlzdHJpYnV0aW9ucztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBEb21haW47XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL0NvbmZpZy8yRFpvdUhlRG9tYWluLmpzXCIsXCIvQ29uZmlnXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICBHaG9zdE5vZGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2dob3N0JztcbiAgICB9XG5cbiAgICBHaG9zdE5vZGUucHJvdG90eXBlID0ge1xuICAgICAgICBzdHJlYW1UbzogZnVuY3Rpb24oZGlyZWN0aW9uLCBub2RlKSB7XG5cbiAgICAgICAgfSxcblxuICAgICAgICBjb2xsaWRlOiBmdW5jdGlvbigpIHtcblxuICAgICAgICB9LFxuXG4gICAgICAgIHNldERpc3RyaWJ1dGlvbjogZnVuY3Rpb24oZGlyZWN0aW9uLCBkaXN0cmlidXRpb24pIHtcblxuICAgICAgICB9LFxuXG4gICAgICAgIGdldERpc3RyaWJ1dGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSxcblxuICAgIH1cblxuICAgIHJldHVybiBHaG9zdE5vZGU7XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL0dob3N0Tm9kZS5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG5cbiAgICBMYXR0aWNlTm9kZSA9IGZ1bmN0aW9uKGRpc3RyaWJ1dGlvbnMpIHtcbiAgICAgICAgZGlyZWN0aW9ucyA9IG51bGw7XG4gICAgICAgIHRoaXMudHlwZSA9ICdsYXR0aWNlJztcbiAgICAgICAgdGhpcy5kaXN0cmlidXRpb25zID0gZGlzdHJpYnV0aW9ucztcbiAgICAgICAgdGhpcy5uZXdEaXN0cmlidXRpb25zID0gZGlzdHJpYnV0aW9ucy5zbGljZSgwKTtcbiAgICB9XG5cbiAgICBMYXR0aWNlTm9kZS5wcm90b3R5cGUgPSB7XG4gICAgICAgIHN0cmVhbVRvOiBmdW5jdGlvbihkaXJlY3Rpb24sIG5vZGUpIHtcbiAgICAgICAgICAgIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZ2V0RGlzdHJpYnV0aW9uKGRpcmVjdGlvbik7XG4gICAgICAgICAgICBub2RlLnNldERpc3RyaWJ1dGlvbihkaXJlY3Rpb24sIGRpc3RyaWJ1dGlvbilcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREaXN0cmlidXRpb246IGZ1bmN0aW9uKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlzdHJpYnV0aW9uc1tkaXJlY3Rpb25dO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldERpc3RyaWJ1dGlvbjogZnVuY3Rpb24oZGlyZWN0aW9uLCBkaXN0cmlidXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMubmV3RGlzdHJpYnV0aW9uc1tkaXJlY3Rpb25dID0gZGlzdHJpYnV0aW9uO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbGxpZGU6IGZ1bmN0aW9uKHJlbGF4YXRpb25UaW1lKSB7XG4gICAgICAgICAgICAvLyBub3cgdGhhdCB0aGUgc3RyZWFtaW5nIGlzIGRvbmUsIHdlIGNhbiBmb3JnZXQgb3VyIG9sZCBkaXN0cmlidXRpb25zXG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnMgPSB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMuc2xpY2UoMCk7XG4gICAgICAgICAgICB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMgPSB0aGlzLmNsZWFyRGlzdHJpYnV0aW9ucyh0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMpO1xuICAgICAgICAgICAgLy8gZG8gY29sbGlzaW9uIHN0dWZmXG4gICAgICAgICAgICB2YXIgZXF1aWxpYnJpdW0gPSB0aGlzLmdldEVxdWlsaWJyaXVtKCk7XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHlTZXQgPSBDb25maWcuZ2V0KCd2ZWxvY2l0eS1zZXQnKTtcbiAgICAgICAgICAgIC8vIHZhciBmb3JjZSA9IDEwO1xuICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCB0aGlzLmRpc3RyaWJ1dGlvbnMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXN0cmlidXRpb25zW2tdID0gdGhpcy5kaXN0cmlidXRpb25zW2tdIC1cbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmRpc3RyaWJ1dGlvbnNba10gLSBlcXVpbGlicml1bVtrXSkgLyByZWxheGF0aW9uVGltZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyArIDMgKiB2ZWxvY2l0eVNldFtrXS5keSAqIHZlbG9jaXR5U2V0W2tdLncgKiBmb3JjZTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRpc3RyaWJ1dGlvbnNba10gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiRGlzdHJpYnV0aW9uIGlzIG5lZ2F0aXZlIVwiLCB0aGlzLmRpc3RyaWJ1dGlvbnNba10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJEaXN0cmlidXRpb25zOiBmdW5jdGlvbihkaXN0cmlidXRpb25zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGRpc3RyaWJ1dGlvbnMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICBkaXN0cmlidXRpb25zW2tdID0gMDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZGlzdHJpYnV0aW9ucztcbiAgICAgICAgfSxcblxuXG4gICAgICAgIGdldEVxdWlsaWJyaXVtOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzcGVlZE9mU291bmRTcXVhcmVkID0gQ29uZmlnLmdldCgnc3BlZWQtb2Ytc291bmQtc3F1YXJlZCcpO1xuICAgICAgICAgICAgdmFyIHZlbG9jaXR5U2V0ICAgICAgICAgPSBDb25maWcuZ2V0KCd2ZWxvY2l0eS1zZXQnKTtcblxuICAgICAgICAgICAgdmFyIGRlbnNpdHkgPSB0aGlzLmdldERlbnNpdHkoKTtcbiAgICAgICAgICAgIHZhciB2ID0gdGhpcy5nZXRWZWxvY2l0eShkZW5zaXR5LCB2ZWxvY2l0eVNldCk7XG4gICAgICAgICAgICB2YXIgZXF1aWxpYnJpdW0gPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpc3RyaWJ1dGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZGlzdHJpYnV0aW9uID0gdGhpcy5kaXN0cmlidXRpb25zW2ldO1xuICAgICAgICAgICAgICAgIHZhciB4aSA9IHt4OiB2ZWxvY2l0eVNldFtpXS5keCwgeTogdmVsb2NpdHlTZXRbaV0uZHl9O1xuXG4gICAgICAgICAgICAgICAgdmFyIGN1ID0gKHYueCAqIHhpLnggKyB2LnkgKiB4aS55KSAvIHNwZWVkT2ZTb3VuZFNxdWFyZWQ7XG5cbiAgICAgICAgICAgICAgICBlcXVpbGlicml1bVtpXSA9IGRlbnNpdHkgKiB2ZWxvY2l0eVNldFtpXS53ICogKFxuICAgICAgICAgICAgICAgICAgICAxICsgY3UgK1xuICAgICAgICAgICAgICAgICAgICBjdSAqIGN1IC8gMiAtXG4gICAgICAgICAgICAgICAgICAgICh2LnggKiB2LnggKyB2LnkgKiB2LnkpIC8gKDIgKiBzcGVlZE9mU291bmRTcXVhcmVkKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGVxdWlsaWJyaXVtO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldERlbnNpdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGRlbnNpdHkgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCB0aGlzLmRpc3RyaWJ1dGlvbnMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICBkZW5zaXR5ICs9IHRoaXMuZGlzdHJpYnV0aW9uc1trXTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZGVuc2l0eTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRWZWxvY2l0eTogZnVuY3Rpb24oZGVuc2l0eSwgdmVsb2NpdHlTZXQpIHtcbiAgICAgICAgICAgIC8vIHplcm8gdmVjdG9yXG4gICAgICAgICAgICB2YXIgdSA9IHt4OiAwLCB5OiAwfTtcblxuICAgICAgICAgICAgaWYgKGRlbnNpdHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGRlbnNpdHkgPSB0aGlzLmdldERlbnNpdHkoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRlbnNpdHkgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmRpc3RyaWJ1dGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZGlzdHJpYnV0aW9uID0gdGhpcy5kaXN0cmlidXRpb25zW2ldO1xuICAgICAgICAgICAgICAgIHUueCArPSB2ZWxvY2l0eVNldFtpXS53ICogdmVsb2NpdHlTZXRbaV0uZHggKiBkaXN0cmlidXRpb247XG4gICAgICAgICAgICAgICAgdS55ICs9IHZlbG9jaXR5U2V0W2ldLncgKiB2ZWxvY2l0eVNldFtpXS5keSAqIGRpc3RyaWJ1dGlvbjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHUueCA9IHUueCAvIGRlbnNpdHk7XG4gICAgICAgICAgICB1LnkgPSB1LnkgLyBkZW5zaXR5O1xuXG4gICAgICAgICAgICByZXR1cm4gdTtcblxuICAgICAgICB9LFxuICAgIH1cblxuICAgIHJldHVybiBMYXR0aWNlTm9kZTtcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvTGF0dGljZU5vZGUuanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vLyBob2RscyB0aGUgc3RydWN0dXJlIGFuZCBrbm93cyB3aGVyZSBldmVyeSBuZWlnaGJvdXIgaXMuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBHaG9zdE5vZGUgPSByZXF1aXJlKCcuL0dob3N0Tm9kZScpO1xuXG4gICAgTGF0dGljZVN0cnVjdHVyZSA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICAvLyB2ZWxvY2l0eSBzZXRcbiAgICAgICAgdGhpcy52ZWxvY2l0eVNldCA9IGNvbmZpZy5nZXQoJ3ZlbG9jaXR5LXNldCcpO1xuICAgICAgICB0aGlzLm9wcG9zaXRlRGlyZWN0aW9ucyA9IGNvbmZpZy5nZXQoJ29wcG9zaXRlLXZlbG9jaXR5LXNldCcpO1xuXG4gICAgICAgIC8vIGFtb3VudCBvZiBub2RlcyBpbiB4IGFuZCB5IGRpcmVjdGlvblxuICAgICAgICAvLyAyRERhbUJyZWFrRG9tYWluXG4gICAgICAgIC8vIDJEWm91SGVEb21haW5cbiAgICAgICAgdmFyIERvbWFpbiA9IHJlcXVpcmUoJy4vQ29uZmlnLzJEWm91SGVEb21haW4nKTtcbiAgICAgICAgdmFyIGRvbWFpbiA9IG5ldyBEb21haW4oY29uZmlnKTtcbiAgICAgICAgLy8gdmFyIGRvbWFpbiA9IHJlcXVpcmUoY29uZmlnLmdldCgnZG9tYWluJykpO1xuICAgICAgICB0aGlzLm54ID0gZG9tYWluLmR4O1xuICAgICAgICB0aGlzLm55ID0gZG9tYWluLmR5O1xuICAgICAgICB0aGlzLmluaXRpYWxpemVOb2Rlcyhkb21haW4pO1xuICAgIH1cblxuICAgIExhdHRpY2VTdHJ1Y3R1cmUucHJvdG90eXBlID0ge1xuICAgICAgICBpbml0aWFsaXplTm9kZXM6IGZ1bmN0aW9uKGRvbWFpbikge1xuICAgICAgICAgICAgLy8gQFRPRE86IGRldGVybWluZSBpZiBzaXplIHNob3VsZCBiZSAxRCwgMkQsIDNELCBvciBhbnkgRFxuICAgICAgICAgICAgdGhpcy5ub2RlcyA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubng7IGkrKykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5ueTsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkb21haW5JZHggPSB7eDogaSwgeTogan07XG4gICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSB0aGlzLmRvbWFpblRvSWR4KGRvbWFpbklkeCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZXNbaWR4XSA9IGRvbWFpbi5pbml0aWFsaXplTm9kZShkb21haW5JZHgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gSXQgc2hvdWxkIGF1dG9tYXRpY2FsbHkgY3JlYXRlIGFwcHJvcHJpYXRlIGdob3N0IG5vZGVzIGZvciBib3VuZGFyeSBjb25kaXRpb25zXG5cbiAgICAgICAgfSxcblxuICAgICAgICBmb3JFYWNoTm9kZTogZnVuY3Rpb24oY2FsbGFibGUpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHRoaXMubm9kZXMubGVuZ3RoOyBpZHgrKykge1xuICAgICAgICAgICAgICAgIHZhciBub2RlID0gdGhpcy5ub2Rlc1tpZHhdO1xuICAgICAgICAgICAgICAgIGNhbGxhYmxlKG5vZGUsIGlkeCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE5vZGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGVzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldERpcmVjdGlvbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gQFRPRE9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZlbG9jaXR5U2V0O1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE9wcG9zaXRlRGlyZWN0aW9uOiBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9wcG9zaXRlRGlyZWN0aW9uc1tkaXJlY3Rpb25dO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldE5laWdoYm91ck9mTm9kZUluRGlyZWN0aW9uOiBmdW5jdGlvbihpZHgsIGRpcmVjdGlvbikge1xuICAgICAgICAgICAgLy8gaWYgaXQgY2FuJ3QgZmluZCBhIG5laWdoYm91cmluZyBub2RlLCB0aGVuIHNlbmQgYSBnaG9zdCBub2RlXG4gICAgICAgICAgICB2YXIgZG9tYWluSWR4ID0gdGhpcy5pZHhUb0RvbWFpbihpZHgpO1xuXG4gICAgICAgICAgICBkb21haW5JZHgueCArPSB0aGlzLnZlbG9jaXR5U2V0W2RpcmVjdGlvbl0uZHg7XG4gICAgICAgICAgICBkb21haW5JZHgueSAtPSB0aGlzLnZlbG9jaXR5U2V0W2RpcmVjdGlvbl0uZHk7XG5cbiAgICAgICAgICAgIGlmICghIHRoaXMuaXNJbkRvbWFpbihkb21haW5JZHgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2hvc3ROb2RlKGRvbWFpbklkeCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5laWdoYm91cklkeCA9IHRoaXMuZG9tYWluVG9JZHgoZG9tYWluSWR4KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGVzW25laWdoYm91cklkeF07XG4gICAgICAgIH0sXG5cbiAgICAgICAgaWR4VG9Eb21haW46IGZ1bmN0aW9uKGlkeCkge1xuICAgICAgICAgICAgeCA9IGlkeCAlIHRoaXMubng7XG4gICAgICAgICAgICB5ID0gTWF0aC5mbG9vcihpZHggLyB0aGlzLm54KTtcbiAgICAgICAgICAgIHJldHVybiB7eDogeCwgeTogeX07XG4gICAgICAgIH0sXG5cbiAgICAgICAgZG9tYWluVG9JZHg6IGZ1bmN0aW9uKGRvbWFpbklkeCkge1xuICAgICAgICAgICAgaWR4ID0gZG9tYWluSWR4LnkgKiB0aGlzLm54ICsgZG9tYWluSWR4Lng7XG5cbiAgICAgICAgICAgIHJldHVybiBpZHg7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNJbkRvbWFpbjogZnVuY3Rpb24oZG9tYWluSWR4KSB7XG4gICAgICAgICAgICByZXR1cm4gZG9tYWluSWR4LnggPj0gMCAmJiBkb21haW5JZHgueCA8ICh0aGlzLm54KSAmJlxuICAgICAgICAgICAgICAgICAgICBkb21haW5JZHgueSA+PSAwICYmIGRvbWFpbklkeC55IDwgKHRoaXMubnkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdob3N0Tm9kZTogZnVuY3Rpb24oZG9tYWluSWR4KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEdob3N0Tm9kZTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREZW5zaXR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGRlbnNpdHkgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBkZW5zaXR5ICs9IHRoaXMubm9kZXNbaV0uZ2V0RGVuc2l0eSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIGRlbnNpdHk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gTGF0dGljZVN0cnVjdHVyZTtcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvTGF0dGljZVN0cnVjdHVyZS5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIE5vU2xpcEJvdW5jZUJhY2tOb2RlID0gZnVuY3Rpb24oZGlzdHJpYnV0aW9ucywgb3Bwb3NpdGVEaXJlY3Rpb24pIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2JvdW5kYXJ5JztcbiAgICAgICAgdGhpcy5vcHBvc2l0ZURpcmVjdGlvbiA9IG9wcG9zaXRlRGlyZWN0aW9uO1xuXG4gICAgICAgIHRoaXMuY2xlYXJEaXN0cmlidXRpb25zKGRpc3RyaWJ1dGlvbnMpO1xuICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnMgPSBkaXN0cmlidXRpb25zO1xuICAgICAgICB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMgPSBkaXN0cmlidXRpb25zLnNsaWNlKDApO1xuICAgIH1cblxuICAgIE5vU2xpcEJvdW5jZUJhY2tOb2RlLnByb3RvdHlwZSA9IHtcbiAgICAgICAgc3RyZWFtVG86IGZ1bmN0aW9uKGRpcmVjdGlvbiwgbm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBcImxhdHRpY2VcIikge1xuICAgICAgICAgICAgICAgIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZ2V0RGlzdHJpYnV0aW9uKGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXREaXN0cmlidXRpb24oZGlyZWN0aW9uLCBkaXN0cmlidXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGFwcGx5Qm91bmRhcnk6IGZ1bmN0aW9uKGRpcmVjdGlvbiwgbm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBcImxhdHRpY2VcIikge1xuICAgICAgICAgICAgICAgIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZ2V0RGlzdHJpYnV0aW9uKGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXREaXN0cmlidXRpb24oZGlyZWN0aW9uLCBkaXN0cmlidXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZXREaXN0cmlidXRpb24odGhpcy5vcHBvc2l0ZU9mKGRpcmVjdGlvbiksIDApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldERpc3RyaWJ1dGlvbjogZnVuY3Rpb24oZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kaXN0cmlidXRpb25zW3RoaXMub3Bwb3NpdGVPZihkaXJlY3Rpb24pXTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXREaXN0cmlidXRpb246IGZ1bmN0aW9uKGRpcmVjdGlvbiwgZGlzdHJpYnV0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnNbZGlyZWN0aW9uXSA9IGRpc3RyaWJ1dGlvbjtcbiAgICAgICAgfSxcblxuICAgICAgICBvcHBvc2l0ZU9mOiBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9wcG9zaXRlRGlyZWN0aW9uW2RpcmVjdGlvbl07XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29sbGlkZTogZnVuY3Rpb24ocmVsYXhhdGlvblRpbWUpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzdHJpYnV0aW9ucyA9IHRoaXMubmV3RGlzdHJpYnV0aW9ucy5zbGljZSgwKTtcbiAgICAgICAgICAgIHRoaXMubmV3RGlzdHJpYnV0aW9ucyA9IHRoaXMuY2xlYXJEaXN0cmlidXRpb25zKHRoaXMubmV3RGlzdHJpYnV0aW9ucyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJEaXN0cmlidXRpb25zOiBmdW5jdGlvbihkaXN0cmlidXRpb25zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGRpc3RyaWJ1dGlvbnMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICBkaXN0cmlidXRpb25zW2tdID0gMDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZGlzdHJpYnV0aW9ucztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREZW5zaXR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZW5zaXR5ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgZGVuc2l0eSArPSB0aGlzLmRpc3RyaWJ1dGlvbnNba107XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGRlbnNpdHk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VmVsb2NpdHk6IGZ1bmN0aW9uKGRlbnNpdHksIHZlbG9jaXR5U2V0KSB7XG4gICAgICAgICAgICAvLyB6ZXJvIHZlY3RvclxuICAgICAgICAgICAgdmFyIHUgPSB7eDogMCwgeTogMH07XG5cbiAgICAgICAgICAgIGlmIChkZW5zaXR5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBkZW5zaXR5ID0gdGhpcy5nZXREZW5zaXR5KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkZW5zaXR5ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZGlzdHJpYnV0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICB1LnggKz0gdmVsb2NpdHlTZXRbaV0udyAqIHZlbG9jaXR5U2V0W2ldLmR4ICogZGlzdHJpYnV0aW9uO1xuICAgICAgICAgICAgICAgIHUueSArPSB2ZWxvY2l0eVNldFtpXS53ICogdmVsb2NpdHlTZXRbaV0uZHkgKiBkaXN0cmlidXRpb247XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB1LnggPSB1LnggLyBkZW5zaXR5O1xuICAgICAgICAgICAgdS55ID0gdS55IC8gZGVuc2l0eTtcblxuICAgICAgICAgICAgcmV0dXJuIHU7XG5cbiAgICAgICAgfSxcbiAgICB9XG5cbiAgICByZXR1cm4gTm9TbGlwQm91bmNlQmFja05vZGU7XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL05vU2xpcEJvdW5jZUJhY2tOb2RlLmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgRGVuc2l0eVZpc3VhbGl6YXRpb25HcmFwaCA9IGZ1bmN0aW9uKHN0cnVjdHVyZSwgY2FudmFzKSB7XG4gICAgICAgIHRoaXMuc3RydWN0dXJlID0gc3RydWN0dXJlO1xuICAgICAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcblxuICAgICAgICB0aGlzLmNvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cbiAgICAgICAgdmFyIG1heERlbnNpdHkgPSAwO1xuICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcbiAgICAgICAgICAgIHZhciBkZW5zaXR5ID0gbm9kZS5nZXREZW5zaXR5KCk7XG4gICAgICAgICAgICBpZiAoZGVuc2l0eSA+IG1heERlbnNpdHkpIHtcbiAgICAgICAgICAgICAgICBtYXhEZW5zaXR5ID0gZGVuc2l0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubWF4RGVuc2l0eSA9IG1heERlbnNpdHk7XG4gICAgfVxuXG4gICAgRGVuc2l0eVZpc3VhbGl6YXRpb25HcmFwaC5wcm90b3R5cGUgPSB7XG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC50cmFuc2xhdGUodGhpcy5jYW52YXMud2lkdGggLyAyLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKTtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5zY2FsZSgxLCAtMSk7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQudHJhbnNsYXRlKC0gdGhpcy5jYW52YXMud2lkdGggLyAyLCAtIHRoaXMuY2FudmFzLmhlaWdodCAvIDIpO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZVN0eWxlID0gJ3JlZCc7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubGluZVdpZHRoID0gMztcbiAgICAgICAgICAgIC8vIHRoaXMuY29udGV4dC50cmFuc2xhdGUoMCwgMCk7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cblxuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuXG4gICAgICAgICAgICB2YXIgbWF4SWR4ID0gdGhpcy5zdHJ1Y3R1cmUubm9kZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIHZhciB3aWR0aE11bHRpcGxpZXIgPSB0aGlzLmNhbnZhcy53aWR0aCAvIG1heElkeDtcbiAgICAgICAgICAgIHZhciBoZWlnaHRNdXRsaXBsaWVyID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gdGhpcy5tYXhEZW5zaXR5O1xuXG4gICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMuc3RydWN0dXJlLm5vZGVzWzBdO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0Lm1vdmVUbygwLCBoZWlnaHRNdXRsaXBsaWVyICogbm9kZS5nZXREZW5zaXR5KCkpO1xuXG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcbiAgICAgICAgICAgICAgICB0aGF0LmNvbnRleHQubGluZVRvKHdpZHRoTXVsdGlwbGllciAqIGlkeCwgaGVpZ2h0TXV0bGlwbGllciAqIG5vZGUuZ2V0RGVuc2l0eSgpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmNvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQucmVzdG9yZSgpO1xuICAgICAgICB9LFxuICAgIH1cblxuICAgIHJldHVybiBEZW5zaXR5VmlzdWFsaXphdGlvbkdyYXBoO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9WaXN1YWxpemVycy9EZW5zaXR5VmlzdWFsaXphdGlvbkdyYXBoLmpzXCIsXCIvVmlzdWFsaXplcnNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBEZW5zaXR5VmlzdWFsaXplcjJEID0gZnVuY3Rpb24oc3RydWN0dXJlLCBjYW52YXMsIHZpc3VhbGl6ZXIsIGRpc3RhbmNlQmV0d2Vlbk5vZGUpIHtcbiAgICAgICAgdGhpcy5zdHJ1Y3R1cmUgPSBzdHJ1Y3R1cmU7XG4gICAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgICB0aGlzLnZpc3VhbGl6ZXIgPSB2aXN1YWxpemVyO1xuICAgICAgICB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUgPSBkaXN0YW5jZUJldHdlZW5Ob2RlIHx8IDIwO1xuXG4gICAgICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB9XG5cbiAgICBEZW5zaXR5VmlzdWFsaXplcjJELnByb3RvdHlwZSA9IHtcbiAgICAgICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMud2lkdGg7XG5cbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuc3RydWN0dXJlLmZvckVhY2hOb2RlKGZ1bmN0aW9uKG5vZGUsIGlkeCkge1xuICAgICAgICAgICAgICAgIHZhciBkb21haW5JZHggPSB0aGF0LnN0cnVjdHVyZS5pZHhUb0RvbWFpbihpZHgpO1xuICAgICAgICAgICAgICAgIHRoYXQuZHJhd05vZGUoZG9tYWluSWR4LCBub2RlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXIucmVuZGVyKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZHJhd05vZGU6IGZ1bmN0aW9uKGRvbWFpbklkeCwgbm9kZSkge1xuICAgICAgICAgICAgdmFyIHJhZGl1cyA9IDU7XG5cbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0O1xuICAgICAgICAgICAgY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICBjb250ZXh0LnRyYW5zbGF0ZShcbiAgICAgICAgICAgICAgICBkb21haW5JZHgueCAqIHRoaXMuZGlzdGFuY2VCZXR3ZWVuTm9kZSxcbiAgICAgICAgICAgICAgICBkb21haW5JZHgueSAqIHRoaXMuZGlzdGFuY2VCZXR3ZWVuTm9kZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGFscGhhID0gTWF0aC5taW4oMSwgTWF0aC5tYXgobm9kZS5nZXREZW5zaXR5KCksIDApKTtcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoMzIsIDcyLCAxNTUsICcgKyBhbHBoYSArICcpJzsvLyAnIzMzNjdkNSc7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAgLCAwLCB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUsIHRoaXMuZGlzdGFuY2VCZXR3ZWVuTm9kZSk7XG5cbiAgICAgICAgICAgIGNvbnRleHQucmVzdG9yZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGtlZXBSZW5kZXJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdG9wUmVuZGVyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBEZW5zaXR5VmlzdWFsaXplcjJEO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9WaXN1YWxpemVycy9EZW5zaXR5VmlzdWFsaXplcjJELmpzXCIsXCIvVmlzdWFsaXplcnNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBMYXR0aWNlU3RydWN0dXJlVmlzdWFsaXplcjJEID0gZnVuY3Rpb24oc3RydWN0dXJlLCBjYW52YXMsIHZpc3VhbGl6ZXIsIGRpc3RhbmNlQmV0d2Vlbk5vZGUpIHtcbiAgICAgICAgdGhpcy5zdHJ1Y3R1cmUgPSBzdHJ1Y3R1cmU7XG4gICAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgICB0aGlzLnZpc3VhbGl6ZXIgPSB2aXN1YWxpemVyO1xuICAgICAgICB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUgPSBkaXN0YW5jZUJldHdlZW5Ob2RlIHx8IDIwO1xuXG4gICAgICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB9O1xuXG4gICAgTGF0dGljZVN0cnVjdHVyZVZpc3VhbGl6ZXIyRC5wcm90b3R5cGUgPSB7XG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgICAgIHRoaXMuc3RydWN0dXJlLmZvckVhY2hOb2RlKGZ1bmN0aW9uKG5vZGUsIGlkeCkge1xuICAgICAgICAgICAgICAgIHZhciBkb21haW5JZHggPSB0aGF0LnN0cnVjdHVyZS5pZHhUb0RvbWFpbihpZHgpO1xuICAgICAgICAgICAgICAgIHRoYXQuZHJhd05vZGUoZG9tYWluSWR4LCBub2RlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRyYXdOb2RlOiBmdW5jdGlvbihkb21haW5JZHgsIG5vZGUpIHtcbiAgICAgICAgICAgIHZhciByYWRpdXMgPSA1O1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG4gICAgICAgICAgICBjb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKFxuICAgICAgICAgICAgICAgIGRvbWFpbklkeC54ICogdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlICsgdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlIC8gMixcbiAgICAgICAgICAgICAgICBkb21haW5JZHgueSAqIHRoaXMuZGlzdGFuY2VCZXR3ZWVuTm9kZSArIHRoaXMuZGlzdGFuY2VCZXR3ZWVuTm9kZSAvIDJcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBEcmF3IHRoZSBuZG9lXG4gICAgICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJsYXR0aWNlXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnBvc2l0aW9uID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gY29udGV4dC5maWxsU3R5bGUgPSAnIzQ4NmE5Nic7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb250ZXh0LmZpbGxTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJib3VuZGFyeVwiOlxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gY29udGV4dC5maWxsU3R5bGUgPSAnbGltZWdyZWVuJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZ2hvc3RcIjpcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9IGNvbnRleHQuZmlsbFN0eWxlID0gJyNlNjViNDcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY29udGV4dC5hcmMoMCwgMCwgcmFkaXVzIC8gMiwgMCwgMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgY29udGV4dC5maWxsKCk7XG5cbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eSA9IG5vZGUuZ2V0VmVsb2NpdHkobm9kZS5nZXREZW5zaXR5KCksIHRoaXMuc3RydWN0dXJlLnZlbG9jaXR5U2V0KTtcbiAgICAgICAgICAgIHRoaXMuZHJhd0Fycm93KGNvbnRleHQsIHZlbG9jaXR5LngsIHZlbG9jaXR5LnksIDIwKTtcblxuICAgICAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZHJhd0Fycm93OiBmdW5jdGlvbihjb250ZXh0LCB4LCB5LCBtYWduaXR1ZGUsIG1heE1hZ25pdHVkZSkge1xuICAgICAgICAgICAgLy8gbWFrZSBhcnJvd3MgdW5pdFxuICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9ICdyZWQnO1xuICAgICAgICAgICAgc3BlZWQgPSBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSk7XG5cbiAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjb250ZXh0Lm1vdmVUbygwLCAwKTtcbiAgICAgICAgICAgIGNvbnRleHQubGluZVRvKG1hZ25pdHVkZSAqIHggLyBzcGVlZCwgbWFnbml0dWRlICogeSAvIHNwZWVkKTtcbiAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZHJhd0Nvbm5lY3Rpb246IGZ1bmN0aW9uKG5vZGUxLCBub2RlMikge1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gTGF0dGljZVN0cnVjdHVyZVZpc3VhbGl6ZXIyRDtcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvVmlzdWFsaXplcnMvTGF0dGljZVN0cnVjdHVyZVZpc2F1YWxpemVyMkQuanNcIixcIi9WaXN1YWxpemVyc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgLypcbiAgICBSYWluYm93VmlzLUpTXG4gICAgUmVsZWFzZWQgdW5kZXIgRWNsaXBzZSBQdWJsaWMgTGljZW5zZSAtIHYgMS4wXG4gICAgKi9cblxuICAgIGZ1bmN0aW9uIFJhaW5ib3coKVxuICAgIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIHZhciBncmFkaWVudHMgPSBudWxsO1xuICAgICAgICB2YXIgbWluTnVtID0gMDtcbiAgICAgICAgdmFyIG1heE51bSA9IDEwMDtcbiAgICAgICAgdmFyIGNvbG91cnMgPSBbJ2ZmMDAwMCcsICdmZmZmMDAnLCAnMDBmZjAwJywgJzAwMDBmZiddO1xuICAgICAgICBzZXRDb2xvdXJzKGNvbG91cnMpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHNldENvbG91cnMgKHNwZWN0cnVtKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoc3BlY3RydW0ubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUmFpbmJvdyBtdXN0IGhhdmUgdHdvIG9yIG1vcmUgY29sb3Vycy4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGluY3JlbWVudCA9IChtYXhOdW0gLSBtaW5OdW0pLyhzcGVjdHJ1bS5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RHcmFkaWVudCA9IG5ldyBDb2xvdXJHcmFkaWVudCgpO1xuICAgICAgICAgICAgICAgIGZpcnN0R3JhZGllbnQuc2V0R3JhZGllbnQoc3BlY3RydW1bMF0sIHNwZWN0cnVtWzFdKTtcbiAgICAgICAgICAgICAgICBmaXJzdEdyYWRpZW50LnNldE51bWJlclJhbmdlKG1pbk51bSwgbWluTnVtICsgaW5jcmVtZW50KTtcbiAgICAgICAgICAgICAgICBncmFkaWVudHMgPSBbIGZpcnN0R3JhZGllbnQgXTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgc3BlY3RydW0ubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xvdXJHcmFkaWVudCA9IG5ldyBDb2xvdXJHcmFkaWVudCgpO1xuICAgICAgICAgICAgICAgICAgICBjb2xvdXJHcmFkaWVudC5zZXRHcmFkaWVudChzcGVjdHJ1bVtpXSwgc3BlY3RydW1baSArIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgY29sb3VyR3JhZGllbnQuc2V0TnVtYmVyUmFuZ2UobWluTnVtICsgaW5jcmVtZW50ICogaSwgbWluTnVtICsgaW5jcmVtZW50ICogKGkgKyAxKSk7XG4gICAgICAgICAgICAgICAgICAgIGdyYWRpZW50c1tpXSA9IGNvbG91ckdyYWRpZW50O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbG91cnMgPSBzcGVjdHJ1bTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0U3BlY3RydW0gPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICBzZXRDb2xvdXJzKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0U3BlY3RydW1CeUFycmF5ID0gZnVuY3Rpb24gKGFycmF5KVxuICAgICAgICB7XG4gICAgICAgICAgICBzZXRDb2xvdXJzKGFycmF5KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb2xvdXJBdCA9IGZ1bmN0aW9uIChudW1iZXIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihudW1iZXIgKyAnIGlzIG5vdCBhIG51bWJlcicpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChncmFkaWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdyYWRpZW50c1swXS5jb2xvdXJBdChudW1iZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VnbWVudCA9IChtYXhOdW0gLSBtaW5OdW0pLyhncmFkaWVudHMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBNYXRoLm1pbihNYXRoLmZsb29yKChNYXRoLm1heChudW1iZXIsIG1pbk51bSkgLSBtaW5OdW0pL3NlZ21lbnQpLCBncmFkaWVudHMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdyYWRpZW50c1tpbmRleF0uY29sb3VyQXQobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29sb3JBdCA9IHRoaXMuY29sb3VyQXQ7XG5cbiAgICAgICAgdGhpcy5zZXROdW1iZXJSYW5nZSA9IGZ1bmN0aW9uIChtaW5OdW1iZXIsIG1heE51bWJlcilcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKG1heE51bWJlciA+IG1pbk51bWJlcikge1xuICAgICAgICAgICAgICAgIG1pbk51bSA9IG1pbk51bWJlcjtcbiAgICAgICAgICAgICAgICBtYXhOdW0gPSBtYXhOdW1iZXI7XG4gICAgICAgICAgICAgICAgc2V0Q29sb3Vycyhjb2xvdXJzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ21heE51bWJlciAoJyArIG1heE51bWJlciArICcpIGlzIG5vdCBncmVhdGVyIHRoYW4gbWluTnVtYmVyICgnICsgbWluTnVtYmVyICsgJyknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQ29sb3VyR3JhZGllbnQoKVxuICAgIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIHZhciBzdGFydENvbG91ciA9ICdmZjAwMDAnO1xuICAgICAgICB2YXIgZW5kQ29sb3VyID0gJzAwMDBmZic7XG4gICAgICAgIHZhciBtaW5OdW0gPSAwO1xuICAgICAgICB2YXIgbWF4TnVtID0gMTAwO1xuXG4gICAgICAgIHRoaXMuc2V0R3JhZGllbnQgPSBmdW5jdGlvbiAoY29sb3VyU3RhcnQsIGNvbG91ckVuZClcbiAgICAgICAge1xuICAgICAgICAgICAgc3RhcnRDb2xvdXIgPSBnZXRIZXhDb2xvdXIoY29sb3VyU3RhcnQpO1xuICAgICAgICAgICAgZW5kQ29sb3VyID0gZ2V0SGV4Q29sb3VyKGNvbG91ckVuZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldE51bWJlclJhbmdlID0gZnVuY3Rpb24gKG1pbk51bWJlciwgbWF4TnVtYmVyKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAobWF4TnVtYmVyID4gbWluTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgbWluTnVtID0gbWluTnVtYmVyO1xuICAgICAgICAgICAgICAgIG1heE51bSA9IG1heE51bWJlcjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ21heE51bWJlciAoJyArIG1heE51bWJlciArICcpIGlzIG5vdCBncmVhdGVyIHRoYW4gbWluTnVtYmVyICgnICsgbWluTnVtYmVyICsgJyknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29sb3VyQXQgPSBmdW5jdGlvbiAobnVtYmVyKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gY2FsY0hleChudW1iZXIsIHN0YXJ0Q29sb3VyLnN1YnN0cmluZygwLDIpLCBlbmRDb2xvdXIuc3Vic3RyaW5nKDAsMikpXG4gICAgICAgICAgICAgICAgKyBjYWxjSGV4KG51bWJlciwgc3RhcnRDb2xvdXIuc3Vic3RyaW5nKDIsNCksIGVuZENvbG91ci5zdWJzdHJpbmcoMiw0KSlcbiAgICAgICAgICAgICAgICArIGNhbGNIZXgobnVtYmVyLCBzdGFydENvbG91ci5zdWJzdHJpbmcoNCw2KSwgZW5kQ29sb3VyLnN1YnN0cmluZyg0LDYpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGNIZXgobnVtYmVyLCBjaGFubmVsU3RhcnRfQmFzZTE2LCBjaGFubmVsRW5kX0Jhc2UxNilcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIG51bSA9IG51bWJlcjtcbiAgICAgICAgICAgIGlmIChudW0gPCBtaW5OdW0pIHtcbiAgICAgICAgICAgICAgICBudW0gPSBtaW5OdW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobnVtID4gbWF4TnVtKSB7XG4gICAgICAgICAgICAgICAgbnVtID0gbWF4TnVtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG51bVJhbmdlID0gbWF4TnVtIC0gbWluTnVtO1xuICAgICAgICAgICAgdmFyIGNTdGFydF9CYXNlMTAgPSBwYXJzZUludChjaGFubmVsU3RhcnRfQmFzZTE2LCAxNik7XG4gICAgICAgICAgICB2YXIgY0VuZF9CYXNlMTAgPSBwYXJzZUludChjaGFubmVsRW5kX0Jhc2UxNiwgMTYpO1xuICAgICAgICAgICAgdmFyIGNQZXJVbml0ID0gKGNFbmRfQmFzZTEwIC0gY1N0YXJ0X0Jhc2UxMCkvbnVtUmFuZ2U7XG4gICAgICAgICAgICB2YXIgY19CYXNlMTAgPSBNYXRoLnJvdW5kKGNQZXJVbml0ICogKG51bSAtIG1pbk51bSkgKyBjU3RhcnRfQmFzZTEwKTtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXRIZXgoY19CYXNlMTAudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdEhleChoZXgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChoZXgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcwJyArIGhleDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzSGV4Q29sb3VyKHN0cmluZylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHJlZ2V4ID0gL14jP1swLTlhLWZBLUZdezZ9JC9pO1xuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4LnRlc3Qoc3RyaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEhleENvbG91cihzdHJpbmcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChpc0hleENvbG91cihzdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZy5zdWJzdHJpbmcoc3RyaW5nLmxlbmd0aCAtIDYsIHN0cmluZy5sZW5ndGgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IHN0cmluZy50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb2xvdXJOYW1lcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29sb3VyTmFtZXNbbmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihzdHJpbmcgKyAnIGlzIG5vdCBhIHZhbGlkIGNvbG91ci4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dGVuZGVkIGxpc3Qgb2YgQ1NTIGNvbG9ybmFtZXMgcyB0YWtlbiBmcm9tXG4gICAgICAgIC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL2NzczMtY29sb3IvI3N2Zy1jb2xvclxuICAgICAgICB2YXIgY29sb3VyTmFtZXMgPSB7XG4gICAgICAgICAgICBhbGljZWJsdWU6IFwiRjBGOEZGXCIsXG4gICAgICAgICAgICBhbnRpcXVld2hpdGU6IFwiRkFFQkQ3XCIsXG4gICAgICAgICAgICBhcXVhOiBcIjAwRkZGRlwiLFxuICAgICAgICAgICAgYXF1YW1hcmluZTogXCI3RkZGRDRcIixcbiAgICAgICAgICAgIGF6dXJlOiBcIkYwRkZGRlwiLFxuICAgICAgICAgICAgYmVpZ2U6IFwiRjVGNURDXCIsXG4gICAgICAgICAgICBiaXNxdWU6IFwiRkZFNEM0XCIsXG4gICAgICAgICAgICBibGFjazogXCIwMDAwMDBcIixcbiAgICAgICAgICAgIGJsYW5jaGVkYWxtb25kOiBcIkZGRUJDRFwiLFxuICAgICAgICAgICAgYmx1ZTogXCIwMDAwRkZcIixcbiAgICAgICAgICAgIGJsdWV2aW9sZXQ6IFwiOEEyQkUyXCIsXG4gICAgICAgICAgICBicm93bjogXCJBNTJBMkFcIixcbiAgICAgICAgICAgIGJ1cmx5d29vZDogXCJERUI4ODdcIixcbiAgICAgICAgICAgIGNhZGV0Ymx1ZTogXCI1RjlFQTBcIixcbiAgICAgICAgICAgIGNoYXJ0cmV1c2U6IFwiN0ZGRjAwXCIsXG4gICAgICAgICAgICBjaG9jb2xhdGU6IFwiRDI2OTFFXCIsXG4gICAgICAgICAgICBjb3JhbDogXCJGRjdGNTBcIixcbiAgICAgICAgICAgIGNvcm5mbG93ZXJibHVlOiBcIjY0OTVFRFwiLFxuICAgICAgICAgICAgY29ybnNpbGs6IFwiRkZGOERDXCIsXG4gICAgICAgICAgICBjcmltc29uOiBcIkRDMTQzQ1wiLFxuICAgICAgICAgICAgY3lhbjogXCIwMEZGRkZcIixcbiAgICAgICAgICAgIGRhcmtibHVlOiBcIjAwMDA4QlwiLFxuICAgICAgICAgICAgZGFya2N5YW46IFwiMDA4QjhCXCIsXG4gICAgICAgICAgICBkYXJrZ29sZGVucm9kOiBcIkI4ODYwQlwiLFxuICAgICAgICAgICAgZGFya2dyYXk6IFwiQTlBOUE5XCIsXG4gICAgICAgICAgICBkYXJrZ3JlZW46IFwiMDA2NDAwXCIsXG4gICAgICAgICAgICBkYXJrZ3JleTogXCJBOUE5QTlcIixcbiAgICAgICAgICAgIGRhcmtraGFraTogXCJCREI3NkJcIixcbiAgICAgICAgICAgIGRhcmttYWdlbnRhOiBcIjhCMDA4QlwiLFxuICAgICAgICAgICAgZGFya29saXZlZ3JlZW46IFwiNTU2QjJGXCIsXG4gICAgICAgICAgICBkYXJrb3JhbmdlOiBcIkZGOEMwMFwiLFxuICAgICAgICAgICAgZGFya29yY2hpZDogXCI5OTMyQ0NcIixcbiAgICAgICAgICAgIGRhcmtyZWQ6IFwiOEIwMDAwXCIsXG4gICAgICAgICAgICBkYXJrc2FsbW9uOiBcIkU5OTY3QVwiLFxuICAgICAgICAgICAgZGFya3NlYWdyZWVuOiBcIjhGQkM4RlwiLFxuICAgICAgICAgICAgZGFya3NsYXRlYmx1ZTogXCI0ODNEOEJcIixcbiAgICAgICAgICAgIGRhcmtzbGF0ZWdyYXk6IFwiMkY0RjRGXCIsXG4gICAgICAgICAgICBkYXJrc2xhdGVncmV5OiBcIjJGNEY0RlwiLFxuICAgICAgICAgICAgZGFya3R1cnF1b2lzZTogXCIwMENFRDFcIixcbiAgICAgICAgICAgIGRhcmt2aW9sZXQ6IFwiOTQwMEQzXCIsXG4gICAgICAgICAgICBkZWVwcGluazogXCJGRjE0OTNcIixcbiAgICAgICAgICAgIGRlZXBza3libHVlOiBcIjAwQkZGRlwiLFxuICAgICAgICAgICAgZGltZ3JheTogXCI2OTY5NjlcIixcbiAgICAgICAgICAgIGRpbWdyZXk6IFwiNjk2OTY5XCIsXG4gICAgICAgICAgICBkb2RnZXJibHVlOiBcIjFFOTBGRlwiLFxuICAgICAgICAgICAgZmlyZWJyaWNrOiBcIkIyMjIyMlwiLFxuICAgICAgICAgICAgZmxvcmFsd2hpdGU6IFwiRkZGQUYwXCIsXG4gICAgICAgICAgICBmb3Jlc3RncmVlbjogXCIyMjhCMjJcIixcbiAgICAgICAgICAgIGZ1Y2hzaWE6IFwiRkYwMEZGXCIsXG4gICAgICAgICAgICBnYWluc2Jvcm86IFwiRENEQ0RDXCIsXG4gICAgICAgICAgICBnaG9zdHdoaXRlOiBcIkY4RjhGRlwiLFxuICAgICAgICAgICAgZ29sZDogXCJGRkQ3MDBcIixcbiAgICAgICAgICAgIGdvbGRlbnJvZDogXCJEQUE1MjBcIixcbiAgICAgICAgICAgIGdyYXk6IFwiODA4MDgwXCIsXG4gICAgICAgICAgICBncmVlbjogXCIwMDgwMDBcIixcbiAgICAgICAgICAgIGdyZWVueWVsbG93OiBcIkFERkYyRlwiLFxuICAgICAgICAgICAgZ3JleTogXCI4MDgwODBcIixcbiAgICAgICAgICAgIGhvbmV5ZGV3OiBcIkYwRkZGMFwiLFxuICAgICAgICAgICAgaG90cGluazogXCJGRjY5QjRcIixcbiAgICAgICAgICAgIGluZGlhbnJlZDogXCJDRDVDNUNcIixcbiAgICAgICAgICAgIGluZGlnbzogXCI0QjAwODJcIixcbiAgICAgICAgICAgIGl2b3J5OiBcIkZGRkZGMFwiLFxuICAgICAgICAgICAga2hha2k6IFwiRjBFNjhDXCIsXG4gICAgICAgICAgICBsYXZlbmRlcjogXCJFNkU2RkFcIixcbiAgICAgICAgICAgIGxhdmVuZGVyYmx1c2g6IFwiRkZGMEY1XCIsXG4gICAgICAgICAgICBsYXduZ3JlZW46IFwiN0NGQzAwXCIsXG4gICAgICAgICAgICBsZW1vbmNoaWZmb246IFwiRkZGQUNEXCIsXG4gICAgICAgICAgICBsaWdodGJsdWU6IFwiQUREOEU2XCIsXG4gICAgICAgICAgICBsaWdodGNvcmFsOiBcIkYwODA4MFwiLFxuICAgICAgICAgICAgbGlnaHRjeWFuOiBcIkUwRkZGRlwiLFxuICAgICAgICAgICAgbGlnaHRnb2xkZW5yb2R5ZWxsb3c6IFwiRkFGQUQyXCIsXG4gICAgICAgICAgICBsaWdodGdyYXk6IFwiRDNEM0QzXCIsXG4gICAgICAgICAgICBsaWdodGdyZWVuOiBcIjkwRUU5MFwiLFxuICAgICAgICAgICAgbGlnaHRncmV5OiBcIkQzRDNEM1wiLFxuICAgICAgICAgICAgbGlnaHRwaW5rOiBcIkZGQjZDMVwiLFxuICAgICAgICAgICAgbGlnaHRzYWxtb246IFwiRkZBMDdBXCIsXG4gICAgICAgICAgICBsaWdodHNlYWdyZWVuOiBcIjIwQjJBQVwiLFxuICAgICAgICAgICAgbGlnaHRza3libHVlOiBcIjg3Q0VGQVwiLFxuICAgICAgICAgICAgbGlnaHRzbGF0ZWdyYXk6IFwiNzc4ODk5XCIsXG4gICAgICAgICAgICBsaWdodHNsYXRlZ3JleTogXCI3Nzg4OTlcIixcbiAgICAgICAgICAgIGxpZ2h0c3RlZWxibHVlOiBcIkIwQzRERVwiLFxuICAgICAgICAgICAgbGlnaHR5ZWxsb3c6IFwiRkZGRkUwXCIsXG4gICAgICAgICAgICBsaW1lOiBcIjAwRkYwMFwiLFxuICAgICAgICAgICAgbGltZWdyZWVuOiBcIjMyQ0QzMlwiLFxuICAgICAgICAgICAgbGluZW46IFwiRkFGMEU2XCIsXG4gICAgICAgICAgICBtYWdlbnRhOiBcIkZGMDBGRlwiLFxuICAgICAgICAgICAgbWFyb29uOiBcIjgwMDAwMFwiLFxuICAgICAgICAgICAgbWVkaXVtYXF1YW1hcmluZTogXCI2NkNEQUFcIixcbiAgICAgICAgICAgIG1lZGl1bWJsdWU6IFwiMDAwMENEXCIsXG4gICAgICAgICAgICBtZWRpdW1vcmNoaWQ6IFwiQkE1NUQzXCIsXG4gICAgICAgICAgICBtZWRpdW1wdXJwbGU6IFwiOTM3MERCXCIsXG4gICAgICAgICAgICBtZWRpdW1zZWFncmVlbjogXCIzQ0IzNzFcIixcbiAgICAgICAgICAgIG1lZGl1bXNsYXRlYmx1ZTogXCI3QjY4RUVcIixcbiAgICAgICAgICAgIG1lZGl1bXNwcmluZ2dyZWVuOiBcIjAwRkE5QVwiLFxuICAgICAgICAgICAgbWVkaXVtdHVycXVvaXNlOiBcIjQ4RDFDQ1wiLFxuICAgICAgICAgICAgbWVkaXVtdmlvbGV0cmVkOiBcIkM3MTU4NVwiLFxuICAgICAgICAgICAgbWlkbmlnaHRibHVlOiBcIjE5MTk3MFwiLFxuICAgICAgICAgICAgbWludGNyZWFtOiBcIkY1RkZGQVwiLFxuICAgICAgICAgICAgbWlzdHlyb3NlOiBcIkZGRTRFMVwiLFxuICAgICAgICAgICAgbW9jY2FzaW46IFwiRkZFNEI1XCIsXG4gICAgICAgICAgICBuYXZham93aGl0ZTogXCJGRkRFQURcIixcbiAgICAgICAgICAgIG5hdnk6IFwiMDAwMDgwXCIsXG4gICAgICAgICAgICBvbGRsYWNlOiBcIkZERjVFNlwiLFxuICAgICAgICAgICAgb2xpdmU6IFwiODA4MDAwXCIsXG4gICAgICAgICAgICBvbGl2ZWRyYWI6IFwiNkI4RTIzXCIsXG4gICAgICAgICAgICBvcmFuZ2U6IFwiRkZBNTAwXCIsXG4gICAgICAgICAgICBvcmFuZ2VyZWQ6IFwiRkY0NTAwXCIsXG4gICAgICAgICAgICBvcmNoaWQ6IFwiREE3MEQ2XCIsXG4gICAgICAgICAgICBwYWxlZ29sZGVucm9kOiBcIkVFRThBQVwiLFxuICAgICAgICAgICAgcGFsZWdyZWVuOiBcIjk4RkI5OFwiLFxuICAgICAgICAgICAgcGFsZXR1cnF1b2lzZTogXCJBRkVFRUVcIixcbiAgICAgICAgICAgIHBhbGV2aW9sZXRyZWQ6IFwiREI3MDkzXCIsXG4gICAgICAgICAgICBwYXBheWF3aGlwOiBcIkZGRUZENVwiLFxuICAgICAgICAgICAgcGVhY2hwdWZmOiBcIkZGREFCOVwiLFxuICAgICAgICAgICAgcGVydTogXCJDRDg1M0ZcIixcbiAgICAgICAgICAgIHBpbms6IFwiRkZDMENCXCIsXG4gICAgICAgICAgICBwbHVtOiBcIkREQTBERFwiLFxuICAgICAgICAgICAgcG93ZGVyYmx1ZTogXCJCMEUwRTZcIixcbiAgICAgICAgICAgIHB1cnBsZTogXCI4MDAwODBcIixcbiAgICAgICAgICAgIHJlZDogXCJGRjAwMDBcIixcbiAgICAgICAgICAgIHJvc3licm93bjogXCJCQzhGOEZcIixcbiAgICAgICAgICAgIHJveWFsYmx1ZTogXCI0MTY5RTFcIixcbiAgICAgICAgICAgIHNhZGRsZWJyb3duOiBcIjhCNDUxM1wiLFxuICAgICAgICAgICAgc2FsbW9uOiBcIkZBODA3MlwiLFxuICAgICAgICAgICAgc2FuZHlicm93bjogXCJGNEE0NjBcIixcbiAgICAgICAgICAgIHNlYWdyZWVuOiBcIjJFOEI1N1wiLFxuICAgICAgICAgICAgc2Vhc2hlbGw6IFwiRkZGNUVFXCIsXG4gICAgICAgICAgICBzaWVubmE6IFwiQTA1MjJEXCIsXG4gICAgICAgICAgICBzaWx2ZXI6IFwiQzBDMEMwXCIsXG4gICAgICAgICAgICBza3libHVlOiBcIjg3Q0VFQlwiLFxuICAgICAgICAgICAgc2xhdGVibHVlOiBcIjZBNUFDRFwiLFxuICAgICAgICAgICAgc2xhdGVncmF5OiBcIjcwODA5MFwiLFxuICAgICAgICAgICAgc2xhdGVncmV5OiBcIjcwODA5MFwiLFxuICAgICAgICAgICAgc25vdzogXCJGRkZBRkFcIixcbiAgICAgICAgICAgIHNwcmluZ2dyZWVuOiBcIjAwRkY3RlwiLFxuICAgICAgICAgICAgc3RlZWxibHVlOiBcIjQ2ODJCNFwiLFxuICAgICAgICAgICAgdGFuOiBcIkQyQjQ4Q1wiLFxuICAgICAgICAgICAgdGVhbDogXCIwMDgwODBcIixcbiAgICAgICAgICAgIHRoaXN0bGU6IFwiRDhCRkQ4XCIsXG4gICAgICAgICAgICB0b21hdG86IFwiRkY2MzQ3XCIsXG4gICAgICAgICAgICB0dXJxdW9pc2U6IFwiNDBFMEQwXCIsXG4gICAgICAgICAgICB2aW9sZXQ6IFwiRUU4MkVFXCIsXG4gICAgICAgICAgICB3aGVhdDogXCJGNURFQjNcIixcbiAgICAgICAgICAgIHdoaXRlOiBcIkZGRkZGRlwiLFxuICAgICAgICAgICAgd2hpdGVzbW9rZTogXCJGNUY1RjVcIixcbiAgICAgICAgICAgIHllbGxvdzogXCJGRkZGMDBcIixcbiAgICAgICAgICAgIHllbGxvd2dyZWVuOiBcIjlBQ0QzMlwiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUmFpbmJvdztcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvVmlzdWFsaXplcnMvUmFpbmJvdy5qc1wiLFwiL1Zpc3VhbGl6ZXJzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgUmFpbmJvdyA9IHJlcXVpcmUoJy4vUmFpbmJvdy5qcycpO1xuXG4gICAgdmFyIFNwZWVkVmlzdWFsaXplcjJEID0gZnVuY3Rpb24oc3RydWN0dXJlLCBjYW52YXMsIHZpc3VhbGl6ZXIsIGRpc3RhbmNlQmV0d2Vlbk5vZGUpIHtcbiAgICAgICAgdGhpcy5zdHJ1Y3R1cmUgPSBzdHJ1Y3R1cmU7XG4gICAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgICB0aGlzLnZpc3VhbGl6ZXIgPSB2aXN1YWxpemVyO1xuICAgICAgICB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUgPSBkaXN0YW5jZUJldHdlZW5Ob2RlIHx8IDIwO1xuXG4gICAgICAgIHRoaXMubWFwID0gbmV3IFJhaW5ib3coKTtcbiAgICAgICAgdGhpcy5tYXAuc2V0TnVtYmVyUmFuZ2UoMCwgMC4xKTtcbiAgICAgICAgdGhpcy5tYXAuc2V0U3BlY3RydW0oJ2JsdWUnLCAnZ3JlZW4nLCAneWVsbG93JywgJ3JlZCcpO1xuXG4gICAgICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB9XG5cbiAgICBTcGVlZFZpc3VhbGl6ZXIyRC5wcm90b3R5cGUgPSB7XG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLndpZHRoO1xuXG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgbWF4VmVsb2NpdHkgPSAwLjAwMDE7XG4gICAgICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSBub2RlLmdldFZlbG9jaXR5KG5vZGUuZ2V0RGVuc2l0eSgpLCB0aGF0LnN0cnVjdHVyZS52ZWxvY2l0eVNldCk7XG4gICAgICAgICAgICAgICAgdmVsb2NpdHkgPSBNYXRoLnNxcnQodmVsb2NpdHkueCAqIHZlbG9jaXR5LnggKyB2ZWxvY2l0eS55ICogdmVsb2NpdHkueSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodmVsb2NpdHkgPiBtYXhWZWxvY2l0eSkge1xuICAgICAgICAgICAgICAgICAgICBtYXhWZWxvY2l0eSA9IHZlbG9jaXR5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbWF4VmVsb2NpdHkgPSBtYXhWZWxvY2l0eTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1heFZlbG9jaXR5KTtcbiAgICAgICAgICAgIHRoaXMubWFwLnNldE51bWJlclJhbmdlKDAsIG1heFZlbG9jaXR5KTtcblxuICAgICAgICAgICAgdGhpcy5zdHJ1Y3R1cmUuZm9yRWFjaE5vZGUoZnVuY3Rpb24obm9kZSwgaWR4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGRvbWFpbklkeCA9IHRoYXQuc3RydWN0dXJlLmlkeFRvRG9tYWluKGlkeCk7XG4gICAgICAgICAgICAgICAgdGhhdC5kcmF3Tm9kZShkb21haW5JZHgsIG5vZGUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnZpc3VhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXIucmVuZGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZHJhd05vZGU6IGZ1bmN0aW9uKGRvbWFpbklkeCwgbm9kZSkge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG4gICAgICAgICAgICBjb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKFxuICAgICAgICAgICAgICAgIGRvbWFpbklkeC54ICogdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlLFxuICAgICAgICAgICAgICAgIGRvbWFpbklkeC55ICogdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSBub2RlLmdldFZlbG9jaXR5KG5vZGUuZ2V0RGVuc2l0eSgpLCB0aGlzLnN0cnVjdHVyZS52ZWxvY2l0eVNldCk7XG4gICAgICAgICAgICB2ZWxvY2l0eSA9IE1hdGguc3FydCh2ZWxvY2l0eS54ICogdmVsb2NpdHkueCArIHZlbG9jaXR5LnkgKiB2ZWxvY2l0eS55KTtcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJyMnICsgdGhpcy5tYXAuY29sb3VyQXQodmVsb2NpdHkpO1xuICAgICAgICAgICAgY29udGV4dC5maWxsUmVjdCgwICwgMCwgdGhpcy5kaXN0YW5jZUJldHdlZW5Ob2RlLCB0aGlzLmRpc3RhbmNlQmV0d2Vlbk5vZGUpO1xuXG4gICAgICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBrZWVwUmVuZGVyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RvcFJlbmRlcmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIH0sXG4gICAgfVxuXG4gICAgcmV0dXJuIFNwZWVkVmlzdWFsaXplcjJEO1xufSgpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9WaXN1YWxpemVycy9TcGVlZFZpc3VhbGl6ZXIyRC5qc1wiLFwiL1Zpc3VhbGl6ZXJzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcbiAgICAvLyBGb3IgRDJROVxuICAgIHZhciBab3VIZVZlbG9jaXR5Qm91bmRhcnlDb25kaXRpb24gPSBmdW5jdGlvbihkaXN0cmlidXRpb25zLCB2ZWxvY2l0eSwgcG9zaXRpb24pIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2xhdHRpY2UnO1xuXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjsgLy8gTiwgRSwgUywgV1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBORSwgU0UsIFNXLCBOV1xuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdmVsb2NpdHk7XG5cbiAgICAgICAgLy8gdGhpcy5jbGVhckRpc3RyaWJ1dGlvbnMoZGlzdHJpYnV0aW9ucyk7XG4gICAgICAgIHRoaXMuZGlzdHJpYnV0aW9ucyA9IGRpc3RyaWJ1dGlvbnM7XG4gICAgICAgIHRoaXMubmV3RGlzdHJpYnV0aW9ucyA9IGRpc3RyaWJ1dGlvbnMuc2xpY2UoMCk7XG4gICAgfVxuXG4gICAgWm91SGVWZWxvY2l0eUJvdW5kYXJ5Q29uZGl0aW9uLnByb3RvdHlwZSA9IHtcbiAgICAgICAgc3RyZWFtVG86IGZ1bmN0aW9uKGRpcmVjdGlvbiwgbm9kZSkge1xuICAgICAgICAgICAgZGlzdHJpYnV0aW9uID0gdGhpcy5nZXREaXN0cmlidXRpb24oZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIG5vZGUuc2V0RGlzdHJpYnV0aW9uKGRpcmVjdGlvbiwgZGlzdHJpYnV0aW9uKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREaXN0cmlidXRpb246IGZ1bmN0aW9uKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlzdHJpYnV0aW9uc1tkaXJlY3Rpb25dO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldERpc3RyaWJ1dGlvbjogZnVuY3Rpb24oZGlyZWN0aW9uLCBkaXN0cmlidXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMubmV3RGlzdHJpYnV0aW9uc1tkaXJlY3Rpb25dID0gZGlzdHJpYnV0aW9uO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNvbGxpZGU6IGZ1bmN0aW9uKHJlbGF4YXRpb25UaW1lKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnMgPSB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMuc2xpY2UoMCk7XG4gICAgICAgICAgICB0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMgPSB0aGlzLmNsZWFyRGlzdHJpYnV0aW9ucyh0aGlzLm5ld0Rpc3RyaWJ1dGlvbnMpO1xuXG4gICAgICAgICAgICB2YXIgZGVuc2l0eSA9IHRoaXMuZ2V0RGVuc2l0eSgpO1xuXG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnNbNF0gPSB0aGlzLmRpc3RyaWJ1dGlvbnNbMl0gLSAzICogZGVuc2l0eSAqIHRoaXMudmVsb2NpdHkueSAvIDI7XG4gICAgICAgICAgICB0aGlzLmRpc3RyaWJ1dGlvbnNbN10gPSB0aGlzLmRpc3RyaWJ1dGlvbnNbNV0gKyAodGhpcy5kaXN0cmlidXRpb25zWzFdIC0gdGhpcy5kaXN0cmlidXRpb25zWzNdKSAvIDIgLSBkZW5zaXR5ICogdGhpcy52ZWxvY2l0eS55IC8gNiAtIGRlbnNpdHkgKiB0aGlzLnZlbG9jaXR5LnggLyAyO1xuICAgICAgICAgICAgdGhpcy5kaXN0cmlidXRpb25zWzhdID0gdGhpcy5kaXN0cmlidXRpb25zWzZdICsgKHRoaXMuZGlzdHJpYnV0aW9uc1szXSAtIHRoaXMuZGlzdHJpYnV0aW9uc1sxXSkgLyAyIC0gZGVuc2l0eSAqIHRoaXMudmVsb2NpdHkueSAvIDYgKyBkZW5zaXR5ICogdGhpcy52ZWxvY2l0eS54IC8gMjtcblxuICAgICAgICAgICAgLy8gdmFyIGVxdWlsaWJyaXVtID0gdGhpcy5nZXRFcXVpbGlicml1bSgpO1xuICAgICAgICAgICAgLy8gdmFyIHZlbG9jaXR5U2V0ID0gQ29uZmlnLmdldCgndmVsb2NpdHktc2V0Jyk7XG4gICAgICAgICAgICAvLyAvLyB2YXIgZm9yY2UgPSAxMDtcbiAgICAgICAgICAgIC8vIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHRoaXMuZGlzdHJpYnV0aW9uc1trXSA9IHRoaXMuZGlzdHJpYnV0aW9uc1trXSAtXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAodGhpcy5kaXN0cmlidXRpb25zW2tdIC0gZXF1aWxpYnJpdW1ba10pIC8gcmVsYXhhdGlvblRpbWU7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgLy8gKyAzICogdmVsb2NpdHlTZXRba10uZHkgKiB2ZWxvY2l0eVNldFtrXS53ICogZm9yY2U7XG5cbiAgICAgICAgICAgIC8vICAgICBpZiAodGhpcy5kaXN0cmlidXRpb25zW2tdIDwgMCkge1xuICAgICAgICAgICAgLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkRpc3RyaWJ1dGlvbiBpcyBuZWdhdGl2ZSFcIiwgdGhpcy5kaXN0cmlidXRpb25zW2tdKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9O1xuICAgICAgICAgICAgLy8gdmFyIGRlbnNpdHkgPSB0aGlzLmdldERlbnNpdHkoKTtcblxuICAgICAgICAgICAgLy8gdGhpcy5kaXN0cmlidXRpb25zWzRdID0gdGhpcy5kaXN0cmlidXRpb25zWzJdIC0gMyAqIGRlbnNpdHkgKiB0aGlzLnZlbG9jaXR5LnkgLyAyO1xuICAgICAgICAgICAgLy8gdGhpcy5kaXN0cmlidXRpb25zWzddID0gdGhpcy5kaXN0cmlidXRpb25zWzVdICsgKHRoaXMuZGlzdHJpYnV0aW9uc1sxXSAtIHRoaXMuZGlzdHJpYnV0aW9uc1szXSkgLyAyIC0gZGVuc2l0eSAqIHRoaXMudmVsb2NpdHkueSAvIDYgLSBkZW5zaXR5ICogdGhpcy52ZWxvY2l0eS54IC8gMjtcbiAgICAgICAgICAgIC8vIHRoaXMuZGlzdHJpYnV0aW9uc1s4XSA9IHRoaXMuZGlzdHJpYnV0aW9uc1s2XSArICh0aGlzLmRpc3RyaWJ1dGlvbnNbM10gLSB0aGlzLmRpc3RyaWJ1dGlvbnNbMV0pIC8gMiAtIGRlbnNpdHkgKiB0aGlzLnZlbG9jaXR5LnkgLyA2ICsgZGVuc2l0eSAqIHRoaXMudmVsb2NpdHkueCAvIDI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJEaXN0cmlidXRpb25zOiBmdW5jdGlvbihkaXN0cmlidXRpb25zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGRpc3RyaWJ1dGlvbnMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICBkaXN0cmlidXRpb25zW2tdID0gMDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZGlzdHJpYnV0aW9ucztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRFcXVpbGlicml1bTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc3BlZWRPZlNvdW5kU3F1YXJlZCA9IENvbmZpZy5nZXQoJ3NwZWVkLW9mLXNvdW5kLXNxdWFyZWQnKTtcbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eVNldCAgICAgICAgID0gQ29uZmlnLmdldCgndmVsb2NpdHktc2V0Jyk7XG5cbiAgICAgICAgICAgIHZhciBkZW5zaXR5ID0gdGhpcy5nZXREZW5zaXR5KCk7XG4gICAgICAgICAgICB2YXIgdiA9IHRoaXMuZ2V0VmVsb2NpdHkoZGVuc2l0eSwgdmVsb2NpdHlTZXQpO1xuICAgICAgICAgICAgdmFyIGVxdWlsaWJyaXVtID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXN0cmlidXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZGlzdHJpYnV0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICB2YXIgeGkgPSB7eDogdmVsb2NpdHlTZXRbaV0uZHgsIHk6IHZlbG9jaXR5U2V0W2ldLmR5fTtcblxuICAgICAgICAgICAgICAgIHZhciBjdSA9ICh2LnggKiB4aS54ICsgdi55ICogeGkueSkgLyBzcGVlZE9mU291bmRTcXVhcmVkO1xuXG4gICAgICAgICAgICAgICAgZXF1aWxpYnJpdW1baV0gPSBkZW5zaXR5ICogdmVsb2NpdHlTZXRbaV0udyAqIChcbiAgICAgICAgICAgICAgICAgICAgMSArIGN1ICtcbiAgICAgICAgICAgICAgICAgICAgY3UgKiBjdSAvIDIgLVxuICAgICAgICAgICAgICAgICAgICAodi54ICogdi54ICsgdi55ICogdi55KSAvICgyICogc3BlZWRPZlNvdW5kU3F1YXJlZClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBlcXVpbGlicml1bTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXREZW5zaXR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZW5zaXR5ID0gMDtcblxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnTic6XG4gICAgICAgICAgICAgICAgICAgIGRlbnNpdHkgPSAoMSAvICgxICsgdGhpcy5nZXRWZWxvY2l0eSgpLnkpKSAqIChcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzdHJpYnV0aW9uc1swXSArIHRoaXMuZGlzdHJpYnV0aW9uc1sxXSsgdGhpcy5kaXN0cmlidXRpb25zWzNdICtcbiAgICAgICAgICAgICAgICAgICAgICAgIDIgKiAodGhpcy5kaXN0cmlidXRpb25zWzJdICsgdGhpcy5kaXN0cmlidXRpb25zWzVdIC0gdGhpcy5kaXN0cmlidXRpb25zWzZdKVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1MnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1cnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnTkUnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ05XJzpcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ1NFJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTVyc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGVuc2l0eTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRWZWxvY2l0eTogZnVuY3Rpb24oZGVuc2l0eSwgdmVsb2NpdHlTZXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZlbG9jaXR5O1xuICAgICAgICB9LFxuICAgIH1cblxuICAgIHJldHVybiBab3VIZVZlbG9jaXR5Qm91bmRhcnlDb25kaXRpb247XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL1pvdUhlVmVsb2NpdHlCb3VuZGFyeUNvbmRpdGlvbi5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIENvbmZpZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnQ3JlYXRpbmcgY29uZmlnJylcbiAgICAgICAgdGhpcy5jb25maWcgPSB7XG4gICAgICAgICAgICAvLyAnZG9tYWluJzogJy4vQ29uZmlnLzJERGFtQnJlYWtEb21haW4nLFxuICAgICAgICAgICAgJ2RvbWFpbic6ICcuL0NvbmZpZy8yRERhbUJyZWFrRG9tYWluJyxcbiAgICAgICAgICAgICd2ZWxvY2l0eS1zZXQnOiBbXG4gICAgICAgICAgICAgICAge2R4OiAwLCAgICAgIGR5OiAwLCAgIHc6IDQgLyA5fSxcblxuICAgICAgICAgICAgICAgIHtkeDogMSwgICAgICBkeTogMCwgICB3OiAxIC8gOX0sXG4gICAgICAgICAgICAgICAge2R4OiAwLCAgICAgIGR5OiAxLCAgIHc6IDEgLyA5fSxcbiAgICAgICAgICAgICAgICB7ZHg6IC0gMSwgICAgZHk6IDAsICAgdzogMSAvIDl9LFxuICAgICAgICAgICAgICAgIHtkeDogMCwgICAgICBkeTogLTEsICB3OiAxIC8gOX0sXG5cbiAgICAgICAgICAgICAgICB7ZHg6IDEsICAgICAgZHk6IDEsICAgdzogMSAvIDM2fSxcbiAgICAgICAgICAgICAgICB7ZHg6IC0gMSwgICAgZHk6IDEsICAgdzogMSAvIDM2fSxcbiAgICAgICAgICAgICAgICB7ZHg6IC0gMSwgICAgZHk6IC0xLCAgdzogMSAvIDM2fSxcbiAgICAgICAgICAgICAgICB7ZHg6IDEsICAgICAgZHk6IC0xLCAgdzogMSAvIDM2fSxcblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIC8vIFRoaXMgYXJyYXkgZ2l2ZXMgdGhlIGluZGV4IG9mIHRoZSBvcHBvc2l0ZSB2ZWxvY2l0eSBzZXQgY29ycmVzcG9uZGluZyB0byB0aGUgaW5kZXggZ2l2ZW4uXG4gICAgICAgICAgICAvLyBUaGlzIHdpbGwgYmUgdXNlZnVsIHdoZW4gaW1wbGVtZW50aW5nIGJvdW5jZSBiYWNrIGJvdW5kYXJ5IGNvbmRpdGlvbnNcbiAgICAgICAgICAgICdvcHBvc2l0ZS12ZWxvY2l0eS1zZXQnOiBbMCwgMywgNCwgMSwgMiwgNywgOCwgNSwgNl0sXG4gICAgICAgICAgICAnc3BlZWQtb2Ytc291bmQtc3F1YXJlZCc6IDEgLyAzLFxuICAgICAgICAgICAgJ3JlbGF4YXRpb24tdGltZSc6IDAuNTUsXG4gICAgICAgICAgICAnUmUnOiAxMDAwMCxcbiAgICAgICAgICAgICdpbml0aWFsLWRpc3RyaWJ1dGlvbnMnOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgICAgICAgICAgaWYgKDEgPT0gMSB8fCAoeCA9PSAyICYmIHkgPT0gMikpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJhbmQgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmFuZCA9IDE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgICAgICAgICA0ICogcmFuZCAvIDksXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5kIC8gOSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyA5LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZCAvIDksXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5kIC8gOSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyAzNixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyAzNixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyAzNixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmQgLyAzNlxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgMFxuICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBDb25maWcucHJvdG90eXBlID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYga2V5IGV4aXN0c1xuICAgICAgICAgICAgaWYgKGNvbmZpZyBpbiB0aGlzLmNvbmZpZykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ1tjb25maWddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH1cblxuICAgIHJldHVybiBuZXcgQ29uZmlnKCk7XG59KCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL2NvbmZpZy5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbnZhciBTaW11bGF0aW9uID0gcmVxdWlyZSgnLi9sYm0nKTtcbnZhciBMYXR0aWNlTm9kZSA9IHJlcXVpcmUoJy4vTGF0dGljZU5vZGUnKTtcbnZhciBMYXR0aWNlU3RydWN0dXJlID0gcmVxdWlyZSgnLi9MYXR0aWNlU3RydWN0dXJlJyk7XG52YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcbmNvbnNvbGUubG9nKENvbmZpZyk7XG5jb25zb2xlLmxvZyhcIlN0YXJ0aW5nIHNpbXVsYXRpb25cIik7XG4vLyBTdGFydCBvZiBzaW11bGF0aW9uXG52YXIgc2ltID0gbmV3IFNpbXVsYXRpb24oKTtcbmNvbnNvbGUubG9nKHNpbSk7XG53aW5kb3cuc2ltID0gc2ltO1xuc2ltLnZpc3VhbGl6ZSgpO1xuLy8gc2ltLnJ1bigpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9mYWtlX2VjMmZkZDNlLmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLy8gZmlyc3QgMkQsIHRoZW5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICBTaW11bGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpO1xuICAgICAgICB0aGlzLnN0cnVjdHVyZSA9IHRoaXMuaW5pdGlhbGl6ZVN0cnVjdHVyZShjb25maWcpO1xuICAgICAgICB2YXIgRG9tYWluID0gcmVxdWlyZSgnLi9Db25maWcvMkRab3VIZURvbWFpbicpO1xuICAgICAgICAvLyB2YXIgRG9tYWluID0gcmVxdWlyZSgnLi9Db25maWcvMkRab3VIZURvbWFpbicpO1xuICAgICAgICB0aGlzLmRvbWFpbiA9IG5ldyBEb21haW4oY29uZmlnKTtcbiAgICAgICAgdGhpcy5yZWxheGF0aW9uVGltZSA9IHRoaXMuZG9tYWluLnJlbGF4YXRpb25UaW1lO1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlbGF4YXRpb25UaW1lOiBcIiwgdGhpcy5yZWxheGF0aW9uVGltZSk7XG5cbiAgICAgICAgdGhpcy5pbml0aWFsaXplVmlzdWFsaXplcnMoKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkluaXRpYWxpemVkIGV2ZXJ5dGhpbmchXCIpO1xuICAgIH1cblxuICAgIFNpbXVsYXRpb24ucHJvdG90eXBlID0ge1xuICAgICAgICBpbml0aWFsaXplVmlzdWFsaXplcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy52aXN1YWxpemVycyA9IFtdO1xuICAgICAgICAgICAgdmFyIFN0cnVjdHVyZVZpc3VhbGl6ZXIgPSByZXF1aXJlKCcuL1Zpc3VhbGl6ZXJzL0xhdHRpY2VTdHJ1Y3R1cmVWaXNhdWFsaXplcjJEJyk7XG4gICAgICAgICAgICB2YXIgRGVuc2l0eVZpc3VhbGl6ZXIgPSByZXF1aXJlKCcuL1Zpc3VhbGl6ZXJzL0RlbnNpdHlWaXN1YWxpemVyMkQnKTtcbiAgICAgICAgICAgIHZhciBTcGVlZFZpc3VhbGl6ZXIgPSByZXF1aXJlKCcuL1Zpc3VhbGl6ZXJzL1NwZWVkVmlzdWFsaXplcjJEJyk7XG4gICAgICAgICAgICB2YXIgRGVuc2l0eVZpc3VhbGl6YXRpb25HcmFwaCA9IHJlcXVpcmUoJy4vVmlzdWFsaXplcnMvRGVuc2l0eVZpc3VhbGl6YXRpb25HcmFwaCcpO1xuXG4gICAgICAgICAgICB2YXIgZGVuc3RpeUNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZW5zaXR5Q2FudmFzJyk7XG4gICAgICAgICAgICB2YXIgZGlzdGFuY2VCZXR3ZWVuTm9kZXMgPSA1O1xuICAgICAgICAgICAgdmFyIHN0cnVjdHVyZSA9IG5ldyBTdHJ1Y3R1cmVWaXN1YWxpemVyKHRoaXMuc3RydWN0dXJlLCBkZW5zdGl5Q2FudmFzLCBkaXN0YW5jZUJldHdlZW5Ob2Rlcyk7XG4gICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXJzLnB1c2goXG4gICAgICAgICAgICAgICAgbmV3IERlbnNpdHlWaXN1YWxpemVyKHRoaXMuc3RydWN0dXJlLCBkZW5zdGl5Q2FudmFzLCBzdHJ1Y3R1cmUsIGRpc3RhbmNlQmV0d2Vlbk5vZGVzKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIERyYXcgZWFjaCBub2RlXG4gICAgICAgICAgICBkZW5zdGl5Q2FudmFzLndpZHRoID0gZGlzdGFuY2VCZXR3ZWVuTm9kZXMgKiB0aGlzLmRvbWFpbi5keDtcbiAgICAgICAgICAgIGRlbnN0aXlDYW52YXMuaGVpZ2h0ID0gZGlzdGFuY2VCZXR3ZWVuTm9kZXMgKiB0aGlzLmRvbWFpbi5keTtcblxuICAgICAgICAgICAgdmFyIHNwZWVkQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NwZWVkQ2FudmFzJyk7XG4gICAgICAgICAgICB2YXIgc3RydWN0dXJlID0gbmV3IFN0cnVjdHVyZVZpc3VhbGl6ZXIodGhpcy5zdHJ1Y3R1cmUsIHNwZWVkQ2FudmFzLCBkaXN0YW5jZUJldHdlZW5Ob2Rlcyk7XG4gICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXJzLnB1c2goXG4gICAgICAgICAgICAgICAgbmV3IFNwZWVkVmlzdWFsaXplcih0aGlzLnN0cnVjdHVyZSwgc3BlZWRDYW52YXMsIHN0cnVjdHVyZSwgZGlzdGFuY2VCZXR3ZWVuTm9kZXMpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgc3BlZWRDYW52YXMud2lkdGggPSBkaXN0YW5jZUJldHdlZW5Ob2RlcyAqIHRoaXMuZG9tYWluLmR4O1xuICAgICAgICAgICAgc3BlZWRDYW52YXMuaGVpZ2h0ID0gZGlzdGFuY2VCZXR3ZWVuTm9kZXMgKiB0aGlzLmRvbWFpbi5keTtcblxuICAgICAgICAgICAgdmFyIGdyYXBoQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dyYXBoQ2FudmFzJyk7XG4gICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXJzLnB1c2goXG4gICAgICAgICAgICAgICAgbmV3IERlbnNpdHlWaXN1YWxpemF0aW9uR3JhcGgodGhpcy5zdHJ1Y3R1cmUsIGdyYXBoQ2FudmFzKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGdyYXBoQ2FudmFzLndpZHRoID0gZGlzdGFuY2VCZXR3ZWVuTm9kZXMgKiB0aGlzLmRvbWFpbi5keDtcbiAgICAgICAgICAgIGdyYXBoQ2FudmFzLmhlaWdodCA9IGRpc3RhbmNlQmV0d2Vlbk5vZGVzICogdGhpcy5kb21haW4uZHk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZVN0cnVjdHVyZTogZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgICAgICAvLyBhY3R1YWxseSBiZWNhdXNlIGR0ID0gZHggPSBkeSB3ZSBzaG91bGQgb25seSBoYXZlIHRvXG4gICAgICAgICAgICAvLyBnaXZlIG9uZSBzaXplIHNpbmNlIHRoZSBzdHJ1Y3R1cmUgc2hvdWxkIGJlIGFibGUgdG9cbiAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSB0aGUgYW1vdW50IG9mIG5vZGVzIGZyb20ga25vd2luZyB0aGUgZG9tYWluXG4gICAgICAgICAgICB2YXIgc3RydWN0dXJlID0gbmV3IExhdHRpY2VTdHJ1Y3R1cmUoY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybiBzdHJ1Y3R1cmU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29sbGlzaW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJlbGF4YXRpb25UaW1lID0gdGhpcy5yZWxheGF0aW9uVGltZTtcblxuICAgICAgICAgICAgdGhpcy5zdHJ1Y3R1cmUuZm9yRWFjaE5vZGUoZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgICAgIG5vZGUuY29sbGlkZShyZWxheGF0aW9uVGltZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdHJlYW06IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzLnN0cnVjdHVyZTtcbiAgICAgICAgICAgIHZhciBkaXJlY3Rpb25zID0gdGhhdC5nZXREaXJlY3Rpb25zKCk7XG4gICAgICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgZGlyZWN0aW9ucy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGlyZWN0aW9uID0gazsvL2RpcmVjdGlvbnNba107XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvdXIgPSB0aGF0LmdldE5laWdoYm91ck9mTm9kZUluRGlyZWN0aW9uKGlkeCwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHJlYW1UbyhkaXJlY3Rpb24sIG5laWdoYm91cik7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBhcHBseSBib3VuZGFyeSBjb25kaXRpb25zXG4gICAgICAgICAgICB0aGlzLnN0cnVjdHVyZS5mb3JFYWNoTm9kZShmdW5jdGlvbihub2RlLCBpZHgpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFwiYm91bmRhcnlcIikge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGRpcmVjdGlvbnMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkaXJlY3Rpb24gPSBrOy8vZGlyZWN0aW9uc1trXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZWlnaGJvdXIgPSB0aGF0LmdldE5laWdoYm91ck9mTm9kZUluRGlyZWN0aW9uKGlkeCwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuYXBwbHlCb3VuZGFyeShkaXJlY3Rpb24sIG5laWdoYm91cik7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcnVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuc3RydWN0dXJlLmdldERlbnNpdHkoKSk7XG4gICAgICAgICAgICB0aGlzLmNvbGxpc2lvbigpO1xuICAgICAgICAgICAgdGhpcy5zdHJlYW0oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwbGF5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLndhaXQgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53YWl0IC0tO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMud2FpdCA9IDUwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJ1bigpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5ydW5uaW5nICE9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bm5pbmctLTtcbiAgICAgICAgICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG5cbiAgICAgICAgcnVuRm9yOiBmdW5jdGlvbihpdGVyYXRpb25zKSB7XG4gICAgICAgICAgICB0aGlzLnJ1bm5pbmcgPSBpdGVyYXRpb25zO1xuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluZm86IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUudGFibGUoXG4gICAgICAgICAgICAgICAgdGhpcy5zdHJ1Y3R1cmUubm9kZXNbXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RydWN0dXJlLmRvbWFpblRvSWR4KHt4OiB4LCB5OiB5fSlcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIHZpc3VhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudmlzdWFsaXplcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc3VhbGl6ZXJzW2ldLnJlbmRlcigpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gU2ltdWxhdGlvbjtcbn0oKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiMVlpWjVTXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvbGJtLmpzXCIsXCIvXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MlxuXG4vKipcbiAqIElmIGBCdWZmZXIuX3VzZVR5cGVkQXJyYXlzYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKGNvbXBhdGlibGUgZG93biB0byBJRTYpXG4gKi9cbkJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgPSAoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgaWYgYnJvd3NlciBzdXBwb3J0cyBUeXBlZCBBcnJheXMuIFN1cHBvcnRlZCBicm93c2VycyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLFxuICAvLyBDaHJvbWUgNyssIFNhZmFyaSA1LjErLCBPcGVyYSAxMS42KywgaU9TIDQuMisuIElmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgYWRkaW5nXG4gIC8vIHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcywgdGhlbiB0aGF0J3MgdGhlIHNhbWUgYXMgbm8gYFVpbnQ4QXJyYXlgIHN1cHBvcnRcbiAgLy8gYmVjYXVzZSB3ZSBuZWVkIHRvIGJlIGFibGUgdG8gYWRkIGFsbCB0aGUgbm9kZSBCdWZmZXIgQVBJIG1ldGhvZHMuIFRoaXMgaXMgYW4gaXNzdWVcbiAgLy8gaW4gRmlyZWZveCA0LTI5LiBOb3cgZml4ZWQ6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOFxuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIDQyID09PSBhcnIuZm9vKCkgJiZcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAvLyBDaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59KSgpXG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybylcblxuICB2YXIgdHlwZSA9IHR5cGVvZiBzdWJqZWN0XG5cbiAgLy8gV29ya2Fyb3VuZDogbm9kZSdzIGJhc2U2NCBpbXBsZW1lbnRhdGlvbiBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgc3RyaW5nc1xuICAvLyB3aGlsZSBiYXNlNjQtanMgZG9lcyBub3QuXG4gIGlmIChlbmNvZGluZyA9PT0gJ2Jhc2U2NCcgJiYgdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBzdWJqZWN0ID0gc3RyaW5ndHJpbShzdWJqZWN0KVxuICAgIHdoaWxlIChzdWJqZWN0Lmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICAgIHN1YmplY3QgPSBzdWJqZWN0ICsgJz0nXG4gICAgfVxuICB9XG5cbiAgLy8gRmluZCB0aGUgbGVuZ3RoXG4gIHZhciBsZW5ndGhcbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0KVxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJylcbiAgICBsZW5ndGggPSBCdWZmZXIuYnl0ZUxlbmd0aChzdWJqZWN0LCBlbmNvZGluZylcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QubGVuZ3RoKSAvLyBhc3N1bWUgdGhhdCBvYmplY3QgaXMgYXJyYXktbGlrZVxuICBlbHNlXG4gICAgdGhyb3cgbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCBuZWVkcyB0byBiZSBhIG51bWJlciwgYXJyYXkgb3Igc3RyaW5nLicpXG5cbiAgdmFyIGJ1ZlxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIC8vIFByZWZlcnJlZDogUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICBidWYgPSBCdWZmZXIuX2F1Z21lbnQobmV3IFVpbnQ4QXJyYXkobGVuZ3RoKSlcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIFRISVMgaW5zdGFuY2Ugb2YgQnVmZmVyIChjcmVhdGVkIGJ5IGBuZXdgKVxuICAgIGJ1ZiA9IHRoaXNcbiAgICBidWYubGVuZ3RoID0gbGVuZ3RoXG4gICAgYnVmLl9pc0J1ZmZlciA9IHRydWVcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmIHR5cGVvZiBzdWJqZWN0LmJ5dGVMZW5ndGggPT09ICdudW1iZXInKSB7XG4gICAgLy8gU3BlZWQgb3B0aW1pemF0aW9uIC0tIHVzZSBzZXQgaWYgd2UncmUgY29weWluZyBmcm9tIGEgdHlwZWQgYXJyYXlcbiAgICBidWYuX3NldChzdWJqZWN0KVxuICB9IGVsc2UgaWYgKGlzQXJyYXlpc2goc3ViamVjdCkpIHtcbiAgICAvLyBUcmVhdCBhcnJheS1pc2ggb2JqZWN0cyBhcyBhIGJ5dGUgYXJyYXlcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpXG4gICAgICBlbHNlXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3RbaV1cbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBidWYud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgIUJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgIW5vWmVybykge1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgYnVmW2ldID0gMFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuLy8gU1RBVElDIE1FVEhPRFNcbi8vID09PT09PT09PT09PT09XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiAoYikge1xuICByZXR1cm4gISEoYiAhPT0gbnVsbCAmJiBiICE9PSB1bmRlZmluZWQgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gZnVuY3Rpb24gKHN0ciwgZW5jb2RpbmcpIHtcbiAgdmFyIHJldFxuICBzdHIgPSBzdHIgKyAnJ1xuICBzd2l0Y2ggKGVuY29kaW5nIHx8ICd1dGY4Jykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoIC8gMlxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSB1dGY4VG9CeXRlcyhzdHIpLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0VG9CeXRlcyhzdHIpLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gKGxpc3QsIHRvdGFsTGVuZ3RoKSB7XG4gIGFzc2VydChpc0FycmF5KGxpc3QpLCAnVXNhZ2U6IEJ1ZmZlci5jb25jYXQobGlzdCwgW3RvdGFsTGVuZ3RoXSlcXG4nICtcbiAgICAgICdsaXN0IHNob3VsZCBiZSBhbiBBcnJheS4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB0b3RhbExlbmd0aCAhPT0gJ251bWJlcicpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBCVUZGRVIgSU5TVEFOQ0UgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gX2hleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgYXNzZXJ0KHN0ckxlbiAlIDIgPT09IDAsICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYnl0ZSA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBhc3NlcnQoIWlzTmFOKGJ5dGUpLCAnSW52YWxpZCBoZXggc3RyaW5nJylcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBieXRlXG4gIH1cbiAgQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPSBpICogMlxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBfdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX2FzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX2JpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIF9hc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gX2Jhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBTdXBwb3J0IGJvdGggKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKVxuICAvLyBhbmQgdGhlIGxlZ2FjeSAoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpXG4gIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgaWYgKCFpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2UgeyAgLy8gbGVnYWN5XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoXG4gICAgbGVuZ3RoID0gc3dhcFxuICB9XG5cbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gX2hleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IF91dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0ID0gX2FzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IF9iaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gX2Jhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBfdXRmMTZsZVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgc2VsZiA9IHRoaXNcblxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcbiAgc3RhcnQgPSBOdW1iZXIoc3RhcnQpIHx8IDBcbiAgZW5kID0gKGVuZCAhPT0gdW5kZWZpbmVkKVxuICAgID8gTnVtYmVyKGVuZClcbiAgICA6IGVuZCA9IHNlbGYubGVuZ3RoXG5cbiAgLy8gRmFzdHBhdGggZW1wdHkgc3RyaW5nc1xuICBpZiAoZW5kID09PSBzdGFydClcbiAgICByZXR1cm4gJydcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gX2hleFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IF91dGY4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0ID0gX2FzY2lpU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IF9iaW5hcnlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gX2Jhc2U2NFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBfdXRmMTZsZVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKHRhcmdldCwgdGFyZ2V0X3N0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzXG5cbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKCF0YXJnZXRfc3RhcnQpIHRhcmdldF9zdGFydCA9IDBcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCBzb3VyY2UubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdzb3VyY2VFbmQgPCBzb3VyY2VTdGFydCcpXG4gIGFzc2VydCh0YXJnZXRfc3RhcnQgPj0gMCAmJiB0YXJnZXRfc3RhcnQgPCB0YXJnZXQubGVuZ3RoLFxuICAgICAgJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KGVuZCA+PSAwICYmIGVuZCA8PSBzb3VyY2UubGVuZ3RoLCAnc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aClcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCA8IGVuZCAtIHN0YXJ0KVxuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgKyBzdGFydFxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmIChsZW4gPCAxMDAgfHwgIUJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRfc3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cbn1cblxuZnVuY3Rpb24gX2Jhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiBfdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIF9hc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKylcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gX2JpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIF9hc2NpaVNsaWNlKGJ1Ziwgc3RhcnQsIGVuZClcbn1cblxuZnVuY3Rpb24gX2hleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gX3V0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSsxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSBjbGFtcChzdGFydCwgbGVuLCAwKVxuICBlbmQgPSBjbGFtcChlbmQsIGxlbiwgbGVuKVxuXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgdmFyIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgICByZXR1cm4gbmV3QnVmXG4gIH1cbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLmdldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMucmVhZFVJbnQ4KG9mZnNldClcbn1cblxuLy8gYHNldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHYsIG9mZnNldCkge1xuICBjb25zb2xlLmxvZygnLnNldCgpIGlzIGRlcHJlY2F0ZWQuIEFjY2VzcyB1c2luZyBhcnJheSBpbmRleGVzIGluc3RlYWQuJylcbiAgcmV0dXJuIHRoaXMud3JpdGVVSW50OCh2LCBvZmZzZXQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgdmFsID0gYnVmW29mZnNldF1cbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICB9IGVsc2Uge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV1cbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZFVJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDJdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgICB2YWwgfD0gYnVmW29mZnNldF1cbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCA9IHZhbCArIChidWZbb2Zmc2V0ICsgM10gPDwgMjQgPj4+IDApXG4gIH0gZWxzZSB7XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMV0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMl0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAzXVxuICAgIHZhbCA9IHZhbCArIChidWZbb2Zmc2V0XSA8PCAyNCA+Pj4gMClcbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkVUludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICB2YXIgbmVnID0gdGhpc1tvZmZzZXRdICYgMHg4MFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQxNihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gX3JlYWRVSW50MzIoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgdmFyIG5lZyA9IHZhbCAmIDB4ODAwMDAwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZmZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRmxvYXQgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgcmV0dXJuIGllZWU3NTQucmVhZChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWREb3VibGUgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgcmV0dXJuIGllZWU3NTQucmVhZChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWREb3VibGUodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWREb3VibGUodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aCkgcmV0dXJuXG5cbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbn1cblxuZnVuY3Rpb24gX3dyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAgICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZmZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2YsIC0weDgwKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICB0aGlzLndyaXRlVUludDgodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICB0aGlzLndyaXRlVUludDgoMHhmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmLCAtMHg4MDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQxNihidWYsIDB4ZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIF93cml0ZVVJbnQzMihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICBfd3JpdGVVSW50MzIoYnVmLCAweGZmZmZmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXZhbHVlKSB2YWx1ZSA9IDBcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kKSBlbmQgPSB0aGlzLmxlbmd0aFxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5jaGFyQ29kZUF0KDApXG4gIH1cblxuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiAhaXNOYU4odmFsdWUpLCAndmFsdWUgaXMgbm90IGEgbnVtYmVyJylcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgdGhpcy5sZW5ndGgsICdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KGVuZCA+PSAwICYmIGVuZCA8PSB0aGlzLmxlbmd0aCwgJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHRoaXNbaV0gPSB2YWx1ZVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG91dCA9IFtdXG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgb3V0W2ldID0gdG9IZXgodGhpc1tpXSlcbiAgICBpZiAoaSA9PT0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUykge1xuICAgICAgb3V0W2kgKyAxXSA9ICcuLi4nXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIG91dC5qb2luKCcgJykgKyAnPidcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGBBcnJheUJ1ZmZlcmAgd2l0aCB0aGUgKmNvcGllZCogbWVtb3J5IG9mIHRoZSBidWZmZXIgaW5zdGFuY2UuXG4gKiBBZGRlZCBpbiBOb2RlIDAuMTIuIE9ubHkgYXZhaWxhYmxlIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBBcnJheUJ1ZmZlci5cbiAqL1xuQnVmZmVyLnByb3RvdHlwZS50b0FycmF5QnVmZmVyID0gZnVuY3Rpb24gKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpXG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgZ2V0L3NldCBtZXRob2RzIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX2dldCA9IGFyci5nZXRcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIG5vZGUgMC4xMytcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxuLy8gc2xpY2Uoc3RhcnQsIGVuZClcbmZ1bmN0aW9uIGNsYW1wIChpbmRleCwgbGVuLCBkZWZhdWx0VmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicpIHJldHVybiBkZWZhdWx0VmFsdWVcbiAgaW5kZXggPSB+fmluZGV4OyAgLy8gQ29lcmNlIHRvIGludGVnZXIuXG4gIGlmIChpbmRleCA+PSBsZW4pIHJldHVybiBsZW5cbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleFxuICBpbmRleCArPSBsZW5cbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleFxuICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBjb2VyY2UgKGxlbmd0aCkge1xuICAvLyBDb2VyY2UgbGVuZ3RoIHRvIGEgbnVtYmVyIChwb3NzaWJseSBOYU4pLCByb3VuZCB1cFxuICAvLyBpbiBjYXNlIGl0J3MgZnJhY3Rpb25hbCAoZS5nLiAxMjMuNDU2KSB0aGVuIGRvIGFcbiAgLy8gZG91YmxlIG5lZ2F0ZSB0byBjb2VyY2UgYSBOYU4gdG8gMC4gRWFzeSwgcmlnaHQ/XG4gIGxlbmd0aCA9IH5+TWF0aC5jZWlsKCtsZW5ndGgpXG4gIHJldHVybiBsZW5ndGggPCAwID8gMCA6IGxlbmd0aFxufVxuXG5mdW5jdGlvbiBpc0FycmF5IChzdWJqZWN0KSB7XG4gIHJldHVybiAoQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ViamVjdCkgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgfSkoc3ViamVjdClcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYiA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaWYgKGIgPD0gMHg3RilcbiAgICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHN0YXJ0ID0gaVxuICAgICAgaWYgKGIgPj0gMHhEODAwICYmIGIgPD0gMHhERkZGKSBpKytcbiAgICAgIHZhciBoID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0ci5zbGljZShzdGFydCwgaSsxKSkuc3Vic3RyKDEpLnNwbGl0KCclJylcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgaC5sZW5ndGg7IGorKylcbiAgICAgICAgYnl0ZUFycmF5LnB1c2gocGFyc2VJbnQoaFtqXSwgMTYpKVxuICAgIH1cbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShzdHIpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgcG9zXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuXG4vKlxuICogV2UgaGF2ZSB0byBtYWtlIHN1cmUgdGhhdCB0aGUgdmFsdWUgaXMgYSB2YWxpZCBpbnRlZ2VyLiBUaGlzIG1lYW5zIHRoYXQgaXRcbiAqIGlzIG5vbi1uZWdhdGl2ZS4gSXQgaGFzIG5vIGZyYWN0aW9uYWwgY29tcG9uZW50IGFuZCB0aGF0IGl0IGRvZXMgbm90XG4gKiBleGNlZWQgdGhlIG1heGltdW0gYWxsb3dlZCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gdmVyaWZ1aW50ICh2YWx1ZSwgbWF4KSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA+PSAwLCAnc3BlY2lmaWVkIGEgbmVnYXRpdmUgdmFsdWUgZm9yIHdyaXRpbmcgYW4gdW5zaWduZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgaXMgbGFyZ2VyIHRoYW4gbWF4aW11bSB2YWx1ZSBmb3IgdHlwZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmc2ludCAodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmSUVFRTc1NCAodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG59XG5cbmZ1bmN0aW9uIGFzc2VydCAodGVzdCwgbWVzc2FnZSkge1xuICBpZiAoIXRlc3QpIHRocm93IG5ldyBFcnJvcihtZXNzYWdlIHx8ICdGYWlsZWQgYXNzZXJ0aW9uJylcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanNcIixcIi8uLi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXJcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG52YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSClcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRleHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXlcblx0ZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NFxufSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyAodGhpcy5iYXNlNjRqcyA9IHt9KSA6IGV4cG9ydHMpKVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIjFZaVo1U1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWJcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5leHBvcnRzLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDAsXG4gICAgICBkID0gaXNMRSA/IC0xIDogMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGMsXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApLFxuICAgICAgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpLFxuICAgICAgZCA9IGlzTEUgPyAxIDogLTEsXG4gICAgICBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwO1xuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpO1xuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwO1xuICAgIGUgPSBlTWF4O1xuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKTtcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS07XG4gICAgICBjICo9IDI7XG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcyk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrO1xuICAgICAgYyAvPSAyO1xuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDA7XG4gICAgICBlID0gZU1heDtcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gZSArIGVCaWFzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gMDtcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KTtcblxuICBlID0gKGUgPDwgbUxlbikgfCBtO1xuICBlTGVuICs9IG1MZW47XG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCk7XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4O1xufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanNcIixcIi8uLi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTRcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIxWWlaNVNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanNcIixcIi8uLi9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzXCIpIl19
