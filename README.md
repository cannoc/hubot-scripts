# hubot-trivia-game

Written in TypeScript, compiled to JS for hubot.

###Installation:

1. trivia.ts and trivia.js in hubots scripts folder
2. res folder at same level as scripts
3. questions.json (not included) in res folder (see: http://bit.ly/1Tvq3sc)

###Dependencies:

1. cheerio
2. underscore

###Question Format:

{  
  "answer": "Pizza",  
  "category": "FOOD",  
  "question": "Crust, sauce, and toppings!",  
  "value": "$400"  
}

###Commands:

!t(rivia) - Start a game of trivia  
!a(nswer) <answer> - Answer the current question  
!sk(ip) - Skip the current question, start a new round  
!end - End the current round  
!score <user> - Show a user's score  
!scores - Show all user scores  
!top [<num>] - Show top <num> players (default: 10)  
!l(ifetime) - Show all players lifetime scores  
!h(int) - Get a hint of the current round  
!reset - Reset current scores (not lifetime)  
!taunt - Add a user to the taunt list  
!taunt-list - Show users who are being taunted  
!setscore <user> <score> - Set a users score (disabled)  
!setlifetime <user> <score> - Set a users lifetime score (disabled)  
