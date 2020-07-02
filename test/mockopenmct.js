
class OpenMCT{
    constructor(){
        this.telemetry = {};
        this.store = {};
        this.funcs = {};
        this.objects = {};
        this.objectViews = {};
        this.types = {};
        this.domainObject = {};

        this.telemetry.addProvider = function(foo){this.funcs = foo}.bind(this);
        this.types.addType = function(name, foo)
            {this.store[name.replace(/\./g,'_')] = foo}.bind(this);
        this.objectViews.addProvider = function(foo){this.objectViews = foo}.bind(this);

    }




}


module.exports = {OpenMCT : OpenMCT};
