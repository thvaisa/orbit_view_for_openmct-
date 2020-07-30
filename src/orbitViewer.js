module.exports = {OrbitViewerPlugin : OrbitViewerPlugin};

const defaultConfig = require('./config.json');


const MapView = require('./leafletMapView.js');
const WebsocketWrapper = require("./websocketWrapper.js")

//Display maps in OpenMCT framework
//By default, reads inputs from config.js and uses simple websocket
//wrapper
function OrbitViewerPlugin(options = {}, wsWrapperIn = new WebsocketWrapper()) {

    const config = Object.assign({}, defaultConfig, options);
    const wsWrapper = wsWrapperIn;

    //Initialization
    const telemetryType = "orbitViewer.map";

    //OpenMCT installation part starts here
    return function install (openmct) {

        //Add provider for the data
        //TODO: Maybe put the functionality somewhere else?
        //Then websocket would also need to be somewhere else
        openmct.telemetry.addProvider({
            request: function(domainObject, options) {
                console.log("request");
                //id is assigned by the socketHandler
                var message = {
                    "exchange" : "tracking",
                    "method" : "request",
                    "params" : domainObject.trackables
                }

                return wsWrapper.sendMessage(domainObject.url, message).then(msg => {
                    let trackables = msg.result.trackables;
                    trackables.forEach(function(trackable){
                        domainObject.trackedObjects.forEach(obj => {
                            if(trackable.name == obj.name){
                                obj.storeTle( trackable.name,
                                              trackable.tle1,
                                              trackable.tle2);
                            };
                        });
                    });
                })
            },
            //We tell openmct that we support request
            //Maybe not needed in our implmentation
            supportsRequest: function (domainObject, options) {
                return domainObject.type === telemetryType;;
            },
            //Tell openmct that subscription are supported
            supportsSubscribe: function (domainObject, callback, options) {
                return false;
            },
            //you should get the point. No Metadata
            supportsMetadata: function (domainObject, options) {
                return false;
            },
            //No limits for openmct
            supportsLimits: function(domainObject) {
                return false;
            },
        });


        //with form we are able to create persistent data
        //to the domainObject into which we can store which Satellites
        //are tracked
        openmct.types.addType(telemetryType, {
            creatable: true,
            name: "OrbitViewer",
            description: "View orbits",

            form: Object.keys(config.trackables).map(function(trackable) {
                    return {
                        "key": trackable,
                        "name": trackable,
                        "control": "checkbox",
                        property: [
                            "trackables",
                            trackable
                        ]
                    }
                })
        });



        //Here we create the view, make some functions the view can use
    	openmct.objectViews.addProvider({
            name: 'OSM Map',
            key: 'tracking',
            cssClass: 'icon-clock',
            canView: function (domainObject) {
            	 return domainObject.type === telemetryType;
            },
            view: function (domainObject) {
                //check valid url and connect
                if(!MapView.validURL(config.url)) return;
                wsWrapper.connect(config.url);

                //Define how view can access openmct's clock
                let getTime = function(current=false){
                    return openmct.time.boundsVal.end;
                }

                //Set update loop for trackables
                let TLEUpdateLoop = function(domainObject){
                		return openmct.telemetry.request(domainObject);
              	}.bind(null, domainObject);

            	  return new MapView.MapView(domainObject, config, getTime,
                                            TLEUpdateLoop, document, openmct);
            }
    		});
    }
}
