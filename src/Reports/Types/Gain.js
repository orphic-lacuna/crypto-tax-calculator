import { ReportEntry } from "../ReportEntry.js";

export class Gain extends ReportEntry {
	static getHeadline() {
		return "Sell Time;Buy Time;Amount;Asset;Sell Rate;Buy Rate;Gain in " + Config.BaseCurrency + ";";
	}
	
	constructor(sellTimestamp, buyTimestamp, asset, amount, sellRate, buyRate, value) {
		super(sellTimestamp);
		this.buyTimestamp = buyTimestamp;
		this.asset = asset;
		this.amount = amount;
		this.value = value;
		this.sellRate = sellRate;
		this.buyRate = buyRate;
		if (!(this.amount > 0)) throw new Error("Gain report entry must have an amount greater than zero");
		if (!(this.value > 0)) throw new Error("Gain report entry has invalid value");
	}
	
	/**
	 * Processes the report entry. 
	 */
	async process() {
	}
	
	async toString() {
		return [
			new Date(this.timestamp).toLocaleString(),
			new Date(this.buyTimestamp).toLocaleString(),
			((this.amount > 0) ? this.amount : ""),
			(this.asset ? this.asset : ""),
			(this.sellRate ? this.sellRate : ""),
			(this.buyRate ? this.buyRate : ""),
			this.value
		].join(";");
	}
}