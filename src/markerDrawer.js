//Responsible for displaying the markers. Also creates icon for groundstation
//Markers that are created has to be added separately to the leaflet map,
//hence some getters
class MarkerDrawer{

    //create markers for the tracked objects
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

    //Create marker for the ground station
    static createGroundStation(config){

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

    //return markers to be added to the map
		getDrawableObjects(){
 				return Object.keys(this.markers).map(function(key){return this.markers[key]}.bind(this));
		}

    //Update location
		updateMe(){
				this.trackedObjects.map(function(obj){
						this.markers[obj.name].setLatLng(obj.pos);
				}.bind(this));
		};

}


module.exports = MarkerDrawer;
