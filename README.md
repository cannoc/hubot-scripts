# Hubot Scripts

A colletion of hubot scripts I've modified over the last while to make my Rocketchat experience more fun! 

### Bitly
  Some useful utilites for bitly
### CatFacts
  Random facts about cats!
### EarDropping
  Hubot will do a thing when he hears a phrase.  This one replaced a lot of other scripts.
### Echo
  Hubot will say/do what you said, optionally in a different room.
### EdBalls
  Ed Balls
### Encourage
  Hubot will encourage someone.
### Flip.js
  Flip/unflip things
### Giphyme
  Hubot will look up a gif from giphy (often times poorly, which makes it fun)
### Greetings
  Set custom greetings for hubot to say when you enter a room
### Help
  Shows the commands hubot responds to (based on comments in files)
### Mute
  Hubot will shut up in a particular channel
### PlexPy
  Collect stats from a plexpy api
### Pugme
  Pugs for everyone
### Quotes
  Endless fun quote database, supports random quotes
### Reload
  Hubot will reload his scripts
### Sudo
  Hubot will do whatever you say
### Trivia
  A full blown trivia game with scoreboards
### XKCD
  Show an xkcd comic strip


# hubot-trivia-game

Written in TypeScript, compiled to JS for hubot.

Based on https://github.com/ravikiranj/hubot-trivia-game

###Installation:

1. trivia.ts and trivia.js in hubots scripts folder
2. res folder at same level as scripts
3. questions.json (not included) in res folder (see: http://bit.ly/1Tvq3sc)

###Dependencies:

1. cheerio
2. underscore

###Question Format:
```
{  
  "answer": "Pizza",  
  "category": "FOOD",  
  "question": "Crust, sauce, and toppings!",  
  "value": "$400"  
}
```
###Commands:

**!t(rivia)** - Start a game of trivia  
**!a(nswer) \<answer\>** - Answer the current question  
**!sk(ip)** - Skip the current question, start a new round  
**!end** - End the current round  
**!score \<user\>** - Show a user's score  
**!scores** - Show all user scores  
**!top \[\<num\>\]** - Show top <num> players (default: 10)  
**!l(ifetime)** - Show all players lifetime scores  
**!h(int)** - Get a hint of the current round  
**!reset** - Reset current scores (not lifetime)  
**!taunt** - Add a user to the taunt list  
**!taunt-list** - Show users who are being taunted  
**!setscore \<user\> \<score\>** - Set a users score (disabled)  
**!setlifetime \<user\> \<score\>** - Set a users lifetime score (disabled)  
