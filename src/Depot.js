import { Tranche } from "./Tranche.js";

/**
 * A depot is a like a wallet for coins. It stores a history of all tranches of coins that have ever been seen in this
 * depot. It also stores a history of transactions that were performed on this depot.
 * Depots have names and can be nested. And depots can hold multiple assets.
 */
export class Depot {
	constructor(name, parent) {
		this.parent = parent;
		if (parent instanceof Depot) {
			parent.addSubDepot(this);
		}
		this.name = name;
		this.tranches = new Set();
		this.subDepots = new Set();
	}
	
	addSubDepot(depot) {
		this.subDepots.add(depot);
	}
	
	getSubDepot(name, autoCreate=true) {
		let subDepot = [...this.subDepots.values()].find(depot => depot.name == name);
		if (!subDepot) {
			return new Depot(this, name);
		}
		return subDepot;
	}
	
	getFullname() {
		let name = this.name;
		let parent = this.parent;
		while (parent instanceof Depot) {
			if (parent) name = parent.name + "." + name;
			parent = parent.parent;
		}
		return name;
	}

	/**
	 * Creates a new tranche and adds it to this depot.
	 */
	addTranche() {
		const t = new Tranche(this, ...arguments);
		this.tranches.add(t);
		return t;
	}
	
	/**
	 * Looks for the tranche that must be consumed next.
	 * @param asset		Symbol of the asset of the tranche
	 * @param fifo		If true, the oldest tranche is returned. If false, the newest tranche is returned.
	 */
	_getNextTranche(asset, timestamp, fifo=true) {
		if (typeof timestamp != "number") throw new Error("missing timestamp");
		
		// filter out all tranches
		// 		a) that do not have the desired asset
		//		b) that are already fully consumed
		//		c) that will be created after this consumption (time of creation is in the future seen from the time of consumption)
		let tranches = [...this.tranches.values()].filter(t => (t.asset == asset) && (t.amountLeft > 0) && (t.creationTimestamp <= timestamp));

		// now loop over all tranches to find the oldest / newest one (depending on fifo parameter) 
		return tranches.reduce((result, t) => {
			if (
				!result ||														// if haven't selected any tranche yet OR
				(fifo && (t.creationTimestamp < result.creationTimestamp)) ||	// current branch is younger (in FIFO mode) OR
				(!fifo && (t.creationTimestamp > result.creationTimestamp))		// current tranch is older (in LIFO mode)
			) {
				result = t;
			}
			return result;
		}, undefined);
	}

	/**
	 * Consumes amount coins of asset at the given timestamp.
	 * @param[in]	asset		The asset of the coins to be consumed
	 * @param[in]	amount		The amount of coins to be consumed
	 * @param[in]	timestamp	Timestamp of the consumption, used for generating report entries
	 * @returns					Returns a list of objects containing the amount of coins consumed and the tranche used for consuming
	 *							e.g. [{amount: 1, tranche: <Tranche Object>}, ...]
	 */
	consume(timestamp, asset, amount) {
		// list of tranches that have been used for consuming coins of this depot
		const consumedTranchesInfo = [];
		
		let amountLeftToBeConsumed = amount;
		// loop until all requested coins are provided by tranches of this depot
		while (amountLeftToBeConsumed > 0) {
			// get the next tranche that should be consumed
			let trancheToBeConsumedNext = this._getNextTranche(asset, timestamp);
			// if there is no tranche that can be consumed
			if (!trancheToBeConsumedNext) {
				// it means that we do not know where the coins come from and when they have been bought
				// TODO: report these coins as of unknown source
				/*globalThis.Reports.UnknownCoins.add({
					depot: this.depot.getFullname(),
					timestamp: this.timestamp,
					asset: asset,
					amount: amountLeft
				});*/
				// now create a fake tranche with creation timestamp equal to consumption timestamp to be tax correct (in doubt for the govt.)
				trancheToBeConsumedNext = new Tranche(this.depot, timestamp, asset, amountLeftToBeConsumed);
			}
			// determine how much of the requested amount can be covered by this tranche
			const amountConsumedByCurrentTranche = trancheToBeConsumedNext.consume(amountLeftToBeConsumed);
			// add the amount and the tranche to the resulting list of tranches that have been used for consuming coins of this depot
			consumedTranchesInfo.push({
				tranche: trancheToBeConsumedNext,
				amount: amountConsumedByCurrentTranche,
				timestamp: timestamp
			});
			
			// TODO: call the callback with the tranche and amount that is taken from that tranche, callback calculates tax stuff
			// await callback(tranche, amountConsumed, trancheConsumptionReportEntry);
			// update the uncovered amount left
			amountLeftToBeConsumed -= amountConsumedByCurrentTranche;
		}
		// return the total amount that has been consumed
		return consumedTranchesInfo;
	}

	/**
	 * Returns the balance of the depot for a given asset and timestamp.
	 */	
	getBalance(timestamp, asset) {
		if (typeof timestamp != "number") throw new Error("missing timestamp");
		return [...this.tranches.values()].filter(t => (t.asset == asset) && (t.creationTimestamp <= timestamp)).reduce((balance, t) => balance + t.amountLeft, 0);
	}
}