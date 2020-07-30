const L = require('leaflet');
const orbits = require('./orbitSolver.js');
const DataDisplay    = require('./dataDisplay.js');
const AOSDataDisplay = require('./aosDataDisplay.js');
const LineDrawer     = require('./lineDrawer.js');
const MarkerDrawer   = require('./markerDrawer.js');

//This is where the magic view is created.
//You might ask why so many parameters; I'll Tell
//domainObject:		Class that contains all the required data.
//config:					default+overridden parameters
//getTime:				Function that let us access OpenMCT's time
//TLEUpdateLoop:	Function that will be called every hour to get new TLE's from the server
//document:				To create Dom objects
//openmct:				We just need to be able to add and remove EventListeners to "bounds"
//Feel free to find a way to remove dependencies: Especially requirement for openmct, would be nice
function MapView(domainObject, config,  getTime, TLEUpdateLoop, document, openmct) {

		if(!validURL(config.map.mapTiles)){
				console.error("map.mapTiles problem");
				return;
		}

		//temporary store url to domainObject whcih can be access by the request function
		//Why? Because we wanted to have feature that multiple OrbitViews are
		//possible with different TLE server. Makes sense, maybe not
		domainObject.url = config.url;

		//store local config for easier use
		domainObject.trackedObjects = [];

		//Create list of trackableObjects
		Object.entries(domainObject.trackables).forEach((values, i) => {
				//Check whether we are even interested of any of these
				if(!values[1]) return;
				if(!(Object.keys(config.trackables).includes(values[0]))){
						console.error("config.json lacks definition of the trackable",values[0]);
				}else{
						domainObject.trackedObjects.push(new orbits.Trackable(values[0],
																													config.trackables[values[0]]));
				}
		});

		//We store the input parameters for further use
		this.domainObject = domainObject;
		this.getTime = getTime;
		this.document = document;
		this.config = config;
		this.openmct = openmct;

		//Loop that updates TLE's remember to destry loops when not needed
		TLEUpdateLoop();
		this.TLEUpdateLoopID = setInterval(
														TLEUpdateLoop,
														config.timings.TLEUpdateInterval)

		//Store how of then markers are updated and what was the last
		//time markers were updated (lastTick)
		this.tmpData = {};
		this.tmpData.updateInterval = config.timings.updateInterval;
		this.tmpData.lastTick = this.getTime();

		//Store observer(ground station) data
		this.observer = new orbits.Observer(this.config.groundStation);

		this.cached_timeouts = [];
}

