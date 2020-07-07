const moment = require('moment');


//This module is responsible for displaying information about
//passes, their duration and the maximum peak
class AOSDataDisplay{
		constructor(trackedObjects, observer, document, container){
				this.trackedObjects = trackedObjects;
				this.observer = observer;
				this.document = document;
				this.container = container;
				this.rows = {};
				this.tableCreate(trackedObjects, this.rows, document, container);
				this.lastPassEnded = null;
				this.lastUpdate = null;
				this.AOS = {};
				this.NNextPasses = 5;
		}

		//Create row, see column names [let rows =[]]
		createRow(row){

				function createRow0(row,name){
						row[name] = row.insertCell();
						row[name].appendChild(document.createTextNode(name));
						row[name].style.border = '1px solid black';
				}

				let rows = ["AOS","AOS in","LOS","duration","Peak"];
				rows.map(function(name){createRow0(row,name)});
		}

		//Create the entire table
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


		//Update values in the table
		//Values has to be calculated with the function that is in the
		//orbitSolver
		updateMe(e){

				//Convert ms format to readable format
				///https://stackoverflow.com/questions/18623783/get-the-time-difference-between-two-datetimes
				function convertToReadableFormat(start, end){
						var ms = moment(end).diff(moment(start));
						var d = moment.duration(ms);
						return Math.floor(d.asHours()) + moment.utc(ms).format(":mm:ss");
				}

				//Check whether the data is outdated. Conditions are
				//lastTick is not set
				//timestamp of the message is earlier than the timestamp of the first update (show history)
				//timestamp of the message is after the timestamp of the end of the first pass
				if(this.lastPassEnded == null || e.detail.timestamp < this.lastUpdate || e.detail.timestamp > this.lastPassEnded){
						this.lastPassEnded = null;
						//Update each trackedObject
						this.trackedObjects.forEach(function(obj){
									//Find passes
									this.AOS[obj.name] = obj.getNextAOS(this.NNextPasses, this.observer, e.detail.timestamp);

									//Update values
									for(let i=0; i<this.NNextPasses; ++i){
											this.rows[obj.name]["data"][i]["AOS"].innerHTML = moment(this.AOS[obj.name][i].start).format("HH:MM:SS");
											this.rows[obj.name]["data"][i]["LOS"].innerHTML = moment(this.AOS[obj.name][i].end).format("HH:MM:SS");
											this.rows[obj.name]["data"][i]["duration"].innerHTML = convertToReadableFormat(this.AOS[obj.name][i].start, this.AOS[obj.name][i].end);
											this.rows[obj.name]["data"][i]["Peak"].innerHTML = this.AOS[obj.name][i].peak.toFixed(1)+String.fromCharCode(176);
									}

									if(this.lastPassEnded < this.AOS[obj.name][0].end || this.lastPassEnded==null){
											this.lastPassEnded = this.AOS[obj.name][0].end;
									}
						}.bind(this));
						this.lastUpdate = e.detail.timestamp;
				}

				//Update values shown in the table
				//These values need to be update every "tick" because it shows ETA to
				//of the next pass
				this.trackedObjects.forEach(function(obj){
						for(let i=0; i<this.NNextPasses; ++i){
								this.rows[obj.name]["data"][i]["AOS in"].innerHTML = convertToReadableFormat(e.detail.timestamp,this.AOS[obj.name][i].start)+String.fromCharCode(176);
						}
				}.bind(this));

		};

}



module.exports = AOSDataDisplay;
