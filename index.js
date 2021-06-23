const { BotWorker } = require("botkit")
const { 
  ConversationAccount, 
  ChannelAccount, 
  BotAdapter, 
  Activity,
  ActivityTypes,
  TurnContext,
  ConversationReference,
  ResourceResponse 
} = require("botbuilder")
const Debug = require("debug");
const debug = Debug("botkit:vonage");
const promisify = require("util");
const Vonage = require("@vonage/server-sdk")
const CredentialsObject = require("@vonage/server-sdk")

class VonageBotWorker extends BotWorker {
  constructor(Vonage) {
    this.api = Vonage;
  }
  async startConversationWithUser(userId) {
    return this.changeContext({
      channelId: "vonage",
      conversation: {id: userId},
      bot: { id: this.controller.getConfig("vonage_number"), name: "bot" },
      user: { id: userId }
    })
  }
}
class VonageCredentialsObject extends CredentialsObject {
  constructor(CredentialsObject) {
    this.credentials = CredentialsObject
  }
}

module.exports = class VonageAdapter extends BotAdapter {
  constructor(VonageCredentialsObject, config) {
    super()
    this.name = "Vonage Adapter";
    this.middlewares = null;
    this.botkit_worker = VonageBotWorker
    this.credentials = VonageCredentialsObject
    this.options = {}
    this.to_number = config.to_number
    this.from_number = config.from_number
    this.enable_incomplete = config.enable_incomplete
  }
  validation() {
    if (!this.credentials.apiKey || !this.credentials.applicationId) {
      const err =
        "Either apiKey or applicationId is required part of the configuration";
      if (!this.enable_incomplete) {
        throw new Error(err);
      } else {
        console.error(err);
      }
    }

    if (!this.credentials.apiSecret || !this.credentials.privateKey) {
      const err =
        "Either apiKey or applicationId is required part of the configuration";
      if (!this.enable_incomplete) {
        throw new Error(err);
      } else {
        console.error(err);
      }
    }

    if (!this.to_number || !this.from_number) {
      const err =
        "Both to_number and from_number are required parts of the configuration";
      if (!this.enable_incomplete) {
        throw new Error(err);
      } else {
        console.error(err);
      }
    }

    if (this.enable_incomplete) {
      const warning = [
        "",
        "****************************************************************************************",
        "* WARNING: Your adapter may be running with an incomplete/unsafe configuration.        *",
        "* - Ensure all required configuration toFrom are present                              *",
        '* - Disable the "enable_incomplete" option!                                            *',
        "****************************************************************************************",
        "",
      ];
      console.warn(warning.join("\n"));
    }

    try {
      this.api = new Vonage(this.credentials, this.options);
    } catch (err) {
      if (err) {
        if (!this.enable_incomplete) {
          throw new Error(err);
        } else {
          console.error(err);
        }
      }
    }

    this.middlewares = {
      spawn: [
        async (bot, next) => {
          // make the Vonage API available to the bot instance.
          bot.api = this.api;
          next();
        },
      ],
    };
  }
  /**
   * Converts a BotBuilder Activity Object into an outbound ready message for the Vonage Messages API.
   * @param activity A BotBuilder Activity object
   * @returns a Vonage message object with {body, from, to}
   */
   activityToVonage(activity) {
    const message = {
      message: {
        content: {
          text: activity.channelData.message.text
        }
      },
      from: activity.channelData.from.number,
      to: activity.channelData.to.number,
    };

    return message;
  } // END activityToVonage

  /** Message API <<< SendActiviy <<< Bot
   * Standard BotBuilder adapter method to send a message from the bot to the messaging API.
   * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#sendactivities).
   * @param context A TurnContext representing the current incoming message and environment. (Not used)
   * @param activities An array of outgoing activities to be sent back to the messaging API.
   */
   async sendActivities( context, activities ) {
    const sendMessageOverChannel = promisify(this.api.channel.send);

    const responses = [];
    for (let a = 0; a < activities.length; a++) {
      const activity = activities[a];
      if (
        activity.type === ActivityTypes.Message ||
        activity.type === ActivityTypes.Event
      ) {
        const message = this.activityToVonage(activity);
        try {
          const { message_uuid } = await sendMessageOverChannel(
            activity.channelData.to.number,
            activity.channelData.from.number,
            message
          );
          responses.push({ id: message_uuid });
        } catch (err) {
          debug("Error sending message over channel", err);
        }
      } else {
        debug(
          "Unknown message type encountered in sendActivities: ",
          activity.type
        );
      }
    }
    return responses;
  } // END sendActivities

  async updateActivity( context, activity ) {
    debug("Vonage SMS does not support updating activities.");
  }

  async deleteActivity( context, reference ) {
    debug("Vonage SMS does not support deleting activities.");
  }

  /**
   * Standard BotBuilder adapter method for continuing an existing conversation based on a conversation reference.
   * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#continueconversation)
   * @param reference A conversation reference to be applied to future messages.
   * @param logic A bot logic function that will perform continuing action in the form `async(context) => { ... }`
   */
    async continueConversation( reference,  logic) {
    const request = TurnContext.applyConversationReference(
      { type: "event", name: "continueConversation" },
      reference,
      true
    );
    const context = new TurnContext(this, request);

    return this.runMiddleware(context, logic);
  }

  /**
   * Standard BotBuilder adapter method for continuing an existing conversation based on a conversation reference.
   * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#continueconversation)
   * @param reference A conversation reference to be applied to future messages.
   * @param logic A bot logic function that will perform continuing action in the form `async(context) => { ... }`
   */
   async continueConversation( reference, logic ) {
    const request = TurnContext.applyConversationReference(
      { type: "event", name: "continueConversation" },
      reference,
      true
    );
    const context = new TurnContext(this, request);

    return this.runMiddleware(context, logic);
  }

  /** Message API >>> ProcessActivity >>> Bot
   * Accept an incoming webhook request and convert it into a TurnContext which can be
   * processed by the bot's logic.
   * @param req A request object from Restify or Express
   * @param res A response object from Restify or Express
   * @param logic A bot logic function in the form `async(context) => { ... }`
   */
   async processActivity( req, res, logic ) {
    try {
      const event = req.body;

      const activity = {
        id: event.message_uuid,
        timestamp: new Date(),
        channelId: "vonage-sms",
        conversation: {
          id: event.from.number,
        },
        from: {
          id: event.from.number,
        },
        recipient: {
          id: event.to.number,
        },
        text: event.message.content.text,
        channelData: event,
        type: ActivityTypes.Message, // ActivityTypes.Event
      };

      // create a conversation reference
      const context = new TurnContext(this, activity);

      context.turnState.set("httpStatus", 200);

      await this.runMiddleware(context, logic);

      // send http response back
      res.status(context.turnState.get("httpStatus"));
      if (context.turnState.get("httpBody")) {
        res.send(context.turnState.get("httpBody"));
      } else {
        res.end();
      }
    } catch (err){
      debug("Error sending message over channel", err);
    }
  }
  /**
  * TO DO !!!!!
  * Validate that requests are coming from Vonage
  * @returns If authorization Bearer token is valid, returns true. 
  * Otherwise, sends a 400 error status via http response and then returns false.
  */

} // END VonageAdapter

