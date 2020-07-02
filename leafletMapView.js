const L = require('leaflet');
const moment = require('moment');
const orbits = require('./orbitSolver.js');
//const proj4leaflet = require("proj4leaflet");


class MarkerDrawer{
		constructor(trackedObjects){
				this.trackedObjects = trackedObjects;
				this.markers = {};
				trackedObjects.map(function(obj){

						let icon = L.icon({
								iconUrl:      obj.config.icon,
								iconSize:     [32, 32],
								shadowSize:   [32, 32],
								iconAnchor:   [16, 16],
								shadowAnchor: [0, 0],
								popupAnchor: [0, -30],
								tooltipAnchor: [ 0, 15 ]
						});

						this.markers[obj.name] = L.marker([60.16, 24.93], {
																					icon: icon }).bindTooltip(obj.name,{
																					permanent: true,
																					direction: 'right'
																				});

				}.bind(this));
		}

		getDrawableObjects(){
 				return Object.keys(this.markers).map(function(key){return this.markers[key]}.bind(this));
		}


		updateMe(){
				this.trackedObjects.map(function(obj){
						this.markers[obj.name].setLatLng(obj.pos);
				}.bind(this));
		};

}



class PathDrawer{

		constructor(trackedObjects, map){
				this.trackedObjects = trackedObjects;
				this.paths = {};
				this.coverage = {};
				this.map = map;

				trackedObjects.map(function(obj){
						this.paths[obj.name] = [];
						this.coverage[obj.name] = [];
				}.bind(this));

		}

		orbitsNeedUpdating(pos, lastPos){
				if(lastPos == null) return true;
				return (Math.abs(pos.lng-lastPos.lng)>10)
										|| (Math.abs(pos.lat-lastPos.lat)>10);
		}

		updateMe(e){
				this.trackedObjects.forEach(function(obj){
						this.drawCoverage(obj.name, obj.coverage, this.map);
						if(this.orbitsNeedUpdating(obj.pos, obj.lastPos) || e.detail.redraw){
								obj.lastPos = obj.pos;

								orbits.computeGroundTracks(obj.tle, e.detail.timestamp).then(msg => {
										this.drawOrbit(obj.name, msg, obj.config.pathColor, this.map);
								});
						};
				}.bind(this));
		};

		createPath(color, map){
				return L.polyline([], { color: color }).addTo(map);
		}

		drawOrbit(name, msg, color, map){
				this.paths[name] = this.paths[name].map(function(row){
						if(row!=undefined) row.remove();
				})

				msg.map((data,i) => {
						this.paths[name][i] = this.createPath(color,map);
						this.mapPath(data, this.paths[name][i]);
				});

		}

		mapPath(data, path){
				data.map(function(row) {
					  path.addLatLng([row[1],row[0]]);
				});
		};


		//todo: study the use of generator
		drawCoverage(name, values, map){
			  this.coverage[name] = this.coverage[name].map(function(row){
						if(row!=undefined) row.remove();
				})

				let to = 0;
				this.coverage[name][to] = this.createPath("red",map);
				values.push(values[0]);
				values.push(values[1]);
				//let path = ;
				let i;
				for (i = 1; i < values.length; i++) {
						if(Math.abs(values[i][0] - values[i-1][0])>90){
								to=to+1;
								this.coverage[name][to] = this.createPath("red",map);
						}
						this.coverage[name][to].addLatLng([values[i][1],values[i][0]]);
				}

				//path.addLatLng([values[values.length-1][1],
				//								values[values.length-1][0]]);

		}
}

function validURL(string) {
    try{
        new URL(string);
    }catch(err){
        console.error("Invalid url: ",err.message);
        return false;
    }
    return true;
}





class DataDisplay{
		constructor(trackedObjects, document, container){
				this.trackedObjects = trackedObjects;
				this.document = document;
				this.container = container;
				this.rows = {};
				this.tableCreate(trackedObjects, this.rows, document, container);
		}

		createRow(row){

				function createRow0(row,name){
						row[name] = row.insertCell();
						row[name].appendChild(document.createTextNode(name));
						row[name].style.border = '1px solid black';
				}

				let rows = ["Name","Latitude","Longitude","Altitude",  "Azimuth", "Elevation"];
				rows.map(function(name){createRow0(row,name)});
		}

