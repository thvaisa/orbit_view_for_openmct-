var benv = require('benv');
describe('calc module', function () {
  beforeEach(function setupEnvironment(done) {
    benv.setup(function () {
      benv.expose({
        angular: benv.require('../node_modules/angular/angular.js', 'angular')
      });
      done();
    });
  });
  // more stuff will go here
  afterEach(function destroySyntheticBrowser() {
    benv.teardown(true);
  });
});


var orbitViewer = require('../build/orbitViewer');
var assert = require('assert');
var baseConfig = require("../config.json");
var testConfig = require("./testConfig.json");
//var mockOpenMCT = require("./mockopenmct.js");

var mockOpenMCT = require("../dist/openmct.js");



var plugin = null;

beforeEach(function () {
    plugin = new mockOpenMCT.OpenMCT();
});


describe('Install', function () {
  describe('#install()', function () {
    it('Test configurations', function () {
        let installer = orbitViewer.OrbitViewerPlugin();
        installer(plugin);
        console.log(plugin.objectViews, plugin.domainObject);
        plugin.objectViews.view(plugin.domainObject);
    });
  });
});
