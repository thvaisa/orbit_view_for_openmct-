/*
 * Simple static webserver to host Open MCT (localhost:8080 or port described in 
 * process.env.PORT (for heroku))
 */

var express = require('express');
var app = express();
const basicAuth = require('express-basic-auth')

//simple authentication for testing environment
app.use(basicAuth({
    users: { 'xxx': 'xxx' },
    challenge: true
}))

app.use('/', express.static(__dirname + '/'));

var port = process.env.PORT || 8080

app.listen(port, function () {
    console.log('Open MCT hosted at http://localhost:' + port);
});
