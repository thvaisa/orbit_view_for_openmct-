//This module displays the position of the tracked object and also
//where the object is visible from the groun station
class DataDisplay{
		constructor(trackedObjects, document, container){
				this.trackedObjects = trackedObjects;
				this.document = document;
				this.container = container;
				this.rows = {};
				this.tableCreate(trackedObjects, this.rows, document, container);
		}


		//Create rows, see [let rows = [...]] for column values
		createRow(row){

				function createRow0(row,name){
						row[name] = row.insertCell();
						row[name].appendChild(document.createTextNode(name));
						row[name].style.border = '1px solid black';
				}

				let rows = ["Name","Latitude","Longitude","Altitude",  "Azimuth", "Elevation"];
				rows.map(function(name){createRow0(row,name)});
		}

		//Create entire table
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

		//update values in the table
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


module.exports = DataDisplay;
