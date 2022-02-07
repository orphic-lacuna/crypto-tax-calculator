import { Transaction } from "./Transaction.js";

export class Deposit extends Transaction {
	
	constructor(depot, timestamp, asset, amount) {
		super(depot, timestamp, asset, amount);
	}

	_process() {
		// a deposit transaction only produces coins, it doesn't consume any coins
		
		// check if we have a linked withdrawal transaction
		if (this.withdrawalTransaction) {
			// if so, it gets complicated ...
			
			// A withdrawal consumes coin tranches. The linked deposit must mirror the consumed tranches regarding timestamp, source transaction or value, ...
			// That means the deposit transaction needs to know about all tranches consumed by the withdrawal. 
			// That's why we must make sure that the withdrawal transaction is processed first.
			const consumedTranches = this.withdrawalTransaction.process(...arguments);
			for (let {timestamp, amount, tranche} of consumedTranches) {
				this.depot.addTranche(timestamp, this.asset, amount, tranche.sourceTransaction);
			}
		}
	}

	set withdrawalTransaction(value) {
		this._withdrawalTransaction = value; 
	}
	
	get withdrawalTransaction() {
		return this._withdrawalTransaction;
	}
	
	toString() {
		let result = "Deposit " + super.toString();
		if (this.withdrawalTransaction) {
			result += " belonging to transaction " + this.withdrawalTransaction.id;
		}
		return result;
	}
}