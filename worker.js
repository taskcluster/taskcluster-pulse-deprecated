var nconf           = require('nconf');
var pulse           = require('pulse');
var Promise         = require('promise');
var debug           = require('debug')('taskcluster-pulse');
var request         = require('superagent-promise');
var yaml            = require('yamljs')
var moment          = require('moment');
var scheduler       = require('taskcluster-client').scheduler;
var config          = require('./config');
config.load();

/** Handle message */
var handleMessage = function(msg) {
  if(msg._meta && msg.payload && msg.payload.change) {
    var meta    = msg._meta;
    var change  = msg.payload.change;
    if (change.branch == 'try') {
      debug("Revision %s was pushed to 'try' by %s",
            change.revision, change.who);

      // Parameters for 'try'
      var params = {
        reason:       "try-push",
        revision:     change.revision,
        repository:   'hg.mozilla.org',
        branch:       'try',
        owner:        change.who,
        flags:        change.comments,
        created:      moment().toDate().toJSON(),
        deadline:     moment().add('hours', 24).toDate().toJSON()
      };

      // Url to fetech task-graph from
      var url = 'https://hg.mozilla.org/try/raw-file/' + change.revision +
                '/taskgraph.yml';

      return request.get(url).end().then(function(res) {
        if (!res.ok) {
          throw new Error("Failed to fetch taskgraph.yml for " +
                          change.revision + " on try");
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
var consumer  = pulse.createConsumer('build', nconf.get('queueName'));
consumer.on('message', function(msg) {
  Promise.from(handleMessage(msg)).catch(function(err) {
    debug("Error handling message, error: %s, %j", err, err, err.stack);
  });
});
