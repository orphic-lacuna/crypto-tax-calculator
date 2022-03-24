import { ReportEntry } from "../ReportEntry.js";
import { DateTime } from "luxon";

export class Interest extends ReportEntry {
	static get filename() {
		return "Interest.csv";
	}
	
	static getHeadline() {
		return "Time;Amount;Asset;Value in " + Config.BaseCurrency + ";Type;";
	}
	
	constructor(timestamp, asset, amount, source, value) {
		super(timestamp);
		this.asset = asset;
		this.amount = amount;
		this.source = source;
		this.value = value;
	}
	
	/**
	 * Processes the report entry. If the value of the received interest is not yet known, resolve the value looking up the asset exchange rate at timestamp. 
	 */
	async process() {
		// check if this type of interest is tax relevant, if not do not include it in the final report
		if (!globalThis.Config.TaxRules.Interest.TaxedTypes.includes(this.source.description)) return null;

		if (typeof this.value != "number") {
			this.value = await ExchangeRates.getValue(this.timestamp, this.asset, this.amount);
		}
		
		return this;
	}
	
	async toString() {
		return [
			this.timestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
			this.amount,
			this.asset,
			this.value,
			this.source.description
		].join(";");
	}
}