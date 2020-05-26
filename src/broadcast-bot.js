import fs from 'fs';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import { CronJob } from 'cron';
import jwt from "jsonwebtoken"
import startServer from './server';
import strings from './strings';
import {
  bot,
  WickrIOAPI,
  WickrUser,
  client_auth_codes,
  logger,
  BOT_AUTH_TOKEN,
  BOT_KEY,
  BOT_PORT,
  BOT_GOOGLE_MAPS,
  WICKRIO_BOT_NAME,
  VERIFY_USERS,
  cronJob,
  updateLastID
} from './constants';

let job;
let verifyUsersMode

// need to be able to debug and lint for syntax errors
//
// Web interface definitions
// 
process.stdin.resume(); //so the program will not close instantly
if (!fs.existsSync(process.cwd() + "/attachments")) {
  mkdirSync(process.cwd() + "/attachments");
}
async function exitHandler(options, err) {
  try {
    var closed = await bot.close();
    if (err || options.exit) {
      console.log("Exit reason:", err);
      process.exit();
    } else if (options.pid) {
      process.kill(process.pid);
    }
  } catch (err) {
    console.log(err);
  }
}

//catches ctrl+c and stop.sh events
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { pid: true }));
process.on('SIGUSR2', exitHandler.bind(null, { pid: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

//TODO clear these values!
//TODO make these user variables??
var securityGroupFlag = false;
var securityGroupsToSend = [];
var securityGroups = [];
var repeatFlag = false;
var voiceMemoFlag = false;;
var fileFlag = false;
var cronInterval;
var displayName;
var askForAckFlag = false;
var messagesForReport = []; // unused

async function main() {
  try {
    var status = await bot.start(WICKRIO_BOT_NAME.value)

    if (!status) {
      exitHandler(null, {
        exit: true,
        reason: 'Client not able to start'
      });
    }

    bot.setAdminOnly(false);

    // set the verification mode to true
    if (VERIFY_USERS.encrypted) {
      verifyUsersMode = WickrIOAPI.cmdDecryptString(VERIFY_USERS.value);
    } else {
      verifyUsersMode = VERIFY_USERS.value;
    }

    bot.setVerificationMode(verifyUsersMode);

    //Passes a callback function that will receive incoming messages into the bot client
    bot.startListening(listen);


    if (BOT_AUTH_TOKEN.value, BOT_KEY.value, BOT_PORT.value) {
      // run server
      startServer()

    } else {
      console.log('If you wanted a web interface, the env variables not set properly. Check BOT_AUTH_TOKEN, BOT_KEY, BOT_PORT')

    }
  } catch (err) {
    console.log(err);
  }
}

function listen(message) {
  try {
    /*
     * Parses an incoming message and returns and object with command,
     * argument, vGroupID and Sender fields
     */
    // const last_id = JSON.parse(fs.readFileSync('last_id.json'))


    var parsedMessage = bot.parseMessage(message);
    if (!parsedMessage) {
      return;
    }

    logger.debug('New incoming Message:', parsedMessage);
    var wickrUser;
    var fullMessage = parsedMessage.message;
    var command = parsedMessage.command;
    if (command != undefined) {
      command = command.toLowerCase().trim();
    }
    var argument = parsedMessage.argument;
    var userEmail = parsedMessage.userEmail;
    var vGroupID = parsedMessage.vgroupid;
    var convoType = parsedMessage.convotype;
    var isAdmin = parsedMessage.isAdmin;
    var msgtype = parsedMessage.msgtype;
    var personal_vGroupID = "";

    //Go back to dev toolkit and fix
    if (convoType === 'personal')
      personal_vGroupID = vGroupID;

    if (command === '/ack') {
      //sets ack (3) of all messages sent to user ? what does this mean
      var userEmailString = "" + userEmail;
      setMessageStatus("", userEmail, "3", "");
      return;
    }
    //Send the location as an acknowledgement
    if (msgtype === 'location') {
      //acknowledges all messages sent to user
      var userEmailString = "" + userEmail;
      var statusMessage;
      var obj = {};
      obj['location'] = {
        latitude: parsedMessage.latitude,
        longitude: parsedMessage.longitude
      };

      statusMessage = JSON.stringify(obj);
      logger.debug("location statusMessage=" + statusMessage);
      setMessageStatus("", userEmail, "3", statusMessage);
      return;
    }
    if (command === '/map') {
      let last_id = get_LastID()
      // request last broadcast requested with location
      // or 

      // request last broadcast status with X number of user responses
      if (!argument) {
        reply = 'need /map <number to retrieve>'
        uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
        return;
      }
      // get message status with locations
      const messageStatus = JSON.parse(WickrIOAPI.cmdGetMessageStatus(last_id.toString(), 'full', String(0), String(argument)))
      // create a simple object to store data
      let locations = []
      locations[messageStatus.messageID] = {}
      let link = `https://maps.googleapis.com/maps/api/staticmap?key=${BOT_GOOGLE_MAPS.value}&size=700x400&markers=color:blue`
      if (messageStatus.length > 0) {
        // only get status' with location acked
        // display map of all users who have acknowledged with location
        messageStatus.map(user => {
          let { latitude, longitude } = JSON.parse(user.status_message).location
          locations[messageStatus.messageID][user.user] = {}
          locations[messageStatus.messageID][user.user].location = 'http://www.google.com/maps/place/' + latitude + ',' + longitude;
          locations[messageStatus.messageID][user.user].latitude = latitude
          locations[messageStatus.messageID][user.user].longitude = longitude
          link += `|label:${user.user}|${latitude},${longitude}`
        })
        locations[messageStatus.messageID] = link
        console.log({ link })
        var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, link);

      } else {
        return messageStatus
      }
    }


    logger.debug("convoType=" + convoType);

    // Do not support interaction with Rooms or Groups 
    if (convoType !== 'personal') {
      var reply = strings["one-to-one"];
      var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      return;
    }

    if (!isAdmin) {
      var reply = strings["not-authorized"];
      var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      logger.debug(sMessage);
      return;
    }

    if (command === '/version') {
      var reply = strings["version"].replace("%{integrationVersion}", version)
        .replace("%{addonVersion}", dependencies["wickrio_addon"])
        .replace("%{apiVersion}", dependencies["wickrio-bot-api"]);
      var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      return;
    }

    var user = bot.getUser(userEmail); //Look up user by their wickr email

    if (user === undefined) { //Check if a user exists in the database
      wickrUser = new WickrUser(userEmail, {
        index: 0,
        vGroupID: vGroupID,
        personal_vGroupID: personal_vGroupID,
        command: "",
        argument: "",
        confirm: "",
        type: ""
      });
      user = bot.addUser(wickrUser); //Add a new user to the database
    }
    logger.debug('user:', user)

    if (command === '/help') {
      var reply = bot.getAdminHelp(strings["help"]);
      var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      user.confirm = '';
      logger.debug(sMessage);
    }

    if (command === '/panel') {
      // Check if this user is an administrator
      var adminUser = bot.myAdmins.getAdmin(user.userEmail);
      // scope this conditional down further
      if (adminUser === undefined) {
        return res.statusCode(401).send('Access denied: ' + user.userEmail + ' is not authorized to broadcast!');
      }

      // generate a random auth code for the session
      // store it in a globally accessable store


      var random = generateRandomString(24);
      client_auth_codes[user.userEmail] = random;
      // bot rest requests need basic base64 auth header - broadcast web needs the token from this bot. token is provided through URL - security risk 
      // send token in url, used for calls to receive data, send messages
      const token = jwt.sign({
        'email': user.userEmail,
        'session': random,
      }, BOT_AUTH_TOKEN.value, { expiresIn: '1800s' });

      // what will the deploy env be
      var reply = encodeURI(`localhost:4545/?token=${token}`)
      var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      user.confirm = '';
      logger.debug(sMessage);
    }

    //TODO Should these be else if statements?? alexL: switch case 
    if (command === '/broadcast') {
      logger.debug("argument:" + argument);
      var reply;
      var uMessage;
      if (!argument) {
        reply = strings["usage"];
        uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
        return;
      }
      user.broadcast = argument;
      reply = strings["askForAck"];
      user.confirm = 'askForAck';
      //uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      uMessage = replyWithYesNoButtons(vGroupID, reply);
    }

    if (command === '/status') {
      logger.debug(":" + argument + ":");
      //check argument here!
      //args = argument.split(' ');
      if (argument === '') {
        var messageIdEntries = getMessageEntries(userEmail, 5);
        var reply = "";
        if (messageIdEntries.length < 1) {
          reply = strings["noPrevious"];
          var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
          return;
        }
        var length = Math.min(messageIdEntries.length, 5);
        var contentData;
        var index = 1;
        var messageList = [];
        var messageString = "";
        for (var i = 0; i < messageIdEntries.length; i++) {
          contentData = WickrIOAPI.cmdGetMessageIDEntry(messageIdEntries[i].message_id);
          var contentParsed = JSON.parse(contentData);
          messageList.push(contentParsed.message);
          messageString += '(' + index++ + ') ' + contentParsed.message + "\n";
        }
        reply = strings["whichMessage"].replace("%{length}", length).replace("%{messageList}", messageString);
        //var uMessage = replyWithButtons(vGroupID, reply, messageList);
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
        user.confirm = 'askMessageId';
        //TODO keep working on this!!
      } else if (isNaN(argument)) {
        var reply = strings["enterID"];
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      }
      //fix later~
      //getStatus(argument, "summary");
    }

    if (command === '/report') {
      var messageIdEntries = getMessageEntries(userEmail, 5);
      var reply = "";
      if (messageIdEntries.length < 1) {
        reply = strings["noPrevious"];
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
        return;
      }
      var length = Math.min(messageIdEntries.length, 5);
      var contentData;
      var index = 1;
      var messageString = "";
      var messageList = [];
      //for (var entry of messageIdEntries) {
      //TODO put this into the strings file
      for (var i = 0; i < messageIdEntries.length; i++) {
        contentData = WickrIOAPI.cmdGetMessageIDEntry(messageIdEntries[i].message_id);
        var contentParsed = JSON.parse(contentData);
        messageString += '(' + index++ + ')' + contentParsed.message + '\n';
        messageList.push(contentParsed.message);
      }
      reply = strings["whichReport"].replace("%{length}", length).replace("%{messageList}", messageString);
      //var uMessage = replyWithButtons(vGroupID, reply, messageList);
      var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      user.confirm = 'idForReport';
    }

    if (command === '/abort') {
      logger.debug(":" + argument + ":");
      //check argument here!
      //args = argument.split(' ');
      if (argument === '') {
        var messageIdEntries = getMessageEntries(userEmail, 5);
        var reply = "";
        if (messageIdEntries.length < 1) {
          reply = strings["noPrevious"];
          var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
          return;
        }
        var length = Math.min(messageIdEntries.length, 5);
        var contentData;
        var index = 1;
        var messageList = [];
        var messageString = "";
        for (var i = 0; i < messageIdEntries.length; i++) {
          contentData = WickrIOAPI.cmdGetMessageIDEntry(messageIdEntries[i].message_id);
          var contentParsed = JSON.parse(contentData);
          messageList.push(contentParsed.message);
          messageString += '(' + index++ + ') ' + contentParsed.message + "\n";
        }
        reply = strings["whichMessage"].replace("%{length}", length).replace("%{messageList}", messageString);
        //var uMessage = replyWithButtons(vGroupID, reply, messageList);
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
        user.confirm = 'idForAbort';
        //TODO keep working on this!!
      } else if (isNaN(argument)) {
        var reply = strings["enterID"];
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      }
    }

    if (command === '/cancel') {
      user.confrim = '';
      var reply = strings["canceled"];
      var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      securityGroupFlag = false;
      securityGroupsToSend = [];
      securityGroups = [];
      repeatFlag = false;
      voiceMemoFlag = false;;
      fileFlag = false;
      displayName = "";
      askForAckFlag = false;
      return;
    }

    //TODO check if user.confrim for flow!!
    // why
    if (parsedMessage.file) {
      var msg = "";
      if (parsedMessage.isVoiceMemo) {
        msg = strings["voiceMemoBroadcast"];
        user.confirm = 'sendVoiceMemo';
        user.command = '/voicememo';
        user.voiceMemoLocation = parsedMessage.file;
        user.voiceMemoDuration = parsedMessage.voiceMemoDuration;
      } else {
        msg = strings["fileBroadcast"].replace("%{filename}", parsedMessage.filename);
        displayName = parsedMessage.filename;
        user.confirm = 'sendFile';
        user.command = '/file';
      }
      user.filename = parsedMessage.file;
      //var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
      var sMessage = replyWithYesNoButtons(vGroupID, msg);
      return logger.debug(sMessage);
    }

    if (user.confirm === 'sendFile') {
      var reply = "";
      if (affirmativeReply(fullMessage)) {
        user.confirm = 'askForAck';
        fileFlag = true;
        reply = strings["askForAck"];
      } else if (negativeReply(fullMessage)) {
        user.confirm = "";
        fileFlag = false;
        reply = strings["fileNotSent"];
      } else {
        user.confirm = 'sendFile';
        reply = strings["invalidInput"];
      }
      var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
    } else if (user.confirm === 'sendVoiceMemo') {
      var reply = "";
      if (affirmativeReply(fullMessage)) {
        user.confirm = 'askForAck';
        voiceMemoFlag = true;
        logger.debug("voiceMEmoFlag: " + voiceMemoFlag);
        reply = strings["askForAck"];
      } else if (negativeReply(fullMessage)) {
        user.confirm = "";
        voiceMemoFlag = false;
        reply = strings["voiceMemoNotSent"];
      } else {
        user.confirm = 'sendVoiceMemo';
        reply = strings["invalidInput"];
      }
      var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
    } else if (user.confirm === 'askForAck' && !fullMessage.startsWith("/broadcast")) {
      if (affirmativeReply(fullMessage)) {
        askForAckFlag = true;
      } else if (negativeReply(fullMessage)) {
        askForAckFlag = false;
      } else {
        user.confirm === 'askForAck';
        var reply = strings["invalidInput"];
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
        return;
      }
      user.confirm = 'whichGroup';
      var getGroups = WickrIOAPI.cmdGetSecurityGroups();
      securityGroups = JSON.parse(getGroups);
      var groupMessage = "";
      var groupList = [];
      for (var i = 0; i < securityGroups.length; i++) {
        logger.debug(securityGroups[i].name);
        //TODO when would size be undefinded?? Should this just be the all option??
        if (securityGroups[i].size === undefined) {
          groupMessage = groupMessage + "(" + i + ") " + securityGroups[i].name + "\n";
          groupList.push(securityGroups[i].name);
        } else {
          groupMessage = groupMessage + "(" + i + ") " + securityGroups[i].name + " (users: " + securityGroups[i].size + ")\n";
          groupList.push(securityGroups[i].name);
        }
      }
      reply = strings["whichGroup"].replace("%{securityGroupList}", groupMessage);
      var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      //Send an array of buttons not just strings.
      groupList.push("all");
      //var uMessage = replyWithButtons(vGroupID, reply);
    } else if (user.confirm === 'whichGroup') {
      var reply;
      if (fullMessage.toLowerCase() === 'all') {
        securityGroupFlag = false;
        if (voiceMemoFlag || fileFlag) {
          sendMessage(user, vGroupID, userEmail);
          return;
        } else {
          //TODO Should we confirm sending even if to the whole network??
          user.confirm = "askRepeat";
          // TODO we could make this question how many times send message so not having to ask repeat and ask number of repeats??
          //reply = "Message will be sent to network of " + userNumber + "\nWould you like to repeat this broadcast message?";
          reply = strings["askRepeat"];
        }
      } else {
        user.confirm = "confirmSecurityGroups";
        var groups = fullMessage.split(/[^0-9]/);
        var groupsString = "";
        var reply;
        securityGroupsToSend = [];
        for (var group of groups) {
          var index = parseInt(group);
          if (index >= 0 && index < securityGroups.length) {
            securityGroupsToSend.push(securityGroups[index].id);
            groupsString = groupsString + securityGroups[index].name + "\n";
            securityGroupFlag = true;
            reply = strings["confirmGroups"].replace("%{groupsList}", groupsString);
            //TODO what if some indexes are good and others are not??
          } else {
            user.confirm = 'whichGroup';
            reply = strings["invalidIndex"].replace("%{index}", index);
            var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
            logger.error("index not in bounds" + index);
            securityGroupsToSend = [];
            return;
          }
        }
      }
      logger.debug("Groups to send!: " + securityGroupsToSend);
      var uMessage = replyWithYesNoButtons(vGroupID, reply);
    } else if (user.confirm === 'confirmSecurityGroups') {
      var reply;
      if (affirmativeReply(fullMessage)) {
        if (voiceMemoFlag || fileFlag) {
          sendMessage(user, vGroupID, userEmail);
        } else {
          user.confirm = "askRepeat";
          reply = strings["askRepeat"];
          replyWithYesNoButtons(vGroupID, reply);
        }
      } else if (negativeReply(fullMessage)) {
        user.confirm = 'whichGroup';
        //TODO should buttons go here?
        reply = strings["whichGroupAgain"];
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      } else {
        user.confirm = 'confirmSecurityGroups';
        reply = strings["invalidInput"];
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      }
      //TODO handle this better
    } else if (user.confirm === 'askRepeat') {
      var reply;
      if (negativeReply(fullMessage)) {
        user.confirm = "noRepeat";
        repeatFlag = false;
        sendMessage(user, vGroupID, userEmail);
        return;
      } else if (affirmativeReply(fullMessage)) {
        if (user.cronJobActive) {
          user.confirm = "activeRepeat";
          reply = strings["activeRepeat"];
        } else {
          user.confirm = "timesRepeat";
          reply = strings["timesRepeat"];
        }
      } else {
        user.confirm = "askRepeat";
        reply = strings["askRepeat"];
      }
      // TODO turn this into reply yes no
      var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
    } else if (user.confirm === 'activeRepeat') {
      if (affirmativeReply(fullMessage)) {
        user.cronJobActive = false;
        if (job) {
          job.stop();
        }
        user.confirm = "askRepeat";
        listen(message);
      } else if (negativeReply(fullMessage)) {
        // Do Nothing??
      } else {
        user.confirm = "activeRepeat";
        reply = string["invalidInput"];
      }
    } else if (user.confirm === 'timesRepeat') {
      user.confirm = "yesRepeat";
      if (!isInt(fullMessage) || parseInt(fullMessage) === 0) {
        user.confirm = "timesRepeat";
        var reply = strings["invalidNumberValue"];
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
        return;
      }
      user.repeat = parseInt(fullMessage);
      user.count = 0;
      var reply = strings["repeatFrequency"];
      var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
    } else if (user.confirm === 'yesRepeat') {
      var now = new Date();
      var minutes = now.getMinutes();
      minutes = minutes.toString();
      if (minutes.length === 2)
        minutes = minutes.charAt(1);
      //Do we need the current time to make this work?? Idts
      //Setting a cron time interval based on current time
      if (minutes === '0') {
        minutes = '*'
      } else {
        minutes = minutes + '-59';
      }
      fullMessage = fullMessage.split(' ');
      logger.debug(fullMessage)
      if (fullMessage.includes("5")) {
        user.confirm = "confirmed";
        cronInterval = minutes + '/5 * * * *';
      } else if (fullMessage.includes("10")) {
        user.confirm = "confirmed";
        cronInterval = minutes + '/10 * * * *';
      } else if (fullMessage.includes("15")) {
        //TODO why is this not also confirmed?
        user.confirm = "";
        cronInterval = minutes + '/15 * * * *';
      } else {
        logger.debug('ELSE')
        user.confirm = "yesRepeat";
        var reply = strings["invalidFrequency"];
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
        return;
      }
      repeatFlag = true;
      sendMessage(user, vGroupID, userEmail);
      //TODO IMPORTANT Fix this! 
      //TODO just use one no more array for message id entries!!
    } else if (user.confirm === 'askMessageId' && fullMessage != "/status") {
      //Subtract one to account for 0 based indexes
      var index = parseInt(fullMessage) - 1;
      var messageIdEntries = getMessageEntries(userEmail, 5);
      var length = Math.min(messageIdEntries.length, 5);
      var reply = "";
      if (isNaN(index) || index < 0 || index >= length) {
        user.confirm = 'askMessageId';
        reply = strings["wrongId"].replace("%{index}", (index + 1)).replace("%{length}", length);
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      } else {
        user.confirm = '';
        reply += getStatus(messageIdEntries[index].message_id, "summary", false);
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      }
    } else if (user.confirm === 'idForReport' && fullMessage != "/report") {
      //Subtract one to account for 0 based indexes
      var index = parseInt(fullMessage) - 1;
      var reply = "";
      //TODO make this a global~?
      var messageIdEntries = getMessageEntries(userEmail, 5);
      var length = Math.min(messageIdEntries.length, 5);
      if (isNaN(index) || index < 0 || index >= length) {
        user.confirm = 'idForReport';
        reply = strings["wrongId"].replace("%{index}", (index + 1)).replace("{%length}", length);
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      } else {
        user.confirm = '';
        var path = getCSVReport(messageIdEntries[index].message_id);
        var uMessage = WickrIOAPI.cmdSendRoomAttachment(vGroupID, path, path);
        logger.debug(uMessage);
      }
    } else if (user.confirm === 'idForAbort' && fullMessage != "/abort") {
      //Subtract one to account for 0 based indexes
      var index = parseInt(fullMessage) - 1;
      var messageIdEntries = getMessageEntries(userEmail, 5);
      var length = Math.min(messageIdEntries.length, 5);
      var reply = "";
      if (isNaN(index) || index < 0 || index >= length) {
        user.confirm = 'idForAbort';
        reply = strings["wrongId"].replace("%{index}", (index + 1)).replace("%{length}", length);
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      } else {
        user.confirm = '';
        reply += WickrIOAPI.cmdCancelMessageID(messageIdEntries[index].message_id);
        var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

//Sends every 30 seconds
//TODO add a counter here?
function asyncStatus(messageId, groupId) {
  logger.debug("asyncStatus we are in");
  var asyncJob = new CronJob("*/30 * * * * *", function () {
    var statusObj = getStatus(messageId, "summary", true);
    var uMessage = WickrIOAPI.cmdSendRoomMessage(groupId, statusObj.statusString);
    if (statusObj.complete) {
      logger.debug("ending job for complete string");
      return asyncJob.stop();
    }
  });
  asyncJob.start();
}

function affirmativeReply(message) {
  return message.toLowerCase() === 'yes' || message.toLowerCase() === 'y';
}

function negativeReply(message) {
  return message.toLowerCase() === 'no' || message.toLowerCase() === 'n';
}

function replyWithYesNoButtons(vGroupID, reply) {
  var button1 = {
    type: "message",
    text: "Yes",
    message: "yes"
  };
  var button2 = {
    type: "message",
    text: "No",
    message: "no"
  };
  var buttons = [button1, button2];

  //  replyWithButtons(reply + "NETWORK" , buttons);
  return WickrIOAPI.cmdSendRoomMessage(vGroupID, reply, "", "", "", [], buttons);
  //return WickrIOAPI.cmdSendNetworkMessage(vGroupId, "", "", messageID, flags, buttons);
}

// function replyWithButtons(message, buttonList) {
//   var buttons = [];
//   for (var button of buttonList) {
//     var buttonObj = {
//       type: "message",
//       text: button,
//       message: button
//     }
//     buttons.push(buttonObj);
//   }
//   //return  WickrIOAPI.cmdSendNetworkMessage(message, "", "", messageID, [], buttons);
//   return WickrIOAPI.cmdSendNetworkMessage(message, "", "", "1", [], buttons);
// }

function isInt(value) {
  return !isNaN(value) && (function (x) { return (x | 0) === x; })(parseFloat(value))
}

function sendMessage(user, vGroupID, userEmail) {
  var reply = "";
  var broadcast = user.broadcast;
  var broadcastMsgToSend = user.broadcast + "\n\nBroadcast message sent by: " + userEmail;
  var broadcastRepeat = user.broadcast;
  var sentby = "Broadcast message sent by: " + userEmail;
  var askForAckString = "";
  if (askForAckFlag) {
    broadcastMsgToSend = broadcastMsgToSend + "\nPlease acknowledge this message by replying with /ack";
    sentby = sentby + "\nPlease acknowledge this message by replying with /ack";
  }
  var messageID = updateLastID();
  var target;
  //TODO the nice ternary operator maybe??
  if (securityGroupsToSend.length < 1 || securityGroupsToSend == undefined) {
    target = "NETWORK";
  } else {
    target = securityGroupsToSend.join();
  }
  logger.debug("this is the messageID in the sMessage func" + messageID);
  if (securityGroupFlag) {
    if (voiceMemoFlag) {
      var duration = "" + user.voiceMemoDuration;
      var sendVoiceMemo = WickrIOAPI.cmdSendSecurityGroupVoiceMemo(securityGroupsToSend, user.voiceMemoLocation, "VoiceMemo", duration, "", "", messageID, sentby);
      logger.debug(sendVoiceMemo);
      //optionally add to which groups?
      reply = strings["voiceMemoSentSG"];
    } else if (fileFlag) {
      var send = WickrIOAPI.cmdSendSecurityGroupAttachment(securityGroupsToSend, user.filename, displayName, "", "", messageID, sentby);
      logger.debug(send)
      reply = strings["fileSentSG"];
    } else {
      if (repeatFlag) {
        repeatMessage(broadcastRepeat, user, vGroupID, messageID, userEmail, target);
      } else {
        var send = WickrIOAPI.cmdSendSecurityGroupMessage(broadcastMsgToSend, securityGroupsToSend, "", "", messageID);
        logger.debug("this is send:" + send)
        reply = strings["messageSentSG"];
      }
    }
  } else {
    if (voiceMemoFlag) {
      var duration = "" + user.voiceMemoDuration;
      var sendVoiceMemo = WickrIOAPI.cmdSendNetworkVoiceMemo(user.voiceMemoLocation, "VoiceMemo", duration, "", "", messageID, sentby);
      logger.debug(sendVoiceMemo);
      reply = strings["voiceMemoSent"];
    } else if (fileFlag) {
      logger.debug("This is the sentby" + sentby);
      var send = WickrIOAPI.cmdSendNetworkAttachment(user.filename, displayName, "", "", messageID, sentby);
      logger.debug("this is send" + send)
      reply = strings["fileSent"];
    } else {
      if (repeatFlag) {
        repeatMessage(broadcastRepeat, user, vGroupID, messageID, userEmail, target);
      } else {
        logger.debug("This is messageID:" + messageID + ":");
        var bMessage = WickrIOAPI.cmdSendNetworkMessage(broadcastMsgToSend, "", "", messageID);
        logger.debug("This is bMessage: " + bMessage)
        reply = strings["messageSent"];
      }
    }
  }
  //what if message fails?
  if (!repeatFlag) {
    var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
    logger.debug(uMessage);
    //securityGroupsToSend = [];
    //voiceMemoFlag = false;
    //fileFlag = false;
    //repeatFlag = false;
    //user.broadcast = "";
    //displayName = "";
  }

  var currentDate = new Date();
  //"YYYY-MM-DDTHH:MM:SS.sssZ"
  var jsonDateTime = currentDate.toJSON();
  if (fileFlag) {
    messageID = "" + messageID;
    writeToMessageIdDB(messageID, userEmail, target, jsonDateTime, displayName);
  } else if (voiceMemoFlag) {
    messageID = "" + messageID;
    writeToMessageIdDB(messageID, userEmail, target, jsonDateTime, ("VoiceMemo-" + jsonDateTime));
  } else if (!fileFlag && !voiceMemoFlag) {
    logger.debug("write to messageIdDB");
    messageID = "" + messageID;
    writeToMessageIdDB(messageID, userEmail, target, jsonDateTime, user.broadcast);
  }
  asyncStatus(messageID, vGroupID);
  securityGroupsToSend = [];
  voiceMemoFlag = false;
  fileFlag = false;
  repeatFlag = false;
  user.broadcast = "";
  displayName = "";
}

//TODO get target inside function
function repeatMessage(broadcast, user, vGroupID, messageID, userEmail, target) {
  //Send first repeated message before starting the cronJob
  logger.debug('cronInterval:', cronInterval)
  var bMessage;
  var currentDate = new Date();
  var jsonDateTime = currentDate.toJSON();
  var broadcastMsgToSend = broadcast + "\n\nBroadcast message sent by: " + userEmail;
  logger.debug("Security group flag is: " + securityGroupFlag);
  if (securityGroupFlag) {
    messageID = "" + messageID;
    bMessage = WickrIOAPI.cmdSendSecurityGroupMessage(broadcastMsgToSend, securityGroupsToSend, "", "", messageID);
  } else {
    messageID = "" + messageID;
    bMessage = WickrIOAPI.cmdSendNetworkMessage(broadcastMsgToSend, "", "", messageID);
  }
  logger.debug(bMessage)


  // send message
  var reply = strings["repeatMessageSent"].replace("%{count}", (user.count + 1));
  var uMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, reply);
  user.count += 1;
  cronJob(job, cronInterval, user, broadcast, securityGroupFlag, askForAckFlag, securityGroupsToSend, userEmail, target);
}

function getMessageEntries(userEmail, max) {
  var messageIdEntries = []
  // need to dynamically get last x records, what if there are over 1000 messages

  var tableDataRaw = WickrIOAPI.cmdGetMessageIDTable("0", "1000");
  var tableData = JSON.parse(tableDataRaw);
  for (var i = tableData.length - 1; i >= 0; i--) {
    var entry = tableData[i];
    logger.debug("entry: " + entry);
    //logger.debug("entry keys: " + Object.keys(entry));
    if (entry.sender === userEmail) {
      messageIdEntries.push(entry);
    }
    if (messageIdEntries.length >= max) {
      break;
    }
  }
  return messageIdEntries;
}

//TODO add these strings to file
function getStatus(messageID, type, async) {
  messageID = "" + messageID;
  var statusData;
  try {
    statusData = WickrIOAPI.cmdGetMessageStatus(messageID, type, "0", "1000");
  } catch (err) {
    if (async) {
      var returnObj = {
        statusString: "No data found for that message",
        complete: true
      };
      return returnObj;
    } else {
      return "No data found for that message";
    }
  }
  var messageStatus = JSON.parse(statusData);
  var statusString;

  statusString = strings["messageStatus"].replace("%{num2send}", messageStatus.num2send).replace("%{sent}", messageStatus.sent).replace("%{acked}", messageStatus.acked).replace("%{pending}", messageStatus.pending).replace("%{failed}", messageStatus.failed).replace("%{read}", messageStatus.read).replace("%{aborted}", messageStatus.aborted).replace("%{ignored}", messageStatus.ignored);
  if (messageStatus.ignored !== undefined) {
    statusString = statusString + strings["messageStatusIgnored"].replace("%{ignored}", messageStatus.ignored);
  }

  logger.debug("here is the message status" + statusString);
  if (async) {
    var complete = messageStatus.pending === 0;
    var returnObj = {
      statusString: statusString,
      complete: complete
    };
    return returnObj;
  } else {
    return statusString;
  }
}

function writeToMessageIdDB(messageId, sender, target, dateSent, messageContent) {
  logger.debug("inside~writeToMessageIdDB");
  WickrIOAPI.cmdAddMessageID(messageId, sender, target, dateSent, messageContent);
}

function setMessageStatus(messageId, userId, status, statusMessage) {
  var reply = WickrIOAPI.cmdSetMessageStatus(messageId, userId, status, statusMessage);
  // var userArray = [userId];
  // var uMessage = WickrIOAPI.cmdSend1to1Message(userArray, reply);
}

function get_LastID() {
  try {
    let lastID
    if (fs.existsSync('last_id.json')) {
      var data = fs.readFileSync('last_id.json');
      logger.debug("is the data okay: " + data);
      lastID = JSON.parse(data);
    } else {
      lastID = '1'
      fs.writeFile('last_id.json', lastID, (err) => {
        //Fix this 
        if (err) throw err;
        logger.trace("Current Message ID saved in file");
      });
    }
    logger.debug("This is the id: " + lastID);
    return lastID;
  } catch (err) {
    logger.error(err);
  }
}

function getCSVReport(messageId) {
  var inc = 0;
  var csvArray = [];
  while (true) {
    var statusData = WickrIOAPI.cmdGetMessageStatus(messageId, "full", "" + inc, "1000");
    var messageStatus = JSON.parse(statusData);
    for (var entry of messageStatus) {
      var statusMessageString = "";
      var statusString = "";

      var sentDateString = "";
      var readDateString = "";
      if (entry.sent_datetime !== undefined)
        sentDateString = entry.sent_datetime;
      if (entry.read_datetime !== undefined)
        readDateString = entry.read_datetime;
      switch (entry.status) {
        case 0:
          statusString = "pending";
          break;
        case 1:
          statusString = "sent";
          break;
        case 2:
          statusString = "failed";
          statusMessageString = entry.status_message;
          break;
        case 3:
          statusString = "acked";
          if (entry.status_message !== undefined) {
            var obj = JSON.parse(entry.status_message);
            if (obj['location'] !== undefined) {
              var latitude = obj['location'].latitude;
              var longitude = obj['location'].longitude;
              statusMessageString = 'http://www.google.com/maps/place/' + latitude + ',' + longitude;
            } else {
              statusMessageString = entry.status_message;
            }
          }
          break;
        case 4:
          statusString = "ignored";
          statusMessageString = entry.status_message;
          break;
        case 5:
          statusString = "aborted";
          statusMessageString = entry.status_message;
          break;
        case 6:
          statusString = "read";
          statusMessageString = entry.status_message;
          break;
      }

      csvArray.push(
        {
          user: entry.user,
          status: statusString,
          statusMessage: statusMessageString,
          sentDate: sentDateString,
          readDate: readDateString
        });
    }
    if (messageStatus.length < 1000) {
      break;
    }
    inc++;
  }
  var now = new Date();
  var dateString = now.getDate() + "-" + (now.getMonth() + 1) + "-" + now.getFullYear() + "_" + now.getHours() + "_" + now.getMinutes() + "_" + now.getSeconds();

  var path = process.cwd() + "/attachments/report-" + dateString + ".csv";
  writeCSVReport(path, csvArray);
  return path;
}

function writeCSVReport(path, csvArray) {
  var csvWriter = createCsvWriter({
    path: path,
    header: [
      { id: 'user', title: 'USER' },
      { id: 'status', title: 'STATUS' },
      { id: 'statusMessage', title: 'MESSAGE' },
      { id: 'sentDate', title: 'SENT' },
      { id: 'readDate', title: 'READ' }
    ]
  });
  csvWriter.writeRecords(csvArray)
    .then(() => {
      logger.debug('...Done');
    });
}

//Basic function to validate credentials for example
// function checkCreds(authToken) {
//   try {
//     var valid = true;
//     const authStr = Buffer.from(authToken, 'base64').toString();
//     //implement authToken verification in here
//     if (authStr !== bot_api_auth_token) {
//       valid = false;
//       console.log('Access denied: invalid basic-auth token.')
//     }
//     return valid;
//   } catch (err) {
//     console.log(err);
//   }
// }

function generateRandomString(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

main();