//What is shown
//CSS could be separated
MapView.prototype.show = function(container) {
			this.myContainer = document.createElement("div");
			this.myContainer.style.cssText = "display: flex; width: 100%; height: 100%; flex-wrap: wrap; overflow-y: scroll;";
			container.appendChild(this.myContainer);

			// Create a new div element inside the OpenMCT container for the map
			this.leftPanel = document.createElement("div");
			//this.leftPanel.className += " inline-block-child";
			this.leftPanel.style.cssText = "width: 60%; height: 0; padding-bottom: 60%; margin: 10px 10px;" ;

			this.rightPanel = document.createElement("div");
			//this.rightPanel.className += " inline-block-child";
			this.rightPanel.style.cssText = "width: 35%; margin: 10px 10px; border: 10px; display: flex; flex-direction: column;";

			//Left and right panel
			this.myContainer.appendChild(this.leftPanel);
			this.myContainer.appendChild(this.rightPanel);

			//put map to the left panel
			this.elemMapView = this.leftPanel;

			//Display passes
			this.AOSdisplayPanel = document.createElement("div");
			this.AOSdisplayPanel.style.cssText = "width: 100%; margin-bottom: 10px; ";

			//Display current information
			this.dataDisplayPanel = document.createElement("div");
			this.dataDisplayPanel.style.cssText = "width: 100%;   border-top: 40px";

			this.rightPanel.appendChild(this.AOSdisplayPanel);
			this.rightPanel.appendChild(this.dataDisplayPanel);

			this.dataDisplay = new DataDisplay(this.domainObject.trackedObjects,
																				this.document, this.dataDisplayPanel);
			this.AOSdisplay = new AOSDataDisplay(this.domainObject.trackedObjects,
																				this.observer, this.document,
																				this.AOSdisplayPanel);

			//Create map and
			this.map = new L.Map(this.elemMapView, {
					attributionControl : false,
					center : [0, 0],			//Center map to [0, 0]
					zoomSnap : 0.0				//Fractional zoom is disabled by default.
			});


			var style = document.createElement('style');

			//Set some bling bling style to the map, Feel free to make better. z-index
			//was important because otherwise the drawing order with openmct is wrong
		  style.innerHTML = '.leaflet-pane {  z-index: 40;} \
												.leaflet-container { background: #AAAA;} \
													.class-tooltip {background: #FFFF; color: #F134}';
		  document.head.appendChild(style);


			//Max bounds for the map
			this.map.setMaxBounds(  [[-90,-180],   [90,180]]  );
			this.map.fitBounds( [[-90,-180],   [90,180]] );


			//Let's create markers and bind them on the map
			this.markerDrawer = new MarkerDrawer(this.domainObject.trackedObjects, this.config);
  		this.markerDrawer.getDrawableObjects().map(function(obj){obj.addTo(this.map)}.bind(this));
		  //Draw ground station
			MarkerDrawer.createGroundStation(this.config).addTo(this.map);

			//Let's make orbit drawers
			this.lineDrawer = new LineDrawer(this.domainObject.trackedObjects, this.map);


			//store are listeners so can they can removed when the view goes out of scope
			this.funcRegistry = [];
			this.funcRegistry.push(this.markerDrawer.updateMe.bind(this.markerDrawer));
			this.funcRegistry.push(this.lineDrawer.updateMe.bind(this.lineDrawer));
			this.funcRegistry.push(this.dataDisplay.updateMe.bind(this.dataDisplay));
			this.funcRegistry.push(this.AOSdisplay.updateMe.bind(this.AOSdisplay));

			this.funcRegistry.map(function(func){
					this.elemMapView.addEventListener("updateAll", func);
			}.bind(this));





			// Add map tiling service
			L.tileLayer(this.config.map.mapTiles, {
			    attribution: "&copy; "+  this.config.map.attribution + " contributors",
			    maxZoom: 5,
					minZoom: 0.5,
			    tileSize: 512,
			    zoomOffset: -1,
					backgroundColor: "#AAAA",
			    noWrap: true
			}).addTo(this.map);

			//Attribution to the leaflet and map tile provider
			L.control.attribution({
				  position: 'topright'
			}).addTo(this.map);

			//var paneClass = document.getElementsByClassName('leaflet-pane');
			//paneClass.zIndex = "40"; //Important z-indexin (draw order).

			//resize map properly
			this.cached_timeouts.push(setTimeout(function(){ this.map.invalidateSize()}.bind(this), 1000));
			//setInterval(function(){ this.map.invalidateSize()}.bind(this), 1000);

			//Update map when screen is resized.
			//Kind of hacky, but works okay
			function resizeMap(map) {
					map.invalidateSize();
					let bounds = L.latLngBounds([[90, 180],[-90, -180]]);
					let wantedZoom = map.getBoundsZoom(bounds, true);
					let center = bounds.getCenter();
					map.setView(center, wantedZoom);
					map.fitBounds(bounds, true);
			}

			resizeMap(this.map);
			this.resizeMap = resizeMap.bind(null, this.map);
			window.onresize = this.resizeMap;

			this.updateLoop = updateFunction.bind(null,this.domainObject,
																					this.map, this.getTime, this.tmpData,
																					this.elemMapView, this.observer);
			this.openmct.time.on('bounds', this.updateLoop);

};






function updateFunction(domainObject,	map, getTime, tmpData, elem, observer, redraw= true){

		let sendUpdateMessage = true;
		let timestamp = getTime();

		//Check time between lastTick
		if(Math.abs(timestamp-tmpData.lastTick)<tmpData.updateInterval){
				return;
		}
		tmpData.lastTick = timestamp;


		//Check that each trackedObject has TLE
		domainObject.trackedObjects.forEach(function(obj){
				let values = obj.getPositionAndCoverage(timestamp, observer);
				if(values == null){
						sendUpdateMessage = false;
				}
		});

		//Allow update if every trackedobject has TLE
		if(sendUpdateMessage){
				var event = new CustomEvent('updateAll', {detail : {
																											timestamp : timestamp,
																											redraw : redraw}});
				elem.dispatchEvent(event);
		}else{
				console.warn("TLE data not set, trying again soon");
		}

};



MapView.prototype.destroy = function() {

			this.cached_timeouts.map(function(func){
					clearTimeout(func);
				});


		this.openmct.time.off('bounds', this.updateMarks);

		this.funcRegistry.map(function(func){
				this.elemMapView.removeEventListener("updateAll", func);
		}.bind(this));

		clearInterval(this.updateLoop);
		clearInterval(this.TLEUpdateLoopID);

		window.removeEventListener('resize', this.resizeMap);

		this.elemMapView.parentNode.removeChild(this.elemMapView);
		this.myContainer.parentNode.removeChild(this.myContainer);
		this.myContainer = null;
		this.elemMapView = null;
		this.map.remove();
};



//This function is here, because did not feel need to create own place
//for just one function. If more auxiliary function will pop up
function validURL(string) {
    try{
        new URL(string);
    }catch(err){
        console.error("Invalid url: ",err.message);
        return false;
    }
    return true;
}


module.exports = {MapView : MapView, validURL : validURL};
