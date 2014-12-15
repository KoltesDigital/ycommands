# ycommands

ycommands be an enhancement of [yargs](https://github.com/chevex/yargs) adding command semantics.

	npm install ycommands --save

All the features of yargs are available, plus new methods define commands and execute them. The command is the first non-option argument:

	./tool.js command args...

The command called may be an abbreviation of the actual command, as long as it's unambiguous.

The command list appears in the help message.

## Additional methods

### .command( name [, description], handler )

Define a command to be called by `.execute`.

### .nocommand( [description ,] handler )

Define the command to be called by `.execute` when there is no specified command.

### .execute( [args] [, callback] )

Determine and execute the proper command based on `args`, or by default `process.argv`.

`callback` is given to the commands, allowing them to return asynchronously. If `callback` is undefined, commands are still provided with a `callback` function which does nothing, in order to allow an asynchronous code style.

Errors happening in ycommands (no command given, unrecognized command, ambiguous command) are **thrown**. They are instances of `ycommands.Error`. `callback` is not called for these errors.

## Command handler

The handler function has the signature

	function( argv [, callback] )

`argv` is the usual argv object from yargs.

`callback` is the callback function given to `.execute`, allowing the function to return asynchronously.

## Example

This innovative tool may be patented in the USA. Pirates!

	#!/usr/bin/env node
	var fs = require('fs');
	var ycommands = require('ycommands');

	try {
		var config = JSON.parse(fs.readFileSync('config.json'));
	} catch (err) {
		config = {};
	}

	try {
		ycommands
			.usage("Manage a configuration file.\nUsage: $0 command")
			.help('h')
			.command("set key value", "Set a config key", function(argv, callback) {
				argv._.shift();
				var key = argv._.shift();
				var value = argv._.shift();
				config[key] = value;
				return fs.writeFile('config.json', JSON.stringify(config), callback);
			})
			.command("show key", "Show a config key", function(argv, callback) {
				argv._.shift();
				var key = argv._.shift();
				if (!config.hasOwnProperty(key))
					return callback(new Error(key + " is not defined"));
				console.log(config[key]);
				return callback();
			})
			.nocommand("List all config keys", function(argv, callback) {
				Object.keys(config).sort().forEach(function(key) {
					console.log("%s = %s", key, config[key]);
				});
				return callback();
			})
			.execute(function(err) {
				if (err)
					throw err;
				
				console.log("Done");
			});
	} catch (err) {
		console.error(err.message);
	}

---

	./tool.js -h
	Manage a configuration file.
	Usage: ./tool.js command
	
	Options:
	  -h  Show help
	
	Commands:
	  set key value  Set a config key
	  show key       Show a config key
	no command       List all config keys


	./tool.js ste foo bar
	Unrecognized command: ste
	Did you mean:
	  set key value  Set a config key

	./tool.js set foo bar
	Done

	./tool.js
	foo = bar
	Done

	./tool.js s foo
	Ambiguous command: s
	Did you mean:
	  set key value  Set a config key
	  show key       Show a config key

	./tool.js sh foo
	bar
	Done

	./tool.js sh foot
	Error: foot is not defined
		at ...

## Release History

### 0.2.0

* suggest commands when unrecognized
* better error handling
* command handlers are still provided with a callback when no callback is given to `.execute`, and are called asynchronously

### 0.1.0

* handles commands or a default command when no command is given
* suggest commands when ambiguous

## License

Copyright (c) 2014 Bloutiouf aka Jonathan Giroux

[MIT licence](http://opensource.org/licenses/MIT)
