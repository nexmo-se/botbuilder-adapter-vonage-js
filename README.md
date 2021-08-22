# botbuilder-adapter-vonage-js

This package contains an adapter that communicates directly with the [Vonage Messages API](https://developer.nexmo.com/messages/overview), and translates messages to and from a standard format used by your bot. This package can be used alongside your favorite bot development framework to build bots that work with Vonage Messages API.

## Before you Begin

You'll neeed to have a Vonage API account, a Vonage Virtual Number, install then run NGROK and setup webhooks for the Messages API with the NGROK URL. You can find clear instructions [here](https://developer.nexmo.com/messages/code-snippets/before-you-begin).

## Use VonageAdapter

VonageAdapter provides a translation layer to the Microsoft Bot Framework, so that bot developers can connect to Vonage Messages API via using the [Vonage Server SDk Client](https://github.com/Vonage/vonage-node-sdk).

## Node.js Module

This is a npm module in TypeScript, which is "importable" in JavaScript and TypeScript

## Install Package

Most npm modules come without a Type definition, so TypeScript developers will have to run an additional `npm i @types/<module_name> -D` command to be able to use the npm module

Add this package to your project using npm:

```bash
npm install --save botbuilder-adapter-vonage
```

Import the adapter class into your code:

```javascript
const VonageAdapter = require('botbuilder-adapter-vonage-js');
```

## Quick start Demo

Before proceeding, you'll have to complete the steps at [Before you Begin](#before-you-begin), if not then please complete that. The code snippet below has the code to run the Demo. You can learn more by following the [instructions](https://botkit.ai/getstarted.html) to create a customized application template.

Use the VonageAdapter to connect to the Microsoft Bot Framework via either [Botkit](https://www.npmjs.com/package/botkit) or [BotBuilder](https://www.npmjs.com/package/botbuilder). Using `BotBuilder` with the VonageAdapter, would allow the adapter to be used more directly with a `webserver`, and all incoming events are handled as [Activities](https://docs.microsoft.com/en-us/javascript/api/botframework-schema/activity?view=botbuilder-ts-latest).

**Example 1:** VonageAdapter use with BotKit.

```javascript
// webhook-server.js
'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const VonageAdapter = require('botbuilder-adapter-vonage-js');
const { Botkit } = require('botkit');

const creds = {
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKey: process.env.VONAGE_APPLICATION_PRIVATE_KEY_PATH,
};
const config = {
  to_number: process.env.TO_NUMBER,
  from_number: process.env.FROM_NUMBER,
  // enable_incomplete: true
};

const adapter = new VonageAdapter(creds, config);

const controller = new Botkit({
  webhook_uri: '/webhooks/inbound',
  adapter,
});

controller.hears('.*', 'message', async (bot, message) => {
  await bot.reply(message, 'I heard: ' + message.text);
});

controller.on('event', async (bot, message) => {
  await bot.reply(message, 'I received an event of type ' + message.type);
});

app.post('/webhooks/status', (req, res) => {
  console.log(req.body);
  res.status(200).end();
});

app.post('/webhooks/dir', (req, res) => {
  res.status(200).end();
});
```

Run ngrok, then set your Vonage Application to the new Ngrok URL.

```js
ngrok http 3000
```

Start the [webhook server](https://developer.nexmo.com/concepts/guides/webhooks), then from your phone send a text to your Virtual Number. You should get a reply "I heard msg-you-sent!"

```js
nodemon webhook-server.js
```

### Botkit Basics

When used in concert with Botkit, developers need only pass the configured adapter to the Botkit constructor, as seen below. Botkit will automatically create and configure the webhook endpoints and other options necessary for communicating with Google.

Developers can then bind to Botkit's event emitting system using `controller.on` and `controller.hears` to filter and handle incoming events from the messaging platform. [Learn more about Botkit's core feature &rarr;](../docs/index.md).

[A full description of the VonageAdapter options and example code can be found in the class reference docs.](../docs/reference/hangouts.md#create-a-new-VonageAdapter)

```javascript
const creds = {
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKey: process.env.VONAGE_APPLICATION_PRIVATE_KEY_PATH,
};
const config = {
  to_number: process.env.TO_NUMBER,
  from_number: process.env.FROM_NUMBER,
  // enable_incomplete: true
};

const adapter = new VonageAdapter(creds, config);

const controller = new Botkit({
  webhook_uri: '/webhooks/inbound',
  adapter,
});

controller.on('message', async (bot, message) => {
  await bot.reply(message, 'I heard a message!');
});
```

### BotBuilder Basics

Alternately, developers may choose to use `VonageAdapter` with BotBuilder. With BotBuilder, the adapter is used more directly with a webserver, and all incoming events are handled as [Activities](https://docs.microsoft.com/en-us/javascript/api/botframework-schema/activity?view=botbuilder-ts-latest).

**Example 2:** VonageAdapter used with Botbuilder

```javascript
const creds = {
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKey: process.env.VONAGE_APPLICATION_PRIVATE_KEY_PATH,
};
const config = {
  to_number: process.env.TO_NUMBER,
  from_number: process.env.FROM_NUMBER,
  // enable_incomplete: true
};

const adapter = new VonageAdapter(creds, config);

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.post('/webhooks/inbound', (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    await context.sendActivity('I heard a message!');
  });
});
```

## Class Reference

- [VonageAdapter](../docs/reference/vonage.md#VonageAdapter)
- [BotWorker Extensions](../docs/reference/vonage.md#vonagebotworker)

## Event List

Botkit will emit the following events:

| Event   | Description           |
| ------- | --------------------- |
| message | a message from a user |

## Calling Vonage Message APIs

This package exposes a pre-configured [Vonage Server API client](https://github.com/Vonage/vonage-node-sdk) for developers who want to use one of the many available API endpoints.

In Botkit handlers, the `bot` worker object passed into all handlers will contain a `bot.api` field that contains the client, preconfigured and ready to use.

```javascript
controller.on('message', async(bot, message) {

    // create a message using the API directly
    let res = await bot.api.channel.send(my_message_object)

});
```

## Botkit Extensions

In Botkit handlers, the `bot` worker for Vonage contains [all of the base methods](../docs/reference/core.md#BotWorker) as well as the following platform-specific extensions:

### Use attachments, quick replies and other rich message features

Botkit will automatically construct your outgoing messages according to Vonage's specifications. To use attachments, quick replies or other features, add them to the message object used to create the reply:

### [bot.startConversationWithUser()](../docs/reference/facebook.md#startconversationwithuser)

Use this method to initiate a conversation with a user. After calling this method, any further actions carried out by the bot worker will happen with the specified user.

This can be used to create or resume conversations with users that are not in direct response to an incoming message, like those sent on a schedule or in response to external events.

## Community & Support

Join our thriving community of Botkit developers and bot enthusiasts at large.
Over 10,000 members strong, [our open Slack group](https://community.botkit.ai) is
_the place_ for people interested in the art and science of making bots.
Come to ask questions, share your progress, and commune with your peers!

You can also find help from members of the Botkit team [in our dedicated Cisco Spark room](https://eurl.io/#SyNZuomKx)!

## About Botkit

Botkit is a part of the [Microsoft Bot Framework](https://dev.botframework.com).

Want to contribute? [Read the contributor guide](https://github.com/howdyai/botkit/blob/master/CONTRIBUTING.md)

Botkit is released under the [MIT Open Source license](https://github.com/howdyai/botkit/blob/master/LICENSE.md)

## Used when making Module:

- `npm install botkit`
- `npm install @vonage/server-sdk@beta`

## Developing and Testing NPM locally

```js
// In NPM Package directory, Link the NPM package to allow local testing (instead of npm publish)
npm link

// In test directory
// Link the npm module
npm link botbuilder-adapter-vonage-js

// Now install the local NPM Package
npm i /<PATH>/botbuilder-adapter-vonage-js
// npm uninstall /Users/kittphi/Repos/botbuilder-adapter-vonage-js
E.G. npm i /Users/kittphi/Repos/botbuilder-adapter-vonage-js

// to update the NPM package
npm update /Users/kittphi/Repos/botbuilder-adapter-vonage-js
```
