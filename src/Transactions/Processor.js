
/**
 * The transaction processor is the core class that manages processing of all transactions. It keeps track
 * of all transactions.
 */
export class TransactionProcessor {
	constructor() {
		this.transactions = [];
	}
	
	addTransaction(transaction) {
		if (this.transactions.includes(transaction)) throw new Error("transaction already known by transaction processor");
		this.transactions.push(transaction);
	}
	
	_sortTransactions() {
		this.transactions.sort((a, b) => a.timestamp - b.timestamp);
	}
	
	/**
	 * Processes all transactions.
	 */
	process() {
		// first step: order the transactions by timestamp
		this._sortTransactions();
		
		this.transactions.forEach(t => t.process());
	}
}