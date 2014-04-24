var nconf   = require('nconf');
var client  = require('taskcluster-client');

/** Default configuration values */
var DEFAULT_CONFIG_VALUES = {
  // pulse configuration
  pulse: {
    // AMQP queue name to use when subscribing to pulse events, we'll use
    // `taskcluster-pulse-test` for development to avoid interfering production
    // deployment which will use `taskcluster-pulse`
    queueName:                      'taskcluster-pulse-test',

    // Branches from which task-graphs should be posted
    branches:                       "try",

    // Send an email to owner on push, as string either 'true' or 'false'
    emailOwnerOnPush:               'false'
  },

  // Configuration of API end-points
  apis: {
    // Use default baseUrls by default
  }
};

var loaded = false;
/** Load configuration */
exports.load = function() {
  if (loaded) {
    return;
  }
  loaded = true;

  // Load configuration from command line arguments, if requested
  nconf.argv();

  // Configurations elements loaded from commandline, these are the only
  // values we should ever really need to change.
  nconf.env({
    separator:  '__',
    whitelist:  [
      'pulse__queueName',
      'pulse__branches'
    ]
  });

  // Config from current working folder if present
  nconf.file('local', 'taskcluster-pulse.conf.json');

  // User configuration
  nconf.file('user', '~/.taskcluster-pulse.conf.json');

  // Global configuration
  nconf.file('global', '/etc/taskcluster-pulse.conf.json');

  // Load default configuration
  nconf.defaults(DEFAULT_CONFIG_VALUES);

  // Set baseUrls for taskcluster-client
  client.config(nconf.get('apis'));
}
