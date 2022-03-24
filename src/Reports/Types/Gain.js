import { ReportEntry } from "../ReportEntry.js";
import { Tranche } from "../../Tranche.js";
import { DateTime, Duration } from "luxon";

export class Gain extends ReportEntry {
	static get filename() {
		return "Gains.csv";
	}
	
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
		coinAge = this.timestamp.diff(this.soldTranche.creationTimestamp);
		
		let taxRelevant = false;
		
		// check if we have a source transaction
		if (this.soldTranche.sourceTransaction) {
			// check the type of the source transaction of the sold tranche
			// Is the source transaction to be taxed when selling?
			if (globalThis.Config.TaxRules.Trading.TaxedWhenSelling.includes(this.soldTranche.sourceTransaction.type)) {
				// it is tax relevant
				
				// check if the value of the buy transaction is already known
				if (typeof this.soldTranche.sourceTransaction.value == "number") {
					this.buyRate = this.soldTranche.sourceTransaction.value / this.soldTranche.sourceTransaction.amount;
				} else {
					this.buyRate = await ExchangeRates.getExchangeRate(this.soldTranche.sourceTransaction.timestamp, this.soldTranche.sourceTransaction.asset);
				}
				valueAtBuyTime = this.buyRate * this.amount;
				this.gain = this.soldValue - valueAtBuyTime;
				taxRelevant = true;
			}
		} else {
			// if we have no source transaction, assume WHAT?
		}
		
		// check if coinAge is below the threshold (otherwise not tax relevant)
		if (taxRelevant) {
			
			if (globalThis.Config.TaxRules && globalThis.Config.TaxRules.Trading) {
				if (globalThis.Config.TaxRules.Trading.NoTaxIfStakedLongerThan && this.soldTranche.flags.has(Tranche.Flags.Staked) && (coinAge > globalThis.Config.TaxRules.Trading.NoTaxIfStakedLongerThan)) {
					taxRelevant = false;
				} else if (globalThis.Config.TaxRules.Trading.NoTaxIfHeldLongerThan && (coinAge > globalThis.Config.TaxRules.Trading.NoTaxIfHeldLongerThan)) {
					taxRelevant = false;
				}
			}
		}
		
		// returning null if not tax relevant ensures that this report entry doesn't show up in the report
		return taxRelevant ? this : null;
	}
	
	async toString() {
		return [
			this.timestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),						// Sell time
			((this.amount > 0) ? this.amount : ""),														// Amount
			this.soldTranche.asset,																		// Asset
			(this.sellRate ? this.sellRate : ""),														// Sell rate
			this.soldTranche.creationTimestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),	// Buy time
			(this.buyRate ? this.buyRate : ""),															// Buy rate
			this.gain																					// Gain
		].join(";");
	}
}