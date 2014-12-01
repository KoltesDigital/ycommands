var yargs = require('yargs');

var inst = Commands(process.argv.slice(2));
Object.keys(inst).forEach(function (key) {
	Commands[key] = typeof inst[key] == 'function'
		? inst[key].bind(inst)
		: inst[key];
});

module.exports = Commands;
function Commands(processArgs, cwd) {
	var self = yargs(processArgs, cwd);
	
	function error(err) {
		console.error(err);
		process.exit(1);
	}
	
	var commands = [];
	var commandById = {};
	var nocommand;
	
	self.command = function(name, description, handler) {
		if (typeof description === 'function') {
			handler = description;
			description = '';
		}
		
		if (typeof handler !== 'function')
			error("handler is not a function");
		
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
			error("handler is not a function");
		
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
			lines.push('Commands:');
		
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
		return lines.join('\n');
	};
	
	self.execute = function(args, callback) {
		function error(err) {
			if (callback)
				return callback(new Error(err));
			console.error(err);
			process.exit(1);
		}
		
		if (typeof args === 'function') {
			callback = args;
			args = null;
		}
		
		var argv = self.parse(args || processArgs);
		
		var commandName = argv._[0];
		if (!commandName) {
			if (nocommand)
				return nocommand.handler(argv, callback);
			return error("No command given");
		}
		
		var command = commandById[commandName];
		if (command)
			return command.handler(argv, callback);
		
		var filteredCommands = commands.filter(function(command) {
			return command.id.indexOf(commandName) === 0;
		});
		
		if (!filteredCommands.length)
			return error("Unrecognized command: " + commandName);
		
		if (filteredCommands.length > 1)
			return error("Possible commands: " + filteredCommands.map(function(command) {
				return command.id;
			}).sort().join(", "));
		
		return filteredCommands[0].handler(argv, callback);
	};
	
	return self;
}
