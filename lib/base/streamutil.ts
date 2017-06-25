import collectionutil = require('./collectionutil');
import { defer } from './promise_util';

export function readAll(readable: NodeJS.ReadableStream): Promise<string> {
    var result = defer<string>();
    var body = '';
    readable.on('data', (chunk: any) => {
        // in Node.js if the stream is from http.ClientResponse
        // then chunk will be a Buffer. Under node-browserify it
        // will be a Uint8Array if xhr.responseType was set to 'arraybuffer'
        if (chunk instanceof Uint8Array) {
            body += collectionutil.stringFromBuffer(chunk);
        } else {
            body += chunk.toString('binary');
        }
    });
    readable.on('end', () => {
        result.resolve(body);
    });
    return result.promise;
}

export function readJSON(readable: NodeJS.ReadableStream): Promise<any> {
    return readAll(readable).then(content => {
        return Promise.resolve(JSON.parse(content));
    });
}
