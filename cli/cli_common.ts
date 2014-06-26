import onepass = require('../lib/onepass');

export interface CommandHandler {
	handle(args: any, item: onepass.Item) : Q.Promise<void>;
}

