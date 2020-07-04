const tlejs = require('tle.js');


//tle packages requires breaking the last element into two pieces
function tle2PostFix(tle2){
    let tle2_substring = tle2.substr(tle2.length - 6);
    return tle2.substring(0,tle2.length - 6) + " " + tle2_substring.substr(1);
}


//Something wrong? Orbits are not ordered
//There was something wrong with the TLE.js function. It
//was not consistent and gave sometimes wrong orbits
function computeGroundTracks_old(tle, timestamp){
   return tlejs.getGroundTracks({
        tle: tle,
        startTimeMS: timestamp,
        stepMS: 20000,
        isLngLatFormat: true
    }).then(threeOrbitsArr => {
        return threeOrbitsArr;
    });
}

//Create orbit with iteration
function computeGroundTracks(tle, timestamp){
   return new Promise(function(resolve, reject) {
       let orbits = [];
       let i = 0;
       let track = 0;
       orbits[track] = [];
       for (i = 0; i < 100; i++) {
          let tmp = getPositionAt(tle, timestamp+1000*60*i);
          if(i>0){
              if(Math.abs(tmp.lng-orbits[track][i-1][0])>90){
                  track = track+1;
                  orbits[track] = [];
              }
          }
          orbits[track][i] = [tmp.lng, tmp.lat];
       }
       resolve(orbits);
   });
}



function getPositionAt(tle, timestamp){
   return tlejs.getLatLngObj(tle, timestamp);
}

//Extra information
function getPositionAndExtraAt(tle, observer, timestamp){
   return tlejs.getSatelliteInfo(
        tle,            // Satellite TLE string or array.
        timestamp,  // Timestamp (ms)
        observer.latitude,      // Observer latitude (degrees)
        observer.longitude,     // Observer longitude (degrees)
        observer.elevation      // Observer elevation (km)
    );
}

function toRadians(deg){
    return Math.PI*deg/180;
}

function toDeg(rad){
    return 180/Math.PI*rad;
}

//from gui_tracker
//maybe change to generator?
//This is implementation from the original mcc system
function footprint(lat,lng, elevation){
    let m = 0;
    let r0 = 6378.137;

    let alt = elevation + r0;

    let x0 = r0 * r0 / alt;
    let phi = Math.acos(x0 * Math.cos(m) / r0) - m;
    let y0 = r0 * Math.sin(phi);

    //Precalculate sin/cos
    let clat = Math.cos(toRadians(lat));
    let slat = Math.sin(toRadians(lat));
    let clon = Math.cos(toRadians(lng));
    let slon = Math.sin(toRadians(lng));

    let verts = [];
    let i;
    const nIterations = 90;
    const dRad = 2*Math.PI/nIterations;
    for (i = 0; i < nIterations; i++) {
        //Point on the circle
        let vert_x = x0
        let vert_y = y0 * Math.sin(i*dRad);
        let vert_z = y0 * Math.cos(i*dRad);

        //Rotate Y-axis by latitude
        let vert_xx = clat * vert_x - slat * vert_z;
        let vert_yy = vert_y;
        let vert_zz = slat * vert_x + clat * vert_z;


        //Rotate around Z-axis by longitude
        vert_x = clon * vert_xx - slon * vert_yy;
        vert_y = slon * vert_xx + clon * vert_yy;
        vert_z = vert_zz;

        //Transform back to angles on the sphere (lat/long)
        verts.push([toDeg(Math.atan2(vert_y, vert_x)),toDeg(Math.asin(vert_z / r0))]);
    }

    return verts;
}


//Stores ground station's values
class Observer{
    constructor(config){
        this.latitude = config.position[0];
        this.longitude = config.position[1];
        this.elevation = config.elevation;
        this.visibility = config.visibility;
    }
}


//Trackables
class Trackable{
    constructor(name, config){
        this.name = name;
        this.tle = null;
        this.config = config;
        this.lastPos = null;
        this.pos = null;
        this.coverage = null;
    }



    getIcon(){
        return this.iconName;
    }

    getMarker(){
        return [this.marker, this.name, this.icon];
    }

    getPositionAndCoverage(timestamp, observer){
        if(this.tle == null) return null;

        //let pos =  getPositionAt(this.tle, timestamp);
        this.info =  getPositionAndExtraAt(this.tle, observer, timestamp);
        let pos = {
            lat : this.info.lat,
            lng : this.info.lng
        };

        this.coverage = footprint(pos.lat, pos.lng, this.info.height);
        this.pos = [pos.lat, pos.lng];
        return this.pos;
    }

    storeTle(name, tle1, tle2){
        this.tle = [name, tle1, tle2PostFix(tle2)];
    }

    //Calculate passes
    getNextAOS(nextN, observer, timestampStart){

        let elevationHistory = [];
        //elevation at time timestampStart
        let startElevation =  getPositionAndExtraAt(this.tle, observer, timestampStart).elevation-observer.visibility;

        let startTime = timestampStart;
        let aboveHorizon = false;

        //Check whether we are above or below horizon
        let peak = -1;
        if(startElevation>0){
            elevationHistory.push({start: timestampStart});
            peak = startElevation;
            aboveHorizon = true;
        }
        let indx = 0;

        let prevElevation = startElevation;
        //Check orbits each minute within 24 hour timeframe
        for (let i = 1; i < 60*24; i++) {

            let timestamp_next = timestampStart+i*1000*60;
            let timestamp_prev = timestampStart+(i-1)*1000*60;

            //elevation of the next iteration
            let elevation = getPositionAndExtraAt(this.tle, observer, timestamp_next).elevation-observer.visibility;
            //check if we need to update elevation
            if(peak<elevation){
                peak = elevation;
            }
            //If sign is different, we know that the satellite crossed the horizon
            if(Math.sign(prevElevation)!=Math.sign(elevation)){
                //Compute more accurate time using binary search
                let passHorizon = iterate(timestamp_prev, timestamp_next, prevElevation, elevation, this.tle, observer);
                //Satellite is above the horizon
                if(aboveHorizon){
                    elevationHistory[indx]["end"] = passHorizon[0];
                    elevationHistory[indx]["peak"] = peak+observer.visibility;
                    aboveHorizon = false;
                    indx = indx+1;
                    peak = -1;
                    if(indx>=nextN){
                        return elevationHistory;
                    }
                //below horizon
                }else{
                    aboveHorizon = true;
                    elevationHistory.push({start : passHorizon[0]});
                }

            }
            //store the previous elevation value
            prevElevation = elevation;
        }
        //return
        return elevationHistory;
    }

}

//binary search to find the more accurate timing of when the horizon is crossed
function iterate(prevTime, nextTime, prevElev, nextElev, tle, observer){
    let start = prevTime;
    let end = nextTime;
    let middle;
    let value;
    while (end-start>500) {
        middle = (start + end)*0.5;

        value = getPositionAndExtraAt(tle, observer, middle).elevation-observer.visibility;

        if (Math.sign(prevElev) == Math.sign(value)) {
            start = middle;
            prevElev = value;
        } else{
            end = middle;
            nextElev = value;
        }
    }
    return [middle, value]
}





//Make accessible outside
module.exports = {
                  computeGroundTracks : computeGroundTracks,
                  Trackable : Trackable,
                  Observer : Observer};