		tableCreate(trackedObjects, rows, document, container){
		    var tbl  = document.createElement('table');
		    tbl.style.width  = '100px';
				//tbl.style.height  = '100%';
		    tbl.style.border = '1px solid black';

				rows["###ColumnNames###"]=tbl.insertRow();
				this.createRow(this.rows["###ColumnNames###"]);


				trackedObjects.forEach(function(obj){
						rows[obj.name]=tbl.insertRow();
						this.createRow(this.rows[obj.name], obj.name);
				}.bind(this));
		    container.appendChild(tbl);
		}

		updateMe(e){

				function setValue(row, key, value){
						row[key].innerHTML = value;
				}


				this.trackedObjects.forEach(function(obj){
						let row = this.rows[obj.name];
						setValue(row, "Name", obj.name);
						setValue(row, "Latitude", obj.info.lat.toFixed(1)+String.fromCharCode(176));
						setValue(row, "Longitude", obj.info.lng.toFixed(1)+String.fromCharCode(176));
						setValue(row, "Altitude", obj.info.height.toFixed(1)+" km");
						setValue(row, "Azimuth", obj.info.azimuth.toFixed(1)+String.fromCharCode(176));
						setValue(row, "Elevation", obj.info.elevation.toFixed(2)+String.fromCharCode(176));
				}.bind(this));
		};
}





class AOSDataDisplay{
		constructor(trackedObjects, observer, document, container){
				this.trackedObjects = trackedObjects;
				this.observer = observer;
				this.document = document;
				this.container = container;
				this.rows = {};
				this.tableCreate(trackedObjects, this.rows, document, container);
				this.lastTick = null;
				this.firstTick = null;
				this.AOS = {};
		}



		createRow(row){

				function createRow0(row,name){
						row[name] = row.insertCell();
						row[name].appendChild(document.createTextNode(name));
						row[name].style.border = '1px solid black';
				}

				let rows = ["AOS","AOS in","LOS","duration","Peak"];
				rows.map(function(name){createRow0(row,name)});
		}



		tableCreate(trackedObjects, rows, document, container){
			  var tbl  = document.createElement('table');
		    tbl.style.width  = '100px';
				//tbl.style.height  = '100%';
		    tbl.style.border = '1px solid black';

				this.rows["###ColumnNames###"]=tbl.insertRow();
				this.createRow(this.rows["###ColumnNames###"]);

				trackedObjects.forEach(function(obj){

						this.rows[obj.name] = {};
						this.rows[obj.name]["name"] = tbl.insertRow();
						this.rows[obj.name]["name"].insertCell();
						this.rows[obj.name]["name"].appendChild(document.createTextNode(obj.name));

						this.rows[obj.name]["data"] = [];
						for(let i=0; i<5; ++i){
								this.rows[obj.name]["data"].push(tbl.insertRow());
								this.createRow(this.rows[obj.name]["data"][i], obj.name);
						}
				}.bind(this));
		    container.appendChild(tbl);
		}


		updateMe(e){


				///https://stackoverflow.com/questions/18623783/get-the-time-difference-between-two-datetimes
				function convertToReadableFormat(start, end){
						var ms = moment(end).diff(moment(start));
						var d = moment.duration(ms);
						return Math.floor(d.asHours()) + moment.utc(ms).format(":mm:ss");
				}

				if(this.lastTick == null || e.detail.timestamp < this.firstTick || e.detail.timestamp > this.lastTick){// || this.lastTick > e.details.timestamp){
						this.trackedObjects.forEach(function(obj){
								this.AOS[obj.name] = obj.getNextAOS(5, this.observer, e.detail.timestamp);

								//console.log(this.rows[obj.name]["data"]);
								for(let i=0; i<5; ++i){
										this.rows[obj.name]["data"][i]["AOS"].innerHTML = moment(this.AOS[obj.name][i].start).format("HH:MM:SS");
										this.rows[obj.name]["data"][i]["LOS"].innerHTML = moment(this.AOS[obj.name][i].end).format("HH:MM:SS");
										this.rows[obj.name]["data"][i]["duration"].innerHTML = convertToReadableFormat(this.AOS[obj.name][i].start, this.AOS[obj.name][i].end);
										this.rows[obj.name]["data"][i]["Peak"].innerHTML = this.AOS[obj.name][i].peak.toFixed(1)+String.fromCharCode(176);
								}


						}.bind(this));

						this.firstTick = e.detail.timestamp;
						this.lastTick = this.AOS[this.trackedObjects[0].name][0].end;
				}

				this.trackedObjects.forEach(function(obj){
						for(let i=0; i<5; ++i){
								this.rows[obj.name]["data"][i]["AOS in"].innerHTML = convertToReadableFormat(e.detail.timestamp,this.AOS[obj.name][i].start)+String.fromCharCode(176);
						}
				}.bind(this));





				/*
				function setValue(row, key, value){
						row[key].innerHTML = value;
				}


				this.trackedObjects.forEach(function(obj){
						let row = this.rows[obj.name];
						setValue(row, "Name", obj.name);
						setValue(row, "Latitude", obj.info.lat);
						setValue(row, "Longitude", obj.info.lng);
						setValue(row, "Altitude", obj.info.height);
						setValue(row, "Azimuth", obj.info.azimuth);
						setValue(row, "Elevation", obj.info.elevation);
				}.bind(this));
				*/
		};

}









