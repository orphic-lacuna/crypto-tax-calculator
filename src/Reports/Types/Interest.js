import { ReportEntry } from "../ReportEntry.js";

export class Interest extends ReportEntry {
	static getHeadline() {
		return "Time;Amount;Asset;Value in " + Config.BaseCurrency + ";Type;";
	}
	
	constructor(timestamp, asset, amount, type, value) {
		super(timestamp);
		this.asset = asset;
		this.amount = amount;
		this.type = type;
		this.value = value;
	}
	
	/**
	 * Processes the report entry. If the value of the received interest in not yet known, resolve the value looking up the asset exchange rate at timestamp. 
	 */
	async process() {
		if (typeof this.value != "number") {
			tihs.value = await CoinPrices.getBaseCurrencyValue(this.timestamp, this.asset, this.amount);
		}
	}
	
	async toString() {
		return [
			new Date(this.timestamp).toLocaleString(),
			this.amount,
			this.asset,
			this.value,
			this.type
		].join(";");
	}
}