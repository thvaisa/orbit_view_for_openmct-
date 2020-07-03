const orbits = require('./orbitSolver.js');

//Display orbits and visible area
class LineDrawer{

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

    //check if the orbits need to redrawn (lat and pos difference is 10 degress)
		orbitsNeedUpdating(pos, lastPos){
				if(lastPos == null) return true;
				return (Math.abs(pos.lng-lastPos.lng)>10)
										|| (Math.abs(pos.lat-lastPos.lat)>10);
		}

    //Update orbits and coverages
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

    //Create leaflet path
		createPath(color, map){
				return L.polyline([], { color: color }).addTo(map);
		}

    //Draw orbit
		drawOrbit(name, msg, color, map){
				this.paths[name] = this.paths[name].map(function(row){
						if(row!=undefined) row.remove();
				})

				msg.map((data,i) => {
						this.paths[name][i] = this.createPath(color,map);
						this.mapPath(data, this.paths[name][i]);
				});

		}

    //Add data to map
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

		}
}


module.exports = LineDrawer;
