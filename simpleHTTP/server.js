'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 8888;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

wss.on('connection', (ws) => {

    console.log("connection");
    ws.on('message', function(message) {

        let satellites = [];
        let msg = JSON.parse(message);

        if("Foresail-1" in msg.params){
            if(msg.params["Foresail-1"]){
                satellites.push({ "name" : "Foresail-1",
                                  "tle1" : "1 39161U 13021C   20168.19303314  .00000164  00000-0  33636-4 0  9994",
                                  "tle2" : "2 39161  97.9627 251.2482 0008176 241.6269 118.4122 14.72323678381855"

                                });
            }
        }

        if("Aalto-1" in msg.params){
            if(msg.params["Aalto-1"]){
                satellites.push({ "name" : "Aalto-1",
                                  "tle1" : "1 42775U 17036L   20167.80885194  .00000581  00000-0  28487-4 0  9998",
                                  "tle2" : "2 42775  97.2982 219.9173 0014653  31.8917 328.3204 15.21843448165424"

                                });
            }
        }

        let retMsg = { "result": { "subsystem" : "tracking",
                                    "exhange": "tracking",
                                    "trackables" : satellites
                                },
                         "id" : msg.id
                      };


        console.log(message);
        console.log(retMsg);
        ws.send(JSON.stringify(retMsg));
        //connection.sendUTF('Hi this is WebSocket server!');
    });


    ws.on('close', function(reasonCode, description) {
        console.log('Client has disconnected.');
    });
});
