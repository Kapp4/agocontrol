/* AgoControl */

Array.prototype.chunk = function(chunkSize) {
    var array = this;
    return [].concat.apply([], array.map(function(elem, i) {
	return i % chunkSize ? [] : [ array.slice(i, i + chunkSize) ];
    }));
};

var subscription = null;
var url = "/jsonrpc";

var deviceMap = {};
Device = Ember.Object.extend({});

function handleEvent(response) {
    if (response.result) {
	console.log(response.result);
	deviceMap[response.result.uuid].set('state', response.result.level);
    }
    getEvent();
}

function getEvent() {
    var request = {};
    request.method = "getevent";
    request.params = {};
    request.params.uuid = subscription;
    request.id = 1;
    request.jsonrpc = "2.0";

    $.post(url, JSON.stringify(request), handleEvent, "json");
}

function handleInventory(response) {
    for (var uuid in response.result.inventory) {
	deviceMap[uuid] = Device.create(response.result.inventory[uuid]);
	for ( var key in response.result.inventory[uuid]) {
	    deviceMap[uuid].uuid = uuid;
	    deviceMap[uuid].addObserver(key, deviceMap[uuid], function(k) {
		return function() {
		    if (indexCtrl) {
			indexCtrl.updateDeviceMap();
		    }
		};
	    }(key));
	}

	if (indexCtrl) {
	    indexCtrl.updateDeviceMap();
	}

    }
}

function getInventory() {
    var request = {};
    request.method = "message";
    request.params = {};
    request.params.content = {};
    request.params.content.command = "inventory";
    request.id = 1;
    request.jsonrpc = "2.0";

    $.ajax({
	type : 'POST',
	url : url,
	data : JSON.stringify(request),
	success : handleInventory,
	dataType : "json",
	async : true
    });
}

function handleSubscribe(response) {
    if (response.result) {
	subscription = response.result;
	getInventory();
	getEvent();
    }
}

function sendCommand(content) {
    var request = {};
    request.method = "message";
    request.params = {};
    request.params.content = content;
    request.params.content;
    request.id = 1;
    request.jsonrpc = "2.0";

    $.ajax({
	type : 'POST',
	url : url,
	data : JSON.stringify(request),
	success : function(r) {
	    console.log(r);
	},
	dataType : "json",
	async : true
    });
}

function subscribe() {
    var request = {};
    request.method = "subscribe";
    request.id = 1;
    request.jsonrpc = "2.0";

    $.post(url, JSON.stringify(request), handleSubscribe, "json");
}

/* EmberJS Application */

var App = Ember.Application.create({
    ApplicationController : Ember.Controller.extend(),
    ready : function() {
	// console.log("START");
	subscribe();
    },

    getTemplate : function(name) {
	var template = '';
	$.ajax({
	    url : './templates/' + name + '.html?' + (new Date()).getTime(),
	    async : false,
	    success : function(text) {
		template = text;
	    }
	});

	return Ember.Handlebars.compile(template);
    },

    getHelperTemplate : function(name) {
	var template = " ";
	$.ajax({
	    url : './templates/' + name + '.html?' + (new Date()).getTime(),
	    async : false,
	    success : function(text) {
		template = text;
	    }
	});

	if (template == " ") {
	    return false;
	}

	return Handlebars.compile(template);
    },

});

App.helperTemplates = {};

App.Router.map(function() {
    // put your routes here
});

/* Template helpers */

Ember.Handlebars.registerBoundHelper('device', function(value, options) {
    var tpl = null;
    if (App.helperTemplates[value.devicetype] === undefined) {
	App.helperTemplates[value.devicetype] = App.getHelperTemplate("devices/" + value.devicetype);
    }

    tpl = App.helperTemplates[value.devicetype];
    if (!tpl) {
	if (App.helperTemplates["empty"] === undefined) {
	    App.helperTemplates["empty"] = App.getHelperTemplate("devices/empty");
	}
	tpl = App.helperTemplates["empty"];
    }

    return new Handlebars.SafeString(tpl(value));
});

/* Used to setUp buttons and sliders */
Ember.Handlebars.registerBoundHelper('doSetup', function(value, options) {

    $(".slider").each(function() {
	$(this).empty().slider({
	    value : $(this).data('value'),
	    min : 0,
	    max : 100,
	    step : 5,
	    disabled : $(this).data('value') == "-",
	    stop : function(event, ui) {
		var content = {};
		content.uuid = $(this).data('uuid');
		content.command = "setlevel";
		content.level = ui.value;
		sendCommand(content);
	    }
	});
    });

    $('.cmd-btn').each(function() {
	$(this).click(function() {
	    var content = {};
	    content.uuid = $(this).data('uuid');
	    content.command = $(this).data('value');
	    sendCommand(content);
	});
    });
});

/* Index - Devices View */

var indexCtrl = null;

App.IndexController = Ember.ObjectController.extend({
    content : [],

    updateDeviceMap : function() {
	var devs = [];

	console.log("---");
	for (var k in deviceMap) {
	    console.log(deviceMap[k].devicetype);
	    devs.push(deviceMap[k]);
	}
	console.log("---");
	devs = devs.chunk(3);
	for (var i = 0; i < devs.length; i++) {
	    devs[i][0].isFirst = true;
	}
	this.set("content", devs);
    },

});

App.IndexView = Ember.View.extend({
    templateName : "index",
    name : "index"
});

App.IndexRoute = Ember.Route.extend({
    model : function() {
	return [];
    },

    setupController : function(controller, model) {
	controller.set('content', model);
	indexCtrl = controller;
    },

    renderTemplate : function() {
	Ember.TEMPLATES['index'] = App.getTemplate("devices");
	this.render();
    },
});