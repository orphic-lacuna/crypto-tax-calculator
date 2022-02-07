import { ReportGenerator } from "./ReportGenerator.js";
import { Interest } from "./Types/Interest.js";
import { Spending } from "./Types/Spending.js";
import { Fee } from "./Types/Fee.js";

export class Reports {
	constructor() {
		this.reportGenerators = {
			Interest: new ReportGenerator(Interest),
			Spending: new ReportGenerator(Spending),
			Fee: new ReportGenerator(Fee)
		};
		for (let reportName in this.reportGenerators) {
			Object.defineProperty(this, reportName, {
				get: function() {
					return this.reportGenerators[reportName];
				}
			});
		}
	}
	
	async generate() {
		for (let reportName in this.reportGenerators) {
			await this.reportGenerators[reportName].generate(...arguments);
		}
	}
}