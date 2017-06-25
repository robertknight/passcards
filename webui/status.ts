import event_stream = require('../lib/base/event_stream');

export enum StatusType {
    Success,
    Error,
}

export class Status {
    type: StatusType;
    text: string;

    expired: event_stream.EventStream<void>;

    constructor(type: StatusType, text: string) {
        var DEFAULT_TIMEOUT = 2000;
        this.type = type;
        this.text = text;
        this.expired = new event_stream.EventStream<void>();
        setTimeout(() => {
            this.expired.publish(null);
        }, DEFAULT_TIMEOUT);
    }

    static withError(err: string | Error) {
        if (typeof err === 'string') {
            return new Status(StatusType.Error, err);
        } else {
            return new Status(StatusType.Error, err.message);
        }
    }
}
