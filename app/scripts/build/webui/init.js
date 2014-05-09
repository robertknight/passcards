var $ = require('jquery');
var app = require('./app');

$(document).ready(function () {
    var location = document.location.href;
    if (location.indexOf('http:') == 0 && location.indexOf('http://localhost') == -1) {
        document.location.href = location.replace('http:', 'https:');
        return;
    }
    new app.App();
});
//# sourceMappingURL=init.js.map
