import { EtherscanCompatibleAPI } from "./EtherscanCompatibleAPI.js";

export class BSCScan extends EtherscanCompatibleAPI {
	
	constructor() {
		super(...arguments);
		this.baseAsset = "BNB";
		this.baseURL = "https://api.bscscan.com/api";
	}
	
}