var gulp = require('gulp');
var browserify = require('gulp-browserify');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

// Run browserify
gulp.task('browserify', function() {
    gulp.src(['./js/app.js'])
        .pipe(browserify({
          insertGlobals : true,
          debug : true // Compile with sourcemaps
        }))
        .pipe(gulp.dest('./js/dist/'))
});

gulp.task('compress', function() {
    gulp.src('./js/dist/app.js')
    .pipe(uglify())
    .pipe(rename('./js/dist/app.min.js'))
    .pipe(gulp.dest('./'));
});

// Default Task
gulp.task('default', ['browserify']);

// Watcher Task
gulp.task('watch', function() {
    gulp.watch(['./js/**/*.js'],['browserify']);
});