import item_store = require('../lib/item_store');

export interface CommandHandler {
	handle(args: any, item: item_store.Item): Q.Promise<void>;
}
