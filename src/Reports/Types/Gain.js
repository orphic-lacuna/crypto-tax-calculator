import { ReportEntry } from "../ReportEntry.js";
import { Buy } from "../../Transactions/Types/Buy.js";
import { Interest } from "../../Transactions/Types/Interest.js";
import { Tranche } from "../../Tranche.js";
import { Duration } from "luxon";

export class Gain extends ReportEntry {
	static getHeadline() {
		return "Sell Time;Buy Time;Amount;Asset;Sell Rate;Buy Rate;Gain in " + globalThis.Config.BaseCurrency + ";";
	}
	
	constructor(sellTimestamp, soldTranche, amount, soldValue) {
		super(sellTimestamp);
		this.soldTranche = soldTranche;
		this.amount = amount;
		this.soldValue = soldValue;
		if (!(this.amount > 0)) throw new Error("Gain report entry must have an amount greater than zero");
		if (!(this.soldValue > 0)) throw new Error("Gain report entry has invalid value");
	}
	
	/**
	 * Processes the report entry. 
	 */
	async process() {
		
		let valueAtBuyTime;
		let coinAge;
		
		// if the value of the sold coins is not yet known, determine it using the exchange rate
		if (typeof this.soldValue != "number") {
			this.sellRate = await ExchangeRates.getExchangeRate(this.timestamp, this.soldTranche.asset);
			this.soldValue = this.sellRate * this.amount;
		} else {
			this.sellRate = this.soldValue / this.amount;
		}
		
		// determine the coin age
		coinAge = this.timestamp.diff(this.soldTranche.timestamp);
		
		// check the type of the source transaction of the sold tranche
		if (this.soldTranche.sourceTransaction instanceof Buy) {
			// check if the value of the buy transaction is already known
			if (typeof this.soldTranche.sourceTransaction.value == "number") {
				valueAtBuyTime = this.soldTranche.sourceTransaction.value;
				this.buyRate = valueAtBuyTime / this.soldTranche.sourceTransaction.amount;
			} else {
				this.buyRate = await ExchangeRates.getExchangeRate(this.soldTranche.sourceTransaction.timestamp, this.soldTranche.sourceTransaction.asset);
				valueAtBuyTime = this.buyRate * this.soldTranche.sourceTransaction.amount;
			}
			this.gain = this.soldValue - valueAtBuyTime;
		} else if (this.soldTranche.sourceTransaction instanceof Interest) {
			// if the source transaction is Interest, this sell is not tax relevant
		} else {
			// if we have no source transaction, assume WHAT?
		}

		// check if coinAge is below the threshold (otherwise not tax relevant)
		let taxRelevant = (this.soldTranche.sourceTransaction instanceof Buy) && (
			(this.soldTranche.flags.has(Tranche.Flags.Staked) && (coinAge < Duration.fromObject(globalThis.Config.TimeUntilTaxFree.IfStaked))) ||
			(coinAge < Duration.fromObject(globalThis.Config.TimeUntilTaxFree.IfOnlyHeld))
		);
		
		// returning null if not tax relevant ensures that this report entry doesn't show up in the report
		return taxRelevant ? this : null;
	}
	
	async toString() {
		return [
			this.timestamp.toLocaleString(),				// Sell time
			this.soldTranche.timestamp.toLocaleString(),	// Buy time
			((this.amount > 0) ? this.amount : ""),			// Amount
			this.soldTranche.asset,							// Asset
			(this.sellRate ? this.sellRate : ""),			// Sell rate
			(this.buyRate ? this.buyRate : ""),				// Buy rate
			this.gain										// Gain
		].join(";");
	}
}