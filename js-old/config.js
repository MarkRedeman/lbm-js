module.exports = function () {

    var Config = function() {
        console.log('Creating config')
        this.config = {
            'domain':
                "--------------------------\
                -                        -\
                -                        -\
                --------------------------"
            ,
            'velocity-set': [
                {x: 0,      y: 0,   w: 4 / 9},

                {x: 0,      y: 1,   w: 1 / 9},
                {x: 0,      y: -1,  w: 1 / 9},
                {x: - 1,    y: 0,   w: 1 / 9},
                {x: 1,      y: 0,   w: 1 / 9},

                {x: 1,      y: 1,   w: 1 / 36},
                {x: - 1,    y: -1,  w: 1 / 36},
                {x: 1,      y: -1,  w: 1 / 36},
                {x: - 1,    y: 1,   w: 1 / 36},

            ],
            // This array gives the index of the opposite velocity set corresponding to the index given.
            // This will be useful when implementing bounce back boundary conditions
            'opposite-velocity-set': [1, 3, 2, 5, 4, 7, 6, 9, 8],
            'speed-of-sound-squared': 1 / 3,
            'relaxation-time': 0.5120,
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