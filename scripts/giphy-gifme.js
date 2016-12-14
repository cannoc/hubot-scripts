// Description:
//   
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
// hubot [gif me | giphy] (<tags>) - Get a gif based on tags (default: random gif)
//

(function() {
  var CONTENT_RATING_LIMIT, DEBUG, DEFAULT_ENDPOINT, ENDPOINT_BASE_URL, FORCE_HTTPS, GIPHY_API_KEY, Giphy, INLINE_IMAGES, RESULTS_LIMIT, _debug, giphy;

  GIPHY_API_KEY = process.env.HUBOT_GIPHY_API_KEY || 'dc6zaTOxFJmzC';

  CONTENT_RATING_LIMIT = process.env.HUBOT_GIPHY_RATING || 'pg-13';

  FORCE_HTTPS = (process.env.HUBOT_GIPHY_FORCE_HTTPS === 'true') || false;

  INLINE_IMAGES = (process.env.HUBOT_GIPHY_INLINE_IMAGES === 'true') || true;

//  DEFAULT_ENDPOINT = process.env.HUBOT_GIPHY_DEFAULT_ENDPOINT || 'random';
  DEFAULT_ENDPOINT = 'search';  

  RESULTS_LIMIT = process.env.HUBOT_GIPHY_RESULTS_LIMIT || 50;

  ENDPOINT_BASE_URL = "http://api.giphy.com/v1/gifs";

  DEBUG = process.env.DEBUG || false;

  giphy = null;

  _debug = function() {
    if (DEBUG) {
      return console.log.apply(this, arguments);
    }
  };

  Giphy = (function() {
    function Giphy() {}

    Giphy.regex = /(gif me|giphy)( \/(\S+))?\s*(.*)/i;

    Giphy.parseMatch = function(match) {
      var command, endpoint, query;
      command = match[1];
      _debug('command', command);
      endpoint = match[3];
      _debug('endpoint', endpoint);
      query = match[4];
      _debug('query', query);
      return [command, endpoint, query];
    };

    Giphy.prototype.formatUrl = function(url) {
      var httpRegex;
      if (FORCE_HTTPS) {
        httpRegex = /^http:/;
        url = url.replace(httpRegex, "https:");
      }
      return url;
    };

    Giphy.prototype.sanitizeQuery = function(query, ignoreRegex, whitespaceRegex) {
      if (query) {
        ignoreRegex = ignoreRegex || /['",]/g;
        whitespaceRegex = whitespaceRegex || /\s/g;
        query = query.trim().replace(ignoreRegex, '').replace(whitespaceRegex, '+');
      }
      _debug('query', query);
      return query;
    };

    Giphy.prototype.getParamsHandler = function(endpoint) {
      switch (endpoint) {
        case 'random':
          return this.getRandomParams;
        case 'search':
          return this.getSearchParams;
        default:
          return null;
      }
    };

    Giphy.prototype.getRandomParams = function(query) {
      query = this.sanitizeQuery(query);
      if (query) {
        return "tag=" + query;
      }
    };

    Giphy.prototype.getSearchParams = function(query) {
      query = this.sanitizeQuery(query);
      if (query) {
        return "q=" + query + "&limit=" + RESULTS_LIMIT;
      }
    };

    Giphy.prototype.getResponseHandler = function(endpoint, response) {
      switch (endpoint) {
        case 'random':
          return this.getSingleImageResponseMessage;
        case 'search':
          return this.getImageCollectionResponseMessage;
        default:
          return null;
      }
    };

    Giphy.prototype.getSingleImageResponseMessage = function(response, endpoint, query) {
      if (response.image_url) {
        if (INLINE_IMAGES) {
          return '![giphy](' + this.formatUrl(response.image_url + ')');
        } else {
          return this.formatUrl(response.image_url);
        }
      } else {
        if (query) {
          return "Apologies -- I couldn't find any GIFs matching '" + query + "'.";
        } else {
          return "Apologies -- I couldn't find any GIFs! This is very strange, indeed.";
        }
      }
    };

    Giphy.prototype.getImageCollectionResponseMessage = function(response, endpoint, query) {
      var images, index;
      if (response.length && response.length > 0) {
        index = Math.floor(Math.random() * response.length);
        images = response[index].images;
        if (images && images.original && images.original.url) {
          if (INLINE_IMAGES) {
            return '![giphy](' + this.formatUrl(images.original.url + ')');
          } else {
            return this.formatUrl(images.original.url);
          }
        } else {
          return "Apologies -- Invalid Giphy response.";
        }
      } else {
        if (query) {
          return "Apologies -- I couldn't find any GIFs matching '" + query + "'.";
        } else {
          return "Apologies -- I couldn't find any GIFs! This is very strange, indeed.";
        }
      }
    };

    Giphy.prototype.makeApiCall = function(msg, url, callback) {
      return msg.http(url).get()(function(err, res, body) {
        var response;
        if (err || res.statusCode !== 200) {
          return msg.send('Apologies -- something went wrong looking for your GIF.');
        } else {
          response = JSON.parse(body).data;
          _debug('response', response);
          return callback(response);
        }
      });
    };

    Giphy.prototype.handleRequest = function(msg, endpoint, query) {
      var params, paramsHandler, responseHandler, url;
      endpoint = endpoint || DEFAULT_ENDPOINT;
      _debug('endpoint', endpoint);
      paramsHandler = this.getParamsHandler(endpoint);
      responseHandler = this.getResponseHandler(endpoint);
      if (paramsHandler === null) {
        return msg.send("Apologies -- " + endpoint + " does not have a valid Giphy endpoint parameter handler");
      } else if (responseHandler === null) {
        return msg.send("Apologies -- " + endpoint + " does not have a valid Giphy endpoint response handler");
      } else {
        params = paramsHandler.call(this, query);
        _debug('params', params);
        url = ENDPOINT_BASE_URL + "/" + endpoint + "?api_key=" + GIPHY_API_KEY + "&rating=" + CONTENT_RATING_LIMIT;
        if (params) {
          url = url + "&" + params;
        }
        _debug('url', url);
        return this.makeApiCall(msg, url, (function(_this) {
          return function(response) {
            var message;
            if (response) {
              message = responseHandler.call(_this, response, endpoint, query);
              _debug('message', message);
              return msg.send(message);
            } else {
              return msg.send("Apologies -- I couldn't get any response! This is very strange, indeed.");
            }
          };
        })(this));
      }
    };

    return Giphy;

  })();

  module.exports = function(robot) {
    return robot.respond(Giphy.regex, function(msg) {
      var command, endpoint, query, ref;
      ref = Giphy.parseMatch(msg.match), command = ref[0], endpoint = ref[1], query = ref[2];
      giphy = giphy || new Giphy();
      return giphy.handleRequest(msg, endpoint, query);
    });
  };

}).call(this);
