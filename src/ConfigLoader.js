import { Duration } from "luxon";
import fs from "fs";

export class ConfigLoader {
	static get defaultConfig() {
		return {
			"DepositWithdrawalLinking": {
				"MaxAmountDeviationRatio": 0.05,
				"MaxTimeDeviation": { "hours": 3 }
			},
			"TaxRules": {
				"Trading": {
					"TaxedWhenSelling": ["Buy", "Deposit"],
					"NoTaxIfHeldLongerThan": { "years": 1 },
					"NoTaxIfStakedLongerThan": { "years": 10 }
				},
				"Interest": {
					"TaxedTypes": ["Mining", "Staking", "Lending", "Referral"]
				}
			},
			"BaseCurrency": "EUR",
			"DustLimit": 1E-12
		};
	}
	
	constructor(filename) {
		let config = ConfigLoader.defaultConfig;
		if ((typeof filename == "string") && fs.existsSync(filename)) {
			config = JSON.parse(fs.readFileSync(filename, "utf-8"));
		}
		
		config.DepositWithdrawalLinking.MaxTimeDeviation = Duration.fromObject(config.DepositWithdrawalLinking.MaxTimeDeviation);
		config.TaxRules.Trading.NoTaxIfHeldLongerThan = Duration.fromObject(config.TaxRules.Trading.NoTaxIfHeldLongerThan);
		config.TaxRules.Trading.NoTaxIfStakedLongerThan = Duration.fromObject(config.TaxRules.Trading.NoTaxIfStakedLongerThan);
		
		return config;
	}
}