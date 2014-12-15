var levenshtein = require('fast-levenshtein');
var yargs = require('yargs');

var inst = Ycommands(process.argv.slice(2));
Object.keys(inst).forEach(function (key) {
	Ycommands[key] = typeof inst[key] == 'function'
		? inst[key].bind(inst)
		: inst[key];
});

module.exports = Ycommands;
function Ycommands(processArgs, cwd) {
	var self = yargs(processArgs, cwd);
	
	var commands = [];
	var commandById = {};
	var nocommand;
	
	self.command = function(name, description, handler) {
		if (typeof description === 'function') {
			handler = description;
			description = '';
		}
		
		if (typeof handler !== 'function')
			throw new YcommandsError("handler is not a function");
		
		var index = name.indexOf(' ');
		var id = (index === -1 ? name : name.substr(0, index));
		
		var command = {
			id: id,
			name: name,
			description: description,
			handler: handler
		};
		commands.push(command);
		commandById[id] = command;
		
		return self;
	};
	
	self.nocommand = function(description, handler) {
		if (typeof description === 'function') {
			handler = description;
			description = '';
		}
		
		if (typeof handler !== 'function')
			throw new YcommandsError("handler is not a function");
		
		nocommand = {
			description: description,
			handler: handler
		};
		
		return self;
	};
	
	var help = self.help;
	self.help = function() {
		if (arguments.length > 0)
			return help.apply(self, arguments);
		
		var lines = [help.call(self)];
		
		if (commands.length || nocommand)
			lines.push("Commands:");
		
		var column = commands.reduce(function(previousValue, command) {
			return Math.max(previousValue, command.name.length);
		}, 0) + 3;
		
		if (nocommand)
			column = Math.max(column, 11);
		
		for (var i = 0, n = commands.length; i < n; ++i) {
			var command = commands[i];
			lines.push("  " + command.name + new Array(column - command.name.length).join(' ') + command.description);
		}
		
		if (nocommand)
			lines.push("no command" + new Array(column - 8).join(' ') + nocommand.description);
		
		lines.push('');
		return lines.join("\n");
	};
	
	self.execute = function(args, callback) {
		function noop() {}
		
		function error(message, lines) {
			var err = new YcommandsError(message);
			if (lines)
				err.message += "\nDid you mean:\n" + lines.sort().join("\n");
			throw err;
		}
		
		if (typeof args === 'function') {
			callback = args;
			args = null;
		}
		
		var argv = self.parse(args || processArgs);
		
		var commandName = argv._[0];
		if (!commandName) {
			if (nocommand)
				return nocommand.handler(argv, callback || noop);
			return error("No command given");
		}
		
		var command = commandById[commandName];
		if (command)
			return command.handler(argv, callback || noop);
		
		var filteredCommands = commands.filter(function(command) {
			return command.id.indexOf(commandName) === 0;
		});
		
		if (!filteredCommands.length) {
			var pairs = commands.map(function(command) {
				return [command, levenshtein.get(commandName, command.id)];
			}).sort(function(a, b) {
				return a[1] - b[1];
			}).filter(function(pair) {
				return pair[1] < 3;
			});
			
			var column = pairs.reduce(function(previousValue, pair) {
				return Math.max(previousValue, pair[0].name.length);
			}, 0) + 3;
			
			var lines = pairs.map(function(pair) {
				var command = pair[0];
				return "  " + command.name + new Array(column - command.name.length).join(' ') + command.description
			});
			
			return error("Unrecognized command: " + commandName, lines);
		}
		
		if (filteredCommands.length > 1) {
			var column = filteredCommands.reduce(function(previousValue, command) {
				return Math.max(previousValue, command.name.length);
			}, 0) + 3;
			
			var lines = filteredCommands.map(function(command) {
				return "  " + command.name + new Array(column - command.name.length).join(' ') + command.description
			});
			
			return error("Ambiguous command: " + commandName, lines);
		}
		
		return process.nextTick(function() {
			return filteredCommands[0].handler(argv, callback || noop);
		});
	};
	
	return self;
}

function YcommandsError(message) {
	Error.call(this);
	Error.captureStackTrace(this, arguments.callee);
	this.message = message;
}
YcommandsError.prototype = Object.create(Error.prototype);
Ycommands.Error = YcommandsError;
