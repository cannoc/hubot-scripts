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

declare function require(name:string);
var module;
var Fs = require("fs");
var Path = require("path");
var Cheerio = require("cheerio");
var Entities = require("entities");
var AnswerChecker = require("../res/answer-checker");
var _ = require("underscore");

var insults = ["You moron.", "Do you even know how to trivia?", "FFS that's a stupid answer.", ":fries:", "I give up.", ":fried_shrimp", "Did you fail 3rd grade?", "Dumbass.", "I don't know what your problem is, but I'll bet it's hard to pronounce.", "If ignorance is bliss, you must be the happiest person alive.", "Shouldn't you have a license for being that dumb?", "I'd like to give you a going-away present, first you do your part.", "If your parents get a divorce would they still be brother and sister?", "Your down to earth, but not quite far down enough.", "Sit down, give your mind a rest - it obviously needs it.", "I heard that you changed your mind. So, what did you do with the diaper?", "I don't mind you talking so much, as long as you don't mind me not listening.", "You are not the sharpest knife in the drawer.", "You're so stupid, you sold your car for gas money."];

class ScoreKeeper {
  cache: { scores: Object; lifetime: Object; }
    constructor(public robot) {
      this.cache = {scores:{}, lifetime:{} };
      this.robot.brain.on("loaded", () => {
          this.cache.scores = this.robot.brain.data.scores;
          this.cache.lifetime = this.robot.brain.data.lifetime;
      });
    }

    public getUser(user) {
        this.cache.scores[user] = this.cache.scores[user] || 0;
        this.cache.lifetime[user] = this.cache.lifetime[user] || 0;
        return user;
    }

    public saveUser(user) {
	
        this.robot.brain.data.scores[user] = this.cache.scores[user];
        this.robot.brain.data.lifetime[user] = this.cache.lifetime[user];
        this.robot.brain.emit("save", this.robot.brain.data);

        return this.cache.scores[user];
    }

    public add(user, value) {
        user = this.getUser(user);
        this.cache.scores[user] += value;
        this.cache.lifetime[user] += value;
        return this.saveUser(user);
    }

    public scoreForUser(user) {
        user = this.getUser(user);
        return this.cache.scores[user];
    }

    public top(amount, lifetime) {
        var tops = [];
        if (!lifetime) {
          for (let name in this.cache.scores) {
              tops.push({
                  name: name,
                  score: this.cache.scores[name]
              });
          }
        } else {
          for (let name in this.cache.lifetime) {
              tops.push({
                  name: name,
                  score: this.cache.lifetime[name]
              });
          }
        }
        this.robot.logger.info("Tops: " + JSON.stringify(tops));
        return tops.sort((a, b) => b.score - a.score).slice(0, amount);
    }

    public resetScores(user) {
        var today = new Date;
        var minutes:any = today.getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        }

        this.robot.brain.data.prevLastReset = this.robot.brain.data.lastReset;
        this.robot.brain.data.prevScores = this.cache.scores;

        this.robot.brain.data.lastReset = "Scores last reset by " + user + " on " + (today.getFullYear()) + "-" + (today.getMonth() + 2) + "-" + (today.getDate()) + " " + (today.getHours()) + ":" + minutes;
        this.cache.scores = {};
        this.robot.brain.data.scores = {};
        this.robot.brain.emit("save", this.robot.brain.data);
    }
  
    public setScore(user, score) {
   	this.cache.scores[user] = parseInt(score);
    }

    public setLifetime(user, score) {
        this.cache.lifetime[user] = parseInt(score);
    }
}

interface Question {
  category:string;
  air_date:string;
  question:string;
  value:string;
  answer:string;
  round:string;
  show_number:string;
  validAnswer?:string;
}

class Game {
    questions: Array<Question>;
    tauntUsers: Array<string> = [];
    currentQ: Question;
    hintLength: number;
    guessCount: number;

