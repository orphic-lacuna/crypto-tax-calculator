/**
 * Base class for all transactions. Each transaction has a timestamp and depot to which it belongs.
 */
export class Transaction {
	
	static _idCounter = 0;
	
	constructor(depot, timestamp, asset, amount) {
		if (!depot) throw new Error("cannot create transaction without depot");
		if (typeof timestamp != "number") throw new Error("cannot create transaction without timestamp");
		this.depot = depot;
		this.timestamp = timestamp;
		this.asset = asset;
		this.amount = amount;
		this._isProcessed = false;
		
		// unique id for the transction
		this.id = Transaction._idCounter;
		Transaction._idCounter += 1;
	}
	
	process() {
		if (!this.isProcessed()) {
			this._processingResult = this._process(...arguments);
			this._isProcessed = true;
		}
		return this._processingResult;
	}
	
	isProcessed() {
		return this._isProcessed;
	}
	
	toString() {
		return "transaction on depot " + depot.getFullname() + ": " + this.amount.toString() + " " + this.asset + " at " + new Date(this.timestamp*1000).toLocaleString();
	}
}

export { Tranche } from "../../Tranche.js";