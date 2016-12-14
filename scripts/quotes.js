// Description:
//   Add quotes for users or topics
//
// Dependencies:
//   Underscore.js
//
// Configuration:
//   None
//
// Commands:
//   hubot quote [<username> | random] [search-term] - Retrieves a random quote from <username> or random
//   hubot quote list (username) - Retrieves all quotes from (username)
//   hubot quote add <username> <quote> - Adds a <quote> for a <username>
//   hubot quote remove <username> <quote> - Removes a <quote> for a <username>
//
// Author:
//   gvnmccld, mannkind
//

var _ = require('underscore');

var Quotes = (function () {

    function Quotes(robot) {
      var _this = this;
      this.robot = robot;
      this.quotes = {};
      this.robot.brain.on("loaded", function () {
        _this.quotes = _this.robot.brain.data.quotes;
        delete _this.quotes.testuser;
      });
    }

    Quotes.prototype.getRandomUserQuote = function (msg, user, term) {
      var found = "";
      console.log("Search Term: " + term);
      if(term) {
         // We have a term to match on, do some searching
         var quo = _.shuffle(this.quotes[user]);
         _.each(quo, function (q) {
           if(q.toLowerCase().indexOf(term.toLowerCase()) > -1) {
 	     return msg.send(q + " - " + user);
	   }
         }); 
      } else {
        // If we didn't have a term to match on, do random
        if(this.quotes[user] && this.quotes[user].length > 0) {
          return msg.send('"' + this.quotes[user][Math.floor(Math.random()*this.quotes[user].length)] + '" - ' + user);
        } else {
          return msg.send("I don't have any quotes stored for " + user + ".");
        }
      }
    }

    Quotes.prototype.getRandomQuote = function (msg) {
      var allQuotes = [];
      for (var username in this.quotes) {
        if (this.quotes.hasOwnProperty(username)) {
          for(var i = 0; i < this.quotes[username].length; i++) {
            allQuotes.push('"' + this.quotes[username][i] + '" - ' + username);
          }
        }
      }
      if(allQuotes.length > 0) {
        return msg.send(allQuotes[Math.floor(Math.random()*allQuotes.length)]);
      } else {
        return msg.send("I don't have any quotes stored, sorry.");
      }
    };
  
    Quotes.prototype.setQuote = function (msg, user, quote) {
      if(!this.quotes[user]) {
        this.quotes[user] = [];
      }
      this.quotes[user].push(quote);
      this.save();
      return msg.send("Quote added for "+user);
    };

    Quotes.prototype.listQuotes = function (msg, user) {
      if(this.quotes[user] && this.quotes[user].length > 0) {
        var heading = "Quotes by *" + user + "*";
        var list = [heading];
        for(var i = 0; i < this.quotes[user].length; i++) {
          list.push('  - "' + this.quotes[user][i] + '"');
        }
        msg.send(list.join('\n'));
      } else {
        msg.send("I don't have any quotes for " + user + ".");
      }
    };

    Quotes.prototype.listUsers = function (msg) {
      var users = [];
      for(var k in this.quotes) {
        if(this.quotes[k].length){ 
          users.push(k);
        }
      }
      if(users.length) {
        msg.send("I have quotes for: " + users.join(", "));
      } else {
        msg.send("I don't have any quotes stored");
      }
    }

    Quotes.prototype.removeQuote = function (msg, user, quote) {
      var index = this.quotes[user].indexOf(quote);
      if(index >= 0) {
        this.quotes[user].splice(index, 1);
        this.save();
        return msg.send("Removed quote: '" + quote + "' by user " + user);
      } else {
        return msg.send("Could not find the specified quote.");
      }
    };

    Quotes.prototype.save = function () {
     // this.quotes = {};
      this.robot.brain.data.quotes = this.quotes;
      this.robot.brain.emit("save", this.robot.brain.data);
      return this.quotes;
    };

    return Quotes;
}());

module.exports = function(robot) {
  var quotes = new Quotes(robot);
  robot.respond(/quote (?!list|random|add|remove)([^\s]+)\s?(.*)?/i, function (msg) { return quotes.getRandomUserQuote(msg, msg.match[1], msg.match[2]); });
  robot.respond(/quote random/i, function (msg) { return quotes.getRandomQuote(msg) });
  robot.respond(/quote list @?(.*)?/i, function (msg) { return quotes.listQuotes(msg, msg.match[1]); });
  robot.respond(/quote list$/i, function (msg) { return quotes.listUsers(msg); });
  robot.respond(/quote add @?(.*?) (.*)/i, function(msg) { return quotes.setQuote(msg, msg.match[1], msg.match[2]); });
  robot.respond(/quote remove @?(.*?) (.*)/i, function(msg) { return quotes.removeQuote(msg, msg.match[1], msg.match[2]); });
};
