// Description:
//   Wikipedia Public API
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot wiki search <query> - Returns the first 5 Wikipedia articles matching the search <query>
//   hubot wiki summary <article> - Returns a one-line description about <article>
//
// Author:
//   gvnmccld

var WIKI_API_URL = "https://en.wikipedia.org/w/api.php";
var WIKI_EN_URL = "https://en.wikipedia.org/wiki";

var Wiki = (function () {
  function Wiki(robot) {
    this.robot = robot;
  }

  var CreateUrl = function(title) {
    return WIKI_EN_URL + "/" + (encodeURIComponent(title));
  };
  
  var WikiRequest = function (res, params, handler) {
    if (params == null) {
      params = {};
    }
    return res.http(WIKI_API_URL).query(params).get()(function(err, httpRes, body) {
      if (err) {
        res.reply("An error occurred while attempting to process your request: " + err);
        return robot.logger.error(err);
      }
      return handler(JSON.parse(body));
    });
  };

  var FormatSearchResult = function(res, result) {
     if(result[1].length === 0) {
        return res.reply("No articles found.");
      }
      var ref = result[1];
      var results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        var article = ref[i];
        results.push(res.send(article + ": " + (CreateUrl(article))));
      }
      return results.join("\n");
  };

  var FormatSummaryResult = function(res, article) {
    return res.send(article.title + ": " + article.extract.split(". ").slice(0, 2).join(". ") + ".\n" + CreateUrl(article.title));
  }
  
  var Search = function(res, term, callback, results) {
    var params = {
      action: "opensearch",
      format: "json",
      limit: results || 5,
      search: term
    };
    WikiRequest(res, params, function (result) {
      callback.call(this, res, result, term);
    });
  };
 
  var searches = 0;
 
  var Summary = function(res, term, callback) {
    var params = {
      action: "query",
      prop: "extracts",
      exchars: 175,
      exintro: true,
      explaintext: true,
      format: "json",
      redirects: true,
      titles: term
    };
    WikiRequest(res, params, function (result) {
      var ref = result.query.pages;
      for (var id in ref) {
        var article = ref[id];
        if (id === "-1") {
          if(searches > 1) {
            return res.send("No luck finding a wiki summary for: " + term);
          }
          searches++;
          return Search(res, term, function (res2, result2, term2) {
            Summary(res2, result2[1], FormatSummaryResult);
          }, 1);
        } else {
          if(article.extract) {
            searches = 0;
            return FormatSummaryResult(res, article);
          } else {
            return res.send("No summary found.");
          }
        }
      }
      callback.call(this, res, result, term);
    });
  }; 

  Wiki.prototype.Router = function(res, type, term) {
    var message;
    if(type === "search") {
      message = Search(res, term, FormatSearchResult);
    } else if(type === "summary") {
      message = Summary(res, term, FormatSummaryResult);
    }
    res.send(message);
  };

  return Wiki;
}());

module.exports = function(robot) {
  var wiki = new Wiki(robot);
  robot.hear(/wiki (summary|search) (.*)/, function (res) { return wiki.Router(res, res.match[1], res.match[2]); });
};
