import CoinGecko from 'coingecko-api';
import fs from "fs";
import * as path from "path";

/**
 * Sleep function is a helper to slow down the requests to CoinGecko to prevent running into a rate limit
 * causing the requests to fail.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a CoinGecko object.
 */
const cgc = new CoinGecko();

/**
 * This list contains for each coin symbol the full coin / token name to prevent ambiguity.
 */
const CoinNames = {
	"ETH": "Ethereum",
	"LTC": "Litecoin",
	"XRP": "XRP",
	"DOT": "Polkadot",
	"EOS": "EOS",
	"BCH": "Bitcoin Cash",
	"ADA": "Cardano",
	"ADX": "AdEx",
	"REEF": "Reef Finance",
	"ATM": "Atletico Madrid Fan Token",
	"OG": "OG Fan Token",
	"LIT": "Litentry",
	"TRX": "Tron",
	"FIL": "Filecoin",
	"TLM": "Alien Worlds",
	"LINK": "Chainlink",
	"ATA": "Automata",
	"NFT": "APENFT",
	"GRT": "The Graph",
	"BCHABC": "Bitcoin Cash ABC"
}

/**
 * The coin list can resolve a coin symbol into the CoinGecko coin ID.
 */
class CoinList {
	constructor(cacheFolder) {
		this.cacheFilename = path.join(cacheFolder, "coin-ids.json");
	}
	
	/**
	 * Fetches the list of all coins available at CoinGecko.
	 * Tries to use the locally cached list first.
	 */
	async fetchData() {
		// check if there is a cached list of coin IDs
		if (fs.existsSync(this.cacheFilename)) {
			// if so, use the local list
			this.list = JSON.parse(fs.readFileSync(this.cacheFilename, "utf-8"));
		} else {
			// if not, fetch it from the server
			let response = await cgc.coins.list();
			if (response.success) {
				this.list = response.data;
				fs.writeFileSync(this.cacheFilename, JSON.stringify(this.list), "utf-8");
			}
		}

		/*for (let coin of this.list) {
			if (coin.symbol == "iota") console.log(coin);
		}
		throw new Error();*/
	}
	
	async getID(symbol) {
		// if we don't have a list of coins from CoinGecko get it
		if (!this.list) await this.fetchData();
		
		// matcher function that either matches the coin symbol or the coin name (case in-sensitive)
		const symbolOrNameMatching = coin => ((coin.symbol == symbol.toLowerCase()) || (coin.name.toLowerCase() == symbol.toLowerCase()));
		// how many entries of the list match (full name or symbol, not case sensitive)
		let count = this.list.reduce((acc, coin) => symbolOrNameMatching(coin) ? acc + 1 : acc, 0);
		
		// define another matching condition depending on whether the coin symbol is unique
		let matchCondition;
		if (count == 1) {
			// if symbol is unique, we can simply use the symbolOrName matcher
			matchCondition = symbolOrNameMatching;
		} else if (count == 0) {
			// if symbol is not found at all, use the lookup table
			const coinName = CoinNames[symbol];
			matchCondition = coin => coin.name == coinName;
		} else {
			// if symbol is not unique, also use the coin name in the 
			matchCondition = coin => {
				// coin must have the same symbol
				if (coin.symbol == symbol.toLowerCase()) {
					// a name must be defined for this coin
					if (symbol.toUpperCase() in CoinNames) {
						// the defined name of the coin should match (case insensitive)
						if (coin.name.toLowerCase() == CoinNames[symbol.toUpperCase()].toLowerCase()) {
							return true;
						}
					}
				}
				return false;
			}
		}
		const coin = this.list.find(matchCondition);
		if (!coin) {
			// if no coin was found, compose a list of coins that COULD match and display them in the error message
			let similarCoinList = this.list.filter(symbolOrNameMatching).map(coin => [coin.symbol, coin.name].join(" "));
			throw new Error(symbol + " not found on CoinGecko, similiar coins:\n" + similarCoinList.join("\n"));
		}
		return coin.id;
	}
}

/**
 * ExchangeRates class fetches exchange rate of any asset at any time and uses a file cache to speed up recurrent requests.
 */
export class ExchangeRates {
	constructor(cacheFolder) {
		this.cacheFilename = path.join(cacheFolder, "exchange-rates.json");
		this.coinList = new CoinList(cacheFolder);
		
		// check if there is a price cache file		
		if (fs.existsSync(this.cacheFilename)) {
			// if so, load it from json file
			this.exchangeRates = JSON.parse(fs.readFileSync(this.cacheFilename, "utf-8"));
		} else {
			// if not, create a new cache object, which is a 2D map (outer level: asset, inner level: date)
			this.exchangeRates = {};
		}
	}
	
	async getValue(timestamp, asset, amount) {
		const er = await this.getExchangeRate(timestamp, asset);
		return amount * er;
	}
	
	async getExchangeRate(timestamp, asset) {
		// check if asset exists, if not create the inner date map
		if (!(asset in this.exchangeRates)) this.exchangeRates[asset] = {};

		// coin gecko provides historical exchange rates only with day resolution, so we use only the date part of the DateTime object
		// as data key 
		const key = timestamp.toISODate();
		
		// check if this date exists
		if (key in this.exchangeRates[asset]) {
			// exchange rate already known
			return this.exchangeRates[asset][key];
		} else {
			// exchange rate not yet known, fetch it from CoinGecko
			
			let fetchSuccessful = false;
			for (let i = 0; i < 3; i++) {
				let history;
				try {
					let coinID = await this.coinList.getID(asset);
					// console.log("Fetching exchange rate for", asset, "at", key, ", coin ID:", coinID);
					history = await cgc.coins.fetchHistory(coinID, {
						"date": timestamp.toFormat("dd-MM-yyyy"),
						"localization": false
					});
	
					let rate = 0;
					if ((history["success"]) && (!history["data"]["market_data"])) {
						// console.log("\tNo exchange rate available, assuming 0");
					} else {
						rate = history["data"]["market_data"]["current_price"][globalThis.Config["BaseCurrency"].toLowerCase()];
						// console.log("\t", rate);
					}
	
					this.exchangeRates[asset][key] = rate;
					this.saveCache();
					await sleep(1000);
					return rate;
				} catch(error) {
					console.error("Response:", history);
					console.error(error);
					console.error("Retrying request in 30 seconds ...");
					await sleep(30000);
				}
			}
		}
		throw new Error("Failed to get exchange rate for " + asset + " at " + timestamp.toString());
	}
	
	saveCache() {
		fs.writeFileSync(this.cacheFilename, JSON.stringify(this.exchangeRates), "utf-8");
	}
}