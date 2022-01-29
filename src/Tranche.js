/**
 * A tranche can be defined as a bunch of coins sharing the same properties (depot, asset, creation timestamp, flags, ...).
 * When doing anything with coins (like moving or spending etc.), coins are always processed in tranches. Tranches are read-only
 * objects, their properties cannot be modified. Each transaction usually consumes one or more tranches of coins and creates
 * one or more tranches of coins. A tranche tracks how many of its coins have been consumed.
 */
export class Tranche {
	
	static Flags = Object.freeze({
		Staked: Symbol("staked"),
		UnknownSource: Symbol("unknown source")
	});
	
	static Source = Object.freeze({
		Unknown: Symbol("unknown"),
		Interest: Symbol("interest"),
		Buy: Symbol("buy")
	});
	
	static _idCounter = 0;
	
	constructor(depot, creationTimestamp, asset, amount, source, flags){ 
		// depot to which this tranche of coins belongs
		this.depot = depot;
		
		// unique id for the tranche
		this.id = Tranche._idCounter;
		Tranche._idCounter += 1;
		
		this.creationTimestamp = creationTimestamp;
		this.asset = asset;
		this.amount = amount;
		// start with zero amount of consumed coins
		this.consumed = 0;
		this.source = source;
		// flags
		if (flags instanceof Set) {
			this.flags = flags;	
		} else if (flags instanceof Array) {
			this.flags = new Set(flags);
		} else {
			this.flags = new Set();
		}
		

		// TODO: rework this report
		// generate a tranche consumption report entry
		/*this.trancheCreationReportEntry = Reports.TrancheConsumption.add({
			timestamp: this.creationTimestamp,
			creationTimestamp: this.creationTimestamp,
			asset: this.asset,
			amount: this.amount,
			depot: this.depot.getFullname(),
			consumptionAmount: 0,
			totalConsumedAmount: 0,
			totalRequestedAmount: 0,
			transactionInfo: transactionInfo,
			consumedTranche: "Tranche " + this.id + " in " + this.depot.getFullname() + " created"
		});*/
	}
	
	/**
	 * Consumes a certain amount of this tranche.
	 * @return Returns the amount of coins that could be consumed from this tranche and a report entry.
	 */
	consume(amount, consumptionTimestamp, transactionInfo) {
		// return value: the amount of coins actually consumed by this function call
		let consumedAmount = 0;
		// check if requested amount can be completely delivered by this tranche
		if (amount <= this.amountLeft) {
			// if so, add the whole requested amount to the consumed amount
			this.consumed += amount;
			// update the return value
			consumedAmount = amount;
		} else {
			// if not, calculate the amount that can be delivered by this tranche
			consumedAmount = this.amountLeft;
			// and mark the tranche as fully consumed
			this.consumed = this.amount;
		}
		
		// generate a tranche consumption report entry
		/*const trancheConsumptionReportEntry = Reports.TrancheConsumption.add({
			timestamp: consumptionTimestamp,
			creationTimestamp: this.creationTimestamp,
			asset: this.asset,
			amount: this.amount,
			depot: this.depot.getFullname(),
			consumptionAmount: consumedAmount,
			totalConsumedAmount: this.consumed,
			totalRequestedAmount: amount,
			transactionInfo: transactionInfo,
			consumedTranche: "Tranche created in Tranche Consumption ID " + this.trancheCreationReportEntry.id.toString() // this.depot.getFullname() + "." + this.id + " (" +  + ")"
		});*/
		
		// and return the amount that could successfully be delivered by this tranche
		return consumedAmount;
	}

	/**
	 * Returns the number of coins in this tranche which have not been consumed yet.
	 */	
	get amountLeft() {
		return this.amount - this.consumed;
	}
}