function MapView(domainObject, config,  getTime, TLEUpdateLoop, document, openmct) {

		if(!validURL(config.map.mapTiles)){
				console.error("map.mapTiles problem");
				return;
		}

		domainObject.url = config.url;

		//store local config for easier use
		domainObject.trackedObjects = [];

		//Create list of trackableObjects
		Object.entries(domainObject.trackables).forEach((values, i) => {
				//Check whether
				if(!values[1]) return;
				if(!(Object.keys(config.trackables).includes(values[0]))){
						console.error("config.json lacks definition of the trackable",values[0]);
				}else{
						domainObject.trackedObjects.push(new orbits.Trackable(values[0],
																													config.trackables[values[0]]));
				}
		});



		this.domainObject = domainObject;
		this.getTime = getTime;
		this.document = document;
		this.config = config;


		this.updateMarkersInterval = config.timings.updateMarkersInterval;
		//this.updateMarkLoopID = null;

		TLEUpdateLoop();
		this.TLEUpdateLoopID = setInterval(
														TLEUpdateLoop,
														config.timings.TLEUpdateInterval)


		this.tmpData = {};
		this.tmpData.updateMarkersInterval = config.timings.updateMarkersInterval;
		this.tmpData.lastTick = this.getTime();

		this.openmct = openmct;
		this.observer = new orbits.Observer(this.config.groundStation);



}











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

			this.myContainer.appendChild(this.leftPanel);
			this.myContainer.appendChild(this.rightPanel);


			this.elemMapView = this.leftPanel;

			this.AOSdisplayPanel = document.createElement("div");
			this.AOSdisplayPanel.style.cssText = "width: 100%; margin-bottom: 10px; ";

			this.dataDisplayPanel = document.createElement("div");
			this.dataDisplayPanel.style.cssText = "width: 100%;   border-top: 40px";



			this.rightPanel.appendChild(this.AOSdisplayPanel);
			this.rightPanel.appendChild(this.dataDisplayPanel);

			//this.AOSdisplayPanel.style.cssText = "display: list-item; width: 100%; outline: none; color: #AAAA"; // TODO: Ugly but works...



			//this.dataDisplayPanel.style.cssText = "display: list-item; width: 100%;  outline: none; color: #AAAA"; // TODO: Ugly but works...




			this.dataDisplay = new DataDisplay(this.domainObject.trackedObjects, this.document, this.dataDisplayPanel);

			this.AOSdisplay = new AOSDataDisplay(this.domainObject.trackedObjects, this.observer, this.document, this.AOSdisplayPanel);

			//Create map and force visible attribution
			this.map = new L.Map(this.elemMapView, {
					attributionControl : false,
					center : [0, 0],
					zoomSnap : 0.0//,
			    //crs: L.CRS.EPSG4326,
    			//continuousWorld: true,
    			//worldCopyJump: false
			});

			L.control.attribution({
				  position: 'topright'
			}).addTo(this.map);

			this.map.setMaxBounds(  [[-90,-180],   [90,180]]  );
			this.map.fitBounds( [[-90,-180],   [90,180]] );










			this.markerDrawer = new MarkerDrawer(this.domainObject.trackedObjects, this.config);
			this.pathDrawer = new PathDrawer(this.domainObject.trackedObjects, this.map);


			this.funcRegistry = [];
			this.funcRegistry.push(this.markerDrawer.updateMe.bind(this.markerDrawer));
			this.funcRegistry.push(this.pathDrawer.updateMe.bind(this.pathDrawer));
			this.funcRegistry.push(this.dataDisplay.updateMe.bind(this.dataDisplay));
			this.funcRegistry.push(this.AOSdisplay.updateMe.bind(this.AOSdisplay));


			this.funcRegistry.map(function(func){
					this.elemMapView.addEventListener("updateAll", func);
			}.bind(this));

			this.markerDrawer.getDrawableObjects().map(function(obj){obj.addTo(this.map)}.bind(this));


			var style = document.createElement('style');

			//Set some bling bling style
		  style.innerHTML = '.leaflet-pane {  z-index: 18;} \
												.leaflet-container { background: #AAAA;} \
													.class-tooltip {background: #FFFF; color: #F134}';
		  document.head.appendChild(style);

			// Add background map
			L.tileLayer(this.config.map.mapTiles, {
			    attribution: "&copy; "+  this.config.map.attribution + " contributors",
			    maxZoom: 5,
					minZoom: 1.0,
			    tileSize: 512,
			    zoomOffset: -1,
					backgroundColor: "#AAAA",
			    noWrap: true
			}).addTo(this.map);

			var paneClass = document.getElementsByClassName('leaflet-pane');
			paneClass.zIndex = "40";

			createGroundStation(this.config).addTo(this.map);

			this.updateMarks = updateMarkLoop.bind(null,this.domainObject,
																						this.map, this.getTime, this.tmpData,
																						this.elemMapView, this.observer);

	    this.openmct.time.on('bounds', this.updateMarks);

			//resize map properly
			setTimeout(function(){ this.map.invalidateSize()}.bind(this), 1000);
			//setInterval(function(){ this.map.invalidateSize()}.bind(this), 1000);


			function reportWindowSize(map) {
					map.invalidateSize();
					let bounds = L.latLngBounds([[90, 180],[-90, -180]]);
					let wantedZoom = map.getBoundsZoom(bounds, true);
					let center = bounds.getCenter();
				//	map.setMinZoom(map.getZoom()-1);
					map.setView(center, wantedZoom);
					map.fitBounds(bounds, true);
					//map.fitBounds(bounds, true);
				  //map.setMinZoom(map.getZoom()-1);
			}

			reportWindowSize(this.map);
			this.resizeWindow = reportWindowSize.bind(null, this.map);
			window.onresize = this.resizeWindow;
	};





