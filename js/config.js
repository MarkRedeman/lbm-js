module.exports = function () {

    var Config = function() {
        console.log('Creating config')
        this.config = {
            // 'domain': './Config/2DDamBreakDomain',
            'domain': './Config/2DZouHeDomain',
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
            'Re': 1000,
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