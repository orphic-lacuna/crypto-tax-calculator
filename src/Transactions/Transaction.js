import { Tranche } from "../Tranche.js";

/**
 */
export class Transaction {
	constructor(timestamp) {
		this.timestamp = timestamp;		
	}
	
	/**
	 * Private function that implements the logic for consuming tranches for a transaction.
	 * A tranche is a set of coins bought at the same time so that this bunch of coins is identifiable.
	 * Calls the provided callback for every tranche that is being consumed (fully or partially).
	 * @param	asset		The asset that is being consumed
	 * @param	amount		The amount of the asset that is being consumed
	 * @param 	callback	Function to be called for every tranche that must be consumed fully or partially in order to fulfill the
							requested amount of the asset.
	 */
	async _consumeTranches(asset, amount, timestamp, transactionInfo, callback) {
		
		if (typeof transactionInfo == "undefined") throw "transactionInfo undefined";
		
		// console.log("Consuming tranches for transaction:", new Date(this.timestamp).toLocaleString(), this.toString());
		let amountLeft = amount;
		while (amountLeft > 0) {
			// console.log("\t", amountLeft);
			// get the oldest tranche of the depot, this is FIFO method (first in first out)
			let tranche = this.depot.getOldestTranche(asset);
			// make sure that there is a tranche
			if (!tranche) {
				if ((typeof globalThis.config["traceAsset"] == "string") && (asset == globalThis.config["traceAsset"])) {
					console.log("\n\n\n\nNo tranche found for remaining", amountLeft, asset, " to be consumed on", this.depot.getFullname(), "\nOnly", this.depot.getBalance(asset), asset, "available\n\n\n\n");
				}
				// if not, it means that we do not know where the coins come from and when they have been bought
				// throw new Error("Error processing transaction: no unconsumed tranches found");
				globalThis.Reports.UnknownCoins.add({
					depot: this.depot.getFullname(),
					timestamp: this.timestamp,
					asset: asset,
					amount: amountLeft
				});
				// create an fictive tranche with creation timestamp equal to consumption timestamp
				tranche = new Tranche(this.depot, timestamp, asset, amountLeft, "Unknown source");
			}
			// determine how much of the requested amount can be covered by this tranche
			let [amountConsumed, trancheConsumptionReportEntry] = tranche.consume(amountLeft, timestamp, transactionInfo);
			// console.log("Consuming", amountConsumed, asset, "from", new Date(tranche.creationTimestamp));
			// call the callback with the tranche and amount that is taken from that tranche, callback calculates tax stuff
			await callback(tranche, amountConsumed, trancheConsumptionReportEntry);
			// update the uncovered amount left
			amountLeft -= amountConsumed;
		}
		if (amountLeft < 0) throw "tranche has been over-consumed";
	}
	
}