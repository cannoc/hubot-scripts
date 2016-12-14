// Description:
//   Replaces default `redis-brain` with MongoDB one. Useful
//   to those who wants to have persistence on completely free
//   Heroku account.
//
// Dependencies:
//   "mongodb": "*"
//   "underscore" "*"
//
// Configuration:
//   MONGODB_URL
//
// Commands:
//   None
//
// Setup:
//   You may need to insert an empty document into the storage collection, ymmv
//
// Author:
//   juancoen, darvin, gvnmccld

var MongoClient, _, decodeKeys, encodeKeys;

MongoClient = require('mongodb').MongoClient;

_ = require('underscore');

encodeKeys = function(obj) {
  var key, value;
  if (typeof obj !== 'object') {
    return obj;
  }
  for (key in obj) {
    value = obj[key];
    if (obj.hasOwnProperty(key)) {
      obj[key.replace(/\./g, ":::")] = encodeKeys(obj[key]);
      if (key.indexOf(".") > -1) {
        delete obj[key];
      }
    }
  }
  return obj;
};

decodeKeys = function(obj) {
  var key, value;
  if (typeof obj !== 'object') {
    return obj;
  }
  for (key in obj) {
    value = obj[key];
    if (obj.hasOwnProperty(key)) {
      obj[key.replace(/:::/g, ".")] = encodeKeys(obj[key]);
      if (key.indexOf(":::") > -1) {
        delete obj[key];
      }
    }
  }
  return obj;
};

module.exports = function(robot) {
  var mongoUrl;
  mongoUrl = process.env.MONGODB_URL;
  return MongoClient.connect(mongoUrl, function(err, db) {
    if (err != null) {
      throw err;
    } else {
      robot.logger.debug("Successfully connected to Mongo");
      db.createCollection('storage', function(err, collection) {
        return collection.findOne({}, function(err, document) {
          if (err != null) {
            throw err;
          } else if (document) {
            document = decodeKeys(document);
            return robot.brain.mergeData(document);
          }
        });
      });
      robot.brain.on('save', function(data) {
        return db.collection('storage', function(err, collection) {
          return collection.findOne({}, function(err, document) {
            if (err != null) {
              throw err;
            } else if (document) {
              document = decodeKeys(document);
              _.extend(document, data);
              return collection.remove({}, function(err) {
                var newdata;
                if (err != null) {
                  throw err;
                } else {
                  newdata = encodeKeys(document);
                  return collection.save(newdata, function(err) {
                    if (err != null) {
                      throw err;
                    }
                  });
                }
              });
            }
          });
        });
      });
      return robot.brain.on('close', function() {
        return db.close();
      });
    }
  });
};
