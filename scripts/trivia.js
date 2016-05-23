// Description:
//   Play trivia! Doesn't include questions. Questions should be in the following JSON format:
//   {
//       "answer": "Pizza",
//       "category": "FOOD",
//       "question": "Crust, sauce, and toppings!",
//       "value": "$400"
//   },
//
// Dependencies:
//   cheerio - for questions with hyperlinks
//
// Configuration:
//   None
//
// Commands:
//   !t(rivia) - ask a question
//   !sk(ip) - skip the current question
//   !end - skip and do not restart
//   !a(nswer) <answer> - provide an answer
//   !score <player> - check the score of the player
//   !s(cores) - show all player scores
//   !l(ifetime) - show lifetime scores for all players
//   !h(int) - hints for trivia question
//   !top [num] - Top [num] Players (default: 10)
//   !reset - resets the score list
//
// Author:
//   yincrash, ravikiranj, gvnmccld
var module;
var Fs = require("fs");
var Path = require("path");
var Cheerio = require("cheerio");
var Entities = require("entities");
var AnswerChecker = require("../res/answer-checker");
var _ = require("underscore");
var ScoreKeeper = (function () {
    function ScoreKeeper(robot) {
        var _this = this;
        this.robot = robot;
        this.robot.brain.on("loaded", function () {
            _this.scores = _this.robot.brain.data.scores || {};
            _this.lifetime = _this.robot.brain.data.lifetime || {};
        });
    }
    ScoreKeeper.prototype.getUser = function (user) {
        this.scores[user] = this.scores[user] || 0;
        this.lifetime[user] = this.lifetime[user] || 0;
        return user;
    };
    ScoreKeeper.prototype.saveUser = function (user) {
        this.robot.brain.data.scores[user] = this.scores[user];
        this.robot.brain.data.lifetime[user] = this.lifetime[user];
        this.robot.brain.emit("save", this.robot.brain.data);
        return this.scores[user];
    };
    ScoreKeeper.prototype.add = function (user, value) {
        user = this.getUser(user);
        this.scores[user] += value;
        this.lifetime[user] += value;
        return this.saveUser(user);
    };
    ScoreKeeper.prototype.scoreForUser = function (user) {
        user = this.getUser(user);
        return this.scores[user];
    };
    ScoreKeeper.prototype.top = function (amount, lifetime) {
        var tops = [];
        for (name in this.scores) {
            tops.push({
                name: name,
                score: this.scores[name],
                lifetime: this.lifetime[name]
            });
        }
        this.robot.logger.info("Lifetime: " + lifetime);
        if (!lifetime) {
            this.robot.logger.info("Sorting by Score");
            return tops.sort(function (a, b) { return b.score - a.score; }).slice(0, amount);
        }
        else {
            this.robot.logger.info("Sorting by lifetime");
            return tops.sort(function (a, b) { return b.lifetime - a.lifetime; }).slice(0, amount);
        }
    };
    ScoreKeeper.prototype.resetScores = function (user) {
        var today = new Date;
        var minutes = today.getMinutes();
        var minutesDisplay = minutes.toString();
        if (minutes < 10) {
            minutesDisplay = "0" + minutes;
        }
        this.robot.brain.data.prevLastReset = this.robot.brain.data.lastReset;
        this.robot.brain.data.prevScores = this.scores;
        this.robot.brain.data.lastReset = "Scores last reset by " + user + " on " +
            (today.getFullYear()) + "-" + (today.getMonth() + 2) + "-" + (today.getDate()) +
            " " + (today.getHours()) + ":" + minutesDisplay;
        this.scores = {};
        this.robot.brain.data.scores = {};
        return this.robot.brain.emit("save", this.robot.brain.data);
    };
    return ScoreKeeper;
}());
var Game = (function () {
    function Game(robot, scoreKeeper) {
        this.robot = robot;
        this.scoreKeeper = scoreKeeper;
        this.insults = ["You moron.", "Do you even know how to trivia?", "FFS that's a stupid answer.", ":fries:", "I give up.", ":fried_shrimp", "Did you fail 3rd grade?", "Dumbass.", "I don't know what your problem is, but I'll bet it's hard to pronounce.", "If ignorance is bliss, you must be the happiest person alive.", "Shouldn't you have a license for being that dumb?", "I'd like to give you a going-away present, first you do your part.", "If your parents get a divorce would they still be brother and sister?", "Your down to earth, but not quite far down enough.", "Sit down, give your mind a rest - it obviously needs it.", "I heard that you changed your mind. So, what did you do with the diaper?", "I don't mind you talking so much, as long as you don't mind me not listening.", "You are not the sharpest knife in the drawer.", "You're so stupid, you sold your car for gas money."];
        var buffer = Fs.readFileSync(Path.resolve("./res", "questions.json"));
        this.questions = JSON.parse(buffer);
        this.tauntUsers = this.robot.brain.data.tauntUsers || [];
    }
    Game.prototype.askQuestion = function (resp) {
        if (!this.currentQ) {
            var index = Math.floor(Math.random() * this.questions.length);
            this.currentQ = this.questions[index];
            this.hintLength = 1;
            this.guessCount = 0;
            // remove optional portions of answer that are in parens
            this.currentQ.validAnswer = this.currentQ.answer.toLowerCase();
            this.currentQ.validAnswer = this.currentQ.validAnswer.replace(/\(.*\)/, "");
            this.currentQ.validAnswer = this.currentQ.validAnswer.replace(/[^a-zA-Z0-9 -]/g, "");
            this.currentQ.validAnswer = this.currentQ.validAnswer.replace(/^(?:(the |a |an ))/g, "");
            this.currentQ.validAnswer = this.currentQ.validAnswer.trim();
        }
        var question = Cheerio.load("<span>" + this.currentQ.question + "</span>");
        var link = question("a").attr("href");
        var text = Entities.decodeHTML(question("span").text());
        return resp.send("---------- :exclamation::new::question::new::exclamation: ----------\n" +
            ("For " + this.currentQ.value + " in the category of " + this.currentQ.category + ":\n") +
            (text + " ") + (link ? " " + link : ""));
    };
    Game.prototype.skipQuestion = function (resp, newQ) {
        if (this.currentQ) {
            resp.send("The answer was " + this.currentQ.answer + ", too easy.");
        }
        this.currentQ = null;
        this.hintLength = null;
        this.guessCount = 0;
        if (newQ) {
            this.askQuestion(resp);
        }
    };
    Game.prototype.endQuestion = function (resp) {
        this.skipQuestion(resp, false);
    };
    Game.prototype.answerQuestion = function (resp, guess) {
        if (this.currentQ) {
            var name = resp.envelope.user.name.toLowerCase().trim();
            this.guessCount = this.guessCount + 1;
            var checkGuess = guess.toLowerCase();
            // remove entities
            checkGuess = checkGuess.replace(/&.{0,}?;/, "");
            // remove all punctuation and spaces, and see if the answer is in the guess.
            checkGuess = checkGuess.replace(/[\\'"\.,-\/#!$%\^&\*;:{}=\-_`~()\s]/g, "");
            checkGuess = checkGuess.replace(/[^a-zA-Z0-9 ]/g, "");
            if (AnswerChecker(checkGuess, this.currentQ.validAnswer)) {
                var value = parseInt(this.currentQ.value.replace(/[^0-9.-]+/g, ""));
                var answerLength = this.currentQ.validAnswer.length;
                if (this.hintLength != null && this.hintLength > 1) {
                    var rawAdjustedValue = Math.ceil(((answerLength - this.hintLength - 1) / answerLength) * value);
                    var adjustedValue = Math.ceil(rawAdjustedValue / 100) * 100;
                    if (adjustedValue < 100) {
                        adjustedValue = 100;
                    }
                }
                else {
                    adjustedValue = value;
                }
                var newScore = this.scoreKeeper.add(name, adjustedValue);
                if (adjustedValue !== value) {
                    resp.reply("is correct! Answer: " + this.currentQ.answer + ". Hints: " +
                        (this.hintLength - 1) + ", Points: Original: " + this.currentQ.value +
                        ", Adjusted: " + adjustedValue + "!");
                }
                else {
                    resp.reply("is correct! Answer: " + this.currentQ.answer + ", you scored $" + adjustedValue + "!");
                }
                this.skipQuestion(resp, true);
            }
            else {
                if (this.tauntUsers.indexOf(name) > -1) {
                    var rand = Math.floor(Math.random() * 100);
                    this.robot.logger.info("random number: " + rand);
                    if (rand < 25) {
                        resp.send((guess + " is incorrect! ") + this.insults[Math.floor(Math.random() * this.insults.length)]);
                    }
                    else {
                        resp.send(guess + " is incorrect!");
                    }
                }
                else {
                    resp.send(guess + " is incorrect.");
                }
            }
        }
        else {
            resp.send("There is no active question!");
        }
    };
    Game.prototype.hint = function (resp) {
        if (this.currentQ) {
            // Get answer
            var answer = this.currentQ.validAnswer;
            // Check if the hintLength is greater than answerLength/2
            if (this.hintLength > answer.length / 2 + 1) {
                resp.send("If you don't know it at this point you're a lost cause.");
                return;
            }
            var hint = answer.substr(0, this.hintLength) + answer.substr(this.hintLength, answer.length +
                this.hintLength).replace(/./g, ".");
            if (answer.length >= this.hintLength) {
                this.hintLength += 1;
            }
            return resp.send("Hint = " + hint);
        }
        else {
            return resp.send("There is no active question!");
        }
    };
    Game.prototype.checkScore = function (resp, name) {
        name = name.toLowerCase().trim();
        var score = this.scoreKeeper.scoreForUser(name);
        return resp.send(name + " has " + score + " points.");
    };
    Game.prototype.leaderBoard = function (resp, amount, lifetime) {
        var op = [];
        amount = parseInt(amount);
        var topscores = this.scoreKeeper.top(amount, lifetime);
        if (!lifetime) {
            resp.send(this.robot.brain.data.lastReset);
        }
        else {
            resp.send("Lifetime Scores:");
        }
        if (topscores.length > 0) {
            _.range(0, topscores.length - 1 + 1).forEach(function (i) { return op.push((i + 1) + ". " + topscores[i].name + ": " + topscores[i].score); });
        }
        else {
            resp.send("There are no current scores, you should start a trivia game!");
        }
        return resp.send(op.join("\n"));
    };
    Game.prototype.resetScores = function (resp) {
        var name;
        name = resp.envelope.user.name.toLowerCase().trim();
        this.scoreKeeper.resetScores(name);
        resp.send("The leaderboard has been reset courtesy of " + name);
    };
    Game.prototype.tauntUser = function (resp, user) {
        if (this.tauntUsers.indexOf(user) === -1) {
            this.tauntUsers.push(user);
            this.tauntList(resp);
        }
        else {
            this.tauntUsers.splice(this.tauntUsers.indexOf(user), 1);
            this.tauntList(resp);
        }
        this.robot.brain.data.tauntUsers = this.tauntUsers;
        return this.robot.brain.emit("save", this.robot.brain.data);
    };
    Game.prototype.tauntList = function (resp) {
        if (this.tauntUsers.length > 0) {
            return resp.send("I'm currently taunting: " + (this.tauntUsers.join(", ")));
        }
        else {
            return resp.send("I'm not taunting anyone right now.");
        }
    };
    return Game;
}());
module.exports = function (robot) {
    var scoreKeeper = new ScoreKeeper(robot);
    var game = new Game(robot, scoreKeeper);
    robot.hear(/^!t(rivia)?$/, function (resp) { return game.askQuestion(resp); });
    robot.hear(/^!sk(ip)?$/, function (resp) { return game.skipQuestion(resp, true); });
    robot.hear(/^!end$/, function (resp) { return game.endQuestion(resp); });
    robot.hear(/^!a(nswer)? (.*)/, function (resp) { return game.answerQuestion(resp, resp.match[2]); });
    robot.hear(/^!score (.*)/i, function (resp) { return game.checkScore(resp, resp.match[1]); });
    robot.hear(/^!s(cores)?$/, function (resp) { return game.leaderBoard(resp, 10000, false); });
    robot.hear(/^!top$/, function (resp) { return game.leaderBoard(resp, 10, false); });
    robot.hear(/^!top (.*)$/, function (resp) { return game.leaderBoard(resp, resp.match[1], false); });
    robot.hear(/^!l(ifetime)?$/, function (resp) { return game.leaderBoard(resp, 10000, true); });
    robot.hear(/^!h(int)?$/i, function (resp) { return game.hint(resp); });
    robot.hear(/^!reset$/, function (resp) { return game.resetScores(resp); });
    robot.hear(/^!taunt (.*)/, function (resp) { return game.tauntUser(resp, resp.match[1]); });
    return robot.hear(/^!taunt-list$/, function (resp) { return game.tauntList(resp); });
};
