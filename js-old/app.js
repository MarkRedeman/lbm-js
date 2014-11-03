var config = require('./config');

var Grid = require('./Grid');
var Simulation = require('./Simulation');


// Start of simulation
var sim = new Simulation(Grid, config);

window.sim = sim;


/*
var Particle = function(x, y, vx, vy) {
    this.x = x;
    this.y = y;

    this.vx = vx;
    this.vy = vy;

    this.follow = false;
    this.trail = [];
};

Particle.prototype.update = function(bounds) {
    this.x = (this.x + this.vx) % bounds.x;
    if (this.x < 0) {
        this.x += bounds.x
    }

    this.y = (this.y + this.vy) % bounds.y;
    if (this.y < 0) {
        this.y += bounds.y
    }

    if (this.follow) {
        this.trail[this.trail.length] = { x: this.x, y: this.y };
        // Remove the tail if the trail becomes to long
        if (this.trail.length > 400) {
            this.trail.splice(0, 1);
        }
    }
};

Particle.prototype.normalizedVelocity = function() {
    v = Math.sqrt(this.vx * this.vx + this.vy * this.vy) / 3;
    return { x: this.vx / v, y: this.vy / v };
}

Particle.prototype.draw = function(ctx) {
    var radius = 10;
    v = this.normalizedVelocity();
    // draw velocity
    ctx.save();
    ctx.lineWidth = radius * 2 / 5;
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius * v.x, radius * v.y);
    ctx.stroke();
    // Draw the arrow
    ctx.translate(radius * v.x, radius * v.y);
    ctx.rotate(Math.atan2(v.y , v.x )-1.25*Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, radius);
    ctx.lineTo(radius, 0);
    ctx.fill();
    ctx.restore();

    // draw particle
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = '#e65b47';
    if (this.follow) {
        ctx.strokeStyle = ctx.fillStyle = '#486a96';
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    if (this.follow && this.trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle = '#486a96';
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.moveTo(this.trail[0].x, this.trail[0].y);

        for (var i = 1; i < this.trail.length; i++) {
            trail = this.trail[i];
            if (Math.abs(trail.x - this.trail[i - 1].x) > 320 ||
                Math.abs(trail.y - this.trail[i - 1].y) > 240) {
                ctx.stroke();
                ctx.beginPath();
            }
            ctx.lineTo(trail.x, trail.y);

        };
        ctx.stroke();
        ctx.restore();
    }
};



var Grid = function(n, m, width, height, shiftX, shiftY) {
    this.cells = [];

    this.n = n;
    this.m = m;
    this.width = width;
    this.height = height;

    // Shift for Galilean invariance
    this.shiftX = shiftX;
    this.shiftY = shiftY;

    var cellWidth = this.width / n;
    var cellHeight = this.height / m;

    for (var i = 0; i < this.n + 1; i++) {
        this.cells[i] = [];

        for (var j = 0; j < this.m + 1; j++) {
            this.cells[i][j] = new GridCell(i * cellWidth, j * cellHeight, cellWidth, cellHeight);

            // if (i == Math.floor(n /2)) {
            //     this.cells[i][j].wall = true;
            // }
            // if (i == Math.floor(n /2) + 1) {
            //     this.cells[i][j].wall = true;
            // }
            // if (i == Math.floor(n /2) - 1) {
            //     this.cells[i][j].wall = true;
            // }
        };
    };

    // var n = Math.floor(n / 2);
    // var m = Math.floor(m / 2)
    // this.cells[n + 2][m].wall = true;
    // this.cells[n + 2][m - 1].wall = true;

    // this.cells[n - 1][m].wall = true;
    // this.cells[n - 2][m].wall = true;

    // this.cells[n + 1][m].wall = true;
    // this.cells[n + 2][m].wall = true;
    // this.cells[n - 1][m - 1].wall = true;

    // this.cells[n - 2][m - 1].wall = true;

    // this.cells[n - 3][m].wall = true;
    // this.cells[n - 3][m - 1].wall = true;

    // this.cells[n - 4][m].wall = true;
    // // this.cells[n - 4][m - 1].wall = true;

    // this.cells[n - 5][m].wall = true;
    // this.cells[n - 5][m - 1].wall = true;


    // this.cells[n - 6][m].wall = true;
    // // this.cells[n - 6][m - 1].wall = true;

    // this.cells[n - 7][m].wall = true;
    // // this.cells[n - 7][m - 1].wall = true;

    // this.cells[n - 8][m].wall = true;
    // // this.cells[n - 8][m - 1].wall = true;

    // this.cells[n + 1][m].wall = true;
    // this.cells[n + 1][m - 1].wall = true;
};

Grid.prototype.findCell = function(x, y) {
    x = x + this.shiftX;
    y = y + this.shiftY;

    x = Math.floor(x * this.n / this.width)
    y = Math.floor(y * this.m / this.height)

    return this.cells[x][y]
};

Grid.prototype.reset = function() {
    this.emptyCells();

    // this.shiftX = Math.random() * (this.width / this.n);
    // this.shiftY = Math.random() * (this.height / this.m);
}

Grid.prototype.emptyCells = function() {
    for (var i = 0; i < this.n + 1; i++) {
        for (var j = 0; j < this.m + 1; j++) {
            this.cells[i][j].reset();
        };
    };
}

Grid.prototype.applyCollisions = function(alpha) {
    for (var i = 0; i < this.n + 1; i++) {
        for (var j = 0; j < this.m + 1; j++) {
            this.cells[i][j].applyCollisions(alpha);
        };
    };
}

Grid.prototype.draw = function(context) {
    cellWidth = this.width / this.n;
    cellHeight = this.height / this.m;

    for (var i = 0; i < this.n + 1; i++) {
        for (var j = 0; j < this.m + 1; j++) {
            cell = this.cells[i][j];

            var follow = false;
            // for (var k = cell.particles.length - 1; k >= 0; k--) {
            //     if (cell.particles[k].follow) { follow = true; break; }
            // };

            context.beginPath();
            context.rect(cell.x - this.shiftX, cell.y - this.shiftY, cellWidth, cellHeight);
            context.lineWidth = 1;
            if (cell.wall)
            {
                context.fillStyle = '#332';
                context.fill();
            }
            if (follow) {
                context.fillStyle = 'orange';
                context.fill();
            }
            context.strokeStyle = '#aaa';
            context.stroke();

        };
    };


    // rainbow = new Rainbow();
    // rainbow.setSpectrum('#ffffff', '#3E296B');
    // rainbow.setNumberRange(1, 20);
    // color = Math.floor(20 * (cell.particles.length + 1) / (maxParticlesInCell + 1))
    // color = rainbow.colourAt(color);

    // rect = new Kinetic.Rect({
    //     x: cell.position.x * grid.cellWidth * @widthRatio,
    //     y: cell.position.y * grid.cellHeight * @heightRatio,
    //     width: grid.cellWidth * @widthRatio,
    //     height: grid.cellHeight * @heightRatio,
    //     fill: color,
    //     stroke: 'black',
    //     strokeWidth: 1
    // });

}

GridCell = function(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.reset();
    this.wall = false;
}

GridCell.prototype.reset = function() {
    this.particles = [];
    this.tvx = 0;
    this.tvy = 0;
}

GridCell.prototype.addParticle = function(particle) {
    this.particles[this.particles.length] = particle;
    this.tvx += particle.vx;
    this.tvy += particle.vy;
}

GridCell.prototype.averageVelocity = function() {
    n = this.particles.length;
    if (n > 0) {
        return {
            x: this.tvx / n,
            y: this.tvy / n
        }
    }
    return { x: 0, y: 0 };
}

GridCell.prototype.applyCollisions = function(alpha) {
    if (this.particles.length == 0) { return; }
    if (this.wall === true) {
        mx = this.x + this.width / 2;
        my = this.y + this.height / 2;
        for (var i = this.particles.length - 1; i >= 0; i--) {
            vx = this.particles[i].vx;
            vy = this.particles[i].vy;

            dx = mx - vx;
            dy = my - vy;

            if (dx > 0) {
                this.particles[i].vx *= -1;
            }
            if (dy > 0) {
                this.particles[i].vy *= -1;
            }
        };
    } else {
        v = this.averageVelocity();
        avx = v.x;
        avy = v.y;

        if (Math.random() < 0.5) {
            alpha = - alpha;
        }

        for (var i = this.particles.length - 1; i >= 0; i--) {
            particle = this.particles[i];
            vx = particle.vx;
            vy = particle.vy;
            particle.vx = avx + Math.cos(alpha) * (vx - avx) + Math.sin(alpha) * (vy - avy);
            particle.vy = avy - Math.sin(alpha) * (vy - avy) + Math.cos(alpha) * (vx - avx);
        };
    }

}

// })();


// Button thing
var step = 0;
var sim;
function next() {
    var stop = document.getElementsByClassName('btn-stop');
    var play = document.getElementsByClassName('btn-play');
    console.log(step);
    switch(step) {
        case 0:
            sim = new Simulation(15);
            play[0].innerHTML = 'Streaming step';
            break;
        case 1:
        // Streaming step
            sim.play(0);
            play[0].innerHTML = 'Create grid';
            break;
        case 2:
        // Collision step
            sim.shouldDrawGrid = true;
            sim.draw();
            play[0].innerHTML = 'Collide';
            break;
        case 3:
        // Collision step
            sim.shouldDrawGrid = true;
            sim.playsteps = 1;
            sim.streamSteps = 0;
            sim.update()
            play[0].innerHTML = 'Play simulation';
            break;
        case 4:
        // Full step
            // sim.playsteps = 20;
            // sim.streamSteps = 60;
            sim.play(-1);
            play[0].innerHTML = 'Add more particles';
            break;
            // sim.update()
        default:
            sim.createParticles(100);
            // sim.particles = sim.particles.splice(0, 1);
            // sim.particles[0].vx = 0.5;
            // sim.particles[0].vy = 0.5;
            sim.play(-1);
            break;
    }
    step++;
}

function stop() {
    var stop = document.getElementsByClassName('btn-stop');
    var play = document.getElementsByClassName('btn-play');
    play[0].innerHTML = 'Start simulation';
}
*/