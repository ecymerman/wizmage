var sass = require('node-sass'), fs=require('fs');
var result = sass.renderSync({ file: 'scss.scss', outputStyle: 'compact' });
fs.writeFileSync('css.css', result.css);