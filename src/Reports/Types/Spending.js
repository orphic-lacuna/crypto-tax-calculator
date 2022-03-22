import { ReportEntry } from "../ReportEntry.js";
import { DateTime } from "luxon";

export class Spending extends ReportEntry {
	static get filename() {
		return "Spendings.csv";
	}
	
	static getHeadline() {
		return "Time;Amount;Asset;Value in " + Config.BaseCurrency;
	}

	constructor(timestamp, asset, amount, value) {
		super(timestamp);
		this.asset = asset;
		this.amount = amount;
		this.value = value;
	}

	/**
	 * Processes the report entry. If the value of the spent coins is not yet known the
	 * value is calculated using the exchange rate of the asset at this time. 
	 */
	async process() {
		if (typeof this.value != "number") {
			this.value = await await ExchangeRates.getValue(this.timestamp, this.asset, this.amount);
		}
		return this;
	}
	
	toString() {
		return [
			this.timestamp.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
			this.amount,
			this.asset,
			this.value
		].join(";");
	}
}