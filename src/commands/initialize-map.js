import State from '../state'
import { logger } from '../helpers/constants'

class InitializeMap {
  constructor(broadcastService) {
    this.broadcastService = broadcastService
    this.commandString = '/map'
  }

  shouldExecute(messageService) {
    if (messageService.getCommand() === this.commandString) {
      return true
    }
    return false
  }

  execute(messageService) {
    // this.broadcastService.setMessage(messageService.getArgument());
    // this.broadcastService.setUserEmail(messageService.getUserEmail());
    // this.broadcastService.setVGroupID(messageService.getVGroupID());
    // this.broadcastService.setTTL('');
    // this.broadcastService.setBOR('');
    // this.broadcastService.setSentByFlag(true);
    // logger.debug(`Here are all the things: ${messageService.getArgument()}`);
    // let reply = 'Would you like to ask the recipients for an acknowledgement?';
    // let state = State.ASK_FOR_ACK;
    // TODO check for undefined??
    // if (
    //   messageService.getArgument() === undefined
    //   || messageService.getArgument() === ''
    //   || messageService.getArgument().length === 0
    // ) {
    //   reply = 'Must have a number or file to broadcast, Usage: /map <message>';
    //   state = State.NONE;
    // }
    // return {
    //   reply,
    //   state,
    // };
  }
}

export default InitializeMap
