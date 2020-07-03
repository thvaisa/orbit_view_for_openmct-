const moment = require('moment');

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



module.exports = AOSDataDisplay;
