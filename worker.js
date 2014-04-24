var nconf           = require('nconf');
var pulse           = require('pulse');
var Promise         = require('promise');
var debug           = require('debug')('taskcluster-pulse');
var request         = require('superagent-promise');
var yaml            = require('yamljs')
var moment          = require('moment');
var _               = require('lodash');
var scheduler       = require('taskcluster-client').scheduler;
var config          = require('./config');
config.load();

var branches = nconf.get('pulse:branches').split(' ');

/** Handle message */
var handleMessage = function(msg) {
  if(msg._meta && msg.payload && msg.payload.change) {
    var meta    = msg._meta;
    var change  = msg.payload.change;
    if (branches.indexOf(change.branch) !== -1) {
      debug("Revision %s was pushed to '%s' by %s",
            change.revision, change.branch, change.who);

      // Parameters
      var params = {
        reason:       "push",
        revision:     change.revision,
        repository:   'hg.mozilla.org',
        branch:       change.branch,
        owner:        change.who,
        comments:     change.comments,
        flags:        change.comments,
        created:      moment().toDate().toJSON(),
        deadline:     moment().add('hours', 24).toDate().toJSON()
      };

      // task-graph url
      var url = 'https://hg.mozilla.org/' + change.branch + '/raw-file/' +
                change.revision + '/taskgraph.yml';

      return request.get(url).end().then(function(res) {
        if (res.status === 404) {
          throw "No taskgraph.yml available for " +
                change.revision + " on " + change.branch;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch taskgraph.yml for " +
                          change.revision + " on " + change.branch);
        }
        return yaml.parse(res.text);
      }).then(function(taskGraph) {
        taskGraph.params = _.defaults(taskGraph.params, params);
        return scheduler.createTaskGraph(taskGraph);
      }).then(function(result) {
        debug('Submitted task-graph with taskGraphId: %s',
              result.status.taskGraphId);
        if (nconf.get('emailOwnerOnPush') === 'true') {
          // TODO: send an email to the owner using SES
        }
      });
    }
  }
};

// Handle incoming messages
var consumer  = pulse.createConsumer('build', nconf.get('pulse:queueName'));
consumer.on('message', function(msg) {
  new Promise(function(accept, reject) {
    try {
      accept(handleMessage(msg));
    }
    catch(e) {
      reject(e);
    }
  }).catch(function(err) {
    debug("Error handling message, error: %s, %j", err, err, err.stack);
  });
});

console.log("Now running with branches: %j", branches);
