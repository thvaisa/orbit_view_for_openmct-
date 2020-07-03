//Replace with your own implementation
class WebsocketWrapper{

    constructor(){
        this.sockets = {};
        this.rpc_calls = {};
        this.rpc_id = 0;
    }

    connect(url){
        for (var key in this.sockets){
            if(key == url) return;
        }

        this.sockets[url] = new WebSocket(url);
        this.setListeners(this.sockets[url]);
    }


    setListeners(socket){

        if(socket == null){
            console.error("Socket not connected");
            return;
        }

        socket.addEventListener('open', function (event) {
            console.log("opened");
        });

        socket.addEventListener('message', function(event) {

            let message;
            console.log("message");
            try {
                message = JSON.parse(event.data)
            }catch (error) {
                console.log(error);
                alert(error);
            return }


            console.log(message);
            if ("error" in message) {
                alert(message.error.message);
                console.log("WebSocket error: " + message.error.message);

                if ("id" in message && message.id in this.rpc_calls)
                    this.rpc_calls[message.id].reject();

                return;
            }

            //response
            if ("id" in message) {
                console.log("Fulfill");
                // Fulfill the promise
                if (message.id in this.rpc_calls){
                    console.log("Fulfill");
                    this.rpc_calls[message.id].promise(message);
                }
            }
        }.bind(this));

        socket.addEventListener("error", function(event) {
            alert(event);
        });
    }


    sendMessage(url, message) {

        if(this.sockets[url] == null){
            console.error("Socket not constructed");
            return Promise.reject();
        }

        message.id = this.rpc_id++;

        return new Promise((resolve, reject) =>
        {
            this.trySending(url, message, resolve, reject);
        }).finally( function() {
            delete this.rpc_calls[message.id];
        }.bind(this));
    }


    //Add counter or something
    trySending(url, message, resolve, reject){
        if(this.sockets[url].readyState!=1){
            setTimeout(function(){this.trySending(url, message, resolve, reject)}.bind(this),1000);
            return;
        }
        this.rpc_calls[message.id] = { promise: resolve, reject: reject };
        this.sockets[url].send(JSON.stringify(message));
    }
}




 module.exports = WebsocketWrapper;