function createGroundStation(config){

				// Groundstation marker
				var gsIcon = L.icon({
						iconUrl:      config.groundStation.icon,
						iconSize:     [32, 32],
						shadowSize:   [32, 32],
						iconAnchor:   [16, 16],
						shadowAnchor: [0, 0],
						popupAnchor:  [0, 0]
				});

				return L.marker(config.groundStation.position, { icon: gsIcon });

}




function updateMarkLoop(domainObject,	map, getTime, tmpData, elem, observer, redraw= true){

		let invoke = true;
		let timestamp = getTime();

		if(Math.abs(timestamp-tmpData.lastTick)<tmpData.updateMarkersInterval){
				return;
		}
		tmpData.lastTick = timestamp;

		domainObject.trackedObjects.forEach(function(obj){
				let values = obj.getPositionAndCoverage(timestamp, observer);
				if(values == null){
						invoke = false;
				}
		});

		if(invoke){
				var event = new CustomEvent('updateAll', {detail : {timestamp : timestamp, redraw : redraw}});
				elem.dispatchEvent(event);
		}else{
				console.warn("TLE data not set, trying again soon");
				//setTimeout(updateMarkLoop.bind(null,domainObject,
				//		map, getTime, tmpData, elem, observer, false), 2000);
		}

};






MapView.prototype.destroy = function() {
		console.log("DESTROY");
		this.openmct.time.off('bounds', this.updateMarks);

		this.funcRegistry.map(function(func){
				this.elemMapView.removeEventListener("updateAll", func);
		}.bind(this));



		//clearInterval(this.updateMarkLoopID);
		clearInterval(this.TLEUpdateLoopID);

		window.removeEventListener('resize', this.resizeWindow);

		this.elemMapView.parentNode.removeChild(this.elemMapView);
		this.myContainer.parentNode.removeChild(this.myContainer);
		this.myContainer = null;
		this.elemMapView = null;
		this.map.remove();

		//this.unsubscribe();
};




module.exports = {MapView : MapView, validURL : validURL};