    constructor(public robot, public scoreKeeper) {
        var buffer = Fs.readFileSync(Path.resolve("./res", "questions.json"));
        this.questions = JSON.parse(buffer);
        this.tauntUsers = this.robot.brain.data.tauntUsers || [];
    }

    public askQuestion(resp) {
        if (!this.currentQ) {  // set current question
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
    }

    public skipQuestion(resp) {
        if (this.currentQ) {
            resp.send("The answer was " + this.currentQ.answer + ", too easy.");
            this.currentQ = null;
            this.hintLength = null;
            this.guessCount = 0;
            return this.askQuestion(resp);
        } else {
            return resp.send("Either there is not a question or you were too slow!!");
        }
    }

    public endQuestion(resp) {
        if (this.currentQ) {
            resp.send("The answer was " + this.currentQ.answer + ", obviously.");
            this.currentQ = null;
            this.hintLength = null;
            return this.guessCount = 0;
        }
    }

    public answerQuestion(resp, guess) {
        if (this.currentQ) {
            name = resp.envelope.user.name.toLowerCase().trim();
            this.guessCount = this.guessCount + 1;
            var checkGuess = guess.toLowerCase();
            // remove html entities (slack's adapter sends & as &amp; now)
            checkGuess = checkGuess.replace(/&.{0,}?;/, "");
            // remove all punctuation and spaces, and see if the answer is in the guess.
            checkGuess = checkGuess.replace(/[\\'"\.,-\/#!$%\^&\*;:{}=\-_`~()\s]/g, "");

            checkGuess = checkGuess.replace(/[^a-zA-Z0-9 ]/g, "");

            if (AnswerChecker(checkGuess, this.currentQ.validAnswer)) {
                var value:any = this.currentQ.value.replace(/[^0-9.-]+/g, "");
                value = parseInt(value);

                var answerLength = this.currentQ.validAnswer.length;
                if ((this.hintLength != null) && this.hintLength > 1) {
                    var rawAdjustedValue = Math.ceil(((answerLength - this.hintLength - 1) / answerLength) * value);
                    var adjustedValue = Math.ceil(rawAdjustedValue / 100) * 100;
                    if (adjustedValue < 100) {
                        adjustedValue = 100;
                    }
                } else {
                    adjustedValue = value;
                }

                var user = resp.envelope.user.name.toLowerCase().trim();
                var newScore = this.scoreKeeper.add(user, adjustedValue);

                if (adjustedValue !== value) {
                    resp.reply("is correct! Answer: " + this.currentQ.answer + ". Hints: " + (this.hintLength - 1) + ", Points: Original: " + this.currentQ.value + ", Adjusted: " + adjustedValue + "!");
                } else {
                    resp.reply("is correct! Answer: " + this.currentQ.answer + ", you scored $" + adjustedValue + "!");
                }

                this.currentQ = null;
                this.hintLength = null;
                this.guessCount = 0;
                return this.askQuestion(resp);
            } else {
                if (this.tauntUsers.indexOf(name) > -1) {
                    var rand = Math.floor(Math.random() * 100);
                    if (rand < 25) {
                        return resp.send((guess + " is incorrect! ") + insults[Math.floor(Math.random() * insults.length)]);
                    } else {
                        return resp.send(guess + " is incorrect!");
                    }
                } else {
                    return resp.send(guess + " is incorrect.");
                }
            }
        } else {
            return resp.send("There is no active question!");
        }
    }

    public hint(resp) {
        if (this.currentQ) {
            // Get answer
            var answer = this.currentQ.validAnswer;

            // Check if the hintLength is greater than answerLength/2
            if (this.hintLength > answer.length / 2 + 1) {
                resp.send("If you don't know it at this point you're a lost cause.");
                return;
            }

            var hint = answer.substr(0, this.hintLength) + answer.substr(this.hintLength, answer.length + this.hintLength).replace(/./g, ".");

            if (this.hintLength <= answer.length) {
                this.hintLength += 1;
            }

            return resp.send("Hint = " + hint);
        } else {
            return resp.send("There is no active question!");
        }
    }

    public checkScore(resp, name) {
        name = name.toLowerCase().trim();
        var score = this.scoreKeeper.scoreForUser(name);
        return resp.send(name + " has " + score + " points.");
    }

    public leaderBoard(resp, amount, lifetime) {
        var op = [];
        amount = parseInt(amount);
	
        var topscores = this.scoreKeeper.top(amount, lifetime);

        if(lifetime) {
          resp.send("Lifetime Scores:");
        } else {
          resp.send(this.robot.brain.data.lastReset);
        }

        if(topscores.length > 0) {
          _.range(0, topscores.length - 1 + 1).forEach(function (i) { return op.push((i + 1) + ". " + topscores[i].name + ": " + topscores[i].score); });
          resp.send(op.join("\n"));
        } else {
          resp.send("There are no scores to display, you should play some trivia!");
        }
    }

    public resetScores(resp) {
        var name = resp.envelope.user.name.toLowerCase().trim();
        this.scoreKeeper.resetScores(name);
        return resp.send("The leaderboard has been reset courtesy of " + name);
    }

    public tauntUser(resp, user) {
        if (this.tauntUsers.indexOf(user) === -1) {
            this.tauntUsers.push(user);
            this.tauntList(resp);
        } else {
            this.tauntUsers.splice(this.tauntUsers.indexOf(user), 1);
            this.tauntList(resp);
        }

        this.robot.brain.data.tauntUsers = this.tauntUsers;
        return this.robot.brain.emit("save", this.robot.brain.data);
    }

    public tauntList(resp) {
        if (this.tauntUsers.length > 0) {
            return resp.send("I'm currently taunting: " + (this.tauntUsers.join(", ")));
        } else {
            return resp.send("I'm not taunting anyone right now.");
        }
    }

    public setScore(resp, user, score) {
	this.scoreKeeper.setScore(user, score);
    }

    public setLifetime(resp, user, score) {
 	this.scoreKeeper.setLifetime(user, score);
    }
}

module.exports = (robot) => {
    var scoreKeeper = new ScoreKeeper(robot);
    var game = new Game(robot, scoreKeeper);

    robot.hear(/^!t(rivia)?$/, (resp) => game.askQuestion(resp));

    robot.hear(/^!sk(ip)?$/, (resp) => game.skipQuestion(resp));

    robot.hear(/^!end$/, (resp) => game.endQuestion(resp));

    robot.hear(/^!a(nswer)? (.*)/, (resp) => game.answerQuestion(resp, resp.match[2]));

    robot.hear(/^!score (.*)/i, (resp) => game.checkScore(resp, resp.match[1]));

    robot.hear(/^!s(cores)?$/, (resp) => game.leaderBoard(resp, 10000, false));

    robot.hear(/^!top$/, (resp) => game.leaderBoard(resp, 10, false));

    robot.hear(/^!top (.*)$/, (resp) => game.leaderBoard(resp, resp.match[1], false));

    robot.hear(/^!l(ifetime)?$/, (resp) => game.leaderBoard(resp, 10000, true));

    robot.hear(/^!h(int)?$/i, (resp) => game.hint(resp));

    robot.hear(/^!reset$/, (resp) => game.resetScores(resp));

    robot.hear(/^!taunt (.*)/, (resp) => game.tauntUser(resp, resp.match[1]));

    robot.hear(/^!taunt-list$/, (resp) => game.tauntList(resp));

    robot.hear(/^!setscore (.*) (.*)/, (resp) => game.setScore(resp, resp.match[1], resp.match[2]));

    robot.hear(/^!setlifetime (.*) (.*)/, (resp) => game.setLifetime(resp, resp.match[1], resp.match[2]));

};

