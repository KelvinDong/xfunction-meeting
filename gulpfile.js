const { src, dest ,series } = require('gulp');
const clean = require('gulp-clean');
const uglify = require('gulp-uglify');
const cssmin = require('gulp-cssmin');
const rev = require('gulp-rev');
const revCollector = require('gulp-rev-collector');
const htmlmin = require('gulp-htmlmin');

function cleanDist(){
    return src('dist/*')
    .pipe(clean());
}

function moveThirdJs(){
    return src('js/third/*')
    .pipe(dest('dist/js/third/'));
}

function moveImages(){
    return src('images/*')
    .pipe(dest('dist/images/'));
}

function miniJs(){
    return src('js/*.js')
    .pipe(uglify())
    .pipe(rev())
    .pipe(dest('dist/js/'))
    .pipe(rev.manifest())
    .pipe(dest('rev/js/'))

}

function miniStyle(){
    return src('*.css')
    .pipe(cssmin())
    .pipe(rev())
    .pipe(dest('dist/'))
    .pipe(rev.manifest())
    .pipe(dest('rev/css/'))
}

function miniHtml(){
    return src(['*.html','rev/**/*.json'])
    .pipe(revCollector())
    .pipe(htmlmin({ collapseWhitespace: true,
        removeComments: true,
        minifyJs:true
    }))
    .pipe(dest('dist/'))
}
  
exports.default = series(cleanDist,moveThirdJs,moveImages,miniJs,miniStyle,miniHtml);    