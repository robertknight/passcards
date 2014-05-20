import Q = require('q');
import underscore = require('underscore');

export interface Request {
	id?: number
}

export interface Response {
	requestId: number
}

interface WorkerTask<Req extends Request, Rsp extends Response> {
	request: Req;
	response: Q.Deferred<Rsp>;
}

export class WorkerPool<Req extends Request, Rsp extends Response> {
	private workers: Worker[];
	private workerTasks: WorkerTask<Req, Rsp>[];
	private nextTaskId: number;

	constructor(workerScript: string) {
		this.workers = [
			new Worker(workerScript),
			new Worker(workerScript)
		];
		this.workerTasks = [];
		this.nextTaskId = 0;

		this.workers.forEach((worker) => {
			worker.onmessage = (e: MessageEvent) => {
				var response = <Rsp>e.data;
				this.workerTasks = underscore.reject(this.workerTasks, (task) => {
					if (task.request.id == response.requestId) {
						task.response.resolve(response);
						return true;
					}
					return false;
				});
			}
		});
	}

	dispatch(request: Req) : Q.Promise<Rsp> {
		var task = <WorkerTask<Req,Rsp>>{
			request: request,
			response: Q.defer<Rsp>()
		};
		request.id = this.nextTaskId;
		this.workerTasks.push(task);
		this.workers[request.id % this.workers.length].postMessage(request);
		++this.nextTaskId;
		return task.response.promise;
	}
}